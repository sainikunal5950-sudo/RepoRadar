export type IssueType =
  | "security"
  | "performance"
  | "bug"
  | "code-smell"
  | "maintainability";

export type Severity = "critical" | "high" | "medium" | "low";

export interface RuleIssue {
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  issueType: IssueType;
  severity: Severity;
  message: string;
  suggestedFix?: string;
  codeSnippet?: string;
  ruleId?: string;
}

export type AnalysisRuleFn = (fileContent: string, filePath: string) => RuleIssue[];
