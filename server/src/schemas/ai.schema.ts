import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const explainCodeSchema = z.object({
  body: z.object({
    repositoryId: z.string().regex(objectIdRegex, "Invalid repository ID format"),
    filePath: z.string().min(1, "File path is required"),
    code: z.string().optional(),
    fileId: z.string().regex(objectIdRegex, "Invalid file ID format").optional(),
    language: z.string().optional(),
  }),
});

export const explainFileSchema = z.object({
  body: z.object({
    repositoryId: z.string().regex(objectIdRegex, "Invalid repository ID format"),
    fileId: z.string().regex(objectIdRegex, "Invalid file ID format"),
  }),
});

export const suggestFixSchema = z.object({
  body: z.object({
    issueId: z.string().regex(objectIdRegex, "Invalid issue ID format"),
  }),
});

export const suggestFixesBatchSchema = z.object({
  body: z.object({
    repositoryId: z.string().regex(objectIdRegex, "Invalid repository ID format"),
    issueIds: z.array(z.string().regex(objectIdRegex, "Invalid issue ID format")).min(1).max(10),
  }),
});
