import request from "supertest";
import app from "../../app";
import aiService from "../../services/ai.service";
import prisma from "../../lib/db";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../services/ai.service");
jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    aIUsageLog: {
      count: jest.fn(),
      create: jest.fn(),
    },
    codeIssue: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    repository: {
      findFirst: jest.fn(),
    },
    repositoryFile: {
      findFirst: jest.fn(),
    },
  },
}));

describe("AI Routes Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const validIssueId = "65d75cf9e1d84f23b890abcd";
  const validFileId = "65d75cf9e1d84f23b890abcf";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(5); // Under rate limit
  });

  describe("POST /api/ai/explain-code", () => {
    it("should return structured explanation for code snippet", async () => {
      (aiService.explainCode as jest.Mock).mockResolvedValueOnce({
        file_path: "src/auth.ts",
        purpose: "Handles user authentication token verification.",
        explanation: "Decrypts JWT payload and checks expiration.",
        key_points: ["Validates token expiration", "Verifies SHA-256 signature"],
        is_truncated: false,
      });

      const res = await request(app)
        .post("/api/ai/explain-code")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          repositoryId: validRepoId,
          filePath: "src/auth.ts",
          code: "function verifyToken(t) { return jwt.verify(t); }",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.purpose).toContain("Handles user authentication");
      expect(aiService.explainCode).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryId: validRepoId,
          filePath: "src/auth.ts",
        })
      );
    });

    it("should return 401 Unauthorized if no JWT token provided", async () => {
      const res = await request(app)
        .post("/api/ai/explain-code")
        .send({
          repositoryId: validRepoId,
          filePath: "src/auth.ts",
          code: "console.log('test')",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should return 429 when hourly quota is exceeded", async () => {
      (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(50); // At/over rate limit

      const res = await request(app)
        .post("/api/ai/explain-code")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          repositoryId: validRepoId,
          filePath: "src/auth.ts",
          code: "console.log('test')",
        })
        .expect(429);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AI_RATE_LIMIT_EXCEEDED");
    });
  });

  describe("POST /api/ai/suggest-fix", () => {
    it("should return remediated code and explanation for an issue", async () => {
      (aiService.suggestFix as jest.Mock).mockResolvedValueOnce({
        issue_id: validIssueId,
        file_path: "src/config.ts",
        line_number: 10,
        original_code: "const key = '12345';",
        fixed_code: "const key = process.env.API_KEY;",
        explanation: "Moved secret to environment variable.",
        why_it_matters: "Prevents credential leaks.",
        confidence: "high",
        cached: false,
      });

      const res = await request(app)
        .post("/api/ai/suggest-fix")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          issueId: validIssueId,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fixed_code).toBe("const key = process.env.API_KEY;");
      expect(res.body.data.cached).toBe(false);
    });
  });

  describe("POST /api/ai/explain-file", () => {
    it("should return full file architectural summary", async () => {
      (aiService.explainFile as jest.Mock).mockResolvedValueOnce({
        file_path: "src/server.ts",
        role: "Application Entrypoint",
        summary: "Initializes Express middleware and mounts API routers.",
        key_exports: ["app"],
        dependencies: ["express", "cors"],
      });

      const res = await request(app)
        .post("/api/ai/explain-file")
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          repositoryId: validRepoId,
          fileId: validFileId,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("Application Entrypoint");
    });
  });

  describe("GET /api/ai/usage", () => {
    it("should return AI usage quota and lifetime stats", async () => {
      (aiService.getAIUsageStats as jest.Mock).mockResolvedValueOnce({
        limit_per_hour: 50,
        used_last_hour: 5,
        remaining_quota: 45,
        total_lifetime_calls: 120,
        resets_at: new Date().toISOString(),
      });

      const res = await request(app)
        .get("/api/ai/usage")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.remaining_quota).toBe(45);
    });
  });

  describe("GET /api/ai/health", () => {
    it("should proxy microservice health", async () => {
      (aiService.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: "ok",
        llm_provider: "openai",
        model: "gpt-4o-mini",
        service: "reporadar-ai-service",
      });

      const res = await request(app)
        .get("/api/ai/health")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");
    });
  });
});
