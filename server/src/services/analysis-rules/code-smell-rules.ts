import { RuleIssue } from "./types";

/**
 * Scans code content for code smells and maintainability problems:
 * - Functions exceeding ~50 lines in length
 * - Missing documentation / comments on exported functions or classes
 * - High cyclomatic complexity (> 10 branches in a single function)
 * - Deeply nested conditionals / blocks (> 3 levels of indentation)
 */
export function scanCodeSmellRules(fileContent: string, filePath: string): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const lines = fileContent.split("\n");

  // 1. Function Length & Cyclomatic Complexity Detector
  const functionStartRegex =
    /^\s*(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/;

  interface ActiveFunction {
    name: string;
    startLine: number;
    openBraceCount: number;
    decisionCount: number;
  }

  const activeFunctions: ActiveFunction[] = [];

  const branchKeywordRegex = /\b(if|else\s+if|for|while|case|catch)\b|&&|\|\||\?/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Check function start
    const fnMatch = functionStartRegex.exec(line);
    if (fnMatch && line.includes("{")) {
      const fnName = fnMatch[1] || fnMatch[2] || fnMatch[3] || "anonymous";
      activeFunctions.push({
        name: fnName,
        startLine: lineNum,
        openBraceCount: (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length,
        decisionCount: 1, // Base complexity
      });
    }

    // Accumulate metrics for active functions
    if (activeFunctions.length > 0) {
      const topFn = activeFunctions[activeFunctions.length - 1];

      // Update brace counts if not the opening line
      if (topFn.startLine !== lineNum) {
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        topFn.openBraceCount += opens - closes;
      }

      // Count decision points
      if (!trimmed.startsWith("//") && !trimmed.startsWith("/*") && !trimmed.startsWith("*")) {
        const branchMatches = line.match(branchKeywordRegex);
        if (branchMatches) {
          topFn.decisionCount += branchMatches.length;
        }
      }

      // If function closed
      if (topFn.openBraceCount <= 0) {
        const totalLines = lineNum - topFn.startLine + 1;

        // Check for long function (> 50 lines)
        if (totalLines > 50) {
          issues.push({
            filePath,
            lineNumber: topFn.startLine,
            issueType: "code-smell",
            severity: "low",
            message: `Function '${topFn.name}' is too long (${totalLines} lines > 50 lines threshold).`,
            suggestedFix: "Refactor into smaller, single-responsibility helper functions to improve readability and testability.",
            codeSnippet: lines[topFn.startLine - 1]?.trim(),
            ruleId: "code-smell/long-function",
          });
        }

        // Check for high cyclomatic complexity (> 10)
        if (topFn.decisionCount > 10) {
          issues.push({
            filePath,
            lineNumber: topFn.startLine,
            issueType: "maintainability",
            severity: "medium",
            message: `Function '${topFn.name}' has high cyclomatic complexity (score: ${topFn.decisionCount} > 10).`,
            suggestedFix: "Simplify conditional branches, use lookup tables, or extract sub-routines to reduce complexity.",
            codeSnippet: lines[topFn.startLine - 1]?.trim(),
            ruleId: "maintainability/high-cyclomatic-complexity",
          });
        }

        activeFunctions.pop();
      }
    }

    // 2. Missing documentation on exported functions/classes
    const exportDeclRegex =
      /^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|class\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=)/;
    if (exportDeclRegex.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      const prevPrevLine = i > 1 ? lines[i - 2].trim() : "";
      const hasDoc =
        prevLine.endsWith("*/") ||
        prevLine.startsWith("//") ||
        prevLine.startsWith("*") ||
        prevPrevLine.endsWith("*/");

      if (!hasDoc) {
        issues.push({
          filePath,
          lineNumber: lineNum,
          issueType: "code-smell",
          severity: "low",
          message: "Missing documentation or JSDoc comments on exported symbol.",
          suggestedFix: "Add a JSDoc or descriptive docstring explaining purpose, parameters, and return types.",
          codeSnippet: trimmed,
          ruleId: "code-smell/missing-documentation",
        });
      }
    }

    // 3. Deeply nested conditionals (> 3 nested levels)
    const nestedIfRegex = /^(?:\s{16,}|\t{4,})if\s*\(/;
    if (nestedIfRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "code-smell",
        severity: "medium",
        message: "Deeply nested conditional statement (> 3 levels of indentation).",
        suggestedFix: "Use guard clauses, early returns, or decompose complex branching into separate functions.",
        codeSnippet: trimmed,
        ruleId: "code-smell/deeply-nested-control-flow",
      });
    }
  }

  return issues;
}
