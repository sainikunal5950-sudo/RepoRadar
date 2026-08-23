import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());

// Health Check Route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "reporadar-api",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Root fallback
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    name: "RepoRadar API Server",
    version: "0.1.0",
    healthCheck: "/api/health",
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 RepoRadar API server running on port ${config.port}`);
  console.log(`📡 Accepting client requests from: ${config.clientUrl}`);
  console.log(`🩺 Health check available at: http://localhost:${config.port}/api/health`);
});

export default app;
