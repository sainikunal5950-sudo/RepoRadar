import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import config from "./config";
import apiRouter from "./routes";
import requestLogger from "./middleware/requestLogger";
import errorHandler from "./middleware/errorHandler";
import AppError from "./lib/AppError";

const app = express();

// 1. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// 2. Body Parser Middleware
app.use(express.json());

// 3. Request Logging Middleware
app.use(requestLogger);

// 4. API Routes (mounted under /api)
app.use("/api", apiRouter);

// 5. Root Info Endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    name: "RepoRadar API Server",
    version: "0.1.0",
    status: "online",
    endpoints: {
      health: "/api/health",
      projects: "/api/projects",
    },
  });
});

// 6. 404 Fallback for unhandled routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
});

// 7. Centralized Error Handler (must be last)
app.use(errorHandler);

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 RepoRadar API server running on port ${config.port}`);
  console.log(`📡 Accepting client requests from: ${config.clientUrl}`);
  console.log(`🩺 Health check available at: http://localhost:${config.port}/api/health`);
  console.log(`📂 Projects API available at: http://localhost:${config.port}/api/projects`);
});

export default app;
