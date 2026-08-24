import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import projectService from "../services/project.service";

/**
 * POST /api/projects - Create a new project
 */
export const createProjectHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const project = await projectService.createProject(req.body);
    sendSuccess(res, project, 201);
  }
);

/**
 * GET /api/projects - List all projects
 */
export const getAllProjectsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const projects = await projectService.getAllProjects();
    sendSuccess(res, projects, 200);
  }
);

/**
 * GET /api/projects/:id - Get a project by ID
 */
export const getProjectByIdHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const project = await projectService.getProjectById(id);
    sendSuccess(res, project, 200);
  }
);

/**
 * PATCH /api/projects/:id - Update an existing project
 */
export const updateProjectHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const project = await projectService.updateProject(id, req.body);
    sendSuccess(res, project, 200);
  }
);

/**
 * DELETE /api/projects/:id - Delete a project
 */
export const deleteProjectHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const project = await projectService.deleteProject(id);
    sendSuccess(res, project, 200);
  }
);
