import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn(
      { err, statusCode: err.statusCode, url: req.url, method: req.method },
      err.message,
    );
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  const isError = err instanceof Error;

  logger.error(
    {
      err,
      url: req.url,
      method: req.method,
      stack: isError ? err.stack : undefined,
    },
    isError ? err.message : "Unexpected error",
  );

  const isDev = process.env.NODE_ENV !== "production";

  res.status(500).json({
    error: "Internal Server Error",
    ...(isDev && isError
      ? { message: err.message, stack: err.stack }
      : {}),
  });
}
