import { Request, Response, NextFunction } from "express";
import prisma from "../lib/db";
import AppError from "../lib/AppError";

export interface AIRateLimitInfo {
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      aiUsageInfo?: AIRateLimitInfo;
    }
  }
}

/**
 * Middleware that limits the number of AI operations a user can trigger per hour.
 */
export async function aiRateLimit(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError("Unauthorized access", 401, "UNAUTHORIZED"));
    }

    const userId = req.user.id;
    const limit = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || "50", 10);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count user AI operations in the past 1 hour
    const usageCount = await prisma.aIUsageLog.count({
      where: {
        user_id: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    const resetAt = new Date(now.getTime() + 60 * 60 * 1000);
    const remaining = Math.max(0, limit - usageCount);

    req.aiUsageInfo = {
      count: usageCount,
      limit,
      remaining,
      resetAt,
    };

    if (usageCount >= limit) {
      return next(
        new AppError(
          `Hourly AI usage limit reached (${limit} requests/hour). Quota resets at ${resetAt.toLocaleTimeString()}.`,
          429,
          "AI_RATE_LIMIT_EXCEEDED"
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default aiRateLimit;
