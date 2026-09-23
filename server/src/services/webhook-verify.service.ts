import crypto from "crypto";

/**
 * Verifies GitHub webhook signature using HMAC-SHA256 and timingSafeEqual
 * @param rawBody - Raw Buffer or string of the incoming request body
 * @param signatureHeader - Value of the X-Hub-Signature-256 header (format: "sha256=<hex_hash>")
 * @param secret - The webhook secret string configured for the repository
 */
export function verifyGitHubWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  // Ensure header starts with "sha256="
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignatureHex = signatureHeader.slice(7).trim();
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");

  // Compute HMAC SHA-256
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(bodyBuffer);
  const calculatedSignatureHex = hmac.digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedSignatureHex, "hex");
    const calculatedBuffer = Buffer.from(calculatedSignatureHex, "hex");

    if (expectedBuffer.length !== calculatedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  } catch {
    return false;
  }
}

export default {
  verifyGitHubWebhookSignature,
};
