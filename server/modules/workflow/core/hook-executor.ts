/**
 * Hook Executor — runs hook_entries commands at task lifecycle events.
 *
 * Hooks are scoped by project > agent > department > global priority.
 * Each hook runs as a child process with configurable timeout.
 * All matching hooks execute in parallel (Promise.all) to avoid sequential blocking.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface HookRow {
  id: string;
  title: string;
  command: string;
  working_directory: string;
  timeout_ms: number;
  scope_type: string;
}

interface DbLike {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
  };
}

type HookEventType = "pre-task" | "post-task" | "on-error" | "on-complete" | "on-status-change" | "on-start";

interface HookContext {
  projectId: string | null;
  agentId: string | null;
  departmentId: string | null;
  taskId: string;
  workingDirectory?: string;
}

/**
 * Execute all matching hooks for the given event type and scope in parallel.
 * Failures are logged but do not block task execution.
 */
export async function executeHooks(
  db: DbLike,
  eventType: HookEventType,
  context: HookContext,
): Promise<void> {
  const { projectId, agentId, departmentId, taskId, workingDirectory } = context;

  const scopeConditions: string[] = ["(scope_type = 'global')"];
  const params: unknown[] = [eventType];

  if (projectId) {
    scopeConditions.push("(scope_type = 'project' AND scope_id = ?)");
    params.push(projectId);
  }
  if (agentId) {
    scopeConditions.push("(scope_type = 'agent' AND scope_id = ?)");
    params.push(agentId);
  }
  if (departmentId) {
    scopeConditions.push("(scope_type = 'department' AND scope_id = ?)");
    params.push(departmentId);
  }

  const scopeWhere = scopeConditions.join(" OR ");

  let hooks: HookRow[];
  try {
    hooks = db
      .prepare(
        `SELECT id, title, command, working_directory, timeout_ms, scope_type
         FROM hook_entries
         WHERE enabled = 1 AND event_type = ? AND (${scopeWhere})
         ORDER BY
           CASE scope_type
             WHEN 'project' THEN 1
             WHEN 'agent' THEN 2
             WHEN 'department' THEN 3
             WHEN 'global' THEN 4
           END,
           priority DESC
         LIMIT 20`,
      )
      .all(...params) as HookRow[];
  } catch {
    return;
  }

  if (hooks.length === 0) return;

  const now = Date.now();
  const env = {
    ...process.env,
    AGENTDESK_TASK_ID: taskId,
    AGENTDESK_EVENT_TYPE: eventType,
    AGENTDESK_PROJECT_ID: projectId || "",
    AGENTDESK_AGENT_ID: agentId || "",
  };

  // Run all hooks in parallel — each failure is independent
  await Promise.all(
    hooks.map(async (hook) => {
      const cwd = hook.working_directory || workingDirectory || process.cwd();
      const timeout = Math.min(Math.max(hook.timeout_ms || 30000, 1000), 300000);

      try {
        await execFileAsync("/bin/sh", ["-c", hook.command], {
          cwd,
          timeout,
          env: { ...env, AGENTDESK_HOOK_ID: hook.id },
        });

        // Update execution stats (best-effort)
        try {
          db.prepare(
            "UPDATE hook_entries SET execution_count = execution_count + 1, last_executed_at = ? WHERE id = ?",
          ).run(now, hook.id);
        } catch {
          /* stats update is best-effort */
        }
      } catch (err) {
        console.error(
          `[AgentDesk] Hook "${hook.title}" (${hook.id}) failed for ${eventType} on task ${taskId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
}
