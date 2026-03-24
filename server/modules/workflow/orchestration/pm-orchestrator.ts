/**
 * PM Orchestrator — PM 에이전트가 LLM으로 모든 오케스트레이션 결정을 수행.
 *
 * 원칙:
 * - setTimeout/setInterval 사용 금지. PM은 이벤트에 즉시 반응.
 * - 시간 기반 체크 금지. PM이 상황을 보고 판단.
 * - 모든 결정은 LLM 호출 또는 즉시 실행 (B등급).
 */

import type { DatabaseSync } from "node:sqlite";
import { eventBus, type TaskStatusEvent } from "../../../lib/event-bus.ts";
import { loadPrompt, loadPromptSection } from "../../../lib/prompt-loader.ts";
import { analyzeTaskFailure, matchErrorPattern, sanitizeErrorMessage } from "./run-complete-handler/error-analysis.ts";
import { runAutoLearning, generateProjectRetrospective, updateAgentFitness } from "./auto-learning.ts";
import { shipAutomation } from "./review-finalize-tools/ship-automation.ts";
import { resolveProvider, getDefaultModel, type ResolvedProvider } from "../../agent-runtime/llm-client.ts";
import { readYoloModeEnabled } from "../../routes/ops/messages/decision-inbox/yolo-mode.ts";
import { recordTaskExecutionEvent } from "../core/task-execution-meta.ts";
import logger from "../../../lib/logger.ts";
import type { AgentRow } from "../core/conversation-types.ts";

/** Adapter: findApiProvider compatible with error-analysis deps interface */
function findApiProviderCompat(db: DatabaseSync, _scope: string): ResolvedProvider | null {
  try {
    return resolveProvider(db);
  } catch {
    return null;
  }
}

/** Adapter: resolveModel compatible with error-analysis deps interface */
function resolveModelCompat(provider: ResolvedProvider | null): string {
  return getDefaultModel(provider?.providerType ?? "anthropic");
}

/** Adapter: callProvider compatible with error-analysis deps interface */
async function callProviderCompat(
  provider: ResolvedProvider | null,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const resolved = provider;
  if (!resolved) throw new Error("No provider");
  if (resolved.type === "anthropic") {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": resolved.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
      signal,
    });
    if (!resp.ok) throw new Error(`Anthropic API ${resp.status}`);
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> };
    return data.content?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("") ?? "";
  }
  // OpenAI-compatible
  const resp = await fetch(`${resolved.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${resolved.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
    signal,
  });
  if (!resp.ok) throw new Error(`LLM API ${resp.status}`);
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

interface PmOrchestratorDeps {
  db: DatabaseSync;
  nowMs: () => number;
  logsDir: string;
  runAgentOneShot: (agent: AgentRow, prompt: string, options: { projectPath?: string; timeoutMs?: number; noTools?: boolean }) => Promise<{ text?: string | null }>;
  startTaskExecutionForAgent: (taskId: string, agentId: string) => void;
  finishReview: (taskId: string, taskTitle: string, options?: { bypassProjectDecisionGate?: boolean; trigger?: string }) => void;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  broadcast: (type: string, payload: unknown) => void;
  sendAgentMessage: (agent: { id: string }, content: string, kind: string, scope: string, meta: unknown, taskId: string | null) => void;
  getPreferredLanguage: () => string;
  resolveProjectPath: (projectId: string) => string;
  insertNotification: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string | void;
}

/** In-flight guard: prevent concurrent PM calls for the same key */
const pmInFlight = new Set<string>();

function findProjectPm(db: DatabaseSync, projectId: string): AgentRow | undefined {
  return db.prepare(
    `SELECT a.* FROM project_agents pa JOIN agents a ON a.id = pa.agent_id
     WHERE pa.project_id = ? AND pa.project_role = 'pm' AND a.status != 'offline' LIMIT 1`,
  ).get(projectId) as AgentRow | undefined;
}

export function startPmOrchestrator(deps: PmOrchestratorDeps): void {
  const {
    db, nowMs, runAgentOneShot, startTaskExecutionForAgent,
    finishReview, appendTaskLog, broadcast, sendAgentMessage,
    getPreferredLanguage, resolveProjectPath, insertNotification,
  } = deps;

  const learnDeps = {
    db, nowMs, runAgentOneShot, appendTaskLog, broadcast, getPreferredLanguage, resolveProjectPath,
  };

  logger.info("[pm-orchestrator] PM orchestration engine started (event-driven, no timers)");

  // ── 이벤트 리스너: 즉시 반응 (타이머 없음) ──
  eventBus.on("task_status_changed", (event: TaskStatusEvent) => {
    if (!event.projectId) return;

    if (event.toStatus === "review") {
      void pmReviewTask(event);
    } else if (event.toStatus === "failed") {
      // 적합도 추적 (실패)
      if (event.taskId) {
        const failTask = db.prepare("SELECT assigned_agent_id, task_type, started_at FROM tasks WHERE id = ?")
          .get(event.taskId) as { assigned_agent_id: string | null; task_type: string; started_at: number | null } | undefined;
        if (failTask?.assigned_agent_id) {
          const dur = nowMs() - (failTask.started_at ?? nowMs());
          updateAgentFitness(db, failTask.assigned_agent_id, failTask.task_type ?? "general", false, Math.max(0, dur));
        }
      }
      void pmHandleFailure(event);
    } else if (event.toStatus === "done") {
      // 적합도 추적 + 자동 학습 + ship automation + PM progress.md 작성
      if (event.taskId) {
        const doneTask = db.prepare(
          "SELECT id, title, description, result, assigned_agent_id, task_type, started_at, completed_at, project_id, project_path FROM tasks WHERE id = ?",
        ).get(event.taskId) as {
          id: string; title: string; description: string | null; result: string | null;
          assigned_agent_id: string | null; task_type: string; started_at: number | null;
          completed_at: number | null; project_id: string | null; project_path: string | null;
        } | undefined;
        if (doneTask?.assigned_agent_id) {
          const dur = (doneTask.completed_at ?? nowMs()) - (doneTask.started_at ?? nowMs());
          updateAgentFitness(db, doneTask.assigned_agent_id, doneTask.task_type ?? "general", true, Math.max(0, dur));
        }
        const pm = findProjectPm(db, event.projectId!);
        if (pm) {
          void runAutoLearning(pm, event.taskId, event.projectId!, learnDeps);
          // progress.md는 review 승인 시 작성 (pmReviewTask → isApprove → pmWriteProgress)
        }
        // Ship automation (version bump + CHANGELOG + 기계적 파일 동기화)
        if (doneTask) {
          const agentRow = doneTask.assigned_agent_id
            ? (db.prepare("SELECT name FROM agents WHERE id = ?").get(doneTask.assigned_agent_id) as { name: string } | undefined)
            : undefined;
          shipAutomation({
            db,
            projectId: event.projectId!,
            taskId: event.taskId,
            taskTitle: doneTask.title,
            taskType: doneTask.task_type,
            taskDescription: doneTask.description,
            taskResult: doneTask.result,
            agentName: agentRow?.name ?? null,
            projectPath: doneTask.project_path,
            nowMs: nowMs(),
            appendTaskLog,
            broadcast,
            insertNotification,
          });
        }
      }
      void pmStartNextTask(event);
    }
  });

  // ── PM: 태스크 결과 검토 ──
  async function pmReviewTask(event: TaskStatusEvent): Promise<void> {
    const { taskId, projectId } = event;
    if (!projectId) return;
    const guardKey = `review:${taskId}`;
    if (pmInFlight.has(guardKey)) return;
    pmInFlight.add(guardKey);

    try {
      // 상태 재확인 — 이벤트 발행 후 상태 변경 가능
      const task = db.prepare(
        "SELECT id, title, description, result, assigned_agent_id, project_id, source_task_id, status, task_type FROM tasks WHERE id = ?",
      ).get(taskId) as { id: string; title: string; description: string | null; result: string | null; assigned_agent_id: string | null; project_id: string | null; source_task_id: string | null; status: string; task_type: string | null } | undefined;

      if (!task || task.status !== "review" || !task.project_id) return;

      // 하위 협업 태스크는 PM 리뷰 스킵
      if (task.source_task_id) return;

      // YOLO mode: PM에게 모든 통제권 — PM이 LLM으로 리뷰하되 사용자 승인 대기 없이 자동 결정
      const isYolo = readYoloModeEnabled(db);

      const pm = findProjectPm(db, projectId);
      if (!pm) {
        // PM 없으면 자동 승인 fallback
        finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: "no_pm_fallback" });
        return;
      }

      const lang = getPreferredLanguage();
      let resultTail = event.resultTail ?? "";
      if (!resultTail && task.result) {
        resultTail = task.result.length > 2000 ? "..." + task.result.slice(-2000) : task.result;
      }

      // Scope drift pre-check: count distinct file paths mentioned in the result
      const fullResult = task.result ?? resultTail;
      const filePathMatches = fullResult.match(/(?:^|\s)[\w./-]+\.\w{1,10}(?=\s|$|[,;:)])/gm);
      const uniqueFiles = new Set(filePathMatches ?? []);
      const fileTouchCount = uniqueFiles.size;
      if (fileTouchCount >= 10) {
        logger.warn({ taskId, fileTouchCount }, "[pm-orchestrator] high file-touch count detected in task result");
      }

      const prompt = loadPrompt("pm/review-task", {
        taskTitle: task.title,
        taskDescription: task.description ?? "",
        taskResult: resultTail || "(no output captured)",
        lang,
      });

      if (!prompt) {
        finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: "pm_prompt_missing" });
        return;
      }

      let projectPath = "";
      try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

      const response = await runAgentOneShot(pm, prompt, {
        projectPath,
        timeoutMs: 30_000,
        noTools: true,
      });

      // 상태 재확인 — LLM 호출 동안 상태가 바뀌었을 수 있음
      const current = db.prepare("SELECT status FROM tasks WHERE id = ?").get(taskId) as { status: string } | undefined;
      if (!current || current.status !== "review") {
        logger.debug({ taskId, currentStatus: current?.status }, "[pm-orchestrator] task status changed during review, aborting");
        return;
      }

      const text = response.text ?? "";
      const isApprove = /^APPROVE[:\s]/im.test(text) || /승인|합격|통과|lgtm|approve/i.test(text);

      // Parse structured checklist signals from PM response
      const hasScopeDrift = /scope\s*(match|drift).*FAIL/i.test(text) || /scope drift/i.test(text);
      const hasErrors = /obvious\s*errors.*FAIL/i.test(text) || /clear\s*error/i.test(text);
      const isIncomplete = /completeness.*FAIL/i.test(text) || /partial|incomplete|stub/i.test(text);
      const excessiveScope = /minimal\s*scope.*FAIL/i.test(text) || /excessive\s*scope/i.test(text);
      const hasEvidence = /evidence:/i.test(text);

      const reviewFlags = {
        scopeDrift: hasScopeDrift,
        errorsDetected: hasErrors,
        incomplete: isIncomplete,
        excessiveScope: excessiveScope || fileTouchCount >= 10,
        evidenceCited: hasEvidence,
        fileTouchCount,
      };

      logger.info({ taskId, decision: isApprove ? "approve" : "revise", reviewFlags, yolo: isYolo }, "[pm-orchestrator] structured review completed");

      if (isApprove) {
        const flagSummary = hasScopeDrift || excessiveScope
          ? ` [WARN: ${hasScopeDrift ? "scope-drift" : ""}${excessiveScope ? " excessive-scope" : ""}]`
          : "";
        appendTaskLog(taskId, "pm_oversight", `PM approved${isYolo ? " (YOLO)" : ""}${flagSummary}: ${text.slice(0, 200)}`);
        finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: isYolo ? "pm_yolo" : "pm_agent" });
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_approved",
          fromState: "review",
          toState: "done",
          summary: `PM approved${flagSummary}: ${text.slice(0, 200)}`,
          createdAt: nowMs(),
        });
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
        broadcast("pm_activity", {
          projectId, taskId, action: "approved",
          agentName: pm.name, summary: `PM approved '${task.title}'${flagSummary}`, timestamp: nowMs(),
          reviewFlags,
        });
        insertNotification({
          type: "pm_approved",
          title: `PM approved: ${task.title}`,
          body: flagSummary ? `Flags: ${flagSummary.trim()}` : null,
          task_id: taskId,
          agent_id: pm.id as string,
        });

        // PM 검토 승인 직후 → progress.md 작성
        void pmWriteProgress(pm, taskId, projectId, {
          title: task.title,
          description: task.description,
          result: task.result,
          task_type: task.task_type ?? "general",
          assigned_agent_id: task.assigned_agent_id,
        });
      } else {
        // 수정 요청: 상태 재확인 후 변경
        const recheck = db.prepare("SELECT status FROM tasks WHERE id = ?").get(taskId) as { status: string } | undefined;
        if (recheck?.status !== "review") return;

        const failedChecks: string[] = [];
        if (hasScopeDrift) failedChecks.push("scope-drift");
        if (hasErrors) failedChecks.push("errors");
        if (isIncomplete) failedChecks.push("incomplete");
        if (excessiveScope) failedChecks.push("excessive-scope");
        const checksLabel = failedChecks.length > 0 ? ` [FAILED: ${failedChecks.join(", ")}]` : "";

        appendTaskLog(taskId, "pm_oversight", `PM requested revision${checksLabel}: ${text.slice(0, 200)}`);
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_revision_requested",
          fromState: "review",
          toState: "planned",
          summary: `PM requested revision${checksLabel}: ${text.slice(0, 200)}`,
          createdAt: nowMs(),
        });
        db.prepare("UPDATE tasks SET status = 'planned', updated_at = ? WHERE id = ? AND status = 'review'").run(nowMs(), taskId);
        broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));

        if (task.assigned_agent_id) {
          sendAgentMessage(
            { id: task.assigned_agent_id },
            `[PM Revision] ${text}`,
            "task_assign", "agent", null, taskId,
          );
          startTaskExecutionForAgent(taskId, task.assigned_agent_id);
        }
        broadcast("pm_activity", {
          projectId, taskId, action: "revision_requested",
          agentName: pm.name, summary: `PM requested revision for '${task.title}'${checksLabel}`, timestamp: nowMs(),
          reviewFlags,
        });
        insertNotification({
          type: "pm_revision",
          title: `PM revision: ${task.title}`,
          body: checksLabel ? `Failed checks: ${checksLabel.trim()}` : text.slice(0, 200),
          task_id: taskId,
          agent_id: pm.id as string,
        });
      }
    } catch (err) {
      logger.error({ err, taskId }, "[pm-orchestrator] review failed, auto-approving as fallback");
      try {
        const task = db.prepare("SELECT title, status FROM tasks WHERE id = ?").get(taskId) as { title: string; status: string } | undefined;
        if (task?.status === "review") {
          finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: "pm_error_fallback" });
        }
      } catch { /* best effort */ }
    } finally {
      pmInFlight.delete(guardKey);
    }
  }

  // ── PM: 실패 태스크 처리 (3-strike escalation + pattern-based debugging) ──
  async function pmHandleFailure(event: TaskStatusEvent): Promise<void> {
    const { taskId, projectId } = event;
    if (!projectId) return;
    const guardKey = `failure:${taskId}`;
    if (pmInFlight.has(guardKey)) return;
    pmInFlight.add(guardKey);

    try {
      const task = db.prepare(
        "SELECT id, title, assigned_agent_id, retry_count, max_retries, last_error_summary, project_id, status FROM tasks WHERE id = ?",
      ).get(taskId) as { id: string; title: string; assigned_agent_id: string | null; retry_count: number; max_retries: number; last_error_summary: string | null; project_id: string | null; status: string } | undefined;
      if (!task) return;

      // Sanitize the error summary before any further processing/logging
      const rawError = task.last_error_summary ?? "Unknown error";
      const sanitizedError = sanitizeErrorMessage(rawError);

      // Pattern-based error classification — log detected pattern as pm_oversight
      const patternMatch = matchErrorPattern(rawError);
      if (patternMatch) {
        appendTaskLog(taskId, "pm_oversight",
          `Error pattern detected: [${patternMatch.category}] ${patternMatch.cause} — ${patternMatch.suggestion}`);
        logger.info(
          { taskId, category: patternMatch.category, cause: patternMatch.cause },
          "[pm-orchestrator] error pattern matched",
        );
      }

      // 에러 분석 (best effort — API 키 있을 때만)
      void analyzeTaskFailure(taskId, task.title, event.exitCode ?? 1, {
        db, logsDir: deps.logsDir, findApiProvider: findApiProviderCompat, resolveModel: resolveModelCompat, callProvider: callProviderCompat,
        getPreferredLanguage, appendTaskLog,
      });

      // status가 이미 바뀌었으면 스킵 (inbox로 변경됨)
      if (task.status !== "inbox" && task.status !== "failed") return;

      const retryCount = task.retry_count ?? 0;
      const maxRetries = task.max_retries ?? 2;

      // ── 3-strike rule: hard escalation after max retries ──
      // After 3 failed attempts (retryCount >= 3, or >= maxRetries whichever is lower),
      // do NOT auto-retry — mark as failed and escalate to user immediately.
      const strikeLimit = Math.min(maxRetries, 3);
      if (retryCount >= strikeLimit) {
        const escalationMsg = `PM: max retries (${strikeLimit}) reached for '${task.title}' — escalating to user. Last error: ${sanitizedError.slice(0, 200)}`;
        appendTaskLog(taskId, "pm_oversight", escalationMsg);
        logger.warn({ taskId, retryCount, strikeLimit }, "[pm-orchestrator] 3-strike escalation — no more retries");
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_escalated",
          fromState: "failed",
          toState: "failed",
          summary: `PM escalated after ${strikeLimit} strikes: ${sanitizedError.slice(0, 200)}`,
          createdAt: nowMs(),
        });

        // Force status to 'failed' (not 'inbox' or 'planned')
        db.prepare("UPDATE tasks SET status = 'failed', updated_at = ? WHERE id = ?")
          .run(nowMs(), taskId);
        broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));

        insertNotification({
          type: "agent_error",
          title: `${task.title} — escalated (${strikeLimit} strikes)`,
          body: sanitizedError.slice(0, 300),
          task_id: taskId,
          agent_id: task.assigned_agent_id,
        });

        broadcast("pm_activity", {
          projectId, taskId, action: "escalated",
          agentName: "PM Orchestrator",
          summary: `3-strike escalation: '${task.title}' failed ${strikeLimit} times`,
          timestamp: nowMs(),
          errorCategory: patternMatch?.category ?? null,
        });
        return;
      }

      const pm = findProjectPm(db, projectId);
      if (!pm) {
        // PM 없으면 자동 재시도 fallback (still respects strike limit above)
        db.prepare("UPDATE tasks SET status = 'planned', retry_count = ?, updated_at = ? WHERE id = ?")
          .run(retryCount + 1, nowMs(), taskId);
        appendTaskLog(taskId, "pm_oversight", `Auto-retry ${retryCount + 1}/${strikeLimit} (no PM)`);
        broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
        if (task.assigned_agent_id) {
          startTaskExecutionForAgent(taskId, task.assigned_agent_id);
        }
        return;
      }

      const lang = getPreferredLanguage();
      const prompt = loadPrompt("pm/handle-failure", {
        taskTitle: task.title,
        errorSummary: sanitizedError,
        retryCount: String(retryCount),
        maxRetries: String(strikeLimit),
        lang,
        errorCategory: patternMatch?.category ?? "unknown",
      });

      if (!prompt) {
        if (task.assigned_agent_id) {
          db.prepare("UPDATE tasks SET status = 'planned', retry_count = ?, updated_at = ? WHERE id = ?")
            .run(retryCount + 1, nowMs(), taskId);
          startTaskExecutionForAgent(taskId, task.assigned_agent_id);
        }
        return;
      }

      let projectPath = "";
      try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

      const response = await runAgentOneShot(pm, prompt, {
        projectPath,
        timeoutMs: 20_000,
        noTools: true,
      });

      const text = response.text ?? "";

      if (/^REASSIGN[:\s]/im.test(text) || /재배정|reassign/i.test(text)) {
        appendTaskLog(taskId, "pm_oversight", `PM reassign: ${text.slice(0, 200)}`);
        const otherAgent = db.prepare(
          `SELECT a.id FROM project_agents pa JOIN agents a ON a.id = pa.agent_id
           WHERE pa.project_id = ? AND a.id != ? AND a.status != 'offline'
           ORDER BY CASE a.role WHEN 'senior' THEN 0 WHEN 'team_leader' THEN 1 ELSE 2 END LIMIT 1`,
        ).get(projectId, task.assigned_agent_id ?? "") as { id: string } | undefined;

        if (otherAgent) {
          db.prepare("UPDATE tasks SET assigned_agent_id = ?, status = 'planned', retry_count = 0, updated_at = ? WHERE id = ?")
            .run(otherAgent.id, nowMs(), taskId);
          broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
          startTaskExecutionForAgent(taskId, otherAgent.id);
        }
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_reassigned",
          fromState: "failed",
          toState: "planned",
          summary: `PM reassigned task to another agent: ${text.slice(0, 200)}`,
          createdAt: nowMs(),
        });
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      } else if (/^ESCALATE[:\s]/im.test(text) || /에스컬|escalat/i.test(text)) {
        appendTaskLog(taskId, "pm_oversight", `PM escalated: ${text.slice(0, 200)}`);
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_escalated",
          fromState: "failed",
          toState: "failed",
          summary: `PM escalated to user: ${text.slice(0, 200)}`,
          createdAt: nowMs(),
        });
        insertNotification({
          type: "agent_error",
          title: `PM: ${task.title}`,
          body: sanitizeErrorMessage(text.slice(0, 300)),
          task_id: taskId,
          agent_id: pm.id as string,
        });
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      } else {
        // RETRY (default) — retryCount < strikeLimit already guaranteed by check above
        appendTaskLog(taskId, "pm_oversight", `PM retry (${retryCount + 1}/${strikeLimit}): ${text.slice(0, 200)}`);
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "pm_retry",
          fromState: "failed",
          toState: "planned",
          summary: `PM retry ${retryCount + 1}/${strikeLimit}: ${text.slice(0, 200)}`,
          createdAt: nowMs(),
        });
        db.prepare("UPDATE tasks SET status = 'planned', retry_count = ?, updated_at = ? WHERE id = ?")
          .run(retryCount + 1, nowMs(), taskId);
        broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
        if (task.assigned_agent_id) {
          startTaskExecutionForAgent(taskId, task.assigned_agent_id);
        }
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      }

      logger.info({ taskId, retryCount: retryCount + 1, strikeLimit, decision: text.slice(0, 50) }, "[pm-orchestrator] failure decision");
    } catch (err) {
      logger.error({ err, taskId }, "[pm-orchestrator] failure handler error");
    } finally {
      pmInFlight.delete(guardKey);
    }
  }

  // ── PM: progress.md 작성 (LLM) ──
  async function pmWriteProgress(
    pm: AgentRow,
    taskId: string,
    projectId: string,
    task: { title: string; description: string | null; result: string | null; task_type: string; assigned_agent_id: string | null } | undefined,
  ): Promise<void> {
    if (!task) return;
    const guardKey = `progress:${taskId}`;
    if (pmInFlight.has(guardKey)) return;
    pmInFlight.add(guardKey);

    try {
      let projectPath = "";
      try { projectPath = resolveProjectPath(projectId); } catch { return; /* no path → skip */ }
      if (!projectPath) return;

      const lang = getPreferredLanguage();
      const agentRow = task.assigned_agent_id
        ? (db.prepare("SELECT name FROM agents WHERE id = ?").get(task.assigned_agent_id) as { name: string } | undefined)
        : undefined;
      const resultTail = task.result ? (task.result.length > 1500 ? "..." + task.result.slice(-1500) : task.result) : "(no output)";

      const projectRow = db.prepare("SELECT name FROM projects WHERE id = ?").get(projectId) as { name: string } | undefined;
      const prompt = loadPromptSection("pm/write-progress", lang, {
        projectName: projectRow?.name ?? projectId,
        taskTitle: task.title,
        taskDescription: task.description ?? "(none)",
        agentName: agentRow?.name ?? "(unassigned)",
        taskType: task.task_type ?? "general",
        taskResult: resultTail,
      });
      if (!prompt) return;

      const response = await runAgentOneShot(pm, prompt, {
        projectPath,
        timeoutMs: 20_000,
        noTools: true,
      });

      const text = response.text?.trim();
      if (!text) return;

      // docs/progress.md에 기록
      const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const docsDir = join(projectPath, "docs");
      const progressPath = join(docsDir, "progress.md");
      const dateLine = `> ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
      const entry = `\n${text}\n\n${dateLine}\n\n---\n`;

      if (existsSync(progressPath)) {
        const existing = readFileSync(progressPath, "utf-8");
        const titleEnd = existing.indexOf("\n");
        if (titleEnd > 0) {
          writeFileSync(progressPath, existing.slice(0, titleEnd + 1) + entry + existing.slice(titleEnd + 1), "utf-8");
        } else {
          writeFileSync(progressPath, existing + "\n" + entry, "utf-8");
        }
      } else {
        if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
        writeFileSync(progressPath, `# Progress\n${entry}`, "utf-8");
      }

      appendTaskLog(taskId, "pm_oversight", `PM wrote progress.md entry for '${task.title}'`);
      logger.info({ taskId, projectId }, "[pm-orchestrator] PM wrote progress.md via LLM");
    } catch (err) {
      logger.warn({ err, taskId }, "[pm-orchestrator] progress.md write failed — continuing");
    } finally {
      pmInFlight.delete(guardKey);
    }
  }

  // ── PM: 다음 태스크 시작 (즉시 — 타이머 없음) ──
  async function pmStartNextTask(event: TaskStatusEvent): Promise<void> {
    const { projectId } = event;
    if (!projectId) return;
    const guardKey = `next:${projectId}`;
    if (pmInFlight.has(guardKey)) return;
    pmInFlight.add(guardKey);

    try {
      const oversight = db.prepare("SELECT 1 FROM pm_oversight_state WHERE project_id = ?").get(projectId);
      if (!oversight) return;

      const planned = db.prepare(
        `SELECT t.id, t.title, t.assigned_agent_id
         FROM tasks t WHERE t.project_id = ? AND t.status = 'planned' AND t.assigned_agent_id IS NOT NULL
         ORDER BY t.created_at ASC LIMIT 10`,
      ).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

      if (planned.length === 0) {
        const active = db.prepare(
          "SELECT 1 FROM tasks WHERE project_id = ? AND status IN ('planned', 'in_progress', 'review') LIMIT 1",
        ).get(projectId);

        if (!active) {
          const pm = findProjectPm(db, projectId);
          if (pm) {
            // 프로젝트 완료 → 회고 보고서 생성
            void generateProjectRetrospective(pm, projectId, learnDeps);
            const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(projectId) as { name: string } | undefined;
            const lang = getPreferredLanguage();
            const msg = lang.startsWith("ko")
              ? `프로젝트 '${project?.name ?? projectId}' 전체 완료. 회고 보고서를 작성하겠습니다.`
              : `Project '${project?.name ?? projectId}' completed. Generating retrospective.`;
            sendAgentMessage({ id: pm.id as string }, msg, "report", "all", null, null);
          }
          db.prepare("DELETE FROM pm_oversight_state WHERE project_id = ?").run(projectId);
          logger.info({ projectId }, "[pm-orchestrator] project completed");
        }
        return;
      }

      const busyAgents = new Set(
        (db.prepare(
          "SELECT DISTINCT assigned_agent_id FROM tasks WHERE project_id = ? AND status IN ('in_progress', 'review') AND assigned_agent_id IS NOT NULL",
        ).all(projectId) as { assigned_agent_id: string }[]).map((r) => r.assigned_agent_id),
      );

      const started = new Set<string>();
      for (const task of planned) {
        if (busyAgents.has(task.assigned_agent_id)) continue;
        if (started.has(task.assigned_agent_id)) continue;
        started.add(task.assigned_agent_id);
        appendTaskLog(task.id, "pm_oversight", `PM started: ${task.title}`);
        startTaskExecutionForAgent(task.id, task.assigned_agent_id);
      }
    } catch (err) {
      logger.error({ err, projectId }, "[pm-orchestrator] start-next error");
    } finally {
      pmInFlight.delete(guardKey);
    }
  }

  // ── 서버 시작 시 미완료 프로젝트 복원 ──
  // DB가 준비되면 즉시 실행 (orchestration.ts에서 호출 시점에 DB는 이미 준비됨)
  try {
    const rows = db.prepare("SELECT project_id FROM pm_oversight_state").all() as { project_id: string }[];
    for (const row of rows) {
      void pmStartNextTask({
        type: "task_status_changed", taskId: "", projectId: row.project_id,
        fromStatus: "unknown", toStatus: "done", agentId: null,
      });
    }
    if (rows.length > 0) {
      logger.info({ count: rows.length }, "[pm-orchestrator] restored active projects");
    }
  } catch (err) {
    logger.error({ err }, "[pm-orchestrator] restore failed (pm_oversight_state table may not exist)");
  }
}
