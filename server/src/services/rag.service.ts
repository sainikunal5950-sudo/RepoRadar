import prisma from "../lib/db";
import AppError from "../lib/AppError";
import aiServiceClient from "./ai-service.client";
import vectorSearchService from "./vector-search.service";

export interface AnswerQuestionOptions {
  repositoryId: string;
  userId: string;
  question: string;
  conversationId?: string;
}

export interface CitedFileChunk {
  file_path: string;
  start_line: number;
  end_line: number;
  score?: number;
}

export interface ChatAnswerResult {
  conversationId: string;
  answer: string;
  citedFiles: string[];
  retrievedChunks: Array<{
    file_path: string;
    start_line: number;
    end_line: number;
    chunk_text: string;
    chunk_type?: string;
    chunk_label?: string;
    score?: number;
  }>;
  tokensUsed?: number;
  messageId: string;
}

export class RAGService {
  /**
   * Retrieves relevant code context, calls AI service for RAG response,
   * stores conversational turns and logs token usage.
   */
  async answerQuestion(options: AnswerQuestionOptions): Promise<ChatAnswerResult> {
    const { repositoryId, userId, question, conversationId } = options;
    const startTime = Date.now();

    // 1. Verify repository ownership & indexing status
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw new AppError(
        "Repository not found or you do not have permission to access it",
        404,
        "REPOSITORY_NOT_FOUND"
      );
    }

    const isIndexed =
      repository.indexing_status === "completed" ||
      repository.indexing_status === "indexed";

    if (!isIndexed) {
      throw new AppError(
        "Repository codebase has not been indexed yet. Please index the repository in AI Code Search before chatting.",
        400,
        "REPOSITORY_NOT_INDEXED"
      );
    }

    // 2. Expand query for higher recall semantic vector retrieval
    const expandedQuery = await aiServiceClient.expandQuery(question);

    // 3. Retrieve relevant code chunks via Atlas Vector Search (or in-memory fallback)
    const searchResponse = await vectorSearchService.searchCode(
      repositoryId,
      userId,
      expandedQuery,
      8
    );

    const contextChunks = (searchResponse.results || []).map((r) => ({
      file_path: r.file_path,
      start_line: r.start_line,
      end_line: r.end_line,
      chunk_text: r.chunk_text,
      chunk_type: r.chunk_type,
      chunk_label: r.chunk_label,
      score: r.score,
    }));

    // 4. Retrieve or create ChatConversation
    let conversation: { id: string; title: string | null };
    let conversationHistory: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const existingConv = await prisma.chatConversation.findFirst({
        where: { id: conversationId, repository_id: repositoryId, user_id: userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 10,
          },
        },
      });

      if (!existingConv) {
        throw new AppError(
          "Conversation not found or access denied",
          404,
          "CONVERSATION_NOT_FOUND"
        );
      }

      conversation = existingConv;
      conversationHistory = existingConv.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    } else {
      const title =
        question.length > 50 ? `${question.slice(0, 47).trim()}...` : question.trim();
      conversation = await prisma.chatConversation.create({
        data: {
          repository_id: repositoryId,
          user_id: userId,
          title,
        },
      });
    }

    // 5. Generate RAG Answer from AI Service
    let aiResponse;
    try {
      aiResponse = await aiServiceClient.chatRespond({
        question,
        retrieved_chunks: contextChunks,
        conversation_history: conversationHistory,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await prisma.aIUsageLog.create({
        data: {
          user_id: userId,
          repository_id: repositoryId,
          operation_type: "rag_chat",
          success: false,
          error_message: err.message,
          duration_ms: durationMs,
        },
      });
      throw err;
    }

    const durationMs = Date.now() - startTime;

    // 6. Persist User and Assistant Messages in Database
    await prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: "user",
        content: question,
      },
    });

    const citedMetadata: CitedFileChunk[] = contextChunks.map((c) => ({
      file_path: c.file_path,
      start_line: c.start_line,
      end_line: c.end_line,
      score: c.score,
    }));

    const assistantMsg = await prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: "assistant",
        content: aiResponse.answer,
        retrieved_chunks: JSON.stringify(citedMetadata),
        tokens_used: aiResponse.tokens_used || null,
      },
    });

    // Update conversation updatedAt timestamp
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 7. Log AI Usage
    await prisma.aIUsageLog.create({
      data: {
        user_id: userId,
        repository_id: repositoryId,
        operation_type: "rag_chat",
        tokens_estimated: aiResponse.tokens_used || null,
        duration_ms: durationMs,
        success: true,
      },
    });

    return {
      conversationId: conversation.id,
      answer: aiResponse.answer,
      citedFiles: aiResponse.cited_files,
      retrievedChunks: contextChunks,
      tokensUsed: aiResponse.tokens_used,
      messageId: assistantMsg.id,
    };
  }

  /**
   * Retrieves all chat conversations for a repository owned by the user.
   */
  async getConversations(repositoryId: string, userId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
    }

    return prisma.chatConversation.findMany({
      where: { repository_id: repositoryId, user_id: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Retrieves message history for a specific conversation.
   */
  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, user_id: userId },
      include: {
        repository: {
          select: {
            id: true,
            github_repo_name: true,
            github_repo_fullname: true,
            indexing_status: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new AppError(
        "Conversation not found or access denied",
        404,
        "CONVERSATION_NOT_FOUND"
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { createdAt: "asc" },
    });

    const parsedMessages = messages.map((m) => {
      let chunks: CitedFileChunk[] = [];
      if (m.retrieved_chunks) {
        try {
          chunks = JSON.parse(m.retrieved_chunks);
        } catch {
          chunks = [];
        }
      }
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        retrievedChunks: chunks,
        tokensUsed: m.tokens_used,
        createdAt: m.createdAt,
      };
    });

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        repository: conversation.repository,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: parsedMessages,
    };
  }

  /**
   * Deletes a conversation and all its messages.
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, user_id: userId },
    });

    if (!conversation) {
      throw new AppError(
        "Conversation not found or access denied",
        404,
        "CONVERSATION_NOT_FOUND"
      );
    }

    await prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    return { message: "Conversation deleted successfully" };
  }
}

export const ragService = new RAGService();
export default ragService;
