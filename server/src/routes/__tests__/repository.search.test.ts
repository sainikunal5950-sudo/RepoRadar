import request from "supertest";
import app from "../../app";
import embeddingIndexingService from "../../services/embedding-indexing.service";
import vectorSearchService from "../../services/vector-search.service";
import { generateTestJWT } from "../../../tests/fixtures/test-data";

jest.mock("../../services/embedding-indexing.service");
jest.mock("../../services/vector-search.service");

describe("Repository Code Search & Indexing Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/repositories/:id/index-code", () => {
    it("should accept indexing request and return 202 Accepted with processing status", async () => {
      (embeddingIndexingService.triggerRepositoryIndexing as jest.Mock).mockResolvedValueOnce({
        message: "Repository code indexing initiated successfully",
        indexing_status: "processing",
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/index-code`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(202);

      expect(res.body.success).toBe(true);
      expect(res.body.data.indexing_status).toBe("processing");
      expect(embeddingIndexingService.triggerRepositoryIndexing).toHaveBeenCalled();
    });

    it("should return 401 Unauthorized if no Bearer token provided", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/index-code`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/repositories/:id/index-status", () => {
    it("should return current indexing status and total indexed chunks", async () => {
      (embeddingIndexingService.getIndexingStatus as jest.Mock).mockResolvedValueOnce({
        indexing_status: "completed",
        total_chunks_indexed: 58,
        last_indexed_at: new Date("2026-09-17T12:00:00Z"),
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/index-status`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.indexing_status).toBe("completed");
      expect(res.body.data.total_chunks_indexed).toBe(58);
    });
  });

  describe("POST /api/repositories/:id/search-code", () => {
    it("should return ranked semantic search results with scores and line ranges", async () => {
      (vectorSearchService.searchCode as jest.Mock).mockResolvedValueOnce({
        query: "jwt authentication verify",
        total_results: 2,
        search_mode: "atlas_vector_search",
        results: [
          {
            id: "emb1",
            file_path: "src/middleware/auth.ts",
            start_line: 12,
            end_line: 35,
            chunk_text: "export function authMiddleware(req, res, next) { ... }",
            chunk_type: "function",
            chunk_label: "function authMiddleware",
            language: "typescript",
            score: 0.96,
          },
          {
            id: "emb2",
            file_path: "src/lib/jwt.ts",
            start_line: 1,
            end_line: 20,
            chunk_text: "export function verifyToken(token: string) { ... }",
            chunk_type: "function",
            chunk_label: "function verifyToken",
            language: "typescript",
            score: 0.89,
          },
        ],
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/search-code`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ query: "jwt authentication verify", limit: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total_results).toBe(2);
      expect(res.body.data.results[0].file_path).toBe("src/middleware/auth.ts");
      expect(res.body.data.results[0].score).toBe(0.96);
      expect(res.body.data.results[1].score).toBe(0.89);
    });

    it("should validate query body and reject empty query", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/search-code`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ query: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
