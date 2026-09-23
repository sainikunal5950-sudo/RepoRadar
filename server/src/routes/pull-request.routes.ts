import { Router } from "express";
import {
  getPullRequestReview,
  reReviewPullRequest,
} from "../controllers/pull-request.controller";
import authMiddleware from "../middleware/authMiddleware";
import aiRateLimit from "../middleware/aiRateLimit";

const router = Router();

// Protect all PR routes with JWT authentication
router.use(authMiddleware);

// GET /api/pull-requests/:id/review - Retrieve full PR review and line-level issues
router.get("/:id/review", getPullRequestReview);

// POST /api/pull-requests/:id/re-review - Manually re-trigger PR review analysis (rate limited)
router.post("/:id/re-review", aiRateLimit, reReviewPullRequest);

export default router;
