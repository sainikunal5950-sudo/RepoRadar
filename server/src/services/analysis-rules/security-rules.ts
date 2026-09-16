import { RuleIssue } from "./types";

/**
 * Scans code content for security vulnerabilities:
 * - Hardcoded secrets, API keys, tokens, and private keys
 * - SQL Injection patterns (dynamic string concatenation into queries)
 * - XSS vulnerabilities (innerHTML, eval, dangerouslySetInnerHTML)
 * - Insecure cryptographic algorithms (MD5, SHA-1, DES, RC4)
 */
export function scanSecurityRules(fileContent: string, filePath: string): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const lines = fileContent.split("\n");

  // Multi-line / whole-file pattern checks
  const awsKeyRegex = /\b(AKIA[0-9A-Z]{16})\b/;
  const privateKeyRegex = /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP )?PRIVATE KEY-----/;
  const hardcodedSecretRegex =
    /(?:api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key|client[_-]?secret|password|passwd|pwd)\s*(?:=|:)\s*["'`][a-zA-Z0-9_\-.~!@#$%^&*+=]{8,}["'`]/i;

  const sqlConcatRegex =
    /(?:db|client|pool|connection|sequelize|knex|prisma|\$queryRawUnsafe|\bquery|\bexecute)\s*\.\s*(?:query|execute|raw|all|get|run)\s*\(\s*["'`].*?(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|CREATE|ALTER).*?["'`]\s*\+/i;
  const sqlTemplateRegex =
    /(?:db|client|pool|connection|sequelize|knex|prisma|\$queryRawUnsafe|\bquery|\bexecute)\s*\.\s*(?:query|execute|raw|all|get|run)\s*\(\s*`.*?(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|CREATE|ALTER).*?\$\{.+?\}.*?`/i;
  const rawSqlConcatRegex =
    /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+FROM\s+.*?["'`]\s*\+\s*[a-zA-Z0-9_.]+/i;

  const innerHTMLRegex = /\.innerHTML\s*=\s*[^;]+/i;
  const dangerouslySetInnerRegex = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/;
  const evalRegex = /\beval\s*\([^)]+\)/;
  const docWriteRegex = /document\s*\.\s*write(?:ln)?\s*\(/;

  const md5Sha1Regex =
    /(?:createHash|createHmac|hashlib\.(?:md5|sha1)|MessageDigest\.getInstance)\s*\(\s*["'](?:md5|sha1)["']/i;
  const weakCipherRegex =
    /(?:createCipher|createCipheriv)\s*\(\s*["'](?:des|rc4|blowfish|null)["']/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip empty lines or pure single-line comment lines for simple checks
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      // Check private key even in comments or cert blocks
      if (privateKeyRegex.test(line)) {
        issues.push({
          filePath,
          lineNumber: lineNum,
          issueType: "security",
          severity: "critical",
          message: "Hardcoded private key detected in source code.",
          suggestedFix: "Store private keys in environment variables or a secure key management vault (e.g. AWS Secrets Manager, HashiCorp Vault).",
          codeSnippet: line.trim(),
          ruleId: "security/hardcoded-private-key",
        });
      }
      continue;
    }

    // 1. AWS Keys
    if (awsKeyRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "critical",
        message: "Hardcoded AWS Access Key ID detected.",
        suggestedFix: "Move AWS credentials to environment variables or use IAM roles / AWS SDK default credential providers.",
        codeSnippet: trimmed,
        ruleId: "security/hardcoded-aws-key",
      });
    }

    // 2. Private Keys
    else if (privateKeyRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "critical",
        message: "Hardcoded private key header detected.",
        suggestedFix: "Store private keys in environment variables or an enterprise secret store.",
        codeSnippet: trimmed,
        ruleId: "security/hardcoded-private-key",
      });
    }

    // 3. Hardcoded API Keys / Passwords / Secrets
    else if (
      hardcodedSecretRegex.test(line) &&
      !line.includes("process.env") &&
      !line.includes("import.meta.env") &&
      !line.includes("config.get") &&
      !line.includes("os.environ") &&
      !line.includes("System.getenv") &&
      !line.includes("placeholder") &&
      !line.includes("REPLACE_ME") &&
      !line.includes("YOUR_")
    ) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "critical",
        message: "Possible hardcoded API key, token, or password detected.",
        suggestedFix: "Extract sensitive credentials into environment variables (.env) and access them securely at runtime.",
        codeSnippet: trimmed,
        ruleId: "security/hardcoded-secret",
      });
    }

    // 4. SQL Injection (string concatenation & unescaped template literals)
    if (sqlConcatRegex.test(line) || sqlTemplateRegex.test(line) || rawSqlConcatRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "critical",
        message: "Potential SQL Injection detected: raw string concatenation or interpolation in SQL query.",
        suggestedFix: "Use parameterized queries or prepared statements (e.g., $1, ? placeholders or ORM parameterized inputs).",
        codeSnippet: trimmed,
        ruleId: "security/sql-injection",
      });
    }

    // 5. XSS - innerHTML assignment
    if (innerHTMLRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "high",
        message: "Direct innerHTML assignment detected (potential Cross-Site Scripting vulnerability).",
        suggestedFix: "Use textContent, innerText, or a sanitized DOM parser/purifier library (e.g. DOMPurify) before inserting HTML.",
        codeSnippet: trimmed,
        ruleId: "security/xss-inner-html",
      });
    }

    // 6. XSS - dangerouslySetInnerHTML
    if (dangerouslySetInnerRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "high",
        message: "Usage of dangerouslySetInnerHTML detected in React/JSX template.",
        suggestedFix: "Sanitize user input with DOMPurify or sanitize-html before passing it to dangerouslySetInnerHTML.",
        codeSnippet: trimmed,
        ruleId: "security/xss-dangerously-set-inner-html",
      });
    }

    // 7. eval() execution
    if (evalRegex.test(line) && !line.includes("//") && !line.includes("/*")) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "critical",
        message: "Dangerous use of eval() detected, allowing arbitrary code execution.",
        suggestedFix: "Avoid eval(). Use JSON.parse() for data or safe parsing alternatives.",
        codeSnippet: trimmed,
        ruleId: "security/eval-usage",
      });
    }

    // 8. document.write
    if (docWriteRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "high",
        message: "document.write() usage detected, which can expose DOM injection vulnerabilities.",
        suggestedFix: "Use modern DOM manipulation APIs like createElement and appendChild.",
        codeSnippet: trimmed,
        ruleId: "security/document-write",
      });
    }

    // 9. Insecure Crypto (MD5/SHA1/weak ciphers)
    if (md5Sha1Regex.test(line) || weakCipherRegex.test(line)) {
      issues.push({
        filePath,
        lineNumber: lineNum,
        issueType: "security",
        severity: "medium",
        message: "Insecure cryptographic hashing or cipher algorithm detected (MD5/SHA-1/DES/RC4).",
        suggestedFix: "Upgrade to modern cryptographic algorithms such as SHA-256, SHA-512, bcrypt, argon2, or AES-256-GCM.",
        codeSnippet: trimmed,
        ruleId: "security/insecure-crypto",
      });
    }
  }

  return issues;
}
