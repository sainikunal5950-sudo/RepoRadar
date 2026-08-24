import { Router } from "express";
import {
  createProjectHandler,
  getAllProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from "../controllers/project.controller";
import validate from "../middleware/validate";
import authMiddleware from "../middleware/authMiddleware";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from "../schemas/project.schema";

const router = Router();

// Protect all project routes with JWT authentication
router.use(authMiddleware);

// GET /api/projects - List all projects
router.get("/", getAllProjectsHandler);

// POST /api/projects - Create a new project
router.post("/", validate(createProjectSchema), createProjectHandler);

// GET /api/projects/:id - Get project by ID
router.get("/:id", validate(projectIdParamSchema), getProjectByIdHandler);

// PATCH /api/projects/:id - Update project by ID
router.patch(
  "/:id",
  validate(projectIdParamSchema),
  validate(updateProjectSchema),
  updateProjectHandler
);

// DELETE /api/projects/:id - Delete project by ID
router.delete("/:id", validate(projectIdParamSchema), deleteProjectHandler);

export default router;
