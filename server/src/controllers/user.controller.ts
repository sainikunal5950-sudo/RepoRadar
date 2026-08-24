import { Request, Response } from "express";
import asyncHandler from "../lib/asyncHandler";
import { sendSuccess } from "../lib/response";
import userService from "../services/user.service";

/**
 * POST /api/users/sync-github - Sync GitHub OAuth user data and return sanitized profile + JWT
 */
export const syncGithubHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.syncGithubUser(req.body);
    sendSuccess(res, result, 200);
  }
);
