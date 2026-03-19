import type { RuntimeContext } from "../types/runtime-context.ts";
import type { IncomingMessage } from "node:http";
import type { WebSocket as WsSocket } from "ws";
import fs from "node:fs";
import path from "path";
import { HOST, PKG_VERSION, PORT } from "../config/runtime.ts";
import logger from "../lib/logger.ts";
import { notifyTaskStatus } from "../gateway/client.ts";
import { startDiscordReceiver } from "../messenger/discord-receiver.ts";
import { startTelegramReceiver } from "../messenger/telegram-receiver.ts";
import { startSlackReceiver } from "../messenger/slack-receiver.ts";
import { registerGracefulShutdownHandlers } from "./lifecycle/register-graceful-shutdown.ts";
import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "./workflow/core/task-execution-meta.ts";
import { TASK_STALLED_THRESHOLD_MS, TASK_STALLED_RECOVERY_THRESHOLD_MS } from "../db/runtime.ts";
import { startWorkflowScheduler } from "./workflow/workflow-scheduler.ts";
import { startOllama, getOllamaRunning } from "./local-llm/backend-manager.ts";
import { startMetricsPoller } from "./local-llm/metrics-collector.ts";
import { startObsidianWatcher } from "./synapse/obsidian-watcher.ts";
import { startNotionPoller } from "./synapse/notion-poller.ts";

export function startLifecycle(ctx: RuntimeContext): void {
  const {
    IN_PROGRESS_ORPHAN_GRACE_MS,
    IN_PROGRESS_ORPHAN_SWEEP_MS,
    SUBTASK_DELEGATION_SWEEP_MS,
    WebSocket,
    WebSocketServer,
    activeProcesses,
    app,
    appendTaskLog,
    broadcast,
    handleClientMessage,
    removeClient,
    clearTaskWorkflowState,
    db,
    dbPath,
    detectAllCli,
    distDir,
    endTaskExecutionSession,
    express,
    finishReview,
    getDecryptedOAuthToken,
    handleTaskRunComplete,
    isAgentInMeeting,
    isIncomingMessageAuthenticated,
    isIncomingMessageOriginTrusted,
    isPidAlive,
    isProduction,
    killPidTree,
    notifyClient,
    nowMs,
    processSubtaskDelegations,
    reconcileCrossDeptSubtasks,
    refreshGoogleToken,
    resolveLang,
    rollbackTaskWorktree,
    runInTransaction,
    stopProgressTimer,
    stopRequestedTasks,
    taskExecutionSessions,
    wsClients,
    logsDir,
  } = ctx as any;

  // ---------------------------------------------------------------------------
  // Production: serve React UI from dist/
  // ---------------------------------------------------------------------------
  if (isProduction) {
    app.use(express.static(distDir));
    // SPA fallback: serve index.html for non-API routes (Express 5 named wildcard)
    app.get(
      "/{*splat}",
      (
        req: { path: string },
        res: {
          status(code: number): { json(payload: unknown): unknown };
          sendFile(filePath: string): unknown;
        },
      ) => {
        if (req.path.startsWith("/api/") || req.path === "/health" || req.path === "/healthz") {
          return res.status(404).json({ error: "not_found" });
        }
        res.sendFile(path.join(distDir, "index.html"));
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Auto break rotation: idle ↔ break every 60s
  // ---------------------------------------------------------------------------
  function rotateBreaks(): void {
    // Rule: max 1 agent per department on break at a time
    const allAgents = db
      .prepare("SELECT id, department_id, status FROM agents WHERE status IN ('idle','break')")
      .all() as { id: string; department_id: string; status: string }[];

    if (allAgents.length === 0) return;

    // Meeting/Client-office summoned agents should stay in office, not break room.
    for (const a of allAgents) {
      if (a.status === "break" && isAgentInMeeting(a.id)) {
        db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(a.id);
        broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(a.id));
      }
    }

    const candidates = allAgents.filter((a) => !isAgentInMeeting(a.id));
    if (candidates.length === 0) return;

    // Group by department
    const byDept = new Map<string, typeof candidates>();
    for (const a of candidates) {
      const list = byDept.get(a.department_id) || [];
      list.push(a);
      byDept.set(a.department_id, list);
    }

    for (const [, members] of byDept) {
      const onBreak = members.filter((a) => a.status === "break");
      const idle = members.filter((a) => a.status === "idle");

      if (onBreak.length > 1) {
        // Too many on break from same dept — return extras to idle
        const extras = onBreak.slice(1);
        for (const a of extras) {
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(a.id);
          broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(a.id));
        }
      } else if (onBreak.length === 1) {
        // 40% chance to return from break (avg ~2.5 min break)
        if (Math.random() < 0.4) {
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(onBreak[0].id);
          broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(onBreak[0].id));
        }
      } else if (onBreak.length === 0 && idle.length > 0) {
        // 50% chance to send one idle agent on break
        if (Math.random() < 0.5) {
          const pick = idle[Math.floor(Math.random() * idle.length)];
          db.prepare("UPDATE agents SET status = 'break' WHERE id = ?").run(pick.id);
          broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(pick.id));
        }
      }
    }
  }

  function pruneDuplicateReviewMeetings(): void {
    const rows = db
      .prepare(
        `
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY task_id, round, status
          ORDER BY started_at DESC, created_at DESC, id DESC
        ) AS rn
      FROM meeting_minutes
      WHERE meeting_type = 'review'
        AND status IN ('in_progress', 'failed')
    )
    SELECT id
    FROM ranked
    WHERE rn > 1
  `,
      )
      .all() as Array<{ id: string }>;
    if (rows.length === 0) return;

    const delEntries = db.prepare("DELETE FROM meeting_minute_entries WHERE meeting_id = ?");
    const delMeetings = db.prepare("DELETE FROM meeting_minutes WHERE id = ?");
    runInTransaction(() => {
      for (const id of rows.map((r) => r.id)) {
        delEntries.run(id);
        delMeetings.run(id);
      }
    });
  }

  type InProgressRecoveryReason = "startup" | "interval";
  const ORPHAN_RECENT_ACTIVITY_WINDOW_MS = Math.max(120_000, IN_PROGRESS_ORPHAN_GRACE_MS);
  // On startup, orphaned tasks (no active process, no output in last 60s) are recovered immediately
  // without waiting for the full grace period.
  const STARTUP_ORPHAN_GRACE_MS = 60_000;
  const STARTUP_ORPHAN_RECENT_ACTIVITY_WINDOW_MS = 60_000;

  function recoverOrphanInProgressTasks(reason: InProgressRecoveryReason): void {
    const isStartup = reason === "startup";
    const effectiveGraceMs = isStartup ? STARTUP_ORPHAN_GRACE_MS : IN_PROGRESS_ORPHAN_GRACE_MS;
    const effectiveActivityWindowMs = isStartup ? STARTUP_ORPHAN_RECENT_ACTIVITY_WINDOW_MS : ORPHAN_RECENT_ACTIVITY_WINDOW_MS;

    type InProgressRow = {
      id: string;
      title: string;
      assigned_agent_id: string | null;
      created_at: number | null;
      started_at: number | null;
      updated_at: number | null;
    };

    const inProgressTasks = db
      .prepare(
        `SELECT id, title, assigned_agent_id, created_at, started_at, updated_at
         FROM tasks WHERE status = 'in_progress' ORDER BY updated_at ASC`,
      )
      .all() as InProgressRow[];

    const now = nowMs();

    // Phase 1: pre-filter — skip tasks with live processes; remove stale handles; check age
    type Candidate = InProgressRow & { ageMs: number };
    const ageCandidates: Candidate[] = [];
    for (const task of inProgressTasks) {
      const active = activeProcesses.get(task.id);
      if (active) {
        const pid = typeof active.pid === "number" ? active.pid : null;
        if (pid !== null && pid > 0 && !isPidAlive(pid)) {
          activeProcesses.delete(task.id);
          appendTaskLog(task.id, "system", `Recovery (${reason}): removed stale process handle (pid=${pid})`);
        } else {
          continue; // process is alive — skip
        }
      }
      const lastTouchedAt = Math.max(task.updated_at ?? 0, task.started_at ?? 0, task.created_at ?? 0);
      const ageMs = lastTouchedAt > 0 ? Math.max(0, now - lastTouchedAt) : effectiveGraceMs + 1;
      if (ageMs >= effectiveGraceMs) ageCandidates.push({ ...task, ageMs });
    }

    if (ageCandidates.length === 0) return;

    // Phase 2: batch DB query — recent log activity check for all age candidates at once
    const ageIds = ageCandidates.map((t) => t.id);
    const agePlaceholders = ageIds.map(() => "?").join(",");
    const recentlyActiveIds = new Set<string>(
      (
        db
          .prepare(
            `SELECT DISTINCT task_id FROM task_logs
             WHERE task_id IN (${agePlaceholders}) AND created_at > ?`,
          )
          .all(...ageIds, now - effectiveActivityWindowMs) as Array<{ task_id: string }>
      ).map((r) => r.task_id),
    );

    // Phase 3: fs check (sequential) — only for tasks not filtered by DB activity
    const fsCandidates: Candidate[] = [];
    for (const task of ageCandidates) {
      if (recentlyActiveIds.has(task.id)) continue; // has recent DB activity — skip
      try {
        const logPath = path.join(logsDir, `${task.id}.log`);
        const stat = fs.statSync(logPath);
        const logIdleMs = Math.max(0, now - Math.floor(stat.mtimeMs || 0));
        if (logIdleMs <= effectiveActivityWindowMs) continue; // log file recently active — skip
      } catch {
        // no log file or unreadable — proceed with recovery
      }
      fsCandidates.push(task);
    }

    if (fsCandidates.length === 0) return;

    // Phase 4: batch DB query — latest RUN/spawn log for all remaining candidates at once
    const fsIds = fsCandidates.map((t) => t.id);
    const fsPlaceholders = fsIds.map(() => "?").join(",");
    const latestRunLogs = new Map<string, string>(
      (
        db
          .prepare(
            `SELECT l.task_id, l.message
             FROM task_logs l
             INNER JOIN (
               SELECT task_id, MAX(created_at) AS max_ca
               FROM task_logs
               WHERE task_id IN (${fsPlaceholders})
                 AND kind = 'system'
                 AND (message LIKE 'RUN %' OR message LIKE 'Agent spawn failed:%')
               GROUP BY task_id
             ) m ON l.task_id = m.task_id AND l.created_at = m.max_ca
             WHERE l.kind = 'system'
               AND (l.message LIKE 'RUN %' OR l.message LIKE 'Agent spawn failed:%')`,
          )
          .all(...fsIds) as Array<{ task_id: string; message: string }>
      ).map((r) => [r.task_id, r.message] as [string, string]),
    );

    // Phase 5: process each remaining candidate
    for (const task of fsCandidates) {
      const { ageMs } = task;
      const latestRunMessage = latestRunLogs.get(task.id) ?? "";

      if (latestRunMessage.startsWith("RUN completed (exit code: 0)")) {
        appendTaskLog(
          task.id,
          "system",
          `Recovery (${reason}): orphan in_progress detected (age_ms=${ageMs}) → replaying successful completion`,
        );
        handleTaskRunComplete(task.id, 0);
        continue;
      }

      if (latestRunMessage.startsWith("RUN ") || latestRunMessage.startsWith("Agent spawn failed:")) {
        appendTaskLog(
          task.id,
          "system",
          `Recovery (${reason}): orphan in_progress detected (age_ms=${ageMs}) → replaying failed completion`,
        );
        handleTaskRunComplete(task.id, 1);
        continue;
      }

      const t = nowMs();
      const updates = ["status = 'inbox'", "updated_at = ?"];
      const params: unknown[] = [t];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        execution_state: "failed",
        retry_after: null,
        execution_error_code: "orphaned_run",
        execution_error_summary: `Recovered orphaned in_progress task during ${reason}`,
      });
      params.push(task.id);
      const move = db
        .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`)
        .run(...(params as any[])) as { changes?: number };
      if ((move.changes ?? 0) === 0) continue;

      recordTaskExecutionEvent(db as any, {
        taskId: task.id,
        eventType: "orphan_recovered",
        fromState: "running",
        toState: "failed",
        summary: `Recovered orphaned in_progress task during ${reason}`,
        metadata: { age_ms: ageMs },
        createdAt: t,
      });

      stopProgressTimer(task.id);
      clearTaskWorkflowState(task.id);
      endTaskExecutionSession(task.id, `orphan_in_progress_${reason}`);
      appendTaskLog(
        task.id,
        "system",
        `Recovery (${reason}): in_progress without active process/run log (age_ms=${ageMs}) → inbox`,
      );

      if (task.assigned_agent_id) {
        db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ?").run(task.assigned_agent_id);
        const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(task.assigned_agent_id);
        broadcast("agent_status", updatedAgent);
      }

      const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
      broadcast("task_update", updatedTask);
      const lang = resolveLang(task.title);
      notifyTaskStatus(task.id, task.title, "inbox", lang);
      const watchdogMessage =
        lang === "en"
          ? `[WATCHDOG] '${task.title}' was in progress but had no active process. Recovered to inbox.`
          : lang === "ja"
            ? `[WATCHDOG] '${task.title}' は in_progress でしたが実行プロセスが存在しないため inbox に復旧しました。`
            : lang === "zh"
              ? `[WATCHDOG] '${task.title}' 处于 in_progress，但未発見執行進程，已恢復到 inbox。`
              : `[WATCHDOG] '${task.title}' 작업이 in_progress 상태였지만 실행 프로세스가 없어 inbox로 복구했습니다.`;
      notifyClient(watchdogMessage, task.id);
    }
  }

  function recoverInterruptedWorkflowOnStartup(): void {
    pruneDuplicateReviewMeetings();
    try {
      reconcileCrossDeptSubtasks();
    } catch (err) {
      logger.error({ err }, "[AgentDesk] startup reconciliation failed");
    }

    recoverOrphanInProgressTasks("startup");

    const reviewTasks = db
      .prepare(
        `
    SELECT id, title
    FROM tasks
    WHERE status = 'review'
    ORDER BY updated_at ASC
  `,
      )
      .all() as Array<{ id: string; title: string }>;

    reviewTasks.forEach((task, idx) => {
      const delay = 1200 + idx * 400;
      setTimeout(() => {
        const current = db.prepare("SELECT status FROM tasks WHERE id = ?").get(task.id) as
          | { status: string }
          | undefined;
        if (!current || current.status !== "review") return;
        finishReview(task.id, task.title);
      }, delay);
    });
  }

  const TASK_HEARTBEAT_SWEEP_MS = 30_000;
  const TASK_TIMEOUT_DEFAULT_MINUTES = 0; // 0 = disabled

  function updateRunningTaskHeartbeats(): void {
    const now = nowMs();
    const trackedTaskIds = new Set<string>([
      ...(Array.from(activeProcesses.keys()) as string[]),
      ...(Array.from(taskExecutionSessions.keys()) as string[]),
    ]);

    for (const taskId of trackedTaskIds) {
      const task = db
        .prepare("SELECT id, status FROM tasks WHERE id = ?")
        .get(taskId) as { id: string; status: string } | undefined;
      if (!task || task.status !== "in_progress") continue;

      let lastOutputAt: number | null = null;
      try {
        const logPath = path.join(logsDir, `${taskId}.log`);
        const stat = fs.statSync(logPath);
        lastOutputAt = Math.floor(stat.mtimeMs || 0) || null;
      } catch {
        lastOutputAt = null;
      }

      const updates = ["updated_at = updated_at"];
      const params: unknown[] = [];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        last_heartbeat_at: now,
        last_output_at: lastOutputAt ?? now,
      });
      params.push(taskId);
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...(params as any[]));

      const session = taskExecutionSessions.get(taskId);
      if (session) {
        session.lastTouchedAt = now;
        taskExecutionSessions.set(taskId, session);
      }
    }
  }

  function markStalledInProgressTasks(): void {
    const now = nowMs();
    const rows = db
      .prepare(
        `SELECT id, title, last_heartbeat_at, updated_at
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'running'`,
      )
      .all() as Array<{
        id: string;
        title: string;
        last_heartbeat_at: number | null;
        updated_at: number | null;
      }>;

    for (const row of rows) {
      if (activeProcesses.has(row.id)) continue;
      const lastSignalAt = Math.max(row.last_heartbeat_at ?? 0, row.updated_at ?? 0);
      if (lastSignalAt <= 0 || now - lastSignalAt < TASK_STALLED_THRESHOLD_MS) continue;

      const updates = ["updated_at = ?"];
      const params: unknown[] = [now];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        execution_state: "stalled",
        execution_error_code: "heartbeat_stalled",
        execution_error_summary: "Task heartbeat timed out while status remained in_progress",
      });
      params.push(row.id);
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`).run(...(params as any[]));
      appendTaskLog(row.id, "system", "Execution marked stalled (heartbeat timeout)");
      recordTaskExecutionEvent(db as any, {
        taskId: row.id,
        eventType: "run_stalled",
        fromState: "running",
        toState: "stalled",
        summary: "Execution marked stalled after heartbeat timeout",
        metadata: { stalled_threshold_ms: TASK_STALLED_THRESHOLD_MS },
        createdAt: now,
      });
      const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
      broadcast("task_update", updatedTask);
    }
  }

  /**
   * Auto-recover stalled tasks that have remained in stalled state beyond
   * the recovery threshold. Moves them to inbox and resets the agent.
   */
  function recoverStalledTasks(): void {
    const now = nowMs();
    const rows = db
      .prepare(
        `SELECT id, title, assigned_agent_id, updated_at
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'stalled'`,
      )
      .all() as Array<{
        id: string;
        title: string;
        assigned_agent_id: string | null;
        updated_at: number | null;
      }>;

    // 복구 대상만 먼저 필터링
    const candidates = rows.filter((row) => {
      const stalledSince = row.updated_at ?? 0;
      return stalledSince > 0 && now - stalledSince >= TASK_STALLED_RECOVERY_THRESHOLD_MS;
    });
    if (candidates.length === 0) return;

    const t = nowMs();

    // DB 쓰기를 단일 트랜잭션으로 배치화 (P3-A)
    const recovered: typeof candidates = [];
    const batchRecover = db.transaction(() => {
      for (const row of candidates) {
        const updates = ["status = 'inbox'", "updated_at = ?"];
        const params: unknown[] = [t];
        appendTaskExecutionMetaUpdate(db as any, updates, params, {
          execution_state: "failed",
          retry_after: null,
          execution_error_code: "stalled_auto_recovered",
          execution_error_summary: "Task auto-recovered from stalled state after timeout",
        });
        params.push(row.id);
        const move = db
          .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`)
          .run(...(params as any[])) as { changes?: number };
        if ((move.changes ?? 0) === 0) continue;

        recordTaskExecutionEvent(db as any, {
          taskId: row.id,
          eventType: "stalled_recovered",
          fromState: "stalled",
          toState: "failed",
          summary: "Auto-recovered stalled task to inbox",
          metadata: { stalled_recovery_threshold_ms: TASK_STALLED_RECOVERY_THRESHOLD_MS },
          createdAt: t,
        });

        if (row.assigned_agent_id) {
          db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ? AND current_task_id = ?").run(
            row.assigned_agent_id,
            row.id,
          );
        }

        recovered.push(row);
      }
    });
    batchRecover();

    // 트랜잭션 외부: 사이드 이펙트(로그·브로드캐스트·알림)
    for (const row of recovered) {
      stopProgressTimer(row.id);
      clearTaskWorkflowState(row.id);
      endTaskExecutionSession(row.id, "stalled_auto_recovery");
      appendTaskLog(row.id, "system", "Auto-recovered from stalled state → inbox (no heartbeat)");

      if (row.assigned_agent_id) {
        const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(row.assigned_agent_id);
        broadcast("agent_status", updatedAgent);
      }

      const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
      broadcast("task_update", updatedTask);
      const lang = resolveLang(row.title);
      notifyTaskStatus(row.id, row.title, "inbox", lang);
      const msg =
        lang === "en"
          ? `[WATCHDOG] '${row.title}' stalled and was auto-recovered to inbox.`
          : lang === "ja"
            ? `[WATCHDOG] '${row.title}' がストール状態のため inbox に自動復旧しました。`
            : lang === "zh"
              ? `[WATCHDOG] '${row.title}' 停滞，已自动恢复到 inbox。`
              : `[WATCHDOG] '${row.title}' 작업이 정체(stalled) 상태로 자동 복구되어 inbox로 이동했습니다.`;
      notifyClient(msg, row.id);
    }
  }

  /**
   * Enforce per-task timeout: tasks running longer than their timeout_minutes
   * are marked as timed out and moved to inbox.
   */
  function enforceTaskTimeouts(): void {
    const now = nowMs();
    const rows = db
      .prepare(
        `SELECT id, title, assigned_agent_id, started_at, timeout_minutes
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'running'
           AND timeout_minutes > 0
           AND started_at IS NOT NULL`,
      )
      .all() as Array<{
        id: string;
        title: string;
        assigned_agent_id: string | null;
        started_at: number;
        timeout_minutes: number;
      }>;

    for (const row of rows) {
      const timeoutMs = row.timeout_minutes * 60_000;
      const elapsed = now - row.started_at;
      if (elapsed < timeoutMs) continue;

      if (activeProcesses.has(row.id)) {
        const proc = activeProcesses.get(row.id);
        const pid = typeof proc?.pid === "number" ? proc.pid : null;
        if (pid && pid > 0) {
          try { killPidTree(pid); } catch { /* best-effort */ }
        }
        activeProcesses.delete(row.id);
      }

      const t = nowMs();
      const updates = ["status = 'inbox'", "updated_at = ?"];
      const params: unknown[] = [t];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        execution_state: "failed",
        retry_after: null,
        execution_error_code: "execution_timeout",
        execution_error_summary: `Task exceeded timeout of ${row.timeout_minutes} minute(s)`,
      });
      params.push(row.id);
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`)
        .run(...(params as any[]));

      recordTaskExecutionEvent(db as any, {
        taskId: row.id,
        eventType: "run_timed_out",
        fromState: "running",
        toState: "failed",
        summary: `Task timed out after ${row.timeout_minutes} minute(s)`,
        metadata: { timeout_minutes: row.timeout_minutes, elapsed_ms: elapsed },
        createdAt: t,
      });

      stopProgressTimer(row.id);
      clearTaskWorkflowState(row.id);
      endTaskExecutionSession(row.id, "execution_timeout");
      appendTaskLog(row.id, "system", `Execution timed out after ${row.timeout_minutes} minute(s) → inbox`);

      if (row.assigned_agent_id) {
        db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ? AND current_task_id = ?").run(
          row.assigned_agent_id,
          row.id,
        );
        const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(row.assigned_agent_id);
        broadcast("agent_status", updatedAgent);
      }

      const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
      broadcast("task_update", updatedTask);
      const lang = resolveLang(row.title);
      notifyTaskStatus(row.id, row.title, "inbox", lang);
      const msg =
        lang === "en"
          ? `[TIMEOUT] '${row.title}' exceeded ${row.timeout_minutes}m limit and was stopped.`
          : lang === "ja"
            ? `[TIMEOUT] '${row.title}' が ${row.timeout_minutes}分の制限を超過し停止されました。`
            : lang === "zh"
              ? `[TIMEOUT] '${row.title}' 超过 ${row.timeout_minutes} 分钟限制，已停止。`
              : `[TIMEOUT] '${row.title}' 작업이 ${row.timeout_minutes}분 제한을 초과하여 중단되었습니다.`;
      notifyClient(msg, row.id);
    }
  }

  function sweepPendingSubtaskDelegations(): void {
    const parents = db
      .prepare(
        `
    SELECT DISTINCT t.id
    FROM tasks t
    JOIN subtasks s ON s.task_id = t.id
    WHERE t.status IN ('planned', 'collaborating', 'in_progress', 'review')
      AND s.target_department_id IS NOT NULL
      AND s.status != 'done'
      AND (s.delegated_task_id IS NULL OR s.delegated_task_id = '')
    ORDER BY t.updated_at ASC
    LIMIT 80
  `,
      )
      .all() as Array<{ id: string }>;

    for (const row of parents) {
      if (!row.id) continue;
      processSubtaskDelegations(row.id);
    }
  }

  // Run rotation every 60 seconds, and once on startup after 5s
  setTimeout(rotateBreaks, 5_000);
  setInterval(rotateBreaks, 60_000);
  setTimeout(recoverInterruptedWorkflowOnStartup, 3_000);
  setInterval(updateRunningTaskHeartbeats, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(markStalledInProgressTasks, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(recoverStalledTasks, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(enforceTaskTimeouts, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(() => recoverOrphanInProgressTasks("interval"), IN_PROGRESS_ORPHAN_SWEEP_MS);
  setTimeout(sweepPendingSubtaskDelegations, 4_000);
  setInterval(sweepPendingSubtaskDelegations, SUBTASK_DELEGATION_SWEEP_MS);
  const noopReceiver = { stop: () => {} };
  let telegramReceiver = noopReceiver;
  let discordReceiver = noopReceiver;
  let slackReceiver = noopReceiver;
  try { telegramReceiver = startTelegramReceiver({ db }); } catch (err) { logger.warn({ err }, "[messenger] Telegram receiver failed to start"); }
  try { discordReceiver = startDiscordReceiver({ db }); } catch (err) { logger.warn({ err }, "[messenger] Discord receiver failed to start"); }
  try { slackReceiver = startSlackReceiver({ db }); } catch (err) { logger.warn({ err }, "[messenger] Slack receiver failed to start"); }

  // ---------------------------------------------------------------------------
  // Local LLM — auto-start Ollama + metrics poller
  // ---------------------------------------------------------------------------
  setTimeout(async () => {
    try {
      const row = db.prepare("SELECT auto_start, port FROM local_llm_backends WHERE name='ollama'").get() as
        | { auto_start: number; port: number }
        | undefined;
      const autoStart = row?.auto_start ?? 1; // default: on
      const port = row?.port ?? 11434;
      if (autoStart && !(await getOllamaRunning(port))) {
        const result = await startOllama();
        if (result.ok) {
          logger.info("[local-llm] Ollama auto-started");
          broadcast("local_llm_status", { backend: "ollama", running: true });
        }
        // not installed or failed → silent, no log needed
      }
    } catch (err) {
      logger.debug({ err }, "[local-llm] auto-start check error");
    }
  }, 5_000);

  startMetricsPoller(broadcast);

  // ---------------------------------------------------------------------------
  // Synapse — file watcher + Notion poller
  // ---------------------------------------------------------------------------
  const obsidianWatcher = startObsidianWatcher(db, broadcast);
  const notionPoller = startNotionPoller(db, broadcast);

  // ---------------------------------------------------------------------------
  // Start HTTP server + WebSocket
  // ---------------------------------------------------------------------------
  const server = app.listen(PORT, HOST, () => {
    logger.info(`[AgentDesk] v${PKG_VERSION} listening on http://${HOST}:${PORT} (db: ${dbPath})`);
    if (isProduction) {
      logger.info(`[AgentDesk] mode: production (serving UI from ${distDir})`);
    } else {
      logger.info(`[AgentDesk] mode: development (UI served by Vite on separate port)`);
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `[AgentDesk] Port ${PORT} is already in use. ` +
        `Kill the existing process (e.g. taskkill /F /IM node.exe) and restart.`,
      );
    } else {
      logger.error({ err }, "[AgentDesk] HTTP server error");
    }
    process.exit(1);
  });

  // Background token refresh: check every 5 minutes for tokens expiring within 5 minutes
  setInterval(
    async () => {
      try {
        const cred = getDecryptedOAuthToken("google_antigravity");
        if (!cred || !cred.refreshToken) return;
        const expiresAtMs = cred.expiresAt && cred.expiresAt < 1e12 ? cred.expiresAt * 1000 : cred.expiresAt;
        if (!expiresAtMs) return;
        // Refresh if expiring within 5 minutes
        if (expiresAtMs < Date.now() + 5 * 60_000) {
          await refreshGoogleToken(cred);
          logger.info("[oauth] Background refresh: Antigravity token renewed");
        }
      } catch (err) {
        logger.error("[oauth] Background refresh failed: %s", err instanceof Error ? err.message : err);
      }
    },
    5 * 60 * 1000,
  );

  // WebSocket server on same HTTP server
  const wss = new WebSocketServer({ server });

  const MAX_WS_CLIENTS = 20;

  wss.on("connection", (ws: WsSocket, req: IncomingMessage) => {
    if (!isIncomingMessageOriginTrusted(req) || !isIncomingMessageAuthenticated(req)) {
      ws.close(1008, "unauthorized");
      return;
    }
    if (wsClients.size >= MAX_WS_CLIENTS) {
      ws.close(4008, "too_many_connections");
      return;
    }
    wsClients.add(ws);
    logger.info({ total: wsClients.size }, "[AgentDesk] WebSocket client connected (total: %d)");

    // Send initial state to the newly connected client
    ws.send(
      JSON.stringify({
        type: "connected",
        payload: {
          version: PKG_VERSION,
          app: "AgentDesk",
        },
        ts: nowMs(),
      }),
    );

    ws.on("message", (data: Buffer | string) => {
      handleClientMessage(ws, data.toString());
    });

    ws.on("close", () => {
      removeClient(ws);
      logger.info({ total: wsClients.size }, "[AgentDesk] WebSocket client disconnected (total: %d)");
    });

    ws.on("error", () => {
      removeClient(ws);
    });
  });

  const stopWorkflowScheduler = startWorkflowScheduler(db, nowMs);

  registerGracefulShutdownHandlers({
    activeProcesses,
    stopRequestedTasks,
    killPidTree,
    rollbackTaskWorktree,
    db,
    nowMs,
    endTaskExecutionSession,
    wsClients,
    wss,
    server,
    onBeforeClose: () => {
      stopWorkflowScheduler();
      obsidianWatcher.stop();
      notionPoller.stop();
      telegramReceiver.stop();
      discordReceiver.stop();
      slackReceiver.stop();
    },
  });
}
