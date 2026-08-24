import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import AppError from "../lib/AppError";
import { AuthUserPayload } from "../types";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required: Bearer token missing", 401, "UNAUTHORIZED"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    
    if (!decoded || !decoded.id || !decoded.email) {
      return next(new AppError("Invalid token payload", 401, "UNAUTHORIZED"));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token has expired. Please sign in again", 401, "TOKEN_EXPIRED"));
    }
    return next(new AppError("Invalid authentication token", 401, "UNAUTHORIZED"));
  }
};

export default authMiddleware;
