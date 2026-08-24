import { Response } from "express";

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200
): Response<ApiResponseSuccess<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  details?: unknown
): Response<ApiResponseError> => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(details ? { details } : {}),
    },
  });
};
