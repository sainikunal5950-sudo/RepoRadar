import { z } from "zod";

export const chatQuestionSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Repository ID is required"),
  }),
  body: z.object({
    question: z
      .string()
      .min(2, "Question must be at least 2 characters long")
      .max(2000, "Question cannot exceed 2000 characters"),
    conversationId: z.string().optional(),
  }),
});

export const repositoryChatQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, "Repository ID is required"),
  }),
});

export const conversationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Conversation ID is required"),
  }),
});
