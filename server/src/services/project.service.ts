import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { CreateProjectInput, UpdateProjectInput } from "../schemas/project.schema";

export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(data: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
      },
    });
    return project;
  }

  /**
   * List all projects, ordered by creation date descending
   */
  async getAllProjects() {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return projects;
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new AppError(`Project with ID '${id}' not found`, 404, "NOT_FOUND");
    }

    return project;
  }

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: UpdateProjectInput) {
    // Ensure project exists
    await this.getProjectById(id);

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    return updatedProject;
  }

  /**
   * Delete a project by ID
   */
  async deleteProject(id: string) {
    // Ensure project exists
    await this.getProjectById(id);

    const deletedProject = await prisma.project.delete({
      where: { id },
    });

    return deletedProject;
  }
}

export const projectService = new ProjectService();
export default projectService;
