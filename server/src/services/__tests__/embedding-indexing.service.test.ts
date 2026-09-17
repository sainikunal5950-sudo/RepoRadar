import embeddingIndexingService from "../embedding-indexing.service";
import prisma from "../../lib/db";
import aiServiceClient from "../ai-service.client";
import * as mongoNative from "../../lib/mongo-native";

jest.mock("../../lib/db", () => ({

  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    repositoryFile: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../ai-service.client", () => ({
  __esModule: true,
  default: {
    chunkAndEmbed: jest.fn(),
  },
}));

jest.mock("../../lib/mongo-native", () => {
  const deleteManyMock = jest.fn().mockResolvedValue({ acknowledged: true });
  const insertManyMock = jest.fn().mockResolvedValue({ acknowledged: true, insertedCount: 2 });
  return {
    getEmbeddingsCollection: jest.fn().mockResolvedValue({
      deleteMany: deleteManyMock,
      insertMany: insertManyMock,
    }),
  };
});

describe("EmbeddingIndexingService Unit Tests", () => {
  const repoId = "65d75cf9e1d84f23b890abce";
  const userId = "65d75cf9e1d84f23b890abcd";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return indexing status for a repository", async () => {
    (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
      id: repoId,
      indexing_status: "completed",
      total_chunks_indexed: 42,
      updatedAt: new Date("2026-09-17T12:00:00Z"),
    });

    const status = await embeddingIndexingService.getIndexingStatus(repoId, userId);

    expect(status.indexing_status).toBe("completed");
    expect(status.total_chunks_indexed).toBe(42);
  });

  it("should trigger repository indexing and set status to processing", async () => {
    (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
      id: repoId,
      _count: { files: 5 },
    });
    (prisma.repository.update as jest.Mock).mockResolvedValue({ id: repoId });

    const res = await embeddingIndexingService.triggerRepositoryIndexing(repoId, userId);

    expect(res.indexing_status).toBe("processing");
    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: repoId },
      data: { indexing_status: "processing" },
    });
  });

  it("should execute indexing, clear old embeddings, and insert new chunk embeddings", async () => {
    (prisma.repositoryFile.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "f1",
        file_path: "src/index.ts",
        language: "typescript",
        content: "const app = express();",
        file_size: 25,
      },
    ]);

    (aiServiceClient.chunkAndEmbed as jest.Mock).mockResolvedValueOnce({
      file_path: "src/index.ts",
      language: "typescript",
      total_chunks: 1,
      dimensions: 1536,
      chunks: [
        {
          chunk_text: "const app = express();",
          start_line: 1,
          end_line: 1,
          chunk_type: "block",
          chunk_label: "src/index.ts:L1-L1",
          embedding: [0.1, 0.2, 0.3],
        },
      ],
    });

    const summary = await embeddingIndexingService.executeIndexing(repoId);

    expect(summary.files_processed).toBe(1);
    expect(summary.chunks_created).toBe(1);

    const collection = await mongoNative.getEmbeddingsCollection();
    expect(collection.deleteMany).toHaveBeenCalled();
    expect(collection.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          file_path: "src/index.ts",
          chunk_text: "const app = express();",
        }),
      ])
    );

    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: repoId },
      data: {
        indexing_status: "completed",
        total_chunks_indexed: 1,
      },
    });
  });
});
