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
  db: {
    prepare: (sql: string) => {
      get: (...args: unknown[]) => unknown;
      all: (...args: unknown[]) => unknown[];
    };
  };
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

// 동적 임계값 계산에 사용할 최근 샘플 수
const DYNAMIC_WINDOW_SIZE = 20;
// Z-score가 이 값을 초과하면 이상으로 판단
const Z_SCORE_THRESHOLD = 2.5;
// 동적 임계값 계산에 필요한 최소 샘플 수 (미달 시 고정값 사용)
const MIN_SAMPLES_FOR_DYNAMIC = 5;

// Track which anomalies we've already alerted to avoid spam
const alertedAnomalies = new Set<string>();

function clearAnomalyAlert(key: string): void {
  setTimeout(() => alertedAnomalies.delete(key), 30 * 60_000); // reset after 30min
}

/** 최근 N개 태스크 실행 시간(ms) 샘플로 Z-score 기반 동적 이상 임계값 계산 */
function computeDynamicDurationThreshold(
  samples: number[],
  fallbackMs: number,
): number {
  if (samples.length < MIN_SAMPLES_FOR_DYNAMIC) return fallbackMs;
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return fallbackMs;
  // 임계값 = mean + Z * stddev (최소 5분, 최대 4시간)
  return Math.min(Math.max(mean + Z_SCORE_THRESHOLD * stddev, 5 * 60_000), 4 * 60 * 60_000);
}

export function startAgentAnomalyMonitor(deps: AnomalyMonitorDeps): { stop: () => void } {
  const { db, nowMs, activeProcesses, insertNotification } = deps;

  /**
   * Z-score 기반 동적 stale 임계값 계산.
   * 최근 완료된 태스크의 실행 시간 분포로 이상 실행 시간을 판단한다.
   */
  function getDynamicStaleDurationMs(): number {
    const FALLBACK_MS = 2 * 60 * 60_000; // 기본 2시간
    try {
      const rows = db
        .prepare(
          `SELECT (completed_at - started_at) AS duration_ms
           FROM tasks
           WHERE status = 'done'
             AND started_at IS NOT NULL
             AND completed_at IS NOT NULL
             AND (completed_at - started_at) > 0
           ORDER BY completed_at DESC
           LIMIT ?`,
        )
        .all(DYNAMIC_WINDOW_SIZE) as Array<{ duration_ms: number }>;
      const samples = rows.map((r) => r.duration_ms);
      return computeDynamicDurationThreshold(samples, FALLBACK_MS);
    } catch {
      return FALLBACK_MS;
    }
  }

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

  // 3. 동적 임계값 기반 stale 에이전트 감지
  // (고정 임계값이 아닌 최근 태스크 실행 시간 분포에서 Z-score로 계산)
  function sweepStaleDynamic(): void {
    const now = nowMs();
    const dynamicThresholdMs = getDynamicStaleDurationMs();

    const staleAgents = db
      .prepare(
        `SELECT a.id, a.name, a.name_ko, a.current_task_id,
                t.started_at, t.title AS task_title
         FROM agents a
         LEFT JOIN tasks t ON t.id = a.current_task_id
         WHERE a.status = 'working'
           AND a.current_task_id IS NOT NULL
           AND t.started_at IS NOT NULL
           AND ? - t.started_at > ?`,
      )
      .all(now, dynamicThresholdMs) as Array<{
        id: string;
        name: string;
        name_ko: string;
        current_task_id: string;
        started_at: number;
        task_title: string | null;
      }>;

    for (const agent of staleAgents) {
      const elapsedMin = Math.round((now - agent.started_at) / 60_000);
      const alertKey = `stale_dynamic:${agent.id}:${agent.current_task_id}`;
      if (alertedAnomalies.has(alertKey)) continue;
      alertedAnomalies.add(alertKey);
      clearAnomalyAlert(alertKey);

      const thresholdMin = Math.round(dynamicThresholdMs / 60_000);
      insertNotification({
        type: "agent_anomaly",
        title: `${agent.name}: unusually long execution`,
        body: `Agent has been running for ${elapsedMin}min (dynamic threshold: ${thresholdMin}min based on recent task history). Task: ${agent.task_title || agent.current_task_id}`,
        task_id: agent.current_task_id,
        agent_id: agent.id,
      });
    }
  }

  // Run first sweep after a short delay to let the system initialize
  const initialTimeout = setTimeout(sweep, 10_000);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);

  // Dynamic stale sweep: 5분마다 (고정 sweep과 별도 주기)
  const staleInterval = setInterval(sweepStaleDynamic, 5 * 60_000);
  setTimeout(sweepStaleDynamic, 30_000);

  return {
    stop() {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      clearInterval(staleInterval);
    },
  };
}
