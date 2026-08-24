import { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    const statusCode = res.statusCode;

    // Log color / format based on status code
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`
    );
  });

  next();
};

export default requestLogger;
