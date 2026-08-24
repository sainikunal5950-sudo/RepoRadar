import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import authService from "../services/auth.service";

/**
 * POST /api/auth/register - Register a new user
 */
export const registerHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    sendSuccess(res, user, 201);
  }
);

/**
 * POST /api/auth/login - Login user and issue JWT token
 */
export const loginHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const authData = await authService.login(req.body);
    sendSuccess(res, authData, 200);
  }
);

/**
 * GET /api/auth/me - Get current logged-in user profile (Protected)
 */
export const getMeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await authService.getUserById(req.user!.id);
    sendSuccess(res, user, 200);
  }
);
