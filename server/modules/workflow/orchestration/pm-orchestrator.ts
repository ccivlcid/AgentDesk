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
import { loadPrompt } from "../../../lib/prompt-loader.ts";
import { analyzeTaskFailure } from "./run-complete-handler/error-analysis.ts";
import { runAutoLearning, generateProjectRetrospective, updateAgentFitness } from "./auto-learning.ts";
import { findApiProvider, resolveModel } from "../../routes/ops/custom-features-ai/provider-helpers.ts";
import { callProvider } from "../../routes/ops/custom-features-ai/llm-providers.ts";
import logger from "../../../lib/logger.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wide deps from orchestration context
type AgentRow = Record<string, any>;

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
  insertNotification: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => void;
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
      // 적합도 추적 + 자동 학습
      if (event.taskId) {
        const doneTask = db.prepare("SELECT assigned_agent_id, task_type, started_at, completed_at FROM tasks WHERE id = ?")
          .get(event.taskId) as { assigned_agent_id: string | null; task_type: string; started_at: number | null; completed_at: number | null } | undefined;
        if (doneTask?.assigned_agent_id) {
          const dur = (doneTask.completed_at ?? nowMs()) - (doneTask.started_at ?? nowMs());
          updateAgentFitness(db, doneTask.assigned_agent_id, doneTask.task_type ?? "general", true, Math.max(0, dur));
        }
        const pm = findProjectPm(db, event.projectId!);
        if (pm) void runAutoLearning(pm, event.taskId, event.projectId!, learnDeps);
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
        "SELECT id, title, description, result, assigned_agent_id, project_id, source_task_id, status FROM tasks WHERE id = ?",
      ).get(taskId) as { id: string; title: string; description: string | null; result: string | null; assigned_agent_id: string | null; project_id: string | null; source_task_id: string | null; status: string } | undefined;

      if (!task || task.status !== "review" || !task.project_id) return;

      // 하위 협업 태스크는 PM 리뷰 스킵
      if (task.source_task_id) return;

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

      if (isApprove) {
        appendTaskLog(taskId, "pm_oversight", `PM approved: ${text.slice(0, 200)}`);
        finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: "pm_agent" });
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
        broadcast("pm_activity", {
          projectId, taskId, action: "approved",
          agentName: pm.name, summary: `PM approved '${task.title}'`, timestamp: nowMs(),
        });
      } else {
        // 수정 요청: 상태 재확인 후 변경
        const recheck = db.prepare("SELECT status FROM tasks WHERE id = ?").get(taskId) as { status: string } | undefined;
        if (recheck?.status !== "review") return;

        appendTaskLog(taskId, "pm_oversight", `PM requested revision: ${text.slice(0, 200)}`);
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
          agentName: pm.name, summary: `PM requested revision for '${task.title}'`, timestamp: nowMs(),
        });
      }

      logger.info({ taskId, decision: isApprove ? "approve" : "revise" }, "[pm-orchestrator] review");
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

  // ── PM: 실패 태스크 처리 ──
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

      // 에러 분석 (best effort — API 키 있을 때만)
      void analyzeTaskFailure(taskId, task.title, event.exitCode ?? 1, {
        db, logsDir: deps.logsDir, findApiProvider, resolveModel, callProvider,
        getPreferredLanguage, appendTaskLog,
      });

      // status가 이미 바뀌었으면 스킵 (inbox로 변경됨)
      if (task.status !== "inbox" && task.status !== "failed") return;

      const retryCount = task.retry_count ?? 0;
      const maxRetries = task.max_retries ?? 2;

      const pm = findProjectPm(db, projectId);
      if (!pm) {
        // PM 없으면 자동 재시도 fallback
        if (retryCount < maxRetries) {
          db.prepare("UPDATE tasks SET status = 'planned', retry_count = ?, updated_at = ? WHERE id = ?")
            .run(retryCount + 1, nowMs(), taskId);
          appendTaskLog(taskId, "pm_oversight", `Auto-retry ${retryCount + 1}/${maxRetries} (no PM)`);
          broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
          if (task.assigned_agent_id) {
            startTaskExecutionForAgent(taskId, task.assigned_agent_id);
          }
        }
        return;
      }

      const lang = getPreferredLanguage();
      const prompt = loadPrompt("pm/handle-failure", {
        taskTitle: task.title,
        errorSummary: task.last_error_summary ?? "Unknown error",
        retryCount: String(retryCount),
        maxRetries: String(maxRetries),
        lang,
      });

      if (!prompt) {
        if (retryCount < maxRetries && task.assigned_agent_id) {
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
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      } else if (/^ESCALATE[:\s]/im.test(text) || /에스컬|escalat/i.test(text)) {
        appendTaskLog(taskId, "pm_oversight", `PM escalated: ${text.slice(0, 200)}`);
        insertNotification({
          type: "agent_error",
          title: `PM: ${task.title}`,
          body: text.slice(0, 300),
          task_id: taskId,
          agent_id: pm.id as string,
        });
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      } else {
        // RETRY (default)
        if (retryCount < maxRetries) {
          appendTaskLog(taskId, "pm_oversight", `PM retry (${retryCount + 1}/${maxRetries}): ${text.slice(0, 200)}`);
          db.prepare("UPDATE tasks SET status = 'planned', retry_count = ?, updated_at = ? WHERE id = ?")
            .run(retryCount + 1, nowMs(), taskId);
          broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
          if (task.assigned_agent_id) {
            startTaskExecutionForAgent(taskId, task.assigned_agent_id);
          }
        } else {
          appendTaskLog(taskId, "pm_oversight", `PM: max retries exceeded: ${text.slice(0, 200)}`);
          insertNotification({
            type: "agent_error",
            title: `${task.title} — max retries`,
            body: text.slice(0, 300),
            task_id: taskId,
            agent_id: pm.id as string,
          });
        }
        sendAgentMessage({ id: pm.id as string }, text, "report", "all", null, taskId);
      }

      logger.info({ taskId, decision: text.slice(0, 50) }, "[pm-orchestrator] failure decision");
    } catch (err) {
      logger.error({ err, taskId }, "[pm-orchestrator] failure handler error");
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
