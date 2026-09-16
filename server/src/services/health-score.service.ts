import prisma from "../lib/db";
import AppError from "../lib/AppError";

export interface HealthScoreResult {
  id?: string;
  repository_id: string;
  overall_score: number;
  overall_grade: string;
  code_quality_score: number;
  security_score: number;
  maintainability_score: number;
  performance_score: number;
  total_files_analyzed: number;
  total_lines_of_code: number;
  calculated_at: Date;
}

export class HealthScoreService {
  /**
   * Calculates grade from numerical score (0 - 100)
   */
  mapScoreToGrade(score: number): string {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    if (score >= 40) return "D";
    return "F";
  }

  /**
   * Calculates health scores and letter grades based on stored CodeIssue records
   */
  async calculateHealthScores(repositoryId: string, userId?: string) {
    // 1. Verify repository
    if (userId) {
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, user_id: userId },
      });
      if (!repository) {
        throw AppError.notFound("Repository not found or unauthorized");
      }
    }

    // 2. Fetch repository files to determine size and line counts
    const files = await prisma.repositoryFile.findMany({
      where: { repository_id: repositoryId, is_binary: false },
      select: { content: true },
    });

    if (!files || files.length === 0) {
      throw AppError.badRequest(
        "No code files found for this repository. Please fetch repository code before calculating health."
      );
    }

    const totalFilesAnalyzed = files.length;
    let totalLinesOfCode = 0;
    for (const f of files) {
      if (f.content) {
        totalLinesOfCode += f.content.split("\n").length;
      }
    }

    // 3. Fetch all CodeIssues for this repository
    const issues = await prisma.codeIssue.findMany({
      where: { repository_id: repositoryId },
      select: { issue_type: true, severity: true },
    });

    // 4. Calculate raw deduction points per category
    let securityDeductions = 0;
    let bugDeductions = 0;
    let maintainabilityDeductions = 0;
    let performanceDeductions = 0;

    const severityWeights: Record<string, number> = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 0.5,
    };

    for (const issue of issues) {
      const weight = severityWeights[issue.severity.toLowerCase()] || 1;

      switch (issue.issue_type) {
        case "security":
          securityDeductions += weight;
          break;
        case "bug":
          bugDeductions += weight;
          break;
        case "code-smell":
        case "maintainability":
          maintainabilityDeductions += weight;
          break;
        case "performance":
          performanceDeductions += weight;
          break;
      }
    }

    // 5. Codebase size normalization factor
    // A scale factor derived from file count prevents large repos from being overly penalized
    const scaleFactor = Math.max(1, Math.sqrt(totalFilesAnalyzed / 5));

    const securityScore = Math.max(
      0,
      Math.min(100, Number((100 - securityDeductions / scaleFactor).toFixed(1)))
    );
    const codeQualityScore = Math.max(
      0,
      Math.min(100, Number((100 - bugDeductions / scaleFactor).toFixed(1)))
    );
    const maintainabilityScore = Math.max(
      0,
      Math.min(100, Number((100 - maintainabilityDeductions / scaleFactor).toFixed(1)))
    );
    const performanceScore = Math.max(
      0,
      Math.min(100, Number((100 - performanceDeductions / scaleFactor).toFixed(1)))
    );

    // 6. Calculate weighted overall score (Security 40%, Quality 25%, Maintainability 20%, Performance 15%)
    const rawOverall =
      securityScore * 0.4 +
      codeQualityScore * 0.25 +
      maintainabilityScore * 0.2 +
      performanceScore * 0.15;

    const overallScore = Math.max(0, Math.min(100, Number(rawOverall.toFixed(1))));
    const overallGrade = this.mapScoreToGrade(overallScore);

    // 7. Persist to MongoDB
    const healthRecord = await prisma.repositoryHealth.create({
      data: {
        repository_id: repositoryId,
        overall_score: overallScore,
        overall_grade: overallGrade,
        code_quality_score: codeQualityScore,
        security_score: securityScore,
        maintainability_score: maintainabilityScore,
        performance_score: performanceScore,
        total_files_analyzed: totalFilesAnalyzed,
        total_lines_of_code: totalLinesOfCode,
        calculated_at: new Date(),
      },
    });

    return healthRecord;
  }

  /**
   * Retrieves the most recent health record for a repository
   */
  async getLatestHealth(repositoryId: string, userId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    const latest = await prisma.repositoryHealth.findFirst({
      where: { repository_id: repositoryId },
      orderBy: { calculated_at: "desc" },
    });

    return latest;
  }

  /**
   * Retrieves historical health records for trend tracking
   */
  async getHealthHistory(repositoryId: string, userId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    const history = await prisma.repositoryHealth.findMany({
      where: { repository_id: repositoryId },
      orderBy: { calculated_at: "asc" },
    });

    return history;
  }

  /**
   * Retrieves health overview across all selected repositories of a user
   */
  async getUserRepositoriesHealthOverview(userId: string) {
    const repositories = await prisma.repository.findMany({
      where: { user_id: userId, is_selected: true },
      select: {
        id: true,
        github_repo_name: true,
        github_repo_fullname: true,
        github_repo_url: true,
        language: true,
        stars: true,
        analysisSummary: true,
        healthRecords: {
          orderBy: { calculated_at: "desc" },
          take: 1,
        },
      },
    });

    let totalScoreSum = 0;
    let scoredCount = 0;
    let totalCriticalCount = 0;

    const items = repositories.map((repo) => {
      const latestHealth = repo.healthRecords[0] || null;
      const criticalCount = repo.analysisSummary?.critical_count || 0;
      totalCriticalCount += criticalCount;

      if (latestHealth) {
        totalScoreSum += latestHealth.overall_score;
        scoredCount++;
      }

      return {
        id: repo.id,
        github_repo_name: repo.github_repo_name,
        github_repo_fullname: repo.github_repo_fullname,
        github_repo_url: repo.github_repo_url,
        language: repo.language,
        stars: repo.stars,
        critical_issues_count: criticalCount,
        total_issues_count: repo.analysisSummary?.total_issues || 0,
        health: latestHealth,
      };
    });

    // Sort worst-first (ascending overall_score, with un-analyzed repositories placed last)
    items.sort((a, b) => {
      if (!a.health && !b.health) return 0;
      if (!a.health) return 1;
      if (!b.health) return -1;
      return a.health.overall_score - b.health.overall_score;
    });

    const averageHealthScore =
      scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(1)) : null;

    return {
      averageHealthScore,
      totalCriticalIssues: totalCriticalCount,
      analyzedRepositoriesCount: scoredCount,
      totalSelectedRepositories: repositories.length,
      repositories: items,
    };
  }
}

export default new HealthScoreService();
