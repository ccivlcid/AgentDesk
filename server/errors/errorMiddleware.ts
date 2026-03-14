import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./ApiError.ts";
import logger from "../lib/logger.ts";

/**
 * Global Express error-handling middleware.
 *
 * - ApiError instances → structured JSON with the appropriate status code.
 * - Unknown errors     → 500 with a generic error code.
 *
 * Register this AFTER all routes:
 *   app.use(apiErrorHandler);
 */
export function apiErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error("[apiErrorHandler] Unhandled error: %s", message);

  res.status(500).json({
    ok: false,
    error: "internal_server_error",
    message: "An internal error occurred",
  });
}
