import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
  nextAuthSecret: process.env.NEXTAUTH_SECRET || "",
  jwtSecret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "reporadar-default-secret-key-change-in-production",
  encryptionKey: process.env.ENCRYPTION_KEY || "reporadar-default-encryption-key-32b",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
};

export default config;
