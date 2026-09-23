import { Request, Response, NextFunction } from "express";
import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { decryptToken } from "../lib/encryption";
import { verifyGitHubWebhookSignature } from "../services/webhook-verify.service";
import { reviewPullRequest } from "../services/pr-review.service";

/**
 * Handles incoming GitHub webhook events with HMAC-SHA256 signature verification
 */
export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signatureHeader = req.headers["x-hub-signature-256"] as string | undefined;
    const githubEvent = (req.headers["x-github-event"] as string) || "";
    const payload = req.body || {};

    // 1. Handle GitHub Webhook Ping event
    if (githubEvent === "ping") {
      res.status(200).json({
        success: true,
        message: "GitHub webhook ping received successfully",
        zen: payload.zen,
      });
      return;
    }

    const githubRepoId = payload.repository?.id;
    if (!githubRepoId) {
      throw new AppError("Invalid webhook payload: Missing repository information", 400, "INVALID_PAYLOAD");
    }

    // 2. Lookup repository by GitHub repo ID
    const repository = await prisma.repository.findUnique({
      where: { github_repo_id: Number(githubRepoId) },
    });

    if (!repository || !repository.webhook_secret) {
      throw new AppError("Repository webhook is not registered or configured", 404, "WEBHOOK_NOT_CONFIGURED");
    }

    // 3. Verify HMAC-SHA256 signature against raw request body
    const decryptedSecret = decryptToken(repository.webhook_secret);
    const rawBodyBuffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const isValidSignature = verifyGitHubWebhookSignature(
      rawBodyBuffer,
      signatureHeader,
      decryptedSecret
    );

    if (!isValidSignature) {
      throw new AppError("Invalid or missing webhook signature (X-Hub-Signature-256)", 401, "INVALID_WEBHOOK_SIGNATURE");
    }

    // 4. Filter for pull_request events
    if (githubEvent !== "pull_request") {
      res.status(200).json({
        success: true,
        message: `Ignored event '${githubEvent}'`,
      });
      return;
    }

    const action = payload.action;
    const prData = payload.pull_request;

    if (!prData) {
      res.status(200).json({
        success: true,
        message: "No pull_request object in payload",
      });
      return;
    }

    // If PR is closed/merged, update record and finish
    if (action === "closed") {
      const isMerged = Boolean(prData.merged);
      const prRecord = await prisma.pullRequest.findUnique({
        where: { github_pr_id: prData.id },
      });

      if (prRecord) {
        await prisma.pullRequest.update({
          where: { id: prRecord.id },
          data: { status: isMerged ? "merged" : "closed" },
        });
      }

      res.status(200).json({
        success: true,
        message: `Pull request #${prData.number} marked as ${isMerged ? "merged" : "closed"}`,
      });
      return;
    }

    // Process review for "opened", "synchronize", or "reopened"
    if (!["opened", "synchronize", "reopened"].includes(action)) {
      res.status(200).json({
        success: true,
        message: `Ignored action '${action}' for pull_request event`,
      });
      return;
    }

    // 5. Upsert PullRequest record
    const pullRequest = await prisma.pullRequest.upsert({
      where: { github_pr_id: prData.id },
      create: {
        repository_id: repository.id,
        github_pr_id: prData.id,
        pr_number: prData.number,
        title: prData.title || `PR #${prData.number}`,
        author_username: prData.user?.login || "unknown",
        status: "open",
        base_branch: prData.base?.ref || "main",
        head_branch: prData.head?.ref || "unknown",
        github_pr_url: prData.html_url || "",
        created_at_github: new Date(prData.created_at || Date.now()),
        review_status: "pending",
      },
      update: {
        title: prData.title || `PR #${prData.number}`,
        status: "open",
        base_branch: prData.base?.ref || "main",
        head_branch: prData.head?.ref || "unknown",
        github_pr_url: prData.html_url || "",
        review_status: "pending",
      },
    });

    // 6. Respond immediately to GitHub (under 10s timeout)
    res.status(200).json({
      success: true,
      message: `Webhook accepted. Review queued for PR #${prData.number}`,
      data: {
        pr_id: pullRequest.id,
        pr_number: pullRequest.pr_number,
        action,
      },
    });

    // 7. Fire-and-forget background review execution
    setImmediate(async () => {
      try {
        await reviewPullRequest(pullRequest.id);
        console.log(`✅ Background review completed for PR #${pullRequest.pr_number} in repo '${repository.github_repo_fullname}'`);
      } catch (err: any) {
        console.error(`❌ Background review error for PR #${pullRequest.pr_number}:`, err.message);
      }
    });
  } catch (error) {
    next(error);
  }
}

export default {
  handleGitHubWebhook,
};
