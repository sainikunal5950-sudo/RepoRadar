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

export interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url?: string;
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

export interface ExtendedGitHubCommitData {
  commit_sha: string;
  author_name: string;
  author_email: string;
  author_github_username?: string;
  author_avatar_url?: string;
  message: string;
  committed_at: Date;
  additions: number;
  deletions: number;
  files_changed_count: number;
}

export interface GitHubCommitFileChangeData {
  file_path: string;
  change_type: string;
  additions: number;
  deletions: number;
}

export interface GitHubCommitDetailsResponse {
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: GitHubCommitFileChangeData[];
}

/**
 * Checks remaining GitHub API rate limits
 */
export async function checkRateLimit(octokit: Octokit): Promise<{ limit: number; remaining: number; reset: Date }> {
  try {
    const rateLimit = await octokit.rest.rateLimit.get();
    return {
      limit: rateLimit.data.rate.limit,
      remaining: rateLimit.data.rate.remaining,
      reset: new Date(rateLimit.data.rate.reset * 1000),
    };
  } catch {
    return { limit: 5000, remaining: 5000, reset: new Date(Date.now() + 3600000) };
  }
}

/**
 * Fetches commits with pagination and author info (up to maxCommits)
 */
export async function fetchCommitsWithDetails(
  octokit: Octokit,
  owner: string,
  repo: string,
  since?: Date | string,
  perPage = 100,
  maxCommits = 500
): Promise<ExtendedGitHubCommitData[]> {
  const allCommits: ExtendedGitHubCommitData[] = [];
  let page = 1;
  const pageLimit = Math.min(perPage, 100);

  while (allCommits.length < maxCommits) {
    const params: {
      owner: string;
      repo: string;
      per_page: number;
      page: number;
      since?: string;
    } = {
      owner,
      repo,
      per_page: pageLimit,
      page,
    };

    if (since) {
      params.since = new Date(since).toISOString();
    }

    const response = await octokit.rest.repos.listCommits(params);
    const commits = response.data;

    if (!commits || commits.length === 0) {
      break;
    }

    for (const item of commits) {
      if (allCommits.length >= maxCommits) break;

      const dateStr = item.commit.author?.date || item.commit.committer?.date || new Date().toISOString();
      const authorName = item.commit.author?.name || item.author?.login || "Unknown Author";
      const authorEmail = item.commit.author?.email || "";
      const authorGithubUsername = item.author?.login;
      const authorAvatarUrl = item.author?.avatar_url;

      allCommits.push({
        commit_sha: item.sha,
        author_name: authorName,
        author_email: authorEmail,
        author_github_username: authorGithubUsername,
        author_avatar_url: authorAvatarUrl,
        message: item.commit.message || "",
        committed_at: new Date(dateStr),
        additions: 0,
        deletions: 0,
        files_changed_count: 0,
      });
    }

    if (commits.length < pageLimit) {
      break;
    }
    page++;
  }

  return allCommits;
}

/**
 * Fetches per-commit file changes and diff statistics from GitHub
 */
export async function fetchCommitFileChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  commitSha: string
): Promise<GitHubCommitDetailsResponse> {
  try {
    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    const stats = {
      additions: response.data.stats?.additions || 0,
      deletions: response.data.stats?.deletions || 0,
      total: response.data.stats?.total || 0,
    };

    const files: GitHubCommitFileChangeData[] = (response.data.files || []).map((f) => {
      let changeType = "modified";
      if (f.status === "added") changeType = "added";
      else if (f.status === "removed") changeType = "removed";
      else if (f.status === "renamed") changeType = "renamed";

      return {
        file_path: f.filename,
        change_type: changeType,
        additions: f.additions || 0,
        deletions: f.deletions || 0,
      };
    });

    return { stats, files };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch commit file changes";
    throw new Error(`Commit detail fetch failed for '${commitSha}': ${errorMsg}`);
  }
}

/**
 * Fetches full recursive git tree using GitHub Git Database Tree API
 */
export async function fetchRepositoryGitTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  treeSha = "HEAD"
): Promise<GitTreeItem[]> {
  const response = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "true",
  });

  return (response.data.tree as GitTreeItem[]) || [];
}

/**
 * Fetches content of a specific file blob from GitHub
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{ content: string | null; size: number; encoding?: string }> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    });

    if (Array.isArray(response.data)) {
      return { content: null, size: 0 };
    }

    if ("content" in response.data && response.data.content) {
      if (response.data.encoding === "base64") {
        const decoded = Buffer.from(response.data.content, "base64").toString("utf-8");
        return { content: decoded, size: response.data.size, encoding: "utf-8" };
      }
      return { content: response.data.content, size: response.data.size, encoding: response.data.encoding };
    }

    return { content: null, size: (response.data as { size?: number }).size || 0 };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to fetch file";
    throw new Error(`File fetch failed for '${path}': ${errorMsg}`);
  }
}

export default {
  initializeOctokit,
  fetchUserRepositories,
  fetchRepositoryMetrics,
  fetchRepositoryLanguages,
  fetchRepositoryCommits,
  fetchCommitsWithDetails,
  fetchCommitFileChanges,
  checkRateLimit,
  fetchRepositoryGitTree,
  fetchFileContent,
};

