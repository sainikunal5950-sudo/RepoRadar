import { scanBugRules } from "../bug-rules";

describe("Bug Rules Unit Tests", () => {
  it("should detect unused variables", () => {
    const code = `
function calculate() {
  const unusedData = 42;
  return 100;
}
`;
    const issues = scanBugRules(code, "calc.ts");
    const issue = issues.find((i) => i.ruleId === "bug/unused-variable");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("medium");
  });

  it("should detect unreachable code after return", () => {
    const code = `
function processItem() {
  return true;
  console.log("This will never run");
}
`;
    const issues = scanBugRules(code, "process.ts");
    const issue = issues.find((i) => i.ruleId === "bug/unreachable-code");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("high");
  });

  it("should detect missing null check on DOM query selector", () => {
    const code = `document.getElementById("search-input").value;`;
    const issues = scanBugRules(code, "dom.ts");
    const issue = issues.find((i) => i.ruleId === "bug/missing-null-check");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("high");
  });

  it("should detect missing null check on array find", () => {
    const code = `users.find(u => u.id === 1).name;`;
    const issues = scanBugRules(code, "users.ts");
    const issue = issues.find((i) => i.ruleId === "bug/missing-null-check-find");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("medium");
  });
});
