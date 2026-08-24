import { z } from "zod";

export const syncGithubSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
    name: z.string().trim().optional(),
    github_id: z.coerce
      .number({ message: "GitHub ID is required" })
      .int()
      .positive("GitHub ID must be a positive integer"),
    github_username: z.string().trim().optional(),
    github_access_token: z.string().trim().optional(),
  }),
});

export type SyncGithubInput = z.infer<typeof syncGithubSchema>["body"];
