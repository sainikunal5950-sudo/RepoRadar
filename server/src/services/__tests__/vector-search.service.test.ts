import vectorSearchService, {
  calculateCosineSimilarity,
} from "../vector-search.service";
import prisma from "../../lib/db";
import aiServiceClient from "../ai-service.client";
import * as mongoNative from "../../lib/mongo-native";

jest.mock("../../lib/db", () => ({

  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("../ai-service.client", () => ({
  __esModule: true,
  default: {
    generateEmbedding: jest.fn(),
  },
}));

describe("VectorSearchService Unit Tests", () => {
  const repoId = "65d75cf9e1d84f23b890abce";
  const userId = "65d75cf9e1d84f23b890abcd";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Cosine Similarity Calculation", () => {
    it("should calculate identical vectors as 1.0", () => {
      const vec = [1, 2, 3];
      expect(calculateCosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it("should calculate orthogonal vectors as 0.0", () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(calculateCosineSimilarity(vecA, vecB)).toBe(0);
    });

    it("should calculate opposite vectors as -1.0", () => {
      const vecA = [1, 2];
      const vecB = [-1, -2];
      expect(calculateCosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });
  });

  describe("searchCode with In-Memory Cosine Fallback", () => {
    it("should execute in-memory search and return ranked results when Atlas pipeline is unavailable", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
        id: repoId,
        indexing_status: "completed",
        total_chunks_indexed: 2,
      });

      (aiServiceClient.generateEmbedding as jest.Mock).mockResolvedValueOnce({
        embedding: [1, 0, 0],
        dimensions: 3,
        model: "text-embedding-3-small",
      });

      const mockDocs = [
        {
          _id: "doc1",
          file_path: "src/auth.ts",
          start_line: 1,
          end_line: 10,
          chunk_text: "function login() {}",
          chunk_type: "function",
          chunk_label: "function login",
          language: "typescript",
          embedding: [0.9, 0.1, 0], // High similarity to [1,0,0]
        },
        {
          _id: "doc2",
          file_path: "src/styles.css",
          start_line: 1,
          end_line: 5,
          chunk_text: "body { margin: 0; }",
          chunk_type: "block",
          chunk_label: "styles.css:L1-L5",
          language: "css",
          embedding: [0, 1, 0], // Low similarity to [1,0,0]
        },
      ];

      jest.spyOn(mongoNative, "getEmbeddingsCollection").mockResolvedValue({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error("Atlas search unavailable")),
        }),
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockDocs),
          }),
        }),
      } as any);

      const response = await vectorSearchService.searchCode(
        repoId,
        userId,
        "authenticate and login"
      );

      expect(response.total_results).toBe(2);
      expect(response.results[0].file_path).toBe("src/auth.ts");
      expect(response.results[0].score).toBeGreaterThan(response.results[1].score);
    });
  });
});
