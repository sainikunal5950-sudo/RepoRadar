import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import repositoryService from "../services/repository.service";
import codeFetchService from "../services/code-fetch.service";
import codeAnalysisService from "../services/code-analysis.service";
import healthScoreService from "../services/health-score.service";
import analyticsService from "../services/analytics.service";
import developerAnalyticsService from "../services/developer-analytics.service";
import embeddingIndexingService from "../services/embedding-indexing.service";
import vectorSearchService from "../services/vector-search.service";


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

/**
 * POST /api/repositories/:id/analyze-code - Run static rule-based analysis on fetched code
 */
export const analyzeRepositoryCodeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await codeAnalysisService.analyzeRepository(id, req.user!.id);
    sendSuccess(res, result, 200);
  }
);

/**
 * GET /api/repositories/:id/analysis-summary - Retrieve rolled-up analysis summary
 */
export const getRepositoryAnalysisSummaryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const summary = await codeAnalysisService.getAnalysisSummary(id, req.user!.id);
    sendSuccess(res, summary, 200);
  }
);

/**
 * GET /api/repositories/:id/analysis-results - Retrieve paginated & filterable analysis issues
 */
export const getRepositoryAnalysisResultsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { severity, issueType, filePath, search, page, limit, offset } = req.query as Record<string, any>;

    const results = await codeAnalysisService.getAnalysisIssues(
      id,
      req.user!.id,
      {
        severity,
        issueType,
        filePath,
        search,
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      }
    );
    sendSuccess(res, results, 200);
  }
);

/**
 * GET /api/repositories/:id/analysis-results/:fileId - Retrieve issues for a specific file
 */
export const getRepositoryFileAnalysisResultsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const fileId = (Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId) as string;

    const issues = await codeAnalysisService.getFileAnalysisIssues(
      id,
      fileId,
      req.user!.id
    );
    sendSuccess(res, issues, 200);
  }
);

/**
 * POST /api/repositories/:id/calculate-health - Trigger health scores & grade calculation
 */
export const calculateRepositoryHealthHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const health = await healthScoreService.calculateHealthScores(id, req.user!.id);
    sendSuccess(res, health, 200);
  }
);

/**
 * GET /api/repositories/:id/health - Retrieve latest health score record
 */
export const getRepositoryHealthHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const health = await healthScoreService.getLatestHealth(id, req.user!.id);
    sendSuccess(res, health, 200);
  }
);

/**
 * GET /api/repositories/:id/health/history - Retrieve historical health scores
 */
export const getRepositoryHealthHistoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const history = await healthScoreService.getHealthHistory(id, req.user!.id);
    sendSuccess(res, history, 200);
  }
);

/**
 * GET /api/repositories/health-overview - Retrieve latest health scores for all selected repositories
 */
export const getUserRepositoriesHealthOverviewHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const overview = await healthScoreService.getUserRepositoriesHealthOverview(req.user!.id);
    sendSuccess(res, overview, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/severity-distribution - Retrieve severity distribution for pie chart
 */
export const getSeverityDistributionAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const distribution = await analyticsService.getIssueDistributionBySeverity(id, req.user!.id);
    sendSuccess(res, distribution, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/type-distribution - Retrieve issue type distribution for bar chart
 */
export const getTypeDistributionAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const distribution = await analyticsService.getIssueDistributionByType(id, req.user!.id);
    sendSuccess(res, distribution, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/top-files - Retrieve top problematic files
 */
export const getTopFilesAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const topFiles = await analyticsService.getTopProblematicFiles(id, req.user!.id, limit);
    sendSuccess(res, topFiles, 200);
  }
);

/**
 * POST /api/repositories/:id/sync-commits - Sync extended commits & file changes and compute analytics
 */
export const syncRepositoryCommitsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await developerAnalyticsService.syncCommitData(req.user!.id, id);
    sendSuccess(res, result, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/contributors - Retrieve contributor breakdown & stats
 */
export const getRepositoryContributorsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    // Verify repository access
    await repositoryService.getRepositoryMetrics(req.user!.id, id);
    const contributors = await developerAnalyticsService.getContributorStats(id);
    sendSuccess(res, contributors, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/activity - Retrieve commit activity timeline (day/week/month)
 */
export const getRepositoryActivityHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    // Verify repository access
    await repositoryService.getRepositoryMetrics(req.user!.id, id);

    const groupBy = (req.query.groupBy === "week" || req.query.groupBy === "month")
      ? req.query.groupBy
      : "day";

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const timeline = await developerAnalyticsService.getCommitActivityTimeline(
      id,
      groupBy,
      from,
      to
    );
    sendSuccess(res, timeline, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/heatmap - Retrieve commit heatmap (day-of-week x hour)
 */
export const getRepositoryHeatmapHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    // Verify repository access
    await repositoryService.getRepositoryMetrics(req.user!.id, id);

    const heatmap = await developerAnalyticsService.getCommitHeatmapData(id);
    sendSuccess(res, heatmap, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/hotspots - Retrieve file hotspots ranked by debt score
 */
export const getRepositoryHotspotsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    // Verify repository access
    await repositoryService.getRepositoryMetrics(req.user!.id, id);

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const hotspots = await developerAnalyticsService.getFileHotspots(id, limit);
    sendSuccess(res, hotspots, 200);
  }
);

/**
 * GET /api/repositories/:id/analytics/technical-debt - Retrieve highest-risk technical debt files with explanations
 */
export const getRepositoryTechnicalDebtHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    // Verify repository access
    await repositoryService.getRepositoryMetrics(req.user!.id, id);

    const debtSummary = await developerAnalyticsService.getTechnicalDebtSummary(id);
    sendSuccess(res, debtSummary, 200);
  }
);

/**
 * POST /api/repositories/:id/index-code - Trigger semantic embedding indexing of repository code files
 */
export const indexRepositoryCodeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await embeddingIndexingService.triggerRepositoryIndexing(id, req.user!.id);
    sendSuccess(res, result, 202);
  }
);

/**
 * GET /api/repositories/:id/index-status - Retrieve repository code indexing status & chunk count
 */
export const getRepositoryIndexStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const statusResult = await embeddingIndexingService.getIndexingStatus(id, req.user!.id);
    sendSuccess(res, statusResult, 200);
  }
);

/**
 * POST /api/repositories/:id/search-code - Execute semantic vector search across repository code
 */
export const searchRepositoryCodeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { query, limit } = req.body;
    const searchResults = await vectorSearchService.searchCode(
      id,
      req.user!.id,
      query,
      limit ? parseInt(String(limit), 10) : 10
    );
    sendSuccess(res, searchResults, 200);
  }
);




