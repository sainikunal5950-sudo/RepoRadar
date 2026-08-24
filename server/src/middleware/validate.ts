import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import AppError from "../lib/AppError";

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate = (schema: RequestValidationSchema | ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Check if schema has explicit body/params/query keys
      if ("body" in schema || "params" in schema || "query" in schema) {
        const complexSchema = schema as RequestValidationSchema;
        if (complexSchema.body) {
          req.body = await complexSchema.body.parseAsync(req.body);
        }
        if (complexSchema.params) {
          req.params = (await complexSchema.params.parseAsync(req.params)) as Record<string, string>;
        }
        if (complexSchema.query) {
          req.query = (await complexSchema.query.parseAsync(req.query)) as Record<string, string>;
        }
      } else {
        // Direct schema defaults to validating req.body
        req.body = await (schema as ZodTypeAny).parseAsync(req.body);
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
