import { Octokit } from "@octokit/rest";

export interface GitHubRepoItem {
  github_repo_id: number;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  description: string | null;
  stars: number;
  language: string | null;
}

/**
 * Initializes an authenticated Octokit instance with the decrypted user OAuth token
 */
export function initializeOctokit(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Fetches all repositories the authenticated user has access to (owned, collaborated, org)
 */
export async function fetchUserRepositories(octokit: Octokit): Promise<GitHubRepoItem[]> {
  const reposResponse = await octokit.rest.repos.listForAuthenticatedUser({
    visibility: "all",
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    per_page: 100,
  });

  return reposResponse.data.map((repo) => ({
    github_repo_id: repo.id,
    github_repo_name: repo.name,
    github_repo_fullname: repo.full_name,
    github_repo_url: repo.html_url,
    description: repo.description || null,
    stars: repo.stargazers_count || 0,
    language: repo.language || null,
  }));
}

export default {
  initializeOctokit,
  fetchUserRepositories,
};
