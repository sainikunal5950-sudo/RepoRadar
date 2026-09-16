import { z } from "zod";

export const repositoryIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ message: "Repository ID is required" })
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Repository ID format (must be 24-character hex MongoDB ObjectId)"),
  }),
});

export const listRepositoriesQuerySchema = z.object({
  query: z
    .object({
      selected: z
        .enum(["true", "false"])
        .optional()
        .transform((val) => (val === undefined ? undefined : val === "true")),
    })
    .optional(),
});

export const analysisQuerySchema = z.object({
  params: z.object({
    id: z
      .string({ message: "Repository ID is required" })
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Repository ID format (must be 24-character hex MongoDB ObjectId)"),
  }),
  query: z
    .object({
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      issueType: z.enum(["security", "performance", "bug", "code-smell", "maintainability"]).optional(),
      filePath: z.string().optional(),
      search: z.string().optional(),
      page: z.string().regex(/^\d+$/).optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      limit: z.string().regex(/^\d+$/).optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
      offset: z.string().regex(/^\d+$/).optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    })
    .optional(),
});

export const analysisFileParamsSchema = z.object({
  params: z.object({
    id: z
      .string({ message: "Repository ID is required" })
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Repository ID format (must be 24-character hex MongoDB ObjectId)"),
    fileId: z.string().min(1, "File ID or Path is required"),
  }),
});

export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>["params"];

