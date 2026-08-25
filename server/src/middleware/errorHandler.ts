import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import AppError from "../lib/AppError";
import config from "../config";

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Default values
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_SERVER_ERROR";
  let details: unknown = undefined;

  // Custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = (err as unknown as { details?: unknown }).details;
  }
  // Zod Validation Error
  else if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    const issues = err.issues || [];
    message = issues.map((e) => `${e.path.join(".") || "field"}: ${e.message}`).join(", ");
    details = issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  }
  // JSON Syntax Error
  else if ("type" in err && (err as { type: string }).type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Invalid JSON in request body";
  }
  // Prisma known errors
  else if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === "P2025") {
      statusCode = 404;
      code = "NOT_FOUND";
      message = "Record not found";
    } else if (prismaErr.code === "P2002") {
      statusCode = 409;
      code = "CONFLICT";
      const target = Array.isArray(prismaErr.meta?.target)
        ? prismaErr.meta.target.join(", ")
        : typeof prismaErr.meta?.target === "string"
        ? prismaErr.meta.target
        : "unknown";
      message = `Unique constraint failed on field(s): ${target}`;
    }
  }
  // Prisma validation/argument errors (e.g. invalid ObjectId format)
  else if (err.name === "PrismaClientValidationError") {
    statusCode = 400;
    code = "DATABASE_VALIDATION_ERROR";
    message = "Invalid database query parameters or payload";
  }

  // In development, log the full error stack
  if (config.nodeEnv === "development" && statusCode >= 500) {
    console.error("💥 Unhandled Exception:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(details ? { details } : {}),
      ...(config.nodeEnv === "development" && statusCode >= 500
        ? { stack: err.stack }
        : {}),
    },
  });
};

export default errorHandler;
