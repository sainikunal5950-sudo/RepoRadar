import request from "supertest";
import app from "../../app";
import developerAnalyticsService from "../../services/developer-analytics.service";
import repositoryService from "../../services/repository.service";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../services/developer-analytics.service");
jest.mock("../../services/repository.service");

describe("Developer Analytics Routes Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryService.getRepositoryMetrics as jest.Mock).mockResolvedValue({
      id: validRepoId,
      github_repo_name: "test-repo",
    });
  });

  describe("POST /api/repositories/:id/sync-commits", () => {
    it("should successfully trigger commit syncing and return aggregation result", async () => {
      (developerAnalyticsService.syncCommitData as jest.Mock).mockResolvedValueOnce({
        commits_synced: 15,
        total_commits_in_repo: 45,
        contributors_found: 3,
        hotspots_computed: 8,
        rate_limit_remaining: 4980,
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/sync-commits`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.commits_synced).toBe(15);
      expect(res.body.data.contributors_found).toBe(3);
      expect(developerAnalyticsService.syncCommitData).toHaveBeenCalledWith(
        expect.any(String),
        validRepoId
      );
    });

    it("should return 401 Unauthorized if no token provided", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/sync-commits`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/repositories/:id/analytics/contributors", () => {
    it("should return contributor breakdown list", async () => {
      (developerAnalyticsService.getContributorStats as jest.Mock).mockResolvedValueOnce([
        {
          id: "cs1",
          author_name: "Alice Dev",
          author_email: "alice@example.com",
          total_commits: 20,
          contribution_percentage: 66.67,
        },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/contributors`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].author_name).toBe("Alice Dev");
    });
  });

  describe("GET /api/repositories/:id/analytics/activity", () => {
    it("should return commit activity timeline points", async () => {
      (developerAnalyticsService.getCommitActivityTimeline as jest.Mock).mockResolvedValueOnce([
        { date: "2026-03-01", commit_count: 5, additions: 100, deletions: 20 },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/activity?groupBy=day`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].date).toBe("2026-03-01");
      expect(developerAnalyticsService.getCommitActivityTimeline).toHaveBeenCalledWith(
        validRepoId,
        "day",
        undefined,
        undefined
      );
    });
  });

  describe("GET /api/repositories/:id/analytics/heatmap", () => {
    it("should return commit heatmap matrix", async () => {
      (developerAnalyticsService.getCommitHeatmapData as jest.Mock).mockResolvedValueOnce({
        matrix: [[0]],
        points: [{ day: 0, dayName: "Sun", hour: 0, count: 0 }],
        maxCount: 5,
        totalCommits: 20,
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/heatmap`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.maxCount).toBe(5);
    });
  });

  describe("GET /api/repositories/:id/analytics/hotspots", () => {
    it("should return file hotspots list", async () => {
      (developerAnalyticsService.getFileHotspots as jest.Mock).mockResolvedValueOnce([
        {
          file_path: "src/server.ts",
          change_count: 12,
          debt_score: 85.5,
          issue_count: 4,
          critical_issue_count: 1,
        },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/hotspots?limit=10`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].file_path).toBe("src/server.ts");
    });
  });

  describe("GET /api/repositories/:id/analytics/technical-debt", () => {
    it("should return technical debt summary risk files", async () => {
      (developerAnalyticsService.getTechnicalDebtSummary as jest.Mock).mockResolvedValueOnce([
        {
          id: "debt1",
          file_path: "src/legacy.ts",
          debt_score: 92.0,
          change_count: 25,
          risk_level: "critical",
          reason: "Modified 25 times with 4 critical issues",
        },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/technical-debt`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].risk_level).toBe("critical");
    });
  });
});
