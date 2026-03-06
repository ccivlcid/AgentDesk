/**
 * Heartbeat Engine - Proactive Agent System
 *
 * Periodically checks agent-assigned projects/tasks for anomalies:
 * - stale_tasks: tasks in_progress too long without updates
 * - blocked_tasks: tasks stuck in blocked/pending status
 * - consecutive_failures: agent failure rate from agent_usage_logs
 * - pending_decisions: unresolved decision inbox items
 *
 * Normal pattern: only notify CEO when anomalies are found.
 * Integrates with agent-anomaly-monitor for orphan detection.
 */

import type { ChildProcess } from "node:child_process";

export type HeartbeatCheckItem =
  | "stale_tasks"
  | "blocked_tasks"
  | "consecutive_failures"
  | "pending_decisions";

export const ALL_CHECK_ITEMS: HeartbeatCheckItem[] = [
  "stale_tasks",
  "blocked_tasks",
  "consecutive_failures",
  "pending_decisions",
];

interface HeartbeatConfig {
  agent_id: string;
  enabled: number;
  interval_minutes: number;
  check_items_json: string;
}

interface Finding {
  check: HeartbeatCheckItem;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

interface HeartbeatDeps {
  db: any;
  nowMs: () => number;
  activeProcesses: Map<string, ChildProcess>;
  broadcast: (type: string, payload: unknown) => void;
  insertNotification: (params: {
    type: "heartbeat";
    title: string;
    body?: string | null;
    task_id?: string | null;
    agent_id?: string | null;
  }) => string;
  notifyCeo: (content: string, taskId?: string | null) => void;
}

const SWEEP_INTERVAL_MS = 60_000; // check configs every 60s
const STALE_TASK_THRESHOLD_MS = 2 * 60 * 60_000; // 2 hours without update
const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export function startHeartbeatEngine(deps: HeartbeatDeps): {
  stop: () => void;
  triggerAgent: (agentId: string) => Finding[];
} {
  const { db, nowMs, activeProcesses, insertNotification, notifyCeo } = deps;

  // Track last heartbeat time per agent to respect intervals
  const lastHeartbeatAt = new Map<string, number>();

  function getEnabledConfigs(): Array<HeartbeatConfig & { agent_name: string; agent_name_ko: string }> {
    return db
      .prepare(
        `SELECT hc.*, a.name AS agent_name, COALESCE(a.name_ko, '') AS agent_name_ko
         FROM heartbeat_configs hc
         JOIN agents a ON a.id = hc.agent_id
         WHERE hc.enabled = 1`,
      )
      .all() as Array<HeartbeatConfig & { agent_name: string; agent_name_ko: string }>;
  }

  function parseCheckItems(json: string): HeartbeatCheckItem[] {
    try {
      const items = JSON.parse(json);
      if (!Array.isArray(items)) return ALL_CHECK_ITEMS;
      return items.filter((i: string) => ALL_CHECK_ITEMS.includes(i as HeartbeatCheckItem)) as HeartbeatCheckItem[];
    } catch {
      return ALL_CHECK_ITEMS;
    }
  }

  function checkStaleTasks(agentId: string, now: number): Finding[] {
    const findings: Finding[] = [];
    const staleTasks = db
      .prepare(
        `SELECT id, title, updated_at FROM tasks
         WHERE assigned_agent_id = ? AND status = 'in_progress'
         AND updated_at < ?`,
      )
      .all(agentId, now - STALE_TASK_THRESHOLD_MS) as Array<{
      id: string;
      title: string;
      updated_at: number;
    }>;

    for (const task of staleTasks) {
      const hoursStale = Math.round((now - task.updated_at) / 3_600_000);
      findings.push({
        check: "stale_tasks",
        severity: hoursStale > 6 ? "critical" : "warning",
        message: `Task "${task.title}" has been in progress for ${hoursStale}h without updates`,
        details: { task_id: task.id, hours_stale: hoursStale },
      });
    }
    return findings;
  }

  function checkBlockedTasks(agentId: string): Finding[] {
    const findings: Finding[] = [];
    const blockedTasks = db
      .prepare(
        `SELECT id, title, status FROM tasks
         WHERE assigned_agent_id = ? AND status IN ('pending')`,
      )
      .all(agentId) as Array<{ id: string; title: string; status: string }>;

    for (const task of blockedTasks) {
      findings.push({
        check: "blocked_tasks",
        severity: "warning",
        message: `Task "${task.title}" is in ${task.status} status`,
        details: { task_id: task.id, status: task.status },
      });
    }

    // Also check blocked subtasks
    const blockedSubtasks = db
      .prepare(
        `SELECT s.id, s.title, s.blocked_reason, t.title AS parent_title
         FROM subtasks s
         JOIN tasks t ON t.id = s.task_id
         WHERE s.assigned_agent_id = ? AND s.status = 'blocked'`,
      )
      .all(agentId) as Array<{
      id: string;
      title: string;
      blocked_reason: string | null;
      parent_title: string;
    }>;

    for (const sub of blockedSubtasks) {
      findings.push({
        check: "blocked_tasks",
        severity: "warning",
        message: `Subtask "${sub.title}" (parent: ${sub.parent_title}) is blocked${sub.blocked_reason ? `: ${sub.blocked_reason}` : ""}`,
        details: { subtask_id: sub.id },
      });
    }
    return findings;
  }

  function checkConsecutiveFailures(agentId: string, now: number): Finding[] {
    const findings: Finding[] = [];
    const recentLogs = db
      .prepare(
        `SELECT exit_code FROM agent_usage_logs
         WHERE agent_id = ? AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(agentId, now - 6 * 60 * 60_000, CONSECUTIVE_FAILURE_THRESHOLD) as Array<{
      exit_code: number | null;
    }>;

    if (recentLogs.length >= CONSECUTIVE_FAILURE_THRESHOLD) {
      const allFailed = recentLogs.every((r) => r.exit_code !== 0 && r.exit_code != null);
      if (allFailed) {
        findings.push({
          check: "consecutive_failures",
          severity: "critical",
          message: `Agent has ${recentLogs.length} consecutive task failures in the last 6 hours`,
          details: { failure_count: recentLogs.length },
        });
      }
    }
    return findings;
  }

  function checkPendingDecisions(_agentId: string): Finding[] {
    const findings: Finding[] = [];
    // Check project_review_decision_states in 'ready' status
    const pendingReviews = db
      .prepare(
        `SELECT prs.project_id, p.name AS project_name
         FROM project_review_decision_states prs
         JOIN projects p ON p.id = prs.project_id
         WHERE prs.status = 'ready'`,
      )
      .all() as Array<{ project_id: string; project_name: string }>;

    for (const review of pendingReviews) {
      findings.push({
        check: "pending_decisions",
        severity: "warning",
        message: `Project "${review.project_name}" has a pending review decision`,
        details: { project_id: review.project_id },
      });
    }
    return findings;
  }

  function runHeartbeatForAgent(
    agentId: string,
    agentName: string,
    checkItems: HeartbeatCheckItem[],
  ): Finding[] {
    const now = nowMs();
    const allFindings: Finding[] = [];

    for (const check of checkItems) {
      switch (check) {
        case "stale_tasks":
          allFindings.push(...checkStaleTasks(agentId, now));
          break;
        case "blocked_tasks":
          allFindings.push(...checkBlockedTasks(agentId));
          break;
        case "consecutive_failures":
          allFindings.push(...checkConsecutiveFailures(agentId, now));
          break;
        case "pending_decisions":
          allFindings.push(...checkPendingDecisions(agentId));
          break;
      }
    }

    // Record heartbeat log
    const status = allFindings.length === 0 ? "ok" : allFindings.some((f) => f.severity === "critical") ? "alert" : "alert";
    db.prepare(
      "INSERT INTO heartbeat_logs (agent_id, status, summary, findings_json, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      agentId,
      allFindings.length === 0 ? "ok" : status,
      allFindings.length === 0
        ? "HEARTBEAT_OK"
        : `${allFindings.length} finding(s) detected`,
      JSON.stringify(allFindings),
      now,
    );

    // Normal pattern: only notify when anomalies found
    if (allFindings.length > 0) {
      const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
      const warningCount = allFindings.filter((f) => f.severity === "warning").length;

      const severityLabel = criticalCount > 0 ? "CRITICAL" : "WARNING";
      const title = `${agentName} heartbeat: ${severityLabel} (${allFindings.length} finding${allFindings.length > 1 ? "s" : ""})`;
      const body = allFindings.map((f) => `[${f.severity.toUpperCase()}] ${f.message}`).join("\n");

      insertNotification({
        type: "heartbeat",
        title,
        body,
        agent_id: agentId,
      });

      // Also notify CEO via messenger
      const summary = criticalCount > 0
        ? `${criticalCount} critical, ${warningCount} warning`
        : `${warningCount} warning`;
      notifyCeo(`[Heartbeat] ${agentName}: ${summary} - ${allFindings[0].message}${allFindings.length > 1 ? ` (+${allFindings.length - 1} more)` : ""}`);
    }

    return allFindings;
  }

  function sweep(): void {
    const now = nowMs();
    const configs = getEnabledConfigs();

    for (const config of configs) {
      const intervalMs = config.interval_minutes * 60_000;
      const lastRun = lastHeartbeatAt.get(config.agent_id) ?? 0;

      if (now - lastRun < intervalMs) continue;

      lastHeartbeatAt.set(config.agent_id, now);

      const checkItems = parseCheckItems(config.check_items_json);
      runHeartbeatForAgent(config.agent_id, config.agent_name, checkItems);
    }
  }

  // Trigger heartbeat for a specific agent manually
  function triggerAgent(agentId: string): Finding[] {
    const config = db
      .prepare(
        `SELECT hc.*, a.name AS agent_name
         FROM heartbeat_configs hc
         JOIN agents a ON a.id = hc.agent_id
         WHERE hc.agent_id = ?`,
      )
      .get(agentId) as (HeartbeatConfig & { agent_name: string }) | undefined;

    const agentRow = db.prepare("SELECT name FROM agents WHERE id = ?").get(agentId) as
      | { name: string }
      | undefined;
    if (!agentRow) return [];

    const checkItems = config ? parseCheckItems(config.check_items_json) : ALL_CHECK_ITEMS;
    lastHeartbeatAt.set(agentId, nowMs());
    return runHeartbeatForAgent(agentId, agentRow.name, checkItems);
  }

  const initialTimeout = setTimeout(sweep, 15_000);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);

  return {
    stop() {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    },
    triggerAgent,
  };
}
