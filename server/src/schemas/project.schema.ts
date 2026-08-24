import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Project name is required" })
      .trim()
      .min(1, "Project name cannot be empty")
      .max(100, "Project name must be at most 100 characters"),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Project name cannot be empty")
        .max(100, "Project name must be at most 100 characters")
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, "Description must be at most 500 characters")
        .nullable()
        .optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.description !== undefined,
      {
        message: "At least one field (name or description) must be provided for update",
      }
    ),
});

export const projectIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ message: "Project ID is required" })
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Project ID format (must be 24-character hex MongoDB ObjectId)"),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>["body"];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>["body"];
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>["params"];
