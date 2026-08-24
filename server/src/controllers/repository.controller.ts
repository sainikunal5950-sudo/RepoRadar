import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import repositoryService from "../services/repository.service";
import codeFetchService from "../services/code-fetch.service";

/**
 * POST /api/repositories/sync - Trigger GitHub repository list synchronization
 */
export const syncRepositoriesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const repos = await repositoryService.syncUserRepositories(req.user!.id);
    sendSuccess(res, repos, 200);
  }
);

/**
 * GET /api/repositories - List all repositories for the logged-in user with nested metrics
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

/**
 * POST /api/repositories/:id/fetch-data - Ingest detailed repository telemetry from GitHub
 */
export const fetchRepositoryDataHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const details = await repositoryService.fetchAndStoreRepositoryDetails(
      req.user!.id,
      id
    );
    sendSuccess(res, details, 200);
  }
);

/**
 * GET /api/repositories/:id/metrics - Retrieve stored metrics, languages, and recent commits for a repo
 */
export const getRepositoryMetricsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const metrics = await repositoryService.getRepositoryMetrics(
      req.user!.id,
      id
    );
    sendSuccess(res, metrics, 200);
  }
);

/**
 * GET /api/repositories/:id/commits - Retrieve paginated commits for a repository
 */
export const getRepositoryCommitsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const commitsData = await repositoryService.getRepositoryCommits(
      req.user!.id,
      id,
      page,
      limit
    );
    sendSuccess(res, commitsData, 200);
  }
);

/**
 * POST /api/repositories/:id/fetch-code - Ingest full repository source files and build file tree
 */
export const fetchRepositoryCodeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await codeFetchService.fetchAndIndexRepositoryCode(
      req.user!.id,
      id
    );
    sendSuccess(res, result, 200);
  }
);

/**
 * GET /api/repositories/:id/files/tree - Retrieve stored hierarchical file tree
 */
export const getRepositoryFileTreeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const treeData = await codeFetchService.getRepositoryFileTree(
      req.user!.id,
      id
    );
    sendSuccess(res, treeData, 200);
  }
);

/**
 * GET /api/repositories/:id/files - Retrieve paginated files list
 */
export const getRepositoryFilesHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const language = req.query.language ? String(req.query.language) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const filesData = await codeFetchService.getRepositoryFiles(
      req.user!.id,
      id,
      { page, limit, language, search }
    );
    sendSuccess(res, filesData, 200);
  }
);

/**
 * GET /api/repositories/:id/files/:fileId - Retrieve content of a single file
 */
export const getRepositoryFileContentHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const fileId = (Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId) as string;

    const file = await codeFetchService.getRepositoryFileContent(
      req.user!.id,
      id,
      fileId
    );
    sendSuccess(res, file, 200);
  }
);
