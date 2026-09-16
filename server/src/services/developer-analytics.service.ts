import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { decryptToken } from "../lib/encryption";
import {
  initializeOctokit,
  fetchCommitsWithDetails,
  fetchCommitFileChanges,
  checkRateLimit,
} from "./github.service";

export interface SyncCommitResult {
  commits_synced: number;
  total_commits_in_repo: number;
  contributors_found: number;
  hotspots_computed: number;
  rate_limit_remaining: number;
}

export interface ActivityTimelinePoint {
  date: string;
  commit_count: number;
  additions: number;
  deletions: number;
}

export interface HeatmapPoint {
  day: number;
  dayName: string;
  hour: number;
  count: number;
}

export interface HeatmapDataResponse {
  matrix: number[][]; // [dayIndex 0..6][hourIndex 0..23]
  points: HeatmapPoint[];
  maxCount: number;
  totalCommits: number;
}

export interface TechnicalDebtRiskFile {
  id: string;
  file_path: string;
  debt_score: number;
  change_count: number;
  unique_authors_count: number;
  issue_count: number;
  critical_issue_count: number;
  risk_level: "critical" | "high" | "medium" | "low";
  reason: string;
  last_modified_at?: Date | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class DeveloperAnalyticsService {
  /**
   * Syncs commits and per-commit file changes incrementally from GitHub API
   */
  async syncCommitData(userId: string, repoId: string): Promise<SyncCommitResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.github_access_token) {
      throw new AppError("GitHub authentication required to sync commits", 401, "UNAUTHORIZED");
    }

    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const [owner, repoName] = repo.github_repo_fullname.split("/");
    if (!owner || !repoName) {
      throw new AppError("Invalid repository name format", 400, "INVALID_REPO");
    }

    const accessToken = decryptToken(user.github_access_token);
    const octokit = initializeOctokit(accessToken);

    // Check rate limits
    const rateLimit = await checkRateLimit(octokit);
    if (rateLimit.remaining < 30) {
      const resetTime = rateLimit.reset.toLocaleTimeString();
      throw new AppError(
        `GitHub API rate limit nearly exhausted (${rateLimit.remaining} requests remaining). Resets at ${resetTime}.`,
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }

    // Determine incremental sync starting point (since latest stored commit)
    const latestStoredCommit = await prisma.repositoryCommit.findFirst({
      where: { repository_id: repoId },
      orderBy: { committed_at: "desc" },
    });

    const since = latestStoredCommit
      ? new Date(latestStoredCommit.committed_at.getTime() + 1000)
      : undefined;

    const maxCommits = parseInt(process.env.MAX_COMMITS_TO_SYNC || "500", 10);
    const batchSize = parseInt(process.env.COMMIT_SYNC_BATCH_SIZE || "20", 10);

    // Fetch commit headers from GitHub
    const remoteCommits = await fetchCommitsWithDetails(
      octokit,
      owner,
      repoName,
      since,
      100,
      maxCommits
    );

    let syncedCount = 0;

    // Filter out commits already in database by SHA
    const existingRecords = await prisma.repositoryCommit.findMany({
      where: {
        repository_id: repoId,
        commit_sha: { in: remoteCommits.map((c) => c.commit_sha) },
      },
      select: { commit_sha: true },
    });
    const existingShas = new Set(existingRecords.map((c: { commit_sha: string }) => c.commit_sha));

    const newCommits = remoteCommits.filter((c) => !existingShas.has(c.commit_sha));

    // Process new commits in batches to fetch file diffs while respecting rate limits
    for (let i = 0; i < newCommits.length; i += batchSize) {
      const batch = newCommits.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (commitHeader) => {
          try {
            const details = await fetchCommitFileChanges(
              octokit,
              owner,
              repoName,
              commitHeader.commit_sha
            );
            return {
              header: commitHeader,
              stats: details.stats,
              files: details.files,
            };
          } catch {
            // If individual commit details fail, keep commit with 0 diffs
            return {
              header: commitHeader,
              stats: { additions: 0, deletions: 0, total: 0 },
              files: [],
            };
          }
        })
      );

      for (const item of batchResults) {
        const createdCommit = await prisma.repositoryCommit.create({
          data: {
            repository_id: repoId,
            commit_sha: item.header.commit_sha,
            author_name: item.header.author_name,
            author_email: item.header.author_email || "unknown@users.noreply.github.com",
            author_github_username: item.header.author_github_username,
            author_avatar_url: item.header.author_avatar_url,
            author: item.header.author_name,
            message: item.header.message,
            committed_at: item.header.committed_at,
            additions: item.stats.additions,
            deletions: item.stats.deletions,
            files_changed_count: item.files.length,
          },
        });

        if (item.files.length > 0) {
          await prisma.commitFileChange.createMany({
            data: item.files.map((f) => ({
              repository_id: repoId,
              commit_id: createdCommit.id,
              commit_sha: item.header.commit_sha,
              file_path: f.file_path,
              change_type: f.change_type,
              additions: f.additions,
              deletions: f.deletions,
            })),
          });
        }

        syncedCount++;
      }
    }

    // Recompute aggregates (contributors and hotspots)
    const contributorStats = await this.computeContributorStats(repoId);
    const hotspots = await this.computeFileHotspots(repoId);

    const totalCommitsInRepo = await prisma.repositoryCommit.count({
      where: { repository_id: repoId },
    });

    const refreshedRateLimit = await checkRateLimit(octokit);

    return {
      commits_synced: syncedCount,
      total_commits_in_repo: totalCommitsInRepo,
      contributors_found: contributorStats.length,
      hotspots_computed: hotspots.length,
      rate_limit_remaining: refreshedRateLimit.remaining,
    };
  }

  /**
   * Aggregates RepositoryCommit records by author_email and computes contributor metrics
   */
  async computeContributorStats(repositoryId: string) {
    const commits = await prisma.repositoryCommit.findMany({
      where: { repository_id: repositoryId },
      include: {
        fileChanges: {
          select: { file_path: true },
        },
      },
      orderBy: { committed_at: "asc" },
    });

    const totalRepoCommits = commits.length;

    if (totalRepoCommits === 0) {
      await prisma.contributorStats.deleteMany({
        where: { repository_id: repositoryId },
      });
      return [];
    }

    // Group commits by author_email (fallback to author_name if email empty)
    interface ContributorAccumulator {
      email: string;
      name: string;
      github_username?: string | null;
      avatar_url?: string | null;
      total_commits: number;
      total_additions: number;
      total_deletions: number;
      touched_files: Set<string>;
      first_commit_at?: Date;
      last_commit_at?: Date;
    }

    const contributorMap = new Map<string, ContributorAccumulator>();

    for (const c of commits) {
      const emailKey = (c.author_email || c.author_name || "unknown@users.noreply.github.com").toLowerCase().trim();

      let accum = contributorMap.get(emailKey);
      if (!accum) {
        accum = {
          email: c.author_email || emailKey,
          name: c.author_name || "Unknown Author",
          github_username: c.author_github_username,
          avatar_url: c.author_avatar_url,
          total_commits: 0,
          total_additions: 0,
          total_deletions: 0,
          touched_files: new Set<string>(),
          first_commit_at: c.committed_at,
          last_commit_at: c.committed_at,
        };
        contributorMap.set(emailKey, accum);
      }

      accum.total_commits += 1;
      accum.total_additions += c.additions;
      accum.total_deletions += c.deletions;

      if (c.author_github_username && !accum.github_username) {
        accum.github_username = c.author_github_username;
      }
      if (c.author_avatar_url && !accum.avatar_url) {
        accum.avatar_url = c.author_avatar_url;
      }
      if (c.author_name && (!accum.name || accum.name === "Unknown Author")) {
        accum.name = c.author_name;
      }

      if (!accum.first_commit_at || c.committed_at < accum.first_commit_at) {
        accum.first_commit_at = c.committed_at;
      }
      if (!accum.last_commit_at || c.committed_at > accum.last_commit_at) {
        accum.last_commit_at = c.committed_at;
      }

      for (const fc of c.fileChanges) {
        accum.touched_files.add(fc.file_path);
      }
    }

    // Clear old stats
    await prisma.contributorStats.deleteMany({
      where: { repository_id: repositoryId },
    });

    const createdStats = [];
    const now = new Date();

    for (const accum of contributorMap.values()) {
      const contributionPercentage = Number(
        ((accum.total_commits / totalRepoCommits) * 100).toFixed(2)
      );

      const stat = await prisma.contributorStats.create({
        data: {
          repository_id: repositoryId,
          author_email: accum.email,
          author_name: accum.name,
          author_github_username: accum.github_username || null,
          author_avatar_url: accum.avatar_url || null,
          total_commits: accum.total_commits,
          total_additions: accum.total_additions,
          total_deletions: accum.total_deletions,
          files_touched_count: accum.touched_files.size,
          first_commit_at: accum.first_commit_at,
          last_commit_at: accum.last_commit_at,
          contribution_percentage: contributionPercentage,
          calculated_at: now,
        },
      });
      createdStats.push(stat);
    }

    return createdStats.sort((a, b) => b.total_commits - a.total_commits);
  }

  /**
   * Aggregates file changes and joins with Module 7 CodeIssue data to compute hotspot debt scores
   */
  async computeFileHotspots(repositoryId: string) {
    const fileChanges = await prisma.commitFileChange.findMany({
      where: { repository_id: repositoryId },
      include: {
        commit: {
          select: {
            author_email: true,
            author_name: true,
            committed_at: true,
          },
        },
      },
    });

    if (fileChanges.length === 0) {
      await prisma.fileHotspot.deleteMany({
        where: { repository_id: repositoryId },
      });
      return [];
    }

    interface HotspotAccumulator {
      file_path: string;
      change_count: number;
      authors: Set<string>;
      total_additions: number;
      total_deletions: number;
      last_modified_at?: Date;
    }

    const fileMap = new Map<string, HotspotAccumulator>();

    for (const fc of fileChanges) {
      let accum = fileMap.get(fc.file_path);
      if (!accum) {
        accum = {
          file_path: fc.file_path,
          change_count: 0,
          authors: new Set<string>(),
          total_additions: 0,
          total_deletions: 0,
          last_modified_at: fc.commit.committed_at,
        };
        fileMap.set(fc.file_path, accum);
      }

      accum.change_count += 1;
      accum.total_additions += fc.additions;
      accum.total_deletions += fc.deletions;

      const authorKey = fc.commit.author_email || fc.commit.author_name || "unknown";
      accum.authors.add(authorKey);

      if (!accum.last_modified_at || fc.commit.committed_at > accum.last_modified_at) {
        accum.last_modified_at = fc.commit.committed_at;
      }
    }

    // Fetch CodeIssues (Module 7) for this repository
    const codeIssues = await prisma.codeIssue.findMany({
      where: { repository_id: repositoryId },
      select: {
        file_path: true,
        severity: true,
      },
    });

    interface IssueStats {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      weight: number;
    }

    const issuesByFile = new Map<string, IssueStats>();

    for (const issue of codeIssues) {
      let stats = issuesByFile.get(issue.file_path);
      if (!stats) {
        stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0, weight: 0 };
        issuesByFile.set(issue.file_path, stats);
      }
      stats.total += 1;
      if (issue.severity === "critical") {
        stats.critical += 1;
        stats.weight += 10;
      } else if (issue.severity === "high") {
        stats.high += 1;
        stats.weight += 5;
      } else if (issue.severity === "medium") {
        stats.medium += 1;
        stats.weight += 2;
      } else {
        stats.low += 1;
        stats.weight += 1;
      }
    }

    // Find max values for normalization
    let maxChangeCount = 1;
    let maxIssueWeight = 1;

    for (const accum of fileMap.values()) {
      if (accum.change_count > maxChangeCount) {
        maxChangeCount = accum.change_count;
      }
    }

    for (const stats of issuesByFile.values()) {
      if (stats.weight > maxIssueWeight) {
        maxIssueWeight = stats.weight;
      }
    }

    // Clear old hotspots
    await prisma.fileHotspot.deleteMany({
      where: { repository_id: repositoryId },
    });

    const createdHotspots = [];
    const now = new Date();

    for (const accum of fileMap.values()) {
      const issueStat = issuesByFile.get(accum.file_path) || {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        weight: 0,
      };

      // Calculate debt_score: (normalized_change × 50) + (normalized_issue_weight × 50)
      const normalizedChange = accum.change_count / maxChangeCount;
      const normalizedIssueWeight = issueStat.weight / maxIssueWeight;

      const debtScore = Number(
        Math.min(100, Math.max(0, (normalizedChange * 50) + (normalizedIssueWeight * 50))).toFixed(1)
      );

      const hotspot = await prisma.fileHotspot.create({
        data: {
          repository_id: repositoryId,
          file_path: accum.file_path,
          change_count: accum.change_count,
          unique_authors_count: accum.authors.size,
          total_additions: accum.total_additions,
          total_deletions: accum.total_deletions,
          issue_count: issueStat.total,
          critical_issue_count: issueStat.critical,
          debt_score: debtScore,
          last_modified_at: accum.last_modified_at,
          calculated_at: now,
        },
      });
      createdHotspots.push(hotspot);
    }

    return createdHotspots.sort((a, b) => b.debt_score - a.debt_score);
  }

  /**
   * Groups commits by day, week, or month for time-series charts
   */
  async getCommitActivityTimeline(
    repositoryId: string,
    groupBy: "day" | "week" | "month" = "day",
    from?: Date,
    to?: Date
  ): Promise<ActivityTimelinePoint[]> {
    const whereClause: {
      repository_id: string;
      committed_at?: { gte?: Date; lte?: Date };
    } = { repository_id: repositoryId };

    if (from || to) {
      whereClause.committed_at = {};
      if (from) whereClause.committed_at.gte = from;
      if (to) whereClause.committed_at.lte = to;
    }

    const commits = await prisma.repositoryCommit.findMany({
      where: whereClause,
      orderBy: { committed_at: "asc" },
    });

    if (commits.length === 0) {
      return [];
    }

    const groupMap = new Map<
      string,
      { commit_count: number; additions: number; deletions: number }
    >();

    for (const c of commits) {
      const dateObj = new Date(c.committed_at);
      let key: string;

      if (groupBy === "month") {
        const year = dateObj.getUTCFullYear();
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        key = `${year}-${month}`;
      } else if (groupBy === "week") {
        // Calculate start of week (Monday UTC)
        const day = dateObj.getUTCDay();
        const diff = dateObj.getUTCDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), diff));
        key = weekStart.toISOString().slice(0, 10);
      } else {
        // day
        key = dateObj.toISOString().slice(0, 10);
      }

      let bucket = groupMap.get(key);
      if (!bucket) {
        bucket = { commit_count: 0, additions: 0, deletions: 0 };
        groupMap.set(key, bucket);
      }

      bucket.commit_count += 1;
      bucket.additions += c.additions;
      bucket.deletions += c.deletions;
    }

    return Array.from(groupMap.entries())
      .map(([date, data]) => ({
        date,
        commit_count: data.commit_count,
        additions: data.additions,
        deletions: data.deletions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generates a 7 (days) x 24 (hours) matrix of commit counts
   */
  async getCommitHeatmapData(repositoryId: string): Promise<HeatmapDataResponse> {
    const commits = await prisma.repositoryCommit.findMany({
      where: { repository_id: repositoryId },
      select: { committed_at: true },
    });

    // 7 rows (days 0..6), 24 columns (hours 0..23)
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxCount = 0;

    for (const c of commits) {
      const d = new Date(c.committed_at);
      const day = d.getDay(); // 0 = Sun, 6 = Sat
      const hour = d.getHours(); // 0..23 (local/server)

      matrix[day][hour] += 1;
      if (matrix[day][hour] > maxCount) {
        maxCount = matrix[day][hour];
      }
    }

    const points: HeatmapPoint[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        points.push({
          day,
          dayName: DAY_NAMES[day],
          hour,
          count: matrix[day][hour],
        });
      }
    }

    return {
      matrix,
      points,
      maxCount,
      totalCommits: commits.length,
    };
  }

  /**
   * Returns ContributorStats sorted by total commits descending
   */
  async getContributorStats(repositoryId: string) {
    return await prisma.contributorStats.findMany({
      where: { repository_id: repositoryId },
      orderBy: { total_commits: "desc" },
    });
  }

  /**
   * Returns FileHotspot records sorted by debt_score descending
   */
  async getFileHotspots(repositoryId: string, limit = 20) {
    return await prisma.fileHotspot.findMany({
      where: { repository_id: repositoryId },
      orderBy: { debt_score: "desc" },
      take: limit,
    });
  }

  /**
   * Returns highest-risk technical debt files with clear human-readable explanations
   */
  async getTechnicalDebtSummary(repositoryId: string): Promise<TechnicalDebtRiskFile[]> {
    const hotspots = await prisma.fileHotspot.findMany({
      where: { repository_id: repositoryId },
      orderBy: { debt_score: "desc" },
      take: 15,
    });

    return hotspots.map((h: {
      id: string;
      file_path: string;
      debt_score: number;
      change_count: number;
      unique_authors_count: number;
      issue_count: number;
      critical_issue_count: number;
      last_modified_at: Date | null;
    }) => {

      let riskLevel: "critical" | "high" | "medium" | "low" = "low";
      if (h.debt_score >= 75 || h.critical_issue_count >= 3) {
        riskLevel = "critical";
      } else if (h.debt_score >= 50 || h.critical_issue_count >= 1 || h.issue_count >= 5) {
        riskLevel = "high";
      } else if (h.debt_score >= 25 || h.issue_count >= 2) {
        riskLevel = "medium";
      }

      const authorsPart = `${h.unique_authors_count} ${h.unique_authors_count === 1 ? "author" : "authors"}`;
      const changePart = `Modified ${h.change_count} ${h.change_count === 1 ? "time" : "times"}`;
      let issuePart = "no static code issues detected";

      if (h.issue_count > 0) {
        if (h.critical_issue_count > 0) {
          issuePart = `${h.issue_count} issues (${h.critical_issue_count} critical)`;
        } else {
          issuePart = `${h.issue_count} issues`;
        }
      }

      const reason = `${changePart} by ${authorsPart} with ${issuePart}. High churn combined with open issues elevates regression risk.`;

      return {
        id: h.id,
        file_path: h.file_path,
        debt_score: h.debt_score,
        change_count: h.change_count,
        unique_authors_count: h.unique_authors_count,
        issue_count: h.issue_count,
        critical_issue_count: h.critical_issue_count,
        risk_level: riskLevel,
        reason,
        last_modified_at: h.last_modified_at,
      };
    });
  }
}

export const developerAnalyticsService = new DeveloperAnalyticsService();
export default developerAnalyticsService;
