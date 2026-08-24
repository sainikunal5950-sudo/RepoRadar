import { Router } from "express";
import {
  syncRepositoriesHandler,
  getUserRepositoriesHandler,
  selectRepositoryHandler,
  deselectRepositoryHandler,
  fetchRepositoryDataHandler,
  getRepositoryMetricsHandler,
  getRepositoryCommitsHandler,
} from "../controllers/repository.controller";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";
import { repositoryIdParamSchema } from "../schemas/repository.schema";

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

export default router;
