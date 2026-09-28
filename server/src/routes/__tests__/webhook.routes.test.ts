import request from "supertest";
import crypto from "crypto";
import app from "../../app";
import prisma from "../../lib/db";
import { encryptToken } from "../../lib/encryption";
import * as prReviewService from "../../services/pr-review.service";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repository: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pullRequest: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pullRequestReview: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    aIUsageLog: {
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

jest.mock("../../services/pr-review.service", () => {
  const actual = jest.requireActual("../../services/pr-review.service");
  return {
    ...actual,
    reviewPullRequest: jest.fn(),
    enableWebhookForRepository: jest.fn(),
    disableWebhookForRepository: jest.fn(),
    togglePRComments: jest.fn(),
    listRepositoryPullRequests: jest.fn(),
    getPullRequestReviewDetails: jest.fn(),
  };
});

describe("GitHub Webhook & PR Review Routes Integration Tests", () => {
  const rawSecret = "my-test-webhook-secret-32chars!";
  const encryptedSecret = encryptToken(rawSecret);
  const repoGithubId = 123456789;
  const repoDbId = "65d75cf9e1d84f23b890abce";
  const prDbId = "65d75cf9e1d84f23b890abcd";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function generateSignature(bodyStr: string, secret: string) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(Buffer.from(bodyStr, "utf8"));
    return `sha256=${hmac.digest("hex")}`;
  }

  describe("POST /api/webhooks/github", () => {
    it("should respond 200 to GitHub ping event", async () => {
      const pingPayload = { zen: "Design for failure." };

      const res = await request(app)
        .post("/api/webhooks/github")
        .set("X-GitHub-Event", "ping")
        .send(pingPayload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.zen).toBe("Design for failure.");
    });

    it("should reject webhook request if signature is missing or invalid (401)", async () => {
      (prisma.repository.findUnique as jest.Mock).mockResolvedValueOnce({
        id: repoDbId,
        github_repo_id: repoGithubId,
        webhook_secret: encryptedSecret,
      });

      const payload = {
        action: "opened",
        repository: { id: repoGithubId },
        pull_request: { id: 999, number: 12, title: "Test PR" },
      };

      const res = await request(app)
        .post("/api/webhooks/github")
        .set("X-GitHub-Event", "pull_request")
        .set("X-Hub-Signature-256", "sha256=invalidhexsignature00000000000000000000000000000000000000000000")
        .send(payload)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
    });

    it("should accept valid webhook signature, upsert PR record, and respond 200 immediately", async () => {
      (prisma.repository.findUnique as jest.Mock).mockResolvedValueOnce({
        id: repoDbId,
        github_repo_id: repoGithubId,
        github_repo_fullname: "octocat/Hello-World",
        webhook_secret: encryptedSecret,
      });

      (prisma.pullRequest.upsert as jest.Mock).mockResolvedValueOnce({
        id: prDbId,
        repository_id: repoDbId,
        github_pr_id: 1001,
        pr_number: 42,
        title: "Feature: Add OAuth security layer",
        author_username: "octocat",
        status: "open",
        base_branch: "main",
        head_branch: "feature/oauth",
        github_pr_url: "https://github.com/octocat/Hello-World/pull/42",
        review_status: "pending",
      });

      (prReviewService.reviewPullRequest as jest.Mock).mockResolvedValueOnce({
        id: prDbId,
        review_status: "completed",
      });

      const payload = {
        action: "opened",
        repository: {
          id: repoGithubId,
          full_name: "octocat/Hello-World",
        },
        pull_request: {
          id: 1001,
          number: 42,
          title: "Feature: Add OAuth security layer",
          user: { login: "octocat" },
          base: { ref: "main" },
          head: { ref: "feature/oauth" },
          html_url: "https://github.com/octocat/Hello-World/pull/42",
          created_at: "2026-08-25T10:00:00Z",
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString, rawSecret);

      const res = await request(app)
        .post("/api/webhooks/github")
        .set("Content-Type", "application/json")
        .set("X-GitHub-Event", "pull_request")
        .set("X-Hub-Signature-256", signature)
        .send(payloadString)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pr_number).toBe(42);
      expect(prisma.pullRequest.upsert).toHaveBeenCalled();
    });

    it("should handle closed/merged PR actions gracefully", async () => {
      (prisma.repository.findUnique as jest.Mock).mockResolvedValueOnce({
        id: repoDbId,
        github_repo_id: repoGithubId,
        webhook_secret: encryptedSecret,
      });

      (prisma.pullRequest.findUnique as jest.Mock).mockResolvedValueOnce({
        id: prDbId,
        github_pr_id: 1001,
      });

      (prisma.pullRequest.update as jest.Mock).mockResolvedValueOnce({
        id: prDbId,
        status: "merged",
      });

      const payload = {
        action: "closed",
        repository: { id: repoGithubId },
        pull_request: {
          id: 1001,
          number: 42,
          merged: true,
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString, rawSecret);

      const res = await request(app)
        .post("/api/webhooks/github")
        .set("Content-Type", "application/json")
        .set("X-GitHub-Event", "pull_request")
        .set("X-Hub-Signature-256", signature)
        .send(payloadString)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("merged");
      expect(prisma.pullRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: prDbId },
          data: { status: "merged" },
        })
      );
    });
  });

  describe("Protected PR Endpoints", () => {
    it("GET /api/pull-requests/:id/review should retrieve review details for authenticated user", async () => {
      (prReviewService.getPullRequestReviewDetails as jest.Mock).mockResolvedValueOnce({
        pullRequest: { id: prDbId, pr_number: 42, title: "Feature PR" },
        latestReview: { id: "rev-1", risk_level: "low", summary: "Looks clean." },
        allReviewsCount: 1,
      });

      const res = await request(app)
        .get(`/api/pull-requests/${prDbId}/review`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pullRequest.pr_number).toBe(42);
      expect(res.body.data.latestReview.risk_level).toBe("low");
    });

    it("POST /api/pull-requests/:id/re-review should re-evaluate review", async () => {
      (prReviewService.getPullRequestReviewDetails as jest.Mock).mockResolvedValueOnce({
        pullRequest: { id: prDbId, pr_number: 42 },
      });

      (prReviewService.reviewPullRequest as jest.Mock).mockResolvedValueOnce({
        id: prDbId,
        review_status: "completed",
      });

      const res = await request(app)
        .post(`/api/pull-requests/${prDbId}/re-review`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(prReviewService.reviewPullRequest).toHaveBeenCalledWith(prDbId);
    });
  });
});
