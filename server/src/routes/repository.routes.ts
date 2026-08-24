import { Router } from "express";
import {
  syncRepositoriesHandler,
  getUserRepositoriesHandler,
  selectRepositoryHandler,
  deselectRepositoryHandler,
} from "../controllers/repository.controller";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";
import { repositoryIdParamSchema } from "../schemas/repository.schema";

const router = Router();

// Protect all repository endpoints with JWT authentication
router.use(authMiddleware);

// POST /api/repositories/sync - Sync user's GitHub repositories
router.post("/sync", syncRepositoriesHandler);

// GET /api/repositories - List repositories for the logged-in user
router.get("/", getUserRepositoriesHandler);

// PATCH /api/repositories/:id/select - Mark repository as selected for analysis
router.patch("/:id/select", validate(repositoryIdParamSchema), selectRepositoryHandler);

// PATCH /api/repositories/:id/deselect - Unmark repository from analysis
router.patch("/:id/deselect", validate(repositoryIdParamSchema), deselectRepositoryHandler);

export default router;
