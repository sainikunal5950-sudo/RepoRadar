import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { decryptToken } from "../lib/encryption";
import {
  initializeOctokit,
  fetchUserRepositories,
  fetchRepositoryMetrics,
  fetchRepositoryLanguages,
  fetchRepositoryCommits,
} from "./github.service";

export class RepositoryService {
  /**
   * Helper to resolve an authenticated Octokit instance for a given user
   */
  private async getAuthenticatedOctokit(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    if (!user.github_access_token) {
      throw new AppError(
        "GitHub account not connected. Please log in with GitHub to enable repository syncing.",
        400,
        "GITHUB_NOT_LINKED"
      );
    }

    let decryptedToken: string;
    try {
      decryptedToken = decryptToken(user.github_access_token);
    } catch {
      throw new AppError(
        "Failed to decrypt GitHub token. Please reconnect your GitHub account.",
        500,
        "DECRYPTION_ERROR"
      );
    }

    return initializeOctokit(decryptedToken);
  }

  /**
   * Syncs repositories list from GitHub for the authenticated user
   */
  async syncUserRepositories(userId: string) {
    const octokit = await this.getAuthenticatedOctokit(userId);

    try {
      const githubRepos = await fetchUserRepositories(octokit);
      const now = new Date();

      for (const repo of githubRepos) {
        const existingRepo = await prisma.repository.findUnique({
          where: { github_repo_id: repo.github_repo_id },
        });

        if (existingRepo) {
          await prisma.repository.update({
            where: { id: existingRepo.id },
            data: {
              user_id: userId,
              github_repo_name: repo.github_repo_name,
              github_repo_fullname: repo.github_repo_fullname,
              github_repo_url: repo.github_repo_url,
              description: repo.description,
              stars: repo.stars,
              language: repo.language,
              last_synced_at: now,
            },
          });
        } else {
          await prisma.repository.create({
            data: {
              user_id: userId,
              github_repo_id: repo.github_repo_id,
              github_repo_name: repo.github_repo_name,
              github_repo_fullname: repo.github_repo_fullname,
              github_repo_url: repo.github_repo_url,
              description: repo.description,
              stars: repo.stars,
              language: repo.language,
              is_selected: false,
              last_synced_at: now,
            },
          });
        }
      }

      return await this.getUserRepositories(userId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "GitHub API request failed";
      if (typeof errorMsg === "string" && (errorMsg.includes("Bad credentials") || errorMsg.includes("401"))) {
        throw new AppError(
          "GitHub access token expired or revoked. Please sign in with GitHub again.",
          401,
          "GITHUB_TOKEN_EXPIRED"
        );
      }
      throw new AppError(`GitHub Sync Failed: ${errorMsg}`, 500, "GITHUB_SYNC_ERROR");
    }
  }

  /**
   * Fetches detailed telemetry from GitHub (metrics, language breakdown, recent commits) and stores in MongoDB
   */
  async fetchAndStoreRepositoryDetails(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const octokit = await this.getAuthenticatedOctokit(userId);

    // Split fullname into owner/repo
    const [owner, repoName] = repo.github_repo_fullname.split("/");
    if (!owner || !repoName) {
      throw new AppError("Invalid repository fullname format", 400, "INVALID_REPO_NAME");
    }

    try {
      // Parallelize calls to GitHub API
      const [metricsData, languagesData, commitsData] = await Promise.all([
        fetchRepositoryMetrics(octokit, owner, repoName),
        fetchRepositoryLanguages(octokit, owner, repoName),
        fetchRepositoryCommits(octokit, owner, repoName, 100),
      ]);

      const now = new Date();

      // 1. Upsert RepositoryMetrics
      await prisma.repositoryMetrics.upsert({
        where: { repository_id: repoId },
        update: {
          stars_count: metricsData.stars_count,
          forks_count: metricsData.forks_count,
          open_issues_count: metricsData.open_issues_count,
          open_prs_count: metricsData.open_prs_count,
          default_branch: metricsData.default_branch,
          total_commits: metricsData.total_commits || commitsData.length,
          last_commit_date: metricsData.last_commit_date,
        },
        create: {
          repository_id: repoId,
          stars_count: metricsData.stars_count,
          forks_count: metricsData.forks_count,
          open_issues_count: metricsData.open_issues_count,
          open_prs_count: metricsData.open_prs_count,
          default_branch: metricsData.default_branch,
          total_commits: metricsData.total_commits || commitsData.length,
          last_commit_date: metricsData.last_commit_date,
        },
      });

      // 2. Replace RepositoryLanguage records
      await prisma.repositoryLanguage.deleteMany({
        where: { repository_id: repoId },
      });

      if (languagesData.length > 0) {
        await prisma.repositoryLanguage.createMany({
          data: languagesData.map((l) => ({
            repository_id: repoId,
            language: l.language,
            bytes: l.bytes,
            percentage: l.percentage,
          })),
        });
      }

      // 3. Store RepositoryCommit records
      for (const c of commitsData) {
        const existingCommit = await prisma.repositoryCommit.findFirst({
          where: { repository_id: repoId, commit_sha: c.commit_sha },
        });

        if (!existingCommit) {
          await prisma.repositoryCommit.create({
            data: {
              repository_id: repoId,
              commit_sha: c.commit_sha,
              author: c.author,
              message: c.message,
              committed_at: c.committed_at,
            },
          });
        }
      }

      // 4. Update parent repository with refreshed stars, primary language, and sync timestamp
      const primaryLanguage = languagesData.length > 0 ? languagesData[0].language : repo.language;
      await prisma.repository.update({
        where: { id: repoId },
        data: {
          stars: metricsData.stars_count,
          language: primaryLanguage,
          last_synced_at: now,
        },
      });

      // Return complete detailed repository
      return await this.getRepositoryMetrics(userId, repoId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "GitHub API request failed";
      throw new AppError(`Failed to fetch GitHub repository details: ${errorMsg}`, 500, "GITHUB_DETAILS_ERROR");
    }
  }

  /**
   * Retrieves single repository with its metrics, languages, and latest 20 commits
   */
  async getRepositoryMetrics(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
      include: {
        metrics: true,
        languages: {
          orderBy: { bytes: "desc" },
        },
        commits: {
          orderBy: { committed_at: "desc" },
          take: 20,
        },
      },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    return repo;
  }

  /**
   * Retrieves paginated commits for a repository
   */
  async getRepositoryCommits(userId: string, repoId: string, page = 1, limit = 20) {
    // Validate repository access
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const skip = (page - 1) * limit;

    const [commits, total] = await Promise.all([
      prisma.repositoryCommit.findMany({
        where: { repository_id: repoId },
        orderBy: { committed_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.repositoryCommit.count({
        where: { repository_id: repoId },
      }),
    ]);

    return {
      commits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves repositories for the user, with nested metrics and languages included
   */
  async getUserRepositories(userId: string, isSelected?: boolean) {
    const repos = await prisma.repository.findMany({
      where: {
        user_id: userId,
        ...(isSelected !== undefined ? { is_selected: isSelected } : {}),
      },
      include: {
        metrics: true,
        languages: {
          orderBy: { bytes: "desc" },
        },
      },
      orderBy: [
        { is_selected: "desc" },
        { stars: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return repos;
  }

  /**
   * Toggles the is_selected state of a repository
   */
  async toggleRepositorySelection(userId: string, repoId: string, isSelected: boolean) {
    const repo = await prisma.repository.findFirst({
      where: {
        id: repoId,
        user_id: userId,
      },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const updatedRepo = await prisma.repository.update({
      where: { id: repoId },
      data: { is_selected: isSelected },
      include: {
        metrics: true,
        languages: true,
      },
    });

    return updatedRepo;
  }
}

export const repositoryService = new RepositoryService();
export default repositoryService;
