import { scanPerformanceRules } from "../performance-rules";

describe("Performance Rules Unit Tests", () => {
  it("should detect synchronous blocking file operations", () => {
    const code = `
const fs = require("fs");
const data = fs.readFileSync("/path/to/file.txt", "utf-8");
`;
    const issues = scanPerformanceRules(code, "reader.js");
    expect(issues.some((i) => i.ruleId === "performance/sync-blocking-operation")).toBe(true);
    expect(issues[0].severity).toBe("high");
    expect(issues[0].issueType).toBe("performance");
  });

  it("should detect nested loops (O(n²) complexity)", () => {
    const code = `
function processMatrix(items) {
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      console.log(items[i], items[j]);
    }
  }
}
`;
    const issues = scanPerformanceRules(code, "matrix.ts");
    expect(issues.some((i) => i.ruleId === "performance/nested-loop")).toBe(true);
    expect(issues[0].severity).toBe("medium");
  });

  it("should detect linear search inside loops", () => {
    const code = `
for (const item of list) {
  const exists = otherArray.includes(item.id);
}
`;
    const issues = scanPerformanceRules(code, "search.ts");
    expect(issues.some((i) => i.ruleId === "performance/inefficient-loop-operation")).toBe(true);
  });
});
