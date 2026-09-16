import prisma from "../lib/db";
import AppError from "../lib/AppError";

export class AnalyticsService {
  /**
   * Returns issue counts grouped by severity, formatted for pie/donut chart
   */
  async getIssueDistributionBySeverity(repositoryId: string, userId?: string) {
    if (userId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, user_id: userId },
      });
      if (!repository) {
        throw AppError.notFound("Repository not found or unauthorized");
      }
    }

    const summary = await prisma.analysisSummary.findUnique({
      where: { repository_id: repositoryId },
    });

    if (!summary) {
      return [
        { name: "Critical", value: 0, color: "#EF4444" },
        { name: "High", value: 0, color: "#F97316" },
        { name: "Medium", value: 0, color: "#EAB308" },
        { name: "Low", value: 0, color: "#737373" },
      ];
    }

    return [
      { name: "Critical", value: summary.critical_count, color: "#EF4444" },
      { name: "High", value: summary.high_count, color: "#F97316" },
      { name: "Medium", value: summary.medium_count, color: "#EAB308" },
      { name: "Low", value: summary.low_count, color: "#737373" },
    ];
  }

  /**
   * Returns issue counts grouped by category, formatted for bar chart
   */
  async getIssueDistributionByType(repositoryId: string, userId?: string) {
    if (userId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, user_id: userId },
      });
      if (!repository) {
        throw AppError.notFound("Repository not found or unauthorized");
      }
    }

    const summary = await prisma.analysisSummary.findUnique({
      where: { repository_id: repositoryId },
    });

    if (!summary) {
      return [
        { type: "Security", count: 0, color: "#EF4444" },
        { type: "Bug", count: 0, color: "#F43F5E" },
        { type: "Performance", count: 0, color: "#F59E0B" },
        { type: "Code Smell", count: 0, color: "#3B82F6" },
        { type: "Maintainability", count: 0, color: "#A855F7" },
      ];
    }

    return [
      { type: "Security", count: summary.security_issues_count, color: "#EF4444" },
      { type: "Bug", count: summary.bug_issues_count, color: "#F43F5E" },
      { type: "Performance", count: summary.performance_issues_count, color: "#F59E0B" },
      { type: "Code Smell", count: summary.code_smell_count, color: "#3B82F6" },
      { type: "Maintainability", count: summary.maintainability_count, color: "#A855F7" },
    ];
  }

  /**
   * Returns top files with highest number of issues, sorted descending
   */
  async getTopProblematicFiles(repositoryId: string, userId?: string, limit = 10) {
    if (userId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, user_id: userId },
      });
      if (!repository) {
        throw AppError.notFound("Repository not found or unauthorized");
      }
    }

    const issues = await prisma.codeIssue.findMany({
      where: { repository_id: repositoryId },
      select: { file_path: true, severity: true, issue_type: true },
    });

    const fileMap: Record<
      string,
      {
        file_path: string;
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
      }
    > = {};

    for (const issue of issues) {
      if (!fileMap[issue.file_path]) {
        fileMap[issue.file_path] = {
          file_path: issue.file_path,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }

      const item = fileMap[issue.file_path];
      item.total++;
      switch (issue.severity.toLowerCase()) {
        case "critical":
          item.critical++;
          break;
        case "high":
          item.high++;
          break;
        case "medium":
          item.medium++;
          break;
        case "low":
          item.low++;
          break;
      }
    }

    const sortedFiles = Object.values(fileMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, Math.max(1, limit));

    return sortedFiles;
  }

  /**
   * Returns chronological health score trends over time for line chart
   */
  async getIssueTrends(repositoryId: string, userId?: string) {
    if (userId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, user_id: userId },
      });
      if (!repository) {
        throw AppError.notFound("Repository not found or unauthorized");
      }
    }

    const records = await prisma.repositoryHealth.findMany({
      where: { repository_id: repositoryId },
      orderBy: { calculated_at: "asc" },
      select: {
        id: true,
        overall_score: true,
        overall_grade: true,
        security_score: true,
        code_quality_score: true,
        maintainability_score: true,
        performance_score: true,
        calculated_at: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      timestamp: r.calculated_at.toISOString(),
      date: new Date(r.calculated_at).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      overall_score: r.overall_score,
      overall_grade: r.overall_grade,
      security_score: r.security_score,
      code_quality_score: r.code_quality_score,
      maintainability_score: r.maintainability_score,
      performance_score: r.performance_score,
    }));
  }
}

export default new AnalyticsService();
