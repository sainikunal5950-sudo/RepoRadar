import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { scanFileForIssues, RuleIssue, IssueType, Severity } from "./analysis-rules";
import healthScoreService from "./health-score.service";

const SUPPORTED_CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "java", "go", "rb", "php", "cpp",
  "c", "cs", "rs", "swift", "kt", "scala",
  "html", "vue", "svelte"
]);

export interface AnalysisFilterOptions {
  severity?: Severity;
  issueType?: IssueType;
  filePath?: string;
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export class CodeAnalysisService {
  /**
   * Scans all stored code files of a repository and generates CodeIssue records & AnalysisSummary
   */
  async analyzeRepository(repositoryId: string, userId: string) {
    // 1. Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        user_id: userId,
      },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    // 2. Fetch all repository files
    const files = await prisma.repositoryFile.findMany({
      where: {
        repository_id: repositoryId,
      },
      select: {
        id: true,
        file_path: true,
        file_type: true,
        language: true,
        content: true,
        is_binary: true,
      },
    });

    if (!files || files.length === 0) {
      throw AppError.badRequest("No code files found. Please fetch repository code first before running analysis.");
    }

    // 3. Filter valid code files with content
    const codeFiles = files.filter((f) => {
      if (f.is_binary || !f.content) return false;
      const ext = f.file_type.toLowerCase().replace(/^\./, "");
      return SUPPORTED_CODE_EXTENSIONS.has(ext);
    });

    // 4. Run rule engines on each file
    const allIssues: RuleIssue[] = [];

    for (const file of codeFiles) {
      if (!file.content) continue;
      const fileIssues = scanFileForIssues(file.content, file.file_path);
      allIssues.push(...fileIssues);
    }

    // 5. Calculate rolled-up summary statistics
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    let securityCount = 0;
    let performanceCount = 0;
    let bugCount = 0;
    let codeSmellCount = 0;
    let maintainabilityCount = 0;

    for (const issue of allIssues) {
      switch (issue.severity) {
        case "critical":
          criticalCount++;
          break;
        case "high":
          highCount++;
          break;
        case "medium":
          mediumCount++;
          break;
        case "low":
          lowCount++;
          break;
      }

      switch (issue.issueType) {
        case "security":
          securityCount++;
          break;
        case "performance":
          performanceCount++;
          break;
        case "bug":
          bugCount++;
          break;
        case "code-smell":
          codeSmellCount++;
          break;
        case "maintainability":
          maintainabilityCount++;
          break;
      }
    }

    // 6. Transactionally / sequentially clear old issues and save new issues
    await prisma.codeIssue.deleteMany({
      where: { repository_id: repositoryId },
    });

    if (allIssues.length > 0) {
      // Chunk bulk inserts if there are many issues
      const chunkSize = 500;
      for (let i = 0; i < allIssues.length; i += chunkSize) {
        const chunk = allIssues.slice(i, i + chunkSize);
        await prisma.codeIssue.createMany({
          data: chunk.map((issue) => ({
            repository_id: repositoryId,
            file_path: issue.filePath,
            line_number: issue.lineNumber,
            column_number: issue.columnNumber || null,
            issue_type: issue.issueType,
            severity: issue.severity,
            message: issue.message,
            suggested_fix: issue.suggestedFix || null,
            code_snippet: issue.codeSnippet || null,
            rule_id: issue.ruleId || null,
          })),
        });
      }
    }

    // 7. Upsert AnalysisSummary
    const summary = await prisma.analysisSummary.upsert({
      where: { repository_id: repositoryId },
      create: {
        repository_id: repositoryId,
        total_issues: allIssues.length,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
        security_issues_count: securityCount,
        performance_issues_count: performanceCount,
        bug_issues_count: bugCount,
        code_smell_count: codeSmellCount,
        maintainability_count: maintainabilityCount,
        analysis_completed_at: new Date(),
      },
      update: {
        total_issues: allIssues.length,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
        security_issues_count: securityCount,
        performance_issues_count: performanceCount,
        bug_issues_count: bugCount,
        code_smell_count: codeSmellCount,
        maintainability_count: maintainabilityCount,
        analysis_completed_at: new Date(),
      },
    });

    // 8. Automatically trigger health score calculation so metrics stay synchronized
    try {
      await healthScoreService.calculateHealthScores(repositoryId);
    } catch (err) {
      console.error("Failed to auto-calculate health scores after analysis:", err);
    }

    return {
      summary,
      totalIssues: allIssues.length,
      issues: allIssues,
    };
  }

  /**
   * Retrieves rolled-up analysis summary for a repository
   */
  async getAnalysisSummary(repositoryId: string, userId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    const summary = await prisma.analysisSummary.findUnique({
      where: { repository_id: repositoryId },
    });

    return summary;
  }

  /**
   * Retrieves paginated, filterable CodeIssue records for a repository
   */
  async getAnalysisIssues(
    repositoryId: string,
    userId: string,
    options: AnalysisFilterOptions = {}
  ) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = options.offset !== undefined ? Number(options.offset) : (page - 1) * limit;

    const whereClause: Record<string, any> = {
      repository_id: repositoryId,
    };

    if (options.severity) {
      whereClause.severity = options.severity;
    }

    if (options.issueType) {
      whereClause.issue_type = options.issueType;
    }

    if (options.filePath) {
      whereClause.file_path = { contains: options.filePath, mode: "insensitive" };
    }

    if (options.search) {
      whereClause.OR = [
        { message: { contains: options.search, mode: "insensitive" } },
        { file_path: { contains: options.search, mode: "insensitive" } },
        { rule_id: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [issues, totalCount] = await Promise.all([
      prisma.codeIssue.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: [{ line_number: "asc" }, { createdAt: "desc" }],
      }),
      prisma.codeIssue.count({
        where: whereClause,
      }),
    ]);

    return {
      issues,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  /**
   * Retrieves all issues for a specific file in a repository
   */
  async getFileAnalysisIssues(repositoryId: string, fileIdOrPath: string, userId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, user_id: userId },
    });

    if (!repository) {
      throw AppError.notFound("Repository not found or unauthorized");
    }

    // Check if fileIdOrPath is an ObjectId or relative path
    let filePath = fileIdOrPath;
    if (/^[0-9a-fA-F]{24}$/.test(fileIdOrPath)) {
      const fileRecord = await prisma.repositoryFile.findUnique({
        where: { id: fileIdOrPath },
        select: { file_path: true },
      });
      if (fileRecord) {
        filePath = fileRecord.file_path;
      }
    }

    const issues = await prisma.codeIssue.findMany({
      where: {
        repository_id: repositoryId,
        file_path: filePath,
      },
      orderBy: { line_number: "asc" },
    });

    return issues;
  }
}

export default new CodeAnalysisService();
