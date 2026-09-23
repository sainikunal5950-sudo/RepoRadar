import crypto from "crypto";
import {
  verifyGitHubWebhookSignature,
} from "../webhook-verify.service";
import {
  parseDiffAddedLines,
  calculatePRRiskLevel,
  isSecuritySensitivePath,
  scanDiffForIssues,
} from "../pr-review.service";

describe("Webhook Verification Service", () => {
  const secret = "test-webhook-secret-key-12345";
  const payloadString = JSON.stringify({
    action: "opened",
    pull_request: { id: 101, number: 1, title: "Add auth" },
  });

  it("should successfully verify a valid HMAC-SHA256 signature", () => {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(Buffer.from(payloadString, "utf8"));
    const validSignature = `sha256=${hmac.digest("hex")}`;

    const isValid = verifyGitHubWebhookSignature(
      Buffer.from(payloadString, "utf8"),
      validSignature,
      secret
    );

    expect(isValid).toBe(true);
  });

  it("should reject tampered payload or modified signature", () => {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(Buffer.from(payloadString, "utf8"));
    const validSignature = `sha256=${hmac.digest("hex")}`;

    const tamperedPayload = JSON.stringify({
      action: "opened",
      pull_request: { id: 999, number: 1, title: "Tampered" },
    });

    const isValid = verifyGitHubWebhookSignature(
      Buffer.from(tamperedPayload, "utf8"),
      validSignature,
      secret
    );

    expect(isValid).toBe(false);
  });

  it("should reject signature when secret is incorrect", () => {
    const hmac = crypto.createHmac("sha256", "wrong-secret");
    hmac.update(Buffer.from(payloadString, "utf8"));
    const signature = `sha256=${hmac.digest("hex")}`;

    const isValid = verifyGitHubWebhookSignature(
      Buffer.from(payloadString, "utf8"),
      signature,
      secret
    );

    expect(isValid).toBe(false);
  });

  it("should return false for missing or malformed signature header", () => {
    expect(verifyGitHubWebhookSignature(Buffer.from(payloadString), undefined, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(Buffer.from(payloadString), "invalid-header", secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(undefined, "sha256=123", secret)).toBe(false);
  });
});

describe("PR Diff Parsing & Line Mapping", () => {
  const samplePatch = `@@ -10,6 +10,8 @@ export function authenticate() {
   const config = getConfig();
-  const oldToken = null;
+  const secretKey = "hardcoded_api_key_value";
+  const token = jwt.sign({}, secretKey);
   return token;
 }`;

  it("should correctly isolate only added (+) lines and map their new file line numbers", () => {
    const addedLines = parseDiffAddedLines(samplePatch);

    expect(addedLines.length).toBe(2);
    expect(addedLines[0].newLineNumber).toBe(11);
    expect(addedLines[0].content).toBe('  const secretKey = "hardcoded_api_key_value";');
    expect(addedLines[1].newLineNumber).toBe(12);
    expect(addedLines[1].content).toBe("  const token = jwt.sign({}, secretKey);");
  });

  it("should detect security rule violations in added diff lines", () => {
    const issues = scanDiffForIssues("src/auth/token.ts", samplePatch);

    expect(issues.length).toBeGreaterThan(0);
    // Should catch hardcoded secret / API key pattern
    const hasSecretIssue = issues.some(
      (i) => i.issueType === "security" || i.severity === "critical" || i.severity === "high"
    );
    expect(hasSecretIssue).toBe(true);
  });
});

describe("PR Risk Level Calculation", () => {
  it("should return 'critical' when any critical issue is present", () => {
    const issues = [
      { severity: "critical", issueType: "security" },
      { severity: "low", issueType: "code-smell" },
    ];
    const risk = calculatePRRiskLevel(issues, ["src/utils.ts"]);
    expect(risk).toBe("critical");
  });

  it("should return 'high' when high severity issues exist with no critical issues", () => {
    const issues = [
      { severity: "high", issueType: "bug" },
      { severity: "medium", issueType: "performance" },
    ];
    const risk = calculatePRRiskLevel(issues, ["src/index.ts"]);
    expect(risk).toBe("high");
  });

  it("should return 'medium' when only medium or low issues exist", () => {
    const issues = [
      { severity: "medium", issueType: "performance" },
      { severity: "low", issueType: "code-smell" },
    ];
    const risk = calculatePRRiskLevel(issues, ["src/components/Button.tsx"]);
    expect(risk).toBe("medium");
  });

  it("should bump clean PRs touching security-sensitive files to 'medium' risk", () => {
    const issues: any[] = [];
    const sensitiveFiles = ["src/middleware/auth.ts", "src/config/jwt.ts"];
    const risk = calculatePRRiskLevel(issues, sensitiveFiles);
    expect(risk).toBe("medium");
  });

  it("should return 'low' for clean PRs touching ordinary files", () => {
    const issues: any[] = [];
    const regularFiles = ["src/components/Header.tsx", "README.md"];
    const risk = calculatePRRiskLevel(issues, regularFiles);
    expect(risk).toBe("low");
  });

  it("should identify security sensitive paths accurately", () => {
    expect(isSecuritySensitivePath("src/auth/login.ts")).toBe(true);
    expect(isSecuritySensitivePath("server/.env.example")).toBe(true);
    expect(isSecuritySensitivePath("src/lib/crypto.ts")).toBe(true);
    expect(isSecuritySensitivePath("src/components/Header.tsx")).toBe(false);
  });
});
