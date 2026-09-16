import request from "supertest";
import app from "../../app";
import healthScoreService from "../../services/health-score.service";
import analyticsService from "../../services/analytics.service";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../services/health-score.service");
jest.mock("../../services/analytics.service");

describe("Repository Health & Analytics Routes Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/repositories/:id/calculate-health", () => {
    it("should trigger health score calculation and return record", async () => {
      (healthScoreService.calculateHealthScores as jest.Mock).mockResolvedValueOnce({
        id: "health-1",
        repository_id: validRepoId,
        overall_score: 92.5,
        overall_grade: "A",
        code_quality_score: 95,
        security_score: 90,
        maintainability_score: 92,
        performance_score: 94,
        total_files_analyzed: 10,
        total_lines_of_code: 500,
        calculated_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/calculate-health`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overall_score).toBe(92.5);
      expect(res.body.data.overall_grade).toBe("A");
      expect(healthScoreService.calculateHealthScores).toHaveBeenCalledWith(
        validRepoId,
        expect.any(String)
      );
    });

    it("should return 401 Unauthorized if no Bearer token is provided", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/calculate-health`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/repositories/:id/health", () => {
    it("should return the latest health record", async () => {
      (healthScoreService.getLatestHealth as jest.Mock).mockResolvedValueOnce({
        id: "health-1",
        overall_score: 88,
        overall_grade: "B",
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/health`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overall_score).toBe(88);
      expect(res.body.data.overall_grade).toBe("B");
    });
  });

  describe("GET /api/repositories/health-overview", () => {
    it("should return health overview across user repositories", async () => {
      (healthScoreService.getUserRepositoriesHealthOverview as jest.Mock).mockResolvedValueOnce({
        averageHealthScore: 85.5,
        totalCriticalIssues: 2,
        analyzedRepositoriesCount: 3,
        totalSelectedRepositories: 3,
        repositories: [],
      });

      const res = await request(app)
        .get("/api/repositories/health-overview")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.averageHealthScore).toBe(85.5);
      expect(res.body.data.totalCriticalIssues).toBe(2);
    });
  });

  describe("GET /api/repositories/:id/analytics/severity-distribution", () => {
    it("should return severity distribution for charts", async () => {
      (analyticsService.getIssueDistributionBySeverity as jest.Mock).mockResolvedValueOnce([
        { name: "Critical", value: 1, color: "#EF4444" },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analytics/severity-distribution`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
