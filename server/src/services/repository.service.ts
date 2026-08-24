import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { decryptToken } from "../lib/encryption";
import { initializeOctokit, fetchUserRepositories } from "./github.service";

export class RepositoryService {
  /**
   * Syncs repositories from GitHub for the authenticated user using their encrypted access token
   */
  async syncUserRepositories(userId: string) {
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

    try {
      const octokit = initializeOctokit(decryptedToken);
      const githubRepos = await fetchUserRepositories(octokit);

      const now = new Date();

      // Process each repo in database
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

      // Return all current repositories for the user
      return await this.getUserRepositories(userId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "GitHub API request failed";
      // Handle expired or revoked GitHub token
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
   * Retrieves repositories for the user, with optional filter by selection state
   */
  async getUserRepositories(userId: string, isSelected?: boolean) {
    const repos = await prisma.repository.findMany({
      where: {
        user_id: userId,
        ...(isSelected !== undefined ? { is_selected: isSelected } : {}),
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
    });

    return updatedRepo;
  }
}

export const repositoryService = new RepositoryService();
export default repositoryService;
