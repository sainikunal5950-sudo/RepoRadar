import ragService from "../rag.service";
import prisma from "../../lib/db";
import aiServiceClient from "../ai-service.client";
import vectorSearchService from "../vector-search.service";
import AppError from "../../lib/AppError";

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
    },
    chatConversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aIUsageLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../ai-service.client", () => ({
  __esModule: true,
  default: {
    expandQuery: jest.fn(),
    chatRespond: jest.fn(),
  },
}));

jest.mock("../vector-search.service", () => ({
  __esModule: true,
  default: {
    searchCode: jest.fn(),
  },
}));

describe("RAGService Unit Tests", () => {
  const repositoryId = "65d75cf9e1d84f23b890abce";
  const userId = "65d75cf9e1d84f23b890abcd";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("answerQuestion", () => {
    it("should throw 404 if repository does not exist", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        ragService.answerQuestion({
          repositoryId,
          userId,
          question: "Where is auth handled?",
        })
      ).rejects.toThrow(AppError);
    });

    it("should throw 400 if repository is not indexed yet", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
        id: repositoryId,
        user_id: userId,
        indexing_status: "not_started",
      });

      await expect(
        ragService.answerQuestion({
          repositoryId,
          userId,
          question: "Where is auth handled?",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "REPOSITORY_NOT_INDEXED",
      });
    });

    it("should orchestrate RAG flow and store chat turns on indexed repo", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
        id: repositoryId,
        user_id: userId,
        indexing_status: "completed",
      });

      (aiServiceClient.expandQuery as jest.Mock).mockResolvedValueOnce(
        "authentication login jwt verify"
      );

      (vectorSearchService.searchCode as jest.Mock).mockResolvedValueOnce({
        query: "authentication login jwt verify",
        total_results: 1,
        results: [
          {
            id: "chunk-1",
            file_path: "src/auth/jwt.ts",
            start_line: 1,
            end_line: 25,
            chunk_text: "export const verifyToken = () => {};",
            chunk_type: "function",
            chunk_label: "verifyToken",
            score: 0.88,
          },
        ],
      });

      (prisma.chatConversation.create as jest.Mock).mockResolvedValueOnce({
        id: "conv-123",
        title: "How does authentication work?",
      });

      (aiServiceClient.chatRespond as jest.Mock).mockResolvedValueOnce({
        answer: "Authentication is handled in `src/auth/jwt.ts:1-25` using JWT verification.",
        cited_files: ["src/auth/jwt.ts"],
        retrieved_chunks_count: 1,
        tokens_used: 150,
      });

      (prisma.chatMessage.create as jest.Mock)
        .mockResolvedValueOnce({ id: "msg-user-1" })
        .mockResolvedValueOnce({ id: "msg-asst-1" });

      const result = await ragService.answerQuestion({
        repositoryId,
        userId,
        question: "How does authentication work?",
      });

      expect(result.conversationId).toBe("conv-123");
      expect(result.answer).toContain("src/auth/jwt.ts");
      expect(result.citedFiles).toEqual(["src/auth/jwt.ts"]);
      expect(result.retrievedChunks).toHaveLength(1);
      expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
      expect(prisma.aIUsageLog.create).toHaveBeenCalledTimes(1);
    });

    it("should load conversation history when conversationId is passed", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
        id: repositoryId,
        user_id: userId,
        indexing_status: "completed",
      });

      (aiServiceClient.expandQuery as jest.Mock).mockResolvedValueOnce("logout session");

      (vectorSearchService.searchCode as jest.Mock).mockResolvedValueOnce({
        results: [],
      });

      (prisma.chatConversation.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "conv-123",
        title: "Auth flow",
        messages: [
          { role: "user", content: "How does login work?" },
          { role: "assistant", content: "It uses JWT." },
        ],
      });

      (aiServiceClient.chatRespond as jest.Mock).mockResolvedValueOnce({
        answer: "I don't have enough context in the indexed codebase to answer that.",
        cited_files: [],
        retrieved_chunks_count: 0,
        tokens_used: 80,
      });

      (prisma.chatMessage.create as jest.Mock)
        .mockResolvedValueOnce({ id: "msg-user-2" })
        .mockResolvedValueOnce({ id: "msg-asst-2" });

      const result = await ragService.answerQuestion({
        repositoryId,
        userId,
        question: "What about logout?",
        conversationId: "conv-123",
      });

      expect(result.conversationId).toBe("conv-123");
      expect(aiServiceClient.chatRespond).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_history: [
            { role: "user", content: "How does login work?" },
            { role: "assistant", content: "It uses JWT." },
          ],
        })
      );
    });
  });

  describe("getConversations & getConversationMessages", () => {
    it("should return repository conversations", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce({
        id: repositoryId,
        user_id: userId,
      });

      (prisma.chatConversation.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "conv-1", title: "Chat 1", _count: { messages: 4 } },
      ]);

      const convs = await ragService.getConversations(repositoryId, userId);
      expect(convs).toHaveLength(1);
      expect(convs[0].id).toBe("conv-1");
    });

    it("should return parsed messages for conversation", async () => {
      (prisma.chatConversation.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "conv-1",
        title: "Chat 1",
        repository: { id: repositoryId, github_repo_name: "reporadar" },
      });

      (prisma.chatMessage.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: "msg-1",
          role: "assistant",
          content: "Hello",
          retrieved_chunks: JSON.stringify([
            { file_path: "src/index.ts", start_line: 1, end_line: 10 },
          ]),
          tokens_used: 50,
          createdAt: new Date(),
        },
      ]);

      const res = await ragService.getConversationMessages("conv-1", userId);
      expect(res.conversation.id).toBe("conv-1");
      expect(res.messages).toHaveLength(1);
      expect(res.messages[0].retrievedChunks[0].file_path).toBe("src/index.ts");
    });
  });

  describe("deleteConversation", () => {
    it("should delete conversation if owned by user", async () => {
      (prisma.chatConversation.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "conv-1",
        user_id: userId,
      });

      (prisma.chatConversation.delete as jest.Mock).mockResolvedValueOnce({
        id: "conv-1",
      });

      const res = await ragService.deleteConversation("conv-1", userId);
      expect(res.message).toContain("deleted");
      expect(prisma.chatConversation.delete).toHaveBeenCalledWith({
        where: { id: "conv-1" },
      });
    });
  });
});
