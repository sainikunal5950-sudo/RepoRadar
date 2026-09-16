import healthScoreService from "../health-score.service";
import prisma from "../../lib/db";

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
    },
    repositoryFile: {
      findMany: jest.fn(),
    },
    codeIssue: {
      findMany: jest.fn(),
    },
    repositoryHealth: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("HealthScoreService Unit Tests", () => {
  const repoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("mapScoreToGrade", () => {
    it("should correctly map boundary scores to grades", () => {
      expect(healthScoreService.mapScoreToGrade(100)).toBe("A");
      expect(healthScoreService.mapScoreToGrade(90)).toBe("A");
      expect(healthScoreService.mapScoreToGrade(89.9)).toBe("B");
      expect(healthScoreService.mapScoreToGrade(75)).toBe("B");
      expect(healthScoreService.mapScoreToGrade(74.9)).toBe("C");
      expect(healthScoreService.mapScoreToGrade(60)).toBe("C");
      expect(healthScoreService.mapScoreToGrade(59.9)).toBe("D");
      expect(healthScoreService.mapScoreToGrade(40)).toBe("D");
      expect(healthScoreService.mapScoreToGrade(39.9)).toBe("F");
      expect(healthScoreService.mapScoreToGrade(0)).toBe("F");
    });
  });

  describe("calculateHealthScores", () => {
    it("should return a score of 100 and grade A when there are zero issues", async () => {
      (prisma.repositoryFile.findMany as jest.Mock).mockResolvedValueOnce([
        { content: "console.log('hello');\nconst x = 1;" },
        { content: "export default 42;" },
      ]);
      (prisma.codeIssue.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.repositoryHealth.create as jest.Mock).mockImplementationOnce(({ data }) =>
        Promise.resolve({ id: "h1", ...data })
      );

      const result = await healthScoreService.calculateHealthScores(repoId);

      expect(result.overall_score).toBe(100);
      expect(result.overall_grade).toBe("A");
      expect(result.security_score).toBe(100);
      expect(result.code_quality_score).toBe(100);
      expect(result.maintainability_score).toBe(100);
      expect(result.performance_score).toBe(100);
      expect(result.total_files_analyzed).toBe(2);
      expect(result.total_lines_of_code).toBe(3);
    });

    it("should deduct more points for critical issues than low issues", async () => {
      (prisma.repositoryFile.findMany as jest.Mock).mockResolvedValue([
        { content: "line1\nline2" },
        { content: "line3\nline4" },
        { content: "line5\nline6" },
        { content: "line7\nline8" },
        { content: "line9\nline10" },
      ]);

      // Critical security issue
      (prisma.codeIssue.findMany as jest.Mock).mockResolvedValueOnce([
        { issue_type: "security", severity: "critical" },
      ]);
      (prisma.repositoryHealth.create as jest.Mock).mockImplementationOnce(({ data }) =>
        Promise.resolve(data)
      );

      const criticalRes = await healthScoreService.calculateHealthScores(repoId);

      // Low security issue
      (prisma.codeIssue.findMany as jest.Mock).mockResolvedValueOnce([
        { issue_type: "security", severity: "low" },
      ]);
      (prisma.repositoryHealth.create as jest.Mock).mockImplementationOnce(({ data }) =>
        Promise.resolve(data)
      );

      const lowRes = await healthScoreService.calculateHealthScores(repoId);

      expect(criticalRes.security_score).toBeLessThan(lowRes.security_score);
    });

    it("should clamp scores to 0 and never return negative values", async () => {
      (prisma.repositoryFile.findMany as jest.Mock).mockResolvedValueOnce([
        { content: "line1" },
      ]);

      // Massive critical issues across all categories
      const massiveIssues = [
        ...Array(20).fill({ issue_type: "security", severity: "critical" }),
        ...Array(20).fill({ issue_type: "bug", severity: "critical" }),
        ...Array(20).fill({ issue_type: "performance", severity: "critical" }),
        ...Array(20).fill({ issue_type: "code-smell", severity: "critical" }),
      ];
      (prisma.codeIssue.findMany as jest.Mock).mockResolvedValueOnce(massiveIssues);
      (prisma.repositoryHealth.create as jest.Mock).mockImplementationOnce(({ data }) =>
        Promise.resolve(data)
      );

      const result = await healthScoreService.calculateHealthScores(repoId);

      expect(result.security_score).toBe(0);
      expect(result.code_quality_score).toBe(0);
      expect(result.performance_score).toBe(0);
      expect(result.maintainability_score).toBe(0);
      expect(result.overall_score).toBe(0);
      expect(result.overall_grade).toBe("F");
    });
  });
});
