import { Router, Request, Response } from "express";
import config from "../config";
import { sendSuccess } from "../lib/response";

const router = Router();

/**
 * GET /api/health - Health check endpoint
 */
router.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    service: "reporadar-api",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

export default router;
