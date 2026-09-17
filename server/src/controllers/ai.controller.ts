import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import aiService from "../services/ai.service";

/**
 * POST /api/ai/explain-code - Explains a code snippet or selected range
 */
export const explainCodeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { repositoryId, filePath, code, fileId, language } = req.body;
    const explanation = await aiService.explainCode({
      userId: req.user!.id,
      repositoryId,
      filePath,
      code,
      fileId,
      language,
    });
    sendSuccess(res, explanation, 200);
  }
);

/**
 * POST /api/ai/explain-file - Explains and summarizes an entire file
 */
export const explainFileHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { repositoryId, fileId } = req.body;
    const summary = await aiService.explainFile({
      userId: req.user!.id,
      repositoryId,
      fileId,
    });
    sendSuccess(res, summary, 200);
  }
);

/**
 * POST /api/ai/suggest-fix - Generates a targeted fix for a single CodeIssue
 */
export const suggestFixHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { issueId } = req.body;
    const fix = await aiService.suggestFix(req.user!.id, issueId);
    sendSuccess(res, fix, 200);
  }
);

/**
 * POST /api/ai/suggest-fixes-batch - Batch generates fixes for multiple CodeIssues
 */
export const suggestFixesBatchHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { repositoryId, issueIds } = req.body;
    const result = await aiService.suggestFixesBatch(
      req.user!.id,
      repositoryId,
      issueIds
    );
    sendSuccess(res, result, 200);
  }
);

/**
 * GET /api/ai/usage - Retrieves current user's AI quota and usage statistics
 */
export const getAIUsageHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const usage = await aiService.getAIUsageStats(req.user!.id);
    sendSuccess(res, usage, 200);
  }
);

/**
 * GET /api/ai/health - Proxies AI microservice health check
 */
export const getAIHealthHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const health = await aiService.checkHealth();
    sendSuccess(res, health, 200);
  }
);
