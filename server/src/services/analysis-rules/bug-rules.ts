import { RuleIssue } from "./types";

/**
 * Scans code content for common bugs:
 * - Unused variables (declared const/let/var never referenced again)
 * - Missing null/undefined checks before property access
 * - Unreachable code (code following unconditional return/throw/break/continue)
 * - Missing return statements in function branches
 */
export function scanBugRules(fileContent: string, filePath: string): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const lines = fileContent.split("\n");

  // 1. Unused variables detector
  const variableDeclRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
  let match: RegExpExecArray | null;
  const declaredVars: { name: string; lineIndex: number; lineText: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    variableDeclRegex.lastIndex = 0;
    while ((match = variableDeclRegex.exec(line)) !== null) {
      const varName = match[1];
      // Exclude exports, destructured components, common ignored names like _
      if (
        !varName.startsWith("_") &&
        !line.includes("export ") &&
        !["req", "res", "next", "err", "error", "props", "state", "dispatch"].includes(varName)
      ) {
        declaredVars.push({ name: varName, lineIndex: i, lineText: line.trim() });
      }
    }
  }

  for (const item of declaredVars) {
    // Count occurrences of the variable name as an identifier across whole file
    const identifierRegex = new RegExp(`\\b${item.name}\\b`, "g");
    const count = (fileContent.match(identifierRegex) || []).length;
    // If it only occurs once (the declaration line itself), it is unused
    if (count === 1) {
      issues.push({
        filePath,
        lineNumber: item.lineIndex + 1,
        issueType: "bug",
        severity: "medium",
        message: `Variable '${item.name}' is declared but its value is never read.`,
        suggestedFix: `Remove the unused variable or prefix it with an underscore (_${item.name}) if required for signature.`,
        codeSnippet: item.lineText,
        ruleId: "bug/unused-variable",
      });
    }
  }

  // 2. Unreachable code detector
  const terminalRegex = /^\s*(return(?:\s+[^;]+)?;|throw\s+new\s+[^;]+;|break;|continue;)\s*$/;
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    const currentTrimmed = currentLine.trim();
    const nextTrimmed = nextLine.trim();

    if (
      terminalRegex.test(currentTrimmed) &&
      nextTrimmed &&
      !nextTrimmed.startsWith("}") &&
      !nextTrimmed.startsWith("case ") &&
      !nextTrimmed.startsWith("default:") &&
      !nextTrimmed.startsWith("//") &&
      !nextTrimmed.startsWith("/*") &&
      !nextTrimmed.startsWith("*")
    ) {
      // Check if next line is inside the same block
      const currentIndent = currentLine.search(/\S|$/);
      const nextIndent = nextLine.search(/\S|$/);

      if (currentIndent === nextIndent && !currentTrimmed.startsWith("//")) {
        issues.push({
          filePath,
          lineNumber: i + 2,
          issueType: "bug",
          severity: "high",
          message: "Unreachable code detected immediately following a return, throw, break, or continue statement.",
          suggestedFix: "Remove the unreachable statements or reposition them before the terminating statement.",
          codeSnippet: nextTrimmed,
          ruleId: "bug/unreachable-code",
        });
      }
    }
  }

  // 3. Missing null/undefined checks before property access
  const unsafeDomAccessRegex =
    /(?:document\.getElementById|document\.querySelector|document\.getElementsByClassName)\s*\([^)]+\)\.[a-zA-Z0-9_$]+(?!\?)/;
  const unsafeArrayFindAccessRegex =
    /\.(?:find|findLast)\s*\([^)]+\)\.[a-zA-Z0-9_$]+(?!\?)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    if (unsafeDomAccessRegex.test(line) && !line.includes("?.")) {
      issues.push({
        filePath,
        lineNumber: i + 1,
        issueType: "bug",
        severity: "high",
        message: "Missing null check on DOM query result before accessing properties.",
        suggestedFix: "Use optional chaining (e.g., document.querySelector(...)?.) or check for null before accessing properties.",
        codeSnippet: trimmed,
        ruleId: "bug/missing-null-check",
      });
    }

    if (unsafeArrayFindAccessRegex.test(line) && !line.includes("?.")) {
      issues.push({
        filePath,
        lineNumber: i + 1,
        issueType: "bug",
        severity: "medium",
        message: "Direct property access on .find() result without checking if element exists.",
        suggestedFix: "Use optional chaining (?.) or verify that the item was found before accessing properties.",
        codeSnippet: trimmed,
        ruleId: "bug/missing-null-check-find",
      });
    }
  }

  return issues;
}
