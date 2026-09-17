import prisma from "../lib/db";
import AppError from "../lib/AppError";
import aiServiceClient, {
  AIExplainCodeResponse,
  AISummarizeFileResponse,
  AISuggestFixResponse,
} from "./ai-service.client";

export class AIService {
  /**
   * Helper to validate that a repository exists and belongs to the authenticated user
   */
  private async validateRepoAccess(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository '${repoId}' not found or access denied`, 404, "NOT_FOUND");
    }
    return repo;
  }

  /**
   * Helper to log AI usage to database
   */
  private async logUsage(params: {
    userId: string;
    repositoryId?: string;
    operationType: string;
    tokensEstimated?: number;
    success: boolean;
    errorMessage?: string;
    durationMs?: number;
  }) {
    try {
      await prisma.aIUsageLog.create({
        data: {
          user_id: params.userId,
          repository_id: params.repositoryId,
          operation_type: params.operationType,
          tokens_estimated: params.tokensEstimated,
          success: params.success,
          error_message: params.errorMessage,
          duration_ms: params.durationMs,
        },
      });
    } catch {
      // Non-blocking logger failure
    }
  }

  /**
   * Explains a specific code snippet or selected range
   */
  async explainCode(params: {
    userId: string;
    repositoryId: string;
    filePath: string;
    code?: string;
    fileId?: string;
    language?: string;
  }): Promise<AIExplainCodeResponse> {
    await this.validateRepoAccess(params.userId, params.repositoryId);

    let codeContent = params.code;
    let detectedLanguage = params.language;

    // If code is not explicitly sent, load from RepositoryFile
    if (!codeContent) {
      let file = null;
      if (params.fileId) {
        file = await prisma.repositoryFile.findFirst({
          where: { id: params.fileId, repository_id: params.repositoryId },
        });
      } else {
        file = await prisma.repositoryFile.findFirst({
          where: { repository_id: params.repositoryId, file_path: params.filePath },
        });
      }

      if (!file || !file.content) {
        throw new AppError("File content could not be located for explanation", 404, "FILE_NOT_FOUND");
      }
      codeContent = file.content;
      detectedLanguage = detectedLanguage || file.language || undefined;
    }

    const estimatedTokens = Math.max(1, Math.floor(codeContent.length / 4));
    const startTime = Date.now();

    try {
      const explanation = await aiServiceClient.explainCode({
        code: codeContent,
        filePath: params.filePath,
        language: detectedLanguage,
      });

      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId: params.userId,
        repositoryId: params.repositoryId,
        operationType: "explain_code",
        tokensEstimated: estimatedTokens,
        success: true,
        durationMs,
      });

      return explanation;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId: params.userId,
        repositoryId: params.repositoryId,
        operationType: "explain_code",
        tokensEstimated: estimatedTokens,
        success: false,
        errorMessage: error.message,
        durationMs,
      });
      throw error;
    }
  }

  /**
   * Summarizes an entire source file's architecture and role
   */
  async explainFile(params: {
    userId: string;
    repositoryId: string;
    fileId: string;
  }): Promise<AISummarizeFileResponse> {
    await this.validateRepoAccess(params.userId, params.repositoryId);

    const file = await prisma.repositoryFile.findFirst({
      where: { id: params.fileId, repository_id: params.repositoryId },
    });

    if (!file || !file.content) {
      throw new AppError("File content not found or empty", 404, "FILE_NOT_FOUND");
    }

    const estimatedTokens = Math.max(1, Math.floor(file.content.length / 4));
    const startTime = Date.now();

    try {
      const summary = await aiServiceClient.summarizeFile({
        content: file.content,
        filePath: file.file_path,
        language: file.language || undefined,
      });

      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId: params.userId,
        repositoryId: params.repositoryId,
        operationType: "explain_file",
        tokensEstimated: estimatedTokens,
        success: true,
        durationMs,
      });

      return summary;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId: params.userId,
        repositoryId: params.repositoryId,
        operationType: "explain_file",
        tokensEstimated: estimatedTokens,
        success: false,
        errorMessage: error.message,
        durationMs,
      });
      throw error;
    }
  }

  /**
   * Generates or retrieves cached fix suggestion for a CodeIssue
   */
  async suggestFix(userId: string, issueId: string): Promise<AISuggestFixResponse & { cached: boolean }> {
    const issue = await prisma.codeIssue.findUnique({
      where: { id: issueId },
      include: {
        repository: true,
      },
    });

    if (!issue) {
      throw new AppError(`Code issue with ID '${issueId}' not found`, 404, "NOT_FOUND");
    }

    if (issue.repository.user_id !== userId) {
      throw new AppError("Access denied to this repository issue", 403, "FORBIDDEN");
    }

    // Check if an AI fix is already cached on the CodeIssue
    if (issue.ai_suggested_fix) {
      try {
        const cachedFix = JSON.parse(issue.ai_suggested_fix) as AISuggestFixResponse;
        return {
          ...cachedFix,
          cached: true,
        };
      } catch {
        // If parsing fails, fall through to re-generate
      }
    }

    const snippet = issue.code_snippet || issue.message;
    const estimatedTokens = Math.max(1, Math.floor(snippet.length / 4));
    const startTime = Date.now();

    try {
      const fix = await aiServiceClient.suggestFix({
        issueId: issue.id,
        codeSnippet: snippet,
        filePath: issue.file_path,
        lineNumber: issue.line_number,
        issueType: issue.issue_type,
        severity: issue.severity,
        message: issue.message,
      });

      // Cache fix onto CodeIssue
      await prisma.codeIssue.update({
        where: { id: issueId },
        data: {
          ai_suggested_fix: JSON.stringify(fix),
          ai_fix_generated_at: new Date(),
        },
      });

      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId,
        repositoryId: issue.repository_id,
        operationType: "suggest_fix",
        tokensEstimated: estimatedTokens,
        success: true,
        durationMs,
      });

      return {
        ...fix,
        cached: false,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.logUsage({
        userId,
        repositoryId: issue.repository_id,
        operationType: "suggest_fix",
        tokensEstimated: estimatedTokens,
        success: false,
        errorMessage: error.message,
        durationMs,
      });
      throw error;
    }
  }

  /**
   * Generates fixes for a batch of issues (max 10)
   */
  async suggestFixesBatch(
    userId: string,
    repositoryId: string,
    issueIds: string[]
  ): Promise<{ fixes: Array<AISuggestFixResponse & { cached: boolean }>; total: number }> {
    await this.validateRepoAccess(userId, repositoryId);

    const cappedIds = issueIds.slice(0, 10);
    const results: Array<AISuggestFixResponse & { cached: boolean }> = [];

    for (const id of cappedIds) {
      try {
        const fix = await this.suggestFix(userId, id);
        results.push(fix);
      } catch (err: any) {
        // Include partial failures gracefully
        results.push({
          issue_id: id,
          file_path: "unknown",
          line_number: 0,
          original_code: "",
          fixed_code: "",
          explanation: `Fix generation failed: ${err.message}`,
          why_it_matters: "Error communicating with AI service",
          confidence: "low",
          cached: false,
        });
      }
    }

    return {
      fixes: results,
      total: results.length,
    };
  }

  /**
   * Retrieves AI usage quota stats for the logged-in user
   */
  async getAIUsageStats(userId: string) {
    const limit = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || "50", 10);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [usedLastHour, totalLifetime] = await Promise.all([
      prisma.aIUsageLog.count({
        where: {
          user_id: userId,
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.aIUsageLog.count({
        where: { user_id: userId },
      }),
    ]);

    const remaining = Math.max(0, limit - usedLastHour);
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000);

    return {
      limit_per_hour: limit,
      used_last_hour: usedLastHour,
      remaining_quota: remaining,
      total_lifetime_calls: totalLifetime,
      resets_at: resetAt,
    };
  }

  /**
   * Checks health of the AI microservice
   */
  async checkHealth() {
    return await aiServiceClient.checkAIHealth();
  }
}

export const aiService = new AIService();
export default aiService;
