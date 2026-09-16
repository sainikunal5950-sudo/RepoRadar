import { RuleIssue } from "./types";

/**
 * Scans code content for performance anti-patterns:
 * - Nested loops (O(n²) / O(n³) time complexity)
 * - Synchronous blocking I/O calls in asynchronous / server code
 * - Inefficient linear search or array spread operations inside loops
 */
export function scanPerformanceRules(fileContent: string, filePath: string): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const lines = fileContent.split("\n");

  // 1. Synchronous blocking operations
  const syncOperationRegex =
    /\b(?:readFileSync|writeFileSync|appendFileSync|existsSync|readdirSync|statSync|execSync|spawnSync|pbkdf2Sync|hashSync)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    if (syncOperationRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: i + 1,
        issueType: "performance",
        severity: "high",
        message: "Synchronous blocking I/O or crypto operation detected in execution path.",
        suggestedFix: "Use asynchronous non-blocking alternatives (e.g. fs.promises or async methods) to prevent event loop starvation.",
        codeSnippet: trimmed,
        ruleId: "performance/sync-blocking-operation",
      });
    }
  }

  // 2. Nested loops & Inefficient operations inside loops
  const loopHeaderRegex =
    /^\s*(?:for\s*\(|while\s*\(|\b\w+\.(?:forEach|map|filter)\s*\()/;
  const loopDepthStack: { lineNum: number; header: string }[] = [];

  const innerInefficientOpRegex =
    /\b\w+\.(?:indexOf|includes|find|findIndex|filter)\s*\(|(?:\w+\s*=\s*\[\s*\.\.\.\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    // Check opening of loop
    if (loopHeaderRegex.test(line)) {
      if (loopDepthStack.length >= 1) {
        issues.push({
          filePath,
          lineNumber: i + 1,
          issueType: "performance",
          severity: "medium",
          message: "Nested loop detected (potential O(n²) or worse time complexity).",
          suggestedFix: "Consider pre-indexing data into a Map, Set, or lookup dictionary before looping.",
          codeSnippet: trimmed,
          ruleId: "performance/nested-loop",
        });
      }
      loopDepthStack.push({ lineNum: i + 1, header: trimmed });
    }

    // Check inefficient operations while inside any loop
    if (loopDepthStack.length > 0 && innerInefficientOpRegex.test(line) && !loopHeaderRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: i + 1,
        issueType: "performance",
        severity: "medium",
        message: "Inefficient linear search (indexOf/includes/find) or array spreading inside loop iteration.",
        suggestedFix: "Use a Set or Map for O(1) lookups or use Array.push instead of spreading arrays in loop iterations.",
        codeSnippet: trimmed,
        ruleId: "performance/inefficient-loop-operation",
      });
    }

    // Approximate loop exit tracking with closing braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const netCloses = closeBraces - openBraces;
    if (netCloses > 0 && loopDepthStack.length > 0) {
      for (let c = 0; c < netCloses; c++) {
        loopDepthStack.pop();
      }
    }
  }

  return issues;
}
