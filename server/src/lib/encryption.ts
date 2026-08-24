import crypto from "crypto";
import config from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Derives a consistent 32-byte buffer key from the configured encryption key
 */
function getEncryptionKey(): Buffer {
  const secret = config.encryptionKey || "reporadar-default-encryption-key-32b";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/**
 * Encrypts a sensitive string (e.g. GitHub OAuth Access Token) using AES-256-GCM
 * Format returned: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptToken(token: string): string {
  if (!token) return "";

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token string
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return "";

  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export default {
  encryptToken,
  decryptToken,
};
