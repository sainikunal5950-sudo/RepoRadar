import { Request, Response, NextFunction } from "express";
import prReviewService, {
  enableWebhookForRepository,
  disableWebhookForRepository,
  togglePRComments,
  listRepositoryPullRequests,
  getPullRequestReviewDetails,
  reviewPullRequest,
} from "../services/pr-review.service";
import AppError from "../lib/AppError";

/**
 * Enables GitHub webhook for automated PR reviews on a repository
 */
export async function enableWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const repositoryId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const result = await enableWebhookForRepository(repositoryId, userId);

    res.status(200).json({
      success: true,
      message: "GitHub webhook successfully registered for automated PR reviews",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disables and deletes GitHub webhook for automated PR reviews
 */
export async function disableWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const repositoryId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    await disableWebhookForRepository(repositoryId, userId);

    res.status(200).json({
      success: true,
      message: "GitHub webhook disabled and removed",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggles whether reviews are posted as GitHub comments
 */
export async function toggleComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const repositoryId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { enabled } = req.body;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const updatedStatus = await togglePRComments(repositoryId, Boolean(enabled), userId);

    res.status(200).json({
      success: true,
      message: `PR review commenting ${updatedStatus ? "enabled" : "disabled"}`,
      data: { pr_comments_enabled: updatedStatus },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists all PRs and their latest review status for a repository
 */
export async function listPullRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const repositoryId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const pullRequests = await listRepositoryPullRequests(repositoryId, userId);

    res.status(200).json({
      success: true,
      data: pullRequests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves full PR review details and line-level detected issues
 */
export async function getPullRequestReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const pullRequestId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const details = await getPullRequestReviewDetails(pullRequestId, userId);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually re-triggers PR review analysis
 */
export async function reReviewPullRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const pullRequestId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    // Verify ownership
    await getPullRequestReviewDetails(pullRequestId, userId);

    // Trigger review immediately
    const updatedPr = await reviewPullRequest(pullRequestId);

    res.status(200).json({
      success: true,
      message: "PR review re-calculated successfully",
      data: updatedPr,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  enableWebhook,
  disableWebhook,
  toggleComments,
  listPullRequests,
  getPullRequestReview,
  reReviewPullRequest,
};
