import {
  initializeOctokit,
  fetchUserRepositories,
  fetchRepositoryMetrics,
  fetchRepositoryLanguages,
  fetchRepositoryCommits,
  fetchRepositoryGitTree,
  fetchFileContent,
} from "../github.service";
import { Octokit } from "@octokit/rest";

describe("GitHub Service Unit Tests", () => {
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn(),
          get: jest.fn(),
          listLanguages: jest.fn(),
          listCommits: jest.fn(),
          getContent: jest.fn(),
        },
        search: {
          issuesAndPullRequests: jest.fn(),
        },
        git: {
          getTree: jest.fn(),
        },
        pulls: {
          list: jest.fn(),
        },
      },
    };
  });

  describe("initializeOctokit", () => {
    it("should instantiate Octokit with provided access token", () => {
      const client = initializeOctokit("gho_test_token_123");
      expect(Octokit).toBeDefined();
      expect(client).toBeDefined();
    });
  });

  describe("fetchUserRepositories", () => {
    it("should map GitHub repos response to clean repo item array", async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValueOnce({
        data: [
          {
            id: 12345,
            name: "reporadar",
            full_name: "testdev/reporadar",
            html_url: "https://github.com/testdev/reporadar",
            description: "Test repo",
            stargazers_count: 5,
            language: "TypeScript",
          },
        ],
      });

      const result = await fetchUserRepositories(mockOctokit);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        github_repo_id: 12345,
        github_repo_name: "reporadar",
        github_repo_fullname: "testdev/reporadar",
        github_repo_url: "https://github.com/testdev/reporadar",
        description: "Test repo",
        stars: 5,
        language: "TypeScript",
      });
    });
  });

  describe("fetchRepositoryMetrics", () => {
    it("should fetch stars, forks, issues, and search PR count", async () => {
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: {
          stargazers_count: 42,
          forks_count: 7,
          open_issues_count: 3,
          default_branch: "main",
        },
      });

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: { total_count: 2 },
      });

      mockOctokit.rest.repos.listCommits.mockResolvedValueOnce({
        data: [
          {
            commit: {
              author: { date: "2026-08-24T12:00:00Z" },
            },
          },
        ],
      });

      const metrics = await fetchRepositoryMetrics(mockOctokit, "testdev", "reporadar");

      expect(metrics.stars_count).toBe(42);
      expect(metrics.forks_count).toBe(7);
      expect(metrics.open_prs_count).toBe(2);
      expect(metrics.default_branch).toBe("main");
      expect(metrics.last_commit_date).toEqual(new Date("2026-08-24T12:00:00Z"));
    });
  });

  describe("fetchRepositoryLanguages", () => {
    it("should compute accurate percentage weights from byte counts", async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValueOnce({
        data: {
          TypeScript: 8000,
          JavaScript: 2000,
        },
      });

      const languages = await fetchRepositoryLanguages(mockOctokit, "testdev", "reporadar");
      expect(languages).toHaveLength(2);
      expect(languages[0]).toEqual({
        language: "TypeScript",
        bytes: 8000,
        percentage: 80,
      });
      expect(languages[1]).toEqual({
        language: "JavaScript",
        bytes: 2000,
        percentage: 20,
      });
    });

    it("should return empty array if total bytes is 0", async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValueOnce({
        data: {},
      });

      const languages = await fetchRepositoryLanguages(mockOctokit, "testdev", "empty-repo");
      expect(languages).toEqual([]);
    });
  });

  describe("fetchRepositoryGitTree", () => {
    it("should call Git Trees API recursively", async () => {
      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: "src", type: "tree", mode: "040000", sha: "sha_src" },
            { path: "src/index.ts", type: "blob", mode: "100644", sha: "sha_file", size: 100 },
          ],
        },
      });

      const tree = await fetchRepositoryGitTree(mockOctokit, "testdev", "reporadar", "main");
      expect(tree).toHaveLength(2);
      expect(tree[1].path).toBe("src/index.ts");
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: "testdev",
        repo: "reporadar",
        tree_sha: "main",
        recursive: "true",
      });
    });
  });

  describe("fetchFileContent", () => {
    it("should decode base64 file content properly", async () => {
      const sampleCode = "export const health = () => 'ok';";
      const base64Code = Buffer.from(sampleCode).toString("base64");

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: {
          type: "file",
          encoding: "base64",
          size: sampleCode.length,
          content: base64Code,
        },
      });

      const fileData = await fetchFileContent(mockOctokit, "testdev", "reporadar", "src/health.ts");
      expect(fileData.content).toBe(sampleCode);
      expect(fileData.size).toBe(sampleCode.length);
    });

    it("should throw a clean error if file content fetch fails", async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce(new Error("File Not Found 404"));

      await expect(
        fetchFileContent(mockOctokit, "testdev", "reporadar", "src/non-existent.ts")
      ).rejects.toThrow("File fetch failed for 'src/non-existent.ts': File Not Found 404");
    });
  });
});
