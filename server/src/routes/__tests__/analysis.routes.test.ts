import request from "supertest";
import app from "../../app";
import codeAnalysisService from "../../services/code-analysis.service";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../services/code-analysis.service");

describe("Repository Analysis Routes Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const validFileId = "65d75cf9e1d84f23b890abcf";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/repositories/:id/analyze-code", () => {
    it("should successfully trigger code analysis and return summary", async () => {
      (codeAnalysisService.analyzeRepository as jest.Mock).mockResolvedValueOnce({
        totalIssues: 4,
        summary: {
          id: "65d75cf9e1d84f23b890abcd",
          repository_id: validRepoId,
          total_issues: 4,
          critical_count: 1,
          high_count: 1,
          medium_count: 1,
          low_count: 1,
          security_issues_count: 1,
          performance_issues_count: 1,
          bug_issues_count: 1,
          code_smell_count: 1,
          maintainability_count: 0,
          analysis_completed_at: new Date().toISOString(),
        },
        issues: [],
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/analyze-code`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIssues).toBe(4);
      expect(res.body.data.summary.critical_count).toBe(1);
      expect(codeAnalysisService.analyzeRepository).toHaveBeenCalledWith(validRepoId, expect.any(String));
    });

    it("should return 401 Unauthorized if no Bearer token is provided", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/analyze-code`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 Bad Request if repository ID is invalid ObjectId", async () => {
      const res = await request(app)
        .post("/api/repositories/invalid-id/analyze-code")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/repositories/:id/analysis-summary", () => {
    it("should return the stored analysis summary", async () => {
      (codeAnalysisService.getAnalysisSummary as jest.Mock).mockResolvedValueOnce({
        id: "65d75cf9e1d84f23b890abcd",
        repository_id: validRepoId,
        total_issues: 12,
        critical_count: 2,
        high_count: 4,
        medium_count: 5,
        low_count: 1,
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analysis-summary`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total_issues).toBe(12);
      expect(res.body.data.critical_count).toBe(2);
    });
  });

  describe("GET /api/repositories/:id/analysis-results", () => {
    it("should return paginated and filtered issue results", async () => {
      (codeAnalysisService.getAnalysisIssues as jest.Mock).mockResolvedValueOnce({
        issues: [
          {
            id: "65d75cf9e1d84f23b890abd1",
            repository_id: validRepoId,
            file_path: "src/app.ts",
            line_number: 14,
            issue_type: "security",
            severity: "critical",
            message: "Hardcoded secret detected",
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analysis-results?severity=critical&issueType=security`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.issues).toHaveLength(1);
      expect(res.body.data.totalCount).toBe(1);
    });
  });

  describe("GET /api/repositories/:id/analysis-results/:fileId", () => {
    it("should return issues for a specific file", async () => {
      (codeAnalysisService.getFileAnalysisIssues as jest.Mock).mockResolvedValueOnce([
        {
          id: "65d75cf9e1d84f23b890abd2",
          file_path: "src/config.ts",
          line_number: 5,
          issue_type: "bug",
          severity: "medium",
          message: "Unused variable",
        },
      ]);

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/analysis-results/${validFileId}`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
