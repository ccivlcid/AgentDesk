/**
 * Standardized API error class for backend route handlers.
 *
 * Throw this from any route handler and the global error middleware
 * will catch it and produce a uniform JSON response:
 *
 *   { ok: false, error: "<code>", message: "<human-readable>" }
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(statusCode: number, errorCode: string, message?: string) {
    super(message ?? errorCode);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  /* ── Convenience factories ─────────────────────────────────────── */

  static badRequest(code: string, message?: string): ApiError {
    return new ApiError(400, code, message);
  }

  static notFound(code: string, message?: string): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(code: string, message?: string): ApiError {
    return new ApiError(409, code, message);
  }

  static internal(code: string, message?: string): ApiError {
    return new ApiError(500, code, message);
  }
}
