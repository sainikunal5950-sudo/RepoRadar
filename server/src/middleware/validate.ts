import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny, z } from "zod";
import AppError from "../lib/AppError";

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (
        schema instanceof z.ZodObject &&
        ("body" in schema.shape || "params" in schema.shape || "query" in schema.shape)
      ) {
        const parsed = (await schema.parseAsync({
          body: req.body,
          params: req.params,
          query: req.query,
        })) as { body?: unknown; params?: unknown; query?: unknown };

        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.params !== undefined) req.params = parsed.params as Record<string, string>;
        if (parsed.query !== undefined) req.query = parsed.query as Record<string, string>;
      } else {
        req.body = await schema.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || [];
        const formattedErrors = issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        const message = issues
          .map((e) => `${e.path.join(".") || "field"}: ${e.message}`)
          .join(", ");
        const appError = new AppError(message, 400, "VALIDATION_ERROR");
        (appError as unknown as { details: unknown }).details = formattedErrors;
        return next(appError);
      }
      next(error);
    }
  };
};

export default validate;
