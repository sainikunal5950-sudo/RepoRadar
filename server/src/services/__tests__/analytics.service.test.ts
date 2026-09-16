import analyticsService from "../analytics.service";
import prisma from "../../lib/db";

jest.mock("../../lib/db", () => ({
  __esModule: true,
  default: {
    repository: {
      findFirst: jest.fn(),
    },
    analysisSummary: {
      findUnique: jest.fn(),
    },
    codeIssue: {
      findMany: jest.fn(),
    },
    repositoryHealth: {
      findMany: jest.fn(),
    },
  },
}));

describe("AnalyticsService Unit Tests", () => {
  const repoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return severity distribution for pie charts", async () => {
    (prisma.analysisSummary.findUnique as jest.Mock).mockResolvedValueOnce({
      critical_count: 3,
      high_count: 5,
      medium_count: 2,
      low_count: 1,
    });

    const res = await analyticsService.getIssueDistributionBySeverity(repoId);

    expect(res).toHaveLength(4);
    expect(res.find((r) => r.name === "Critical")?.value).toBe(3);
    expect(res.find((r) => r.name === "High")?.value).toBe(5);
  });

  it("should return issue type distribution for bar charts", async () => {
    (prisma.analysisSummary.findUnique as jest.Mock).mockResolvedValueOnce({
      security_issues_count: 4,
      bug_issues_count: 2,
      performance_issues_count: 1,
      code_smell_count: 3,
      maintainability_count: 0,
    });

    const res = await analyticsService.getIssueDistributionByType(repoId);

    expect(res).toHaveLength(5);
    expect(res.find((r) => r.type === "Security")?.count).toBe(4);
    expect(res.find((r) => r.type === "Bug")?.count).toBe(2);
  });

  it("should return top problematic files sorted descending", async () => {
    (prisma.codeIssue.findMany as jest.Mock).mockResolvedValueOnce([
      { file_path: "src/auth.ts", severity: "critical", issue_type: "security" },
      { file_path: "src/auth.ts", severity: "high", issue_type: "security" },
      { file_path: "src/config.ts", severity: "medium", issue_type: "bug" },
    ]);

    const res = await analyticsService.getTopProblematicFiles(repoId, undefined, 5);

    expect(res).toHaveLength(2);
    expect(res[0].file_path).toBe("src/auth.ts");
    expect(res[0].total).toBe(2);
    expect(res[0].critical).toBe(1);
    expect(res[0].high).toBe(1);
    expect(res[1].file_path).toBe("src/config.ts");
    expect(res[1].total).toBe(1);
  });

  it("should return issue trends over time", async () => {
    const now = new Date("2026-09-10T12:00:00Z");
    (prisma.repositoryHealth.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "h1",
        overall_score: 85,
        overall_grade: "B",
        security_score: 90,
        code_quality_score: 80,
        maintainability_score: 85,
        performance_score: 90,
        calculated_at: now,
      },
    ]);

    const res = await analyticsService.getIssueTrends(repoId);

    expect(res).toHaveLength(1);
    expect(res[0].overall_score).toBe(85);
    expect(res[0].overall_grade).toBe("B");
    expect(res[0].timestamp).toBe(now.toISOString());
  });
});
