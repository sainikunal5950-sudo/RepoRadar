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
  calculateRepositoryHealthHandler,
  getRepositoryHealthHandler,
  getRepositoryHealthHistoryHandler,
  getUserRepositoriesHealthOverviewHandler,
  getSeverityDistributionAnalyticsHandler,
  getTypeDistributionAnalyticsHandler,
  getTopFilesAnalyticsHandler,
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

// GET /api/repositories/health-overview - Multi-repository health overview (before :id)
router.get("/health-overview", getUserRepositoriesHealthOverviewHandler);

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

// POST /api/repositories/:id/calculate-health - Calculate health scores & letter grade
router.post("/:id/calculate-health", validate(repositoryIdParamSchema), calculateRepositoryHealthHandler);

// GET /api/repositories/:id/health - Retrieve latest health score record
router.get("/:id/health", validate(repositoryIdParamSchema), getRepositoryHealthHandler);

// GET /api/repositories/:id/health/history - Retrieve historical health scores
router.get("/:id/health/history", validate(repositoryIdParamSchema), getRepositoryHealthHistoryHandler);

// GET /api/repositories/:id/analytics/severity-distribution - Retrieve severity distribution for pie chart
router.get("/:id/analytics/severity-distribution", validate(repositoryIdParamSchema), getSeverityDistributionAnalyticsHandler);

// GET /api/repositories/:id/analytics/type-distribution - Retrieve issue type distribution for bar chart
router.get("/:id/analytics/type-distribution", validate(repositoryIdParamSchema), getTypeDistributionAnalyticsHandler);

// GET /api/repositories/:id/analytics/top-files - Retrieve top problematic files
router.get("/:id/analytics/top-files", validate(repositoryIdParamSchema), getTopFilesAnalyticsHandler);

export default router;


