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

export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>["params"];
