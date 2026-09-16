import { scanCodeSmellRules } from "../code-smell-rules";

describe("Code Smell Rules Unit Tests", () => {
  it("should detect functions exceeding 50 lines", () => {
    const lines = ["function megaFunction() {"];
    for (let i = 0; i < 55; i++) {
      lines.push(`  const step${i} = ${i};`);
    }
    lines.push("  return true;");
    lines.push("}");
    const code = lines.join("\n");

    const issues = scanCodeSmellRules(code, "longFn.ts");
    expect(issues.some((i) => i.ruleId === "code-smell/long-function")).toBe(true);
    expect(issues.find((i) => i.ruleId === "code-smell/long-function")?.severity).toBe("low");
  });

  it("should detect missing documentation on exported symbols", () => {
    const code = `
export function calculateTax(amount: number) {
  return amount * 0.2;
}
`;
    const issues = scanCodeSmellRules(code, "tax.ts");
    expect(issues.some((i) => i.ruleId === "code-smell/missing-documentation")).toBe(true);
    expect(issues.find((i) => i.ruleId === "code-smell/missing-documentation")?.severity).toBe("low");
  });

  it("should detect deeply nested conditionals", () => {
    const code = `
function deepBranching() {
  if (true) {
    if (true) {
      if (true) {
                if (true) {
                  return "nested";
                }
      }
    }
  }
}
`;
    const issues = scanCodeSmellRules(code, "deep.ts");
    expect(issues.some((i) => i.ruleId === "code-smell/deeply-nested-control-flow")).toBe(true);
    expect(issues.find((i) => i.ruleId === "code-smell/deeply-nested-control-flow")?.severity).toBe("medium");
  });
});
