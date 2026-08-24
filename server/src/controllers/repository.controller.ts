import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import repositoryService from "../services/repository.service";

/**
 * POST /api/repositories/sync - Trigger GitHub repository synchronization
 */
export const syncRepositoriesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const repos = await repositoryService.syncUserRepositories(req.user!.id);
    sendSuccess(res, repos, 200);
  }
);

/**
 * GET /api/repositories - List all repositories for the logged-in user
 */
export const getUserRepositoriesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const isSelected =
      req.query.selected !== undefined
        ? req.query.selected === "true"
        : undefined;

    const repos = await repositoryService.getUserRepositories(
      req.user!.id,
      isSelected
    );
    sendSuccess(res, repos, 200);
  }
);

/**
 * PATCH /api/repositories/:id/select - Select a repository for radar analysis
 */
export const selectRepositoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const repo = await repositoryService.toggleRepositorySelection(
      req.user!.id,
      id,
      true
    );
    sendSuccess(res, repo, 200);
  }
);

/**
 * PATCH /api/repositories/:id/deselect - Deselect a repository from radar analysis
 */
export const deselectRepositoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const repo = await repositoryService.toggleRepositorySelection(
      req.user!.id,
      id,
      false
    );
    sendSuccess(res, repo, 200);
  }
);
