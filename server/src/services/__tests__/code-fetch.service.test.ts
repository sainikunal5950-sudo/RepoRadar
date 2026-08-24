import {
  shouldIgnorePath,
  detectLanguageAndBinary,
  buildNestedTree,
  codeFetchService,
} from "../code-fetch.service";
import prisma from "../../lib/db";
import * as encryption from "../../lib/encryption";
import * as githubService from "../github.service";
import { mockUser, mockRepository, mockGitTree } from "../../../tests/fixtures/test-data";

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    repositoryFile: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    repositoryFileTree: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../../lib/encryption");
jest.mock("../github.service");

describe("Code Fetch Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("shouldIgnorePath Helper", () => {
    it("should ignore node_modules, .git, and build directories", () => {
      expect(shouldIgnorePath("node_modules/express/index.js")).toBe(true);
      expect(shouldIgnorePath(".git/config")).toBe(true);
      expect(shouldIgnorePath(".next/static/chunks/app.js")).toBe(true);
      expect(shouldIgnorePath("dist/bundle.js")).toBe(true);
      expect(shouldIgnorePath("package-lock.json")).toBe(true);
      expect(shouldIgnorePath("yarn.lock")).toBe(true);
    });

    it("should allow valid source code paths", () => {
      expect(shouldIgnorePath("src/index.ts")).toBe(false);
      expect(shouldIgnorePath("src/components/Button.tsx")).toBe(false);
      expect(shouldIgnorePath("package.json")).toBe(false);
      expect(shouldIgnorePath("README.md")).toBe(false);
    });
  });

  describe("detectLanguageAndBinary Helper", () => {
    it("should identify TypeScript, Python, JSON, and binary files accurately", () => {
      expect(detectLanguageAndBinary("src/app.ts")).toEqual({
        language: "typescript",
        extension: "ts",
        isBinary: false,
      });

      expect(detectLanguageAndBinary("main.py")).toEqual({
        language: "python",
        extension: "py",
        isBinary: false,
      });

      expect(detectLanguageAndBinary("config.json")).toEqual({
        language: "json",
        extension: "json",
        isBinary: false,
      });

      expect(detectLanguageAndBinary("logo.png")).toEqual({
        language: "binary",
        extension: "png",
        isBinary: true,
      });
    });
  });

  describe("buildNestedTree Helper", () => {
    it("should construct a nested hierarchical tree from a flat list", () => {
      const flatItems = [
        { path: "src", type: "folder" as const },
        { path: "src/utils", type: "folder" as const },
        { path: "src/utils/math.ts", type: "file" as const, size: 120, file_type: "ts", language: "typescript" },
        { path: "package.json", type: "file" as const, size: 300, file_type: "json", language: "json" },
      ];

      const tree = buildNestedTree(flatItems);

      expect(tree).toHaveLength(2);
      // Folders sorted first
      expect(tree[0].name).toBe("src");
      expect(tree[0].type).toBe("folder");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children![0].name).toBe("utils");
      expect(tree[0].children![0].children![0].name).toBe("math.ts");

      // File
      expect(tree[1].name).toBe("package.json");
      expect(tree[1].type).toBe("file");
    });
  });

  describe("fetchAndIndexRepositoryCode", () => {
    it("should fetch git tree, filter files, store records, and upsert tree", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce(mockRepository);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (encryption.decryptToken as jest.Mock).mockReturnValueOnce("decrypted_token");
      (githubService.initializeOctokit as jest.Mock).mockReturnValueOnce({});
      (githubService.fetchRepositoryGitTree as jest.Mock).mockResolvedValueOnce(mockGitTree);
      (githubService.fetchFileContent as jest.Mock).mockResolvedValue({
        content: "console.log('hello');",
        size: 24,
      });

      (prisma.repositoryFile.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      (prisma.repositoryFile.createMany as jest.Mock).mockResolvedValueOnce({ count: 3 });
      (prisma.repositoryFile.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "file1", file_path: "src/index.ts", file_type: "ts", file_size: 512, language: "typescript" },
        { id: "file2", file_path: "src/utils.ts", file_type: "ts", file_size: 1024, language: "typescript" },
        { id: "file3", file_path: "package.json", file_type: "json", file_size: 256, language: "json" },
      ]);
      (prisma.repositoryFileTree.upsert as jest.Mock).mockResolvedValueOnce({});

      const result = await codeFetchService.fetchAndIndexRepositoryCode(mockUser.id, mockRepository.id);

      expect(result.indexed_files).toBe(3);
      expect(result.total_dirs).toBe(1);
      expect(prisma.repositoryFile.createMany).toHaveBeenCalled();
      expect(prisma.repositoryFileTree.upsert).toHaveBeenCalled();
    });

    it("should throw 404 error if repository does not exist", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        codeFetchService.fetchAndIndexRepositoryCode(mockUser.id, "invalid-repo-id")
      ).rejects.toThrow("Repository with ID 'invalid-repo-id' not found");
    });
  });

  describe("getRepositoryFileTree", () => {
    it("should return parsed tree JSON and file totals", async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValueOnce(mockRepository);
      (prisma.repositoryFileTree.findUnique as jest.Mock).mockResolvedValueOnce({
        tree_json: JSON.stringify([{ name: "src", type: "folder", children: [] }]),
        total_files: 5,
        total_dirs: 1,
        updated_at: new Date("2026-08-24T12:00:00Z"),
      });

      const treeData = await codeFetchService.getRepositoryFileTree(mockUser.id, mockRepository.id);

      expect(treeData.total_files).toBe(5);
      expect(treeData.total_dirs).toBe(1);
      expect(treeData.tree).toHaveLength(1);
      expect(treeData.tree[0].name).toBe("src");
    });
  });
});
