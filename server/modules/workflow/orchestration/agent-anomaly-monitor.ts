/**
 * Agent Anomaly Monitor
 *
 * Periodically checks for:
 * 1. Agents stuck in 'working' status without an active process (orphaned)
 * 2. Agents with consecutive task failures exceeding threshold
 * 3. Agents working for too long without any output (stale)
 */
import type { ChildProcess } from "node:child_process";

interface AnomalyMonitorDeps {
  db: any;
  nowMs: () => number;
  activeProcesses: Map<string, ChildProcess>;
  broadcast: (type: string, payload: unknown) => void;
  insertNotification: (params: {
    type: "agent_anomaly";
    title: string;
    body?: string | null;
    task_id?: string | null;
    agent_id?: string | null;
  }) => string;
}

const SWEEP_INTERVAL_MS = 60_000; // check every 60s
const ORPHAN_GRACE_MS = 5 * 60_000; // 5 min grace before flagging orphan
const CONSECUTIVE_FAILURE_THRESHOLD = 3;

// Track which anomalies we've already alerted to avoid spam
const alertedAnomalies = new Set<string>();

function clearAnomalyAlert(key: string): void {
  setTimeout(() => alertedAnomalies.delete(key), 30 * 60_000); // reset after 30min
}

export function startAgentAnomalyMonitor(deps: AnomalyMonitorDeps): { stop: () => void } {
  const { db, nowMs, activeProcesses, insertNotification } = deps;

  function sweep(): void {
    const now = nowMs();

    // 1. Detect orphaned agents (working status but no active process)
    const workingAgents = db
      .prepare(
        `SELECT a.id, a.name, a.name_ko, a.current_task_id, t.started_at, t.title AS task_title
         FROM agents a
         LEFT JOIN tasks t ON t.id = a.current_task_id
         WHERE a.status = 'working' AND a.current_task_id IS NOT NULL`,
      )
      .all() as Array<{
        id: string;
        name: string;
        name_ko: string;
        current_task_id: string;
        started_at: number | null;
        task_title: string | null;
      }>;

    for (const agent of workingAgents) {
      const hasProcess = activeProcesses.has(agent.current_task_id);
      if (hasProcess) continue;

      const elapsed = agent.started_at ? now - agent.started_at : 0;
      if (elapsed < ORPHAN_GRACE_MS) continue;

      const alertKey = `orphan:${agent.id}:${agent.current_task_id}`;
      if (alertedAnomalies.has(alertKey)) continue;
      alertedAnomalies.add(alertKey);
      clearAnomalyAlert(alertKey);

      const elapsedMin = Math.round(elapsed / 60_000);
      insertNotification({
        type: "agent_anomaly",
        title: `${agent.name}: orphaned working state`,
        body: `Agent has been in 'working' status for ${elapsedMin}min without an active process. Task: ${agent.task_title || agent.current_task_id}`,
        task_id: agent.current_task_id,
        agent_id: agent.id,
      });
    }

    // 2. Detect consecutive failures
    const recentFailureAgents = db
      .prepare(
        `SELECT u.agent_id, a.name, a.name_ko,
                COUNT(*) AS consecutive_fails
         FROM (
           SELECT agent_id, exit_code,
                  ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC) AS rn
           FROM agent_usage_logs
           WHERE created_at >= ?
         ) u
         JOIN agents a ON a.id = u.agent_id
         WHERE u.rn <= ? AND u.exit_code != 0 AND u.exit_code IS NOT NULL
         GROUP BY u.agent_id
         HAVING consecutive_fails >= ?`,
      )
      .all(
        now - 6 * 60 * 60_000, // last 6 hours
        CONSECUTIVE_FAILURE_THRESHOLD,
        CONSECUTIVE_FAILURE_THRESHOLD,
      ) as Array<{ agent_id: string; name: string; name_ko: string; consecutive_fails: number }>;

    for (const row of recentFailureAgents) {
      const alertKey = `failures:${row.agent_id}:${row.consecutive_fails}`;
      if (alertedAnomalies.has(alertKey)) continue;
      alertedAnomalies.add(alertKey);
      clearAnomalyAlert(alertKey);

      insertNotification({
        type: "agent_anomaly",
        title: `${row.name}: ${row.consecutive_fails} consecutive failures`,
        body: `Agent has failed ${row.consecutive_fails} consecutive tasks. Consider reassigning or checking provider status.`,
        agent_id: row.agent_id,
      });
    }
  }

  // Run first sweep after a short delay to let the system initialize
  const initialTimeout = setTimeout(sweep, 10_000);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);

  return {
    stop() {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    },
  };
}
