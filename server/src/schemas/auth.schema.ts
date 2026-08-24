import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters"),
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
    password: z
      .string({ message: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be at most 100 characters"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Please provide a valid email address")
      .toLowerCase(),
    password: z
      .string({ message: "Password is required" })
      .min(1, "Password cannot be empty"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
