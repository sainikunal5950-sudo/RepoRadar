import { developerAnalyticsService } from "../developer-analytics.service";
import prisma from "../../lib/db";

// Mock prisma
jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repositoryCommit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    commitFileChange: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    contributorStats: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    codeIssue: {
      findMany: jest.fn(),
    },
    fileHotspot: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    repository: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("DeveloperAnalyticsService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("computeContributorStats", () => {
    it("should correctly aggregate commits, additions, deletions, files touched, and percentages summing to 100", async () => {
      const mockCommits = [
        {
          id: "c1",
          repository_id: "repo1",
          author_name: "Alice",
          author_email: "alice@example.com",
          author_github_username: "alice",
          author_avatar_url: "https://avatar.alice",
          additions: 100,
          deletions: 20,
          committed_at: new Date("2026-01-01T10:00:00Z"),
          fileChanges: [{ file_path: "src/index.ts" }, { file_path: "src/utils.ts" }],
        },
        {
          id: "c2",
          repository_id: "repo1",
          author_name: "Alice",
          author_email: "alice@example.com",
          author_github_username: "alice",
          author_avatar_url: "https://avatar.alice",
          additions: 50,
          deletions: 10,
          committed_at: new Date("2026-01-02T10:00:00Z"),
          fileChanges: [{ file_path: "src/index.ts" }],
        },
        {
          id: "c3",
          repository_id: "repo1",
          author_name: "Bob",
          author_email: "bob@example.com",
          author_github_username: "bob",
          author_avatar_url: "https://avatar.bob",
          additions: 200,
          deletions: 50,
          committed_at: new Date("2026-01-03T10:00:00Z"),
          fileChanges: [{ file_path: "src/components/App.tsx" }],
        },
      ];

      (prisma.repositoryCommit.findMany as jest.Mock).mockResolvedValue(mockCommits);
      (prisma.contributorStats.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.contributorStats.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ id: "stat-" + data.author_name, ...data }));

      const stats = await developerAnalyticsService.computeContributorStats("repo1");

      expect(prisma.contributorStats.deleteMany).toHaveBeenCalledWith({
        where: { repository_id: "repo1" },
      });
      expect(prisma.contributorStats.create).toHaveBeenCalledTimes(2);

      const aliceStat = stats.find((s) => s.author_email === "alice@example.com");
      const bobStat = stats.find((s) => s.author_email === "bob@example.com");

      expect(aliceStat).toBeDefined();
      expect(aliceStat?.total_commits).toBe(2);
      expect(aliceStat?.total_additions).toBe(150);
      expect(aliceStat?.total_deletions).toBe(30);
      expect(aliceStat?.files_touched_count).toBe(2); // index.ts, utils.ts
      expect(aliceStat?.contribution_percentage).toBe(66.67);

      expect(bobStat).toBeDefined();
      expect(bobStat?.total_commits).toBe(1);
      expect(bobStat?.total_additions).toBe(200);
      expect(bobStat?.total_deletions).toBe(50);
      expect(bobStat?.files_touched_count).toBe(1);
      expect(bobStat?.contribution_percentage).toBe(33.33);

      const totalPercentage = stats.reduce((acc, s) => acc + s.contribution_percentage, 0);
      expect(Math.round(totalPercentage)).toBe(100);
    });

    it("should return empty array if repository has no commits", async () => {
      (prisma.repositoryCommit.findMany as jest.Mock).mockResolvedValue([]);
      const stats = await developerAnalyticsService.computeContributorStats("empty-repo");
      expect(stats).toEqual([]);
      expect(prisma.contributorStats.deleteMany).toHaveBeenCalledWith({
        where: { repository_id: "empty-repo" },
      });
    });
  });

  describe("computeFileHotspots", () => {
    it("should compute debt score higher for files with both high changes and critical issues", async () => {
      const mockFileChanges = [
        // File 1 (high change, high critical issues)
        {
          id: "fc1",
          file_path: "src/auth.ts",
          change_type: "modified",
          additions: 50,
          deletions: 10,
          commit: { author_email: "alice@example.com", author_name: "Alice", committed_at: new Date("2026-01-01") },
        },
        {
          id: "fc2",
          file_path: "src/auth.ts",
          change_type: "modified",
          additions: 20,
          deletions: 5,
          commit: { author_email: "bob@example.com", author_name: "Bob", committed_at: new Date("2026-01-02") },
        },
        // File 2 (low change, no issues)
        {
          id: "fc3",
          file_path: "src/readme.md",
          change_type: "modified",
          additions: 5,
          deletions: 0,
          commit: { author_email: "alice@example.com", author_name: "Alice", committed_at: new Date("2026-01-01") },
        },
      ];

      const mockCodeIssues = [
        { file_path: "src/auth.ts", severity: "critical" },
        { file_path: "src/auth.ts", severity: "critical" },
        { file_path: "src/auth.ts", severity: "high" },
      ];

      (prisma.commitFileChange.findMany as jest.Mock).mockResolvedValue(mockFileChanges);
      (prisma.codeIssue.findMany as jest.Mock).mockResolvedValue(mockCodeIssues);
      (prisma.fileHotspot.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.fileHotspot.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ id: "hotspot-" + data.file_path, ...data }));

      const hotspots = await developerAnalyticsService.computeFileHotspots("repo1");

      expect(hotspots.length).toBe(2);
      const authHotspot = hotspots.find((h) => h.file_path === "src/auth.ts");
      const readmeHotspot = hotspots.find((h) => h.file_path === "src/readme.md");

      expect(authHotspot).toBeDefined();
      expect(authHotspot?.change_count).toBe(2);
      expect(authHotspot?.unique_authors_count).toBe(2);
      expect(authHotspot?.critical_issue_count).toBe(2);
      expect(authHotspot?.issue_count).toBe(3);
      expect(authHotspot?.debt_score).toBe(100); // 50 (max change) + 50 (max issues)

      expect(readmeHotspot).toBeDefined();
      expect(readmeHotspot?.change_count).toBe(1);
      expect(readmeHotspot?.debt_score).toBeLessThan(authHotspot!.debt_score);
    });
  });

  describe("getCommitActivityTimeline", () => {
    it("should correctly group commits by day", async () => {
      const mockCommits = [
        { committed_at: new Date("2026-02-10T10:00:00Z"), additions: 10, deletions: 2 },
        { committed_at: new Date("2026-02-10T14:30:00Z"), additions: 20, deletions: 5 },
        { committed_at: new Date("2026-02-11T09:15:00Z"), additions: 15, deletions: 1 },
      ];

      (prisma.repositoryCommit.findMany as jest.Mock).mockResolvedValue(mockCommits);

      const timeline = await developerAnalyticsService.getCommitActivityTimeline("repo1", "day");

      expect(timeline).toHaveLength(2);
      expect(timeline[0]).toEqual({
        date: "2026-02-10",
        commit_count: 2,
        additions: 30,
        deletions: 7,
      });
      expect(timeline[1]).toEqual({
        date: "2026-02-11",
        commit_count: 1,
        additions: 15,
        deletions: 1,
      });
    });

    it("should correctly group commits by month", async () => {
      const mockCommits = [
        { committed_at: new Date("2026-01-15T10:00:00Z"), additions: 100, deletions: 20 },
        { committed_at: new Date("2026-01-20T10:00:00Z"), additions: 50, deletions: 10 },
        { committed_at: new Date("2026-02-05T10:00:00Z"), additions: 80, deletions: 15 },
      ];

      (prisma.repositoryCommit.findMany as jest.Mock).mockResolvedValue(mockCommits);

      const timeline = await developerAnalyticsService.getCommitActivityTimeline("repo1", "month");

      expect(timeline).toHaveLength(2);
      expect(timeline[0]).toEqual({
        date: "2026-01",
        commit_count: 2,
        additions: 150,
        deletions: 30,
      });
      expect(timeline[1]).toEqual({
        date: "2026-02",
        commit_count: 1,
        additions: 80,
        deletions: 15,
      });
    });
  });

  describe("getCommitHeatmapData", () => {
    it("should build 7x24 matrix matching commit timestamps", async () => {
      const d1 = new Date();
      d1.setHours(14, 0, 0, 0); // hour 14

      (prisma.repositoryCommit.findMany as jest.Mock).mockResolvedValue([
        { committed_at: d1 },
        { committed_at: d1 },
      ]);

      const heatmap = await developerAnalyticsService.getCommitHeatmapData("repo1");

      expect(heatmap.matrix.length).toBe(7);
      expect(heatmap.matrix[0].length).toBe(24);
      expect(heatmap.totalCommits).toBe(2);
      expect(heatmap.maxCount).toBe(2);
      expect(heatmap.points.length).toBe(7 * 24);
    });
  });
});
