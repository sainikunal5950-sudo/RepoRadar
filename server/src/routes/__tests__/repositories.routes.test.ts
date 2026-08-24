import request from "supertest";
import app from "../../app";
import codeFetchService from "../../services/code-fetch.service";
import { generateTestJWT, mockRepository } from "../../../tests/fixtures/test-data";

jest.mock("../../services/code-fetch.service");

describe("Repository Routes Integration Tests", () => {
  const validRepoId = "65d75cf9e1d84f23b890abce";
  const validFileId = "65d75cf9e1d84f23b890abcf";
  const testToken = generateTestJWT();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/repositories/:id/fetch-code", () => {
    it("should successfully trigger code fetch and return tree summary", async () => {
      (codeFetchService.fetchAndIndexRepositoryCode as jest.Mock).mockResolvedValueOnce({
        total_files: 10,
        indexed_files: 8,
        skipped_files: 2,
        total_dirs: 2,
        tree: [{ name: "src", type: "folder", children: [] }],
      });

      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/fetch-code`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.indexed_files).toBe(8);
      expect(res.body.data.total_dirs).toBe(2);
      expect(codeFetchService.fetchAndIndexRepositoryCode).toHaveBeenCalled();
    });

    it("should return 401 Unauthorized if no Bearer token is provided", async () => {
      const res = await request(app)
        .post(`/api/repositories/${validRepoId}/fetch-code`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 Bad Request if repository ID is invalid ObjectId", async () => {
      const res = await request(app)
        .post("/api/repositories/invalid-id/fetch-code")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/repositories/:id/files/tree", () => {
    it("should return the stored hierarchical file tree", async () => {
      (codeFetchService.getRepositoryFileTree as jest.Mock).mockResolvedValueOnce({
        tree: [{ name: "src", path: "src", type: "folder", children: [] }],
        total_files: 5,
        total_dirs: 1,
        updated_at: new Date("2026-08-24T12:00:00Z"),
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/files/tree`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total_files).toBe(5);
      expect(res.body.data.tree).toHaveLength(1);
    });
  });

  describe("GET /api/repositories/:id/files", () => {
    it("should return paginated file list with query params", async () => {
      (codeFetchService.getRepositoryFiles as jest.Mock).mockResolvedValueOnce({
        files: [
          {
            id: validFileId,
            file_path: "src/app.ts",
            file_type: "ts",
            file_size: 512,
            language: "typescript",
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/files?page=1&limit=10&language=typescript`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.files).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
      expect(codeFetchService.getRepositoryFiles).toHaveBeenCalledWith(
        expect.any(String),
        validRepoId,
        expect.objectContaining({ page: 1, limit: 10, language: "typescript" })
      );
    });
  });

  describe("GET /api/repositories/:id/files/:fileId", () => {
    it("should return single file content", async () => {
      (codeFetchService.getRepositoryFileContent as jest.Mock).mockResolvedValueOnce({
        id: validFileId,
        repository_id: validRepoId,
        file_path: "src/app.ts",
        file_type: "ts",
        file_size: 512,
        language: "typescript",
        content: "export const app = 'test';",
        is_binary: false,
      });

      const res = await request(app)
        .get(`/api/repositories/${validRepoId}/files/${validFileId}`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe("export const app = 'test';");
      expect(res.body.data.file_path).toBe("src/app.ts");
    });
  });
});
