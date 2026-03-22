import { isApiRequestError } from "./core";

export type ToastVariant = "success" | "error" | "warning" | "info";

/**
 * User-facing messages for known API error codes.
 * Extend this map as new error codes are introduced on the backend.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  task_not_found: "Task not found",
  agent_not_found: "Agent not found",
  department_not_found: "Specialty not found",
  webhook_not_found: "Webhook not found",
  dependency_not_found: "Dependency not found",
  dependency_task_not_found: "Dependency task not found",
  circular_dependency: "This would create a circular dependency",
  self_dependency: "A task cannot depend on itself",
  depends_on_task_id_required: "Dependency task ID is required",
  name_and_url_required: "Name and URL are required",
  invalid_id: "Invalid ID",
  cost_limit_exceeded: "Execution blocked: cost limit exceeded",
  execution_timeout: "Task execution timed out",
  heartbeat_stalled: "Task heartbeat timed out",
  stalled_auto_recovered: "Task auto-recovered from stalled state",
  orphaned_run: "Task recovered from orphaned execution",
  already_running: "Task is already running",
  process_still_active: "Previous run is still stopping",
  internal_server_error: "An internal server error occurred",
};

/** HTTP-status fallback messages when no error code is available. */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  403: "Permission denied",
  404: "Resource not found",
  409: "Conflict",
  429: "Too many requests — please try again later",
  500: "Internal server error",
  502: "Upstream service error",
  503: "Service temporarily unavailable",
};

export interface HandleApiErrorOptions {
  /** Context label shown before the error (e.g. "Create task failed"). */
  context?: string;
  /** Override the toast variant. Defaults to "error". */
  variant?: ToastVariant;
  /** If true, also logs to console.error (default: true). */
  log?: boolean;
}

/**
 * Extracts a user-friendly message from an API error and calls `showToast`.
 *
 * Usage:
 *   try { await api.createTask(input); }
 *   catch (err) { handleApiError(err, showToast, { context: "Create task failed" }); }
 */
export function handleApiError(
  err: unknown,
  showToast: (message: string, variant?: ToastVariant) => void,
  options: HandleApiErrorOptions = {},
): void {
  const { context, variant = "error", log = true } = options;

  if (log) {
    console.error(context ?? "API error:", err);
  }

  let userMessage: string;

  if (isApiRequestError(err)) {
    // Try known error code → message mapping
    if (err.code && ERROR_CODE_MESSAGES[err.code]) {
      userMessage = ERROR_CODE_MESSAGES[err.code];
    } else if (err.code) {
      // Use server-provided message if available, else humanize the code
      userMessage = err.message || err.code.replace(/_/g, " ");
    } else {
      // Fallback to HTTP status message
      userMessage = STATUS_MESSAGES[err.status] ?? `Request failed (${err.status})`;
    }
  } else if (err instanceof Error) {
    userMessage = err.message || "An unexpected error occurred";
  } else {
    userMessage = "An unexpected error occurred";
  }

  const toastMessage = context ? `${context}: ${userMessage}` : userMessage;
  showToast(toastMessage, variant);
}
