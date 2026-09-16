import { Router } from "express";
import {
  syncRepositoriesHandler,
  getUserRepositoriesHandler,
  selectRepositoryHandler,
  deselectRepositoryHandler,
  fetchRepositoryDataHandler,
  getRepositoryMetricsHandler,
  getRepositoryCommitsHandler,
  fetchRepositoryCodeHandler,
  getRepositoryFileTreeHandler,
  getRepositoryFilesHandler,
  getRepositoryFileContentHandler,
  analyzeRepositoryCodeHandler,
  getRepositoryAnalysisSummaryHandler,
  getRepositoryAnalysisResultsHandler,
  getRepositoryFileAnalysisResultsHandler,
} from "../controllers/repository.controller";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";
import {
  repositoryIdParamSchema,
  analysisQuerySchema,
  analysisFileParamsSchema,
} from "../schemas/repository.schema";

const router = Router();

// Protect all repository endpoints with JWT authentication
router.use(authMiddleware);

// POST /api/repositories/sync - Sync user's GitHub repositories list
router.post("/sync", syncRepositoriesHandler);

// GET /api/repositories - List repositories with metrics for logged-in user
router.get("/", getUserRepositoriesHandler);

// PATCH /api/repositories/:id/select - Mark repository as selected for analysis
router.patch("/:id/select", validate(repositoryIdParamSchema), selectRepositoryHandler);

// PATCH /api/repositories/:id/deselect - Unmark repository from analysis
router.patch("/:id/deselect", validate(repositoryIdParamSchema), deselectRepositoryHandler);

// POST /api/repositories/:id/fetch-data - Fetch & store detailed telemetry from GitHub
router.post("/:id/fetch-data", validate(repositoryIdParamSchema), fetchRepositoryDataHandler);

// GET /api/repositories/:id/metrics - Retrieve stored metrics, languages, and recent commits
router.get("/:id/metrics", validate(repositoryIdParamSchema), getRepositoryMetricsHandler);

// GET /api/repositories/:id/commits - Retrieve paginated commits history
router.get("/:id/commits", validate(repositoryIdParamSchema), getRepositoryCommitsHandler);

// POST /api/repositories/:id/fetch-code - Ingest source code tree and file blobs
router.post("/:id/fetch-code", validate(repositoryIdParamSchema), fetchRepositoryCodeHandler);

// GET /api/repositories/:id/files/tree - Retrieve stored hierarchical file tree
router.get("/:id/files/tree", validate(repositoryIdParamSchema), getRepositoryFileTreeHandler);

// GET /api/repositories/:id/files - Retrieve paginated file metadata
router.get("/:id/files", validate(repositoryIdParamSchema), getRepositoryFilesHandler);

// GET /api/repositories/:id/files/:fileId - Retrieve content of a single file
router.get("/:id/files/:fileId", validate(repositoryIdParamSchema), getRepositoryFileContentHandler);

// POST /api/repositories/:id/analyze-code - Run static rule-based analysis on fetched code
router.post("/:id/analyze-code", validate(repositoryIdParamSchema), analyzeRepositoryCodeHandler);

// GET /api/repositories/:id/analysis-summary - Retrieve rolled-up analysis summary
router.get("/:id/analysis-summary", validate(repositoryIdParamSchema), getRepositoryAnalysisSummaryHandler);

// GET /api/repositories/:id/analysis-results - Retrieve paginated & filterable analysis issues
router.get("/:id/analysis-results", validate(analysisQuerySchema), getRepositoryAnalysisResultsHandler);

// GET /api/repositories/:id/analysis-results/:fileId - Retrieve issues for a specific file
router.get("/:id/analysis-results/:fileId", validate(analysisFileParamsSchema), getRepositoryFileAnalysisResultsHandler);

export default router;

