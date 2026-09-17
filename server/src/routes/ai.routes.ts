import { Router } from "express";
import {
  explainCodeHandler,
  explainFileHandler,
  suggestFixHandler,
  suggestFixesBatchHandler,
  getAIUsageHandler,
  getAIHealthHandler,
} from "../controllers/ai.controller";
import authMiddleware from "../middleware/authMiddleware";
import aiRateLimit from "../middleware/aiRateLimit";
import validate from "../middleware/validate";
import {
  explainCodeSchema,
  explainFileSchema,
  suggestFixSchema,
  suggestFixesBatchSchema,
} from "../schemas/ai.schema";

const router = Router();

// Protect all AI routes with user authentication
router.use(authMiddleware);

// GET /api/ai/health - Check health of AI service
router.get("/health", getAIHealthHandler);

// GET /api/ai/usage - Get user AI quota and rate-limit statistics
router.get("/usage", getAIUsageHandler);

// POST /api/ai/explain-code - Explain code snippet (rate limited)
router.post("/explain-code", aiRateLimit, validate(explainCodeSchema), explainCodeHandler);

// POST /api/ai/explain-file - Summarize entire file (rate limited)
router.post("/explain-file", aiRateLimit, validate(explainFileSchema), explainFileHandler);

// POST /api/ai/suggest-fix - Generate fix for an issue (rate limited)
router.post("/suggest-fix", aiRateLimit, validate(suggestFixSchema), suggestFixHandler);

// POST /api/ai/suggest-fixes-batch - Batch fix generation (rate limited)
router.post("/suggest-fixes-batch", aiRateLimit, validate(suggestFixesBatchSchema), suggestFixesBatchHandler);

export default router;
