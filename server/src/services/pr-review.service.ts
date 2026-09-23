import crypto from "crypto";
import prisma from "../lib/db";
import AppError from "../lib/AppError";
import config from "../config";
import { encryptToken, decryptToken } from "../lib/encryption";
import githubService, {
  initializeOctokit,
  createRepositoryWebhook,
  deleteRepositoryWebhook,
  fetchPullRequestDiff,
  postPullRequestComment,
  GitHubPRFileDiff,
} from "./github.service";
import { scanFileForIssues, RuleIssue } from "./analysis-rules";
import aiServiceClient, { AIPRReviewIssueItem } from "./ai-service.client";

const SENSITIVE_PATH_PATTERNS = [
  /auth/i,
  /security/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /crypto/i,
  /permission/i,
  /session/i,
  /\.env/i,
  /middleware[\/\\]auth/i,
  /jwt/i,
  /oauth/i,
];

/**
 * Checks if a file path belongs to security-sensitive application domains
 */
export function isSecuritySensitivePath(filePath: string): boolean {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

export interface ParsedDiffLine {
  newLineNumber: number;
  content: string;
}

/**
 * Parses unified diff patch content to extract only added/modified lines with new file line numbers
 */
export function parseDiffAddedLines(patch: string): ParsedDiffLine[] {
  if (!patch) return [];

  const addedLines: ParsedDiffLine[] = [];
  const lines = patch.split("\n");
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Chunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      if (match && match[1]) {
        currentNewLine = parseInt(match[1], 10);
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const codeContent = line.slice(1);
      addedLines.push({
        newLineNumber: currentNewLine,
        content: codeContent,
      });
      currentNewLine++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // Deleted line - does not advance new line count
      continue;
    } else {
      // Unchanged context line
      currentNewLine++;
    }
  }

  return addedLines;
}

/**
 * Runs static rule engines strictly against the added/modified code lines of a diff
 */
export function scanDiffForIssues(filePath: string, patch?: string): RuleIssue[] {
  if (!patch) return [];

  const addedLines = parseDiffAddedLines(patch);
  if (addedLines.length === 0) return [];

  // Build a synthetic file content consisting of the added lines
  const addedCodeText = addedLines.map((l) => l.content).join("\n");
  const issues = scanFileForIssues(addedCodeText, filePath);

  // Remap synthetic line numbers to actual new file line numbers
  return issues.map((issue) => {
    const syntheticIndex = Math.max(0, issue.lineNumber - 1);
    const actualLine =
      syntheticIndex < addedLines.length
        ? addedLines[syntheticIndex].newLineNumber
        : issue.lineNumber;

    return {
      ...issue,
      lineNumber: actualLine,
    };
  });
}

/**
 * Computes overall PR risk level based on issue severity and file sensitivity
 */
export function calculatePRRiskLevel(
  issues: Array<{ severity: string }>,
  filesChanged: string[]
): "low" | "medium" | "high" | "critical" {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumOrLowCount = issues.filter(
    (i) => i.severity === "medium" || i.severity === "low"
  ).length;

  if (criticalCount > 0) {
    return "critical";
  }

  if (highCount > 0) {
    return "high";
  }

  if (mediumOrLowCount > 0) {
    return "medium";
  }

  // If no static issues, check if any security-sensitive paths were modified
  const touchesSensitiveFiles = filesChanged.some((f) => isSecuritySensitivePath(f));
  if (touchesSensitiveFiles) {
    return "medium";
  }

  return "low";
}

/**
 * Executes full review pipeline for a Pull Request record
 */
export async function reviewPullRequest(pullRequestId: string): Promise<any> {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
    include: {
      repository: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!pr) {
    throw new AppError(`Pull Request not found with ID '${pullRequestId}'`, 404, "PR_NOT_FOUND");
  }

  // Update status to reviewing
  await prisma.pullRequest.update({
    where: { id: pullRequestId },
    data: { review_status: "reviewing", error_message: null },
  });

  try {
    const repository = pr.repository;
    const user = repository.user;

    if (!user.github_access_token) {
      throw new Error("Repository owner has no linked GitHub access token");
    }

    const decryptedToken = decryptToken(user.github_access_token);
    const octokit = initializeOctokit(decryptedToken);

    const [owner, repoName] = repository.github_repo_fullname.split("/");
    if (!owner || !repoName) {
      throw new Error(`Invalid repository full name format: ${repository.github_repo_fullname}`);
    }

    // 1. Fetch changed files & diff patches
    const diffFiles: GitHubPRFileDiff[] = await fetchPullRequestDiff(
      octokit,
      owner,
      repoName,
      pr.pr_number
    );

    let totalAdditions = 0;
    let totalDeletions = 0;
    const filesChangedNames: string[] = [];
    const allFoundIssues: RuleIssue[] = [];
    const diffSnippets: string[] = [];

    for (const file of diffFiles) {
      totalAdditions += file.additions || 0;
      totalDeletions += file.deletions || 0;
      filesChangedNames.push(file.file_path);

      if (file.patch) {
        // Run Module 7 rule engines against the added lines
        const fileIssues = scanDiffForIssues(file.file_path, file.patch);
        allFoundIssues.push(...fileIssues);

        // Collect snippet for AI summary
        if (diffSnippets.length < 10) {
          diffSnippets.push(`--- File: ${file.file_path} (+${file.additions}, -${file.deletions}) ---\n${file.patch.slice(0, 800)}`);
        }
      }
    }

    // 2. Compute risk level
    const riskLevel = calculatePRRiskLevel(allFoundIssues, filesChangedNames);
    const criticalIssuesCount = allFoundIssues.filter((i) => i.severity === "critical").length;

    // 3. Call AI Service for natural language summary
    const aiIssuesPayload: AIPRReviewIssueItem[] = allFoundIssues.map((i) => ({
      filePath: i.filePath,
      lineNumber: i.lineNumber,
      severity: i.severity,
      issueType: i.issueType,
      message: i.message,
    }));

    const aiSummaryResult = await aiServiceClient.summarizePullRequestReview({
      pr_title: pr.title,
      files_changed: filesChangedNames,
      diff_summary: diffSnippets.join("\n\n"),
      issues_found: aiIssuesPayload,
    });

    const fullAiReviewText = [
      `### Summary\n${aiSummaryResult.summary}`,
      `### Risk Assessment\n${aiSummaryResult.risk_assessment}`,
      `### Recommendation\n${aiSummaryResult.recommendation}`,
    ].join("\n\n");

    // 4. Persist PullRequestReview and PullRequestIssues
    const createdReview = await prisma.pullRequestReview.create({
      data: {
        pull_request_id: pr.id,
        risk_level: riskLevel,
        summary: aiSummaryResult.summary,
        recommendation: aiSummaryResult.recommendation,
        issues_found: allFoundIssues.length,
        critical_issues_count: criticalIssuesCount,
        files_changed_count: filesChangedNames.length,
        additions: totalAdditions,
        deletions: totalDeletions,
        ai_review_text: fullAiReviewText,
        posted_to_github: false,
        issues: {
          create: allFoundIssues.map((issue) => ({
            file_path: issue.filePath,
            line_number: issue.lineNumber,
            issue_type: issue.issueType,
            severity: issue.severity,
            message: issue.message,
            is_new_issue: true,
            suggested_fix: issue.suggestedFix || null,
            code_snippet: issue.codeSnippet || null,
          })),
        },
      },
      include: {
        issues: true,
      },
    });

    // 5. Optionally post comment to GitHub PR
    let githubCommentUrl: string | null = null;
    let postedToGithub = false;

    if (repository.pr_comments_enabled) {
      try {
        const riskEmoji =
          riskLevel === "critical"
            ? "🚨"
            : riskLevel === "high"
            ? "⚠️"
            : riskLevel === "medium"
            ? "⚡"
            : "✅";

        let issuesMarkdown = "";
        if (allFoundIssues.length > 0) {
          issuesMarkdown = `\n\n#### 🔍 Detected Code Issues (${allFoundIssues.length})\n` +
            allFoundIssues
              .slice(0, 8)
              .map(
                (i) =>
                  `- **[${i.severity.toUpperCase()}]** \`${i.filePath}:${i.lineNumber}\` — ${i.message}`
              )
              .join("\n");
          if (allFoundIssues.length > 8) {
            issuesMarkdown += `\n- *...and ${allFoundIssues.length - 8} more issues.*`;
          }
        }

        const commentBody = `### 📡 RepoRadar AI Pull Request Review\n\n` +
          `**Risk Level:** ${riskEmoji} **${riskLevel.toUpperCase()}**  \n` +
          `**Recommendation:** **${aiSummaryResult.recommendation}**\n\n` +
          `#### 📝 Summary\n${aiSummaryResult.summary}\n\n` +
          `#### 🛡️ Risk Assessment\n${aiSummaryResult.risk_assessment}` +
          issuesMarkdown +
          `\n\n---\n*Automated review generated by [RepoRadar](http://localhost:3000/dashboard/repositories/${repository.id}/pull-requests/${pr.id})*`;

        const commentResult = await postPullRequestComment(
          octokit,
          owner,
          repoName,
          pr.pr_number,
          commentBody
        );

        githubCommentUrl = commentResult.html_url;
        postedToGithub = true;

        await prisma.pullRequestReview.update({
          where: { id: createdReview.id },
          data: {
            posted_to_github: true,
            github_comment_url: githubCommentUrl,
          },
        });
      } catch (commentErr: any) {
        console.error(`Failed to post comment on PR #${pr.pr_number}:`, commentErr.message);
      }
    }

    // 6. Update PR completion status
    const updatedPr = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        review_status: "completed",
        last_reviewed_at: new Date(),
        error_message: null,
      },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { issues: true },
        },
      },
    });

    return updatedPr;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : "Review process failed";
    console.error(`PR review failed for PR ID '${pullRequestId}':`, errorMsg);

    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: {
        review_status: "failed",
        error_message: errorMsg,
      },
    });

    throw error;
  }
}

/**
 * Registers GitHub webhook for automated PR reviews and generates secret
 */
export async function enableWebhookForRepository(
  repositoryId: string,
  userId: string
): Promise<{ webhookId: number; webhookUrl: string }> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, user_id: userId },
    include: { user: true },
  });

  if (!repository) {
    throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
  }

  if (!repository.user.github_access_token) {
    throw new AppError("GitHub account not linked. Please reconnect GitHub in profile.", 400, "GITHUB_NOT_LINKED");
  }

  const decryptedToken = decryptToken(repository.user.github_access_token);
  const octokit = initializeOctokit(decryptedToken);

  const [owner, repoName] = repository.github_repo_fullname.split("/");
  if (!owner || !repoName) {
    throw new AppError("Invalid repository full name format", 400, "INVALID_REPO_NAME");
  }

  // Generate a random 32-character hex secret for webhook signature verification
  const rawWebhookSecret = crypto.randomBytes(24).toString("hex");
  const encryptedSecret = encryptToken(rawWebhookSecret);

  // Construct webhook endpoint URL
  const webhookUrl = `${config.webhookBaseUrl.replace(/\/$/, "")}/api/webhooks/github`;

  // If previous webhook exists, attempt to remove it cleanly first
  if (repository.webhook_id) {
    try {
      await deleteRepositoryWebhook(octokit, owner, repoName, repository.webhook_id);
    } catch {
      // Ignore if not found on GitHub
    }
  }

  const webhookId = await createRepositoryWebhook(
    octokit,
    owner,
    repoName,
    webhookUrl,
    rawWebhookSecret
  );

  await prisma.repository.update({
    where: { id: repository.id },
    data: {
      webhook_id: webhookId,
      webhook_secret: encryptedSecret,
    },
  });

  return { webhookId, webhookUrl };
}

/**
 * Removes registered webhook from GitHub and database
 */
export async function disableWebhookForRepository(
  repositoryId: string,
  userId: string
): Promise<void> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, user_id: userId },
    include: { user: true },
  });

  if (!repository) {
    throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
  }

  if (repository.webhook_id && repository.user.github_access_token) {
    try {
      const decryptedToken = decryptToken(repository.user.github_access_token);
      const octokit = initializeOctokit(decryptedToken);
      const [owner, repoName] = repository.github_repo_fullname.split("/");
      if (owner && repoName) {
        await deleteRepositoryWebhook(octokit, owner, repoName, repository.webhook_id);
      }
    } catch (err: any) {
      console.warn("Failed to delete webhook on GitHub:", err.message);
    }
  }

  await prisma.repository.update({
    where: { id: repository.id },
    data: {
      webhook_id: null,
      webhook_secret: null,
    },
  });
}

/**
 * Toggles whether AI reviews should be posted as comments on GitHub PRs
 */
export async function togglePRComments(
  repositoryId: string,
  enabled: boolean,
  userId: string
): Promise<boolean> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, user_id: userId },
  });

  if (!repository) {
    throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
  }

  await prisma.repository.update({
    where: { id: repositoryId },
    data: { pr_comments_enabled: enabled },
  });

  return enabled;
}

/**
 * Lists all PRs for a repository with their latest review metadata
 */
export async function listRepositoryPullRequests(
  repositoryId: string,
  userId: string
): Promise<any[]> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, user_id: userId },
  });

  if (!repository) {
    throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
  }

  const pullRequests = await prisma.pullRequest.findMany({
    where: { repository_id: repositoryId },
    orderBy: { created_at_github: "desc" },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return pullRequests.map((pr: any) => {
    const latestReview = pr.reviews[0] || null;
    return {
      id: pr.id,
      repository_id: pr.repository_id,
      github_pr_id: pr.github_pr_id,
      pr_number: pr.pr_number,
      title: pr.title,
      author_username: pr.author_username,
      status: pr.status,
      base_branch: pr.base_branch,
      head_branch: pr.head_branch,
      github_pr_url: pr.github_pr_url,
      created_at_github: pr.created_at_github,
      last_reviewed_at: pr.last_reviewed_at,
      review_status: pr.review_status,
      error_message: pr.error_message,
      latest_review: latestReview
        ? {
            id: latestReview.id,
            risk_level: latestReview.risk_level,
            summary: latestReview.summary,
            recommendation: latestReview.recommendation,
            issues_found: latestReview.issues_found,
            critical_issues_count: latestReview.critical_issues_count,
            files_changed_count: latestReview.files_changed_count,
            additions: latestReview.additions,
            deletions: latestReview.deletions,
            posted_to_github: latestReview.posted_to_github,
            github_comment_url: latestReview.github_comment_url,
            createdAt: latestReview.createdAt,
          }
        : null,
    };
  });
}

/**
 * Retrieves full PR review details and line-level issues
 */
export async function getPullRequestReviewDetails(
  pullRequestId: string,
  userId: string
): Promise<any> {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
    include: {
      repository: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          issues: {
            orderBy: [{ severity: "asc" }, { file_path: "asc" }],
          },
        },
      },
    },
  });

  if (!pr || pr.repository.user_id !== userId) {
    throw new AppError("Pull request review not found", 404, "PR_NOT_FOUND");
  }

  const latestReview = pr.reviews[0] || null;

  return {
    pullRequest: {
      id: pr.id,
      repository_id: pr.repository_id,
      github_repo_fullname: pr.repository.github_repo_fullname,
      github_pr_id: pr.github_pr_id,
      pr_number: pr.pr_number,
      title: pr.title,
      author_username: pr.author_username,
      status: pr.status,
      base_branch: pr.base_branch,
      head_branch: pr.head_branch,
      github_pr_url: pr.github_pr_url,
      created_at_github: pr.created_at_github,
      last_reviewed_at: pr.last_reviewed_at,
      review_status: pr.review_status,
      error_message: pr.error_message,
    },
    latestReview,
    allReviewsCount: pr.reviews.length,
  };
}

export default {
  parseDiffAddedLines,
  scanDiffForIssues,
  calculatePRRiskLevel,
  reviewPullRequest,
  enableWebhookForRepository,
  disableWebhookForRepository,
  togglePRComments,
  listRepositoryPullRequests,
  getPullRequestReviewDetails,
};
