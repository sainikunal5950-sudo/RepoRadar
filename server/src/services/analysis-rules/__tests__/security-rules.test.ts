import { scanSecurityRules } from "../security-rules";

describe("Security Rules Unit Tests", () => {
  it("should detect hardcoded AWS Access Key", () => {
    const code = `const awsKey = "AKIA1234567890ABCDEF";`;
    const issues = scanSecurityRules(code, "config.js");

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.ruleId === "security/hardcoded-aws-key")).toBe(true);
    expect(issues[0].severity).toBe("critical");
    expect(issues[0].issueType).toBe("security");
  });

  it("should detect hardcoded passwords/secrets", () => {
    const code = `const api_key = "super_secret_token_123456";`;
    const issues = scanSecurityRules(code, "api.ts");

    expect(issues.some((i) => i.ruleId === "security/hardcoded-secret")).toBe(true);
    expect(issues[0].severity).toBe("critical");
  });

  it("should detect SQL injection concatenation", () => {
    const code = `const query = db.query("SELECT * FROM users WHERE id = " + userId);`;
    const issues = scanSecurityRules(code, "models/user.ts");

    expect(issues.some((i) => i.ruleId === "security/sql-injection")).toBe(true);
    expect(issues[0].severity).toBe("critical");
  });

  it("should detect XSS innerHTML assignment", () => {
    const code = `element.innerHTML = "<p>" + userInput + "</p>";`;
    const issues = scanSecurityRules(code, "app.js");

    expect(issues.some((i) => i.ruleId === "security/xss-inner-html")).toBe(true);
    expect(issues[0].severity).toBe("high");
  });

  it("should detect dangerouslySetInnerHTML in JSX", () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: rawContent }} />`;
    const issues = scanSecurityRules(code, "Component.tsx");

    expect(issues.some((i) => i.ruleId === "security/xss-dangerously-set-inner-html")).toBe(true);
    expect(issues[0].severity).toBe("high");
  });

  it("should detect dangerous eval usage", () => {
    const code = `const result = eval(userCode);`;
    const issues = scanSecurityRules(code, "runner.js");

    expect(issues.some((i) => i.ruleId === "security/eval-usage")).toBe(true);
    expect(issues[0].severity).toBe("critical");
  });

  it("should detect weak crypto algorithm MD5/SHA1", () => {
    const code = `const hash = crypto.createHash("md5").update(data).digest("hex");`;
    const issues = scanSecurityRules(code, "utils/hash.ts");

    expect(issues.some((i) => i.ruleId === "security/insecure-crypto")).toBe(true);
    expect(issues[0].severity).toBe("medium");
  });
});
