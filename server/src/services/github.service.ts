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

export interface GitHubRepoMetricsData {
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  open_prs_count: number;
  default_branch: string;
  total_commits: number;
  last_commit_date: Date | null;
}

export interface GitHubLanguageData {
  language: string;
  bytes: number;
  percentage: number;
}

export interface GitHubCommitData {
  commit_sha: string;
  author: string;
  message: string;
  committed_at: Date;
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

/**
 * Fetches core metrics for a specific repository (stars, forks, issues, PRs, default branch)
 */
export async function fetchRepositoryMetrics(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GitHubRepoMetricsData> {
  const repoDetails = await octokit.rest.repos.get({
    owner,
    repo,
  });

  // Fetch open Pull Requests count
  let openPrsCount = 0;
  try {
    const prSearch = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:pr is:open`,
      per_page: 1,
    });
    openPrsCount = prSearch.data.total_count;
  } catch {
    // Fallback: list open PRs
    const prList = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    openPrsCount = prList.data.length;
  }

  // Fetch latest commit for date and commit count estimation
  let lastCommitDate: Date | null = null;
  let totalCommits = 0;
  try {
    const commitsRes = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });
    if (commitsRes.data.length > 0) {
      const latest = commitsRes.data[0];
      const dateStr = latest.commit.author?.date || latest.commit.committer?.date;
      lastCommitDate = dateStr ? new Date(dateStr) : null;
    }
  } catch {
    lastCommitDate = null;
  }

  return {
    stars_count: repoDetails.data.stargazers_count,
    forks_count: repoDetails.data.forks_count,
    open_issues_count: repoDetails.data.open_issues_count,
    open_prs_count: openPrsCount,
    default_branch: repoDetails.data.default_branch || "main",
    total_commits: totalCommits,
    last_commit_date: lastCommitDate,
  };
}

/**
 * Fetches programming language breakdown and calculates percentages
 */
export async function fetchRepositoryLanguages(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GitHubLanguageData[]> {
  const langRes = await octokit.rest.repos.listLanguages({
    owner,
    repo,
  });

  const languageMap = langRes.data as Record<string, number>;
  const totalBytes = Object.values(languageMap).reduce((acc, bytes) => acc + bytes, 0);

  if (totalBytes === 0) {
    return [];
  }

  return Object.entries(languageMap).map(([language, bytes]) => ({
    language,
    bytes,
    percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
  })).sort((a, b) => b.bytes - a.bytes);
}

/**
 * Fetches recent commit history for a repository
 */
export async function fetchRepositoryCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit = 100
): Promise<GitHubCommitData[]> {
  const commitsRes = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: limit,
  });

  return commitsRes.data.map((item) => {
    const dateStr = item.commit.author?.date || item.commit.committer?.date || new Date().toISOString();
    return {
      commit_sha: item.sha,
      author: item.commit.author?.name || item.author?.login || "Unknown Author",
      message: item.commit.message,
      committed_at: new Date(dateStr),
    };
  });
}

export default {
  initializeOctokit,
  fetchUserRepositories,
  fetchRepositoryMetrics,
  fetchRepositoryLanguages,
  fetchRepositoryCommits,
};
