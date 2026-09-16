import { RuleIssue } from "./types";
import { scanSecurityRules } from "./security-rules";
import { scanBugRules } from "./bug-rules";
import { scanPerformanceRules } from "./performance-rules";
import { scanCodeSmellRules } from "./code-smell-rules";

export * from "./types";
export * from "./security-rules";
export * from "./bug-rules";
export * from "./performance-rules";
export * from "./code-smell-rules";

/**
 * Runs all rule engines against a single file content and returns all detected issues.
 */
export function scanFileForIssues(fileContent: string, filePath: string): RuleIssue[] {
  return [
    ...scanSecurityRules(fileContent, filePath),
    ...scanBugRules(fileContent, filePath),
    ...scanPerformanceRules(fileContent, filePath),
    ...scanCodeSmellRules(fileContent, filePath),
  ];
}
