import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { startExecutionLoop } from "../../../agent-runtime/execution-loop.ts";
import { findApiProvider, readDefaultProvider, resolveModel } from "../../ops/custom-features-ai/provider-helpers.ts";
import { callProvider } from "../../ops/custom-features-ai/llm-providers.ts";

// ── Kickoff Meeting ─────────────────────────────────────────────────────────

interface KickoffMeetingAgent {
  id: string;
  name: string;
  role: string | null;
  dept_name: string | null;
  projectRole: string | null;       // pm | pl | dev
  projectRoleLabel: string | null;  // 사용자 지정 역할명
  taskTitles: string[];             // 배정된 태스크 목록 (0개일 수 있음)
}

/**
 * 프로젝트 킥오프 직후 에이전트들이 모여 회의를 진행.
 * meeting_minutes + meeting_minute_entries DB 저장 + client_office_call WS 브로드캐스트.
 * 백그라운드 비동기 실행 (킥오프 응답을 블록하지 않음).
 */
async function runKickoffMeeting(
  projectName: string,
  projectGoal: string,
  firstTaskId: string,
  agents: KickoffMeetingAgent[],
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
  nowMs: () => number,
  /** 회의 완료 후 호출 — planned 태스크 자동 실행 트리거 */
  onComplete?: () => void,
): Promise<void> {
  if (agents.length === 0) return;

  const meetingId = randomUUID();
  const startTs = nowMs();

  // 1. meeting_minutes 레코드 생성
  db.prepare(`
    INSERT INTO meeting_minutes (id, task_id, meeting_type, round, title, status, started_at, created_at)
    VALUES (?, ?, 'planned', 1, ?, 'in_progress', ?, ?)
  `).run(meetingId, firstTaskId, `[킥오프] ${projectName}`, startTs, startTs);

  broadcast("meeting_minutes_update", { task_id: firstTaskId, meeting_id: meetingId, phase: "started" });

  // 2. 회의 스크립트 생성 (에이전트별 발언 라인)
  const lines: { agentIdx: number; content: string; messageType: string }[] = [];

  // PM 역할 에이전트를 사회자로 지정 (없으면 첫 번째)
  const pmIdx = agents.findIndex((a) => a.projectRole === "pm");
  const facilitatorIdx = pmIdx >= 0 ? pmIdx : 0;
  const facilitator = agents[facilitatorIdx];
  const ROLE_LABEL: Record<string, string> = { pm: "PM", pl: "PL", dev: "Dev" };

  // 오프닝 (PM이 진행)
  lines.push({
    agentIdx: facilitatorIdx,
    content: `안녕하세요. «${projectName}» 프로젝트 킥오프 회의를 시작하겠습니다.\n목표: ${projectGoal.slice(0, 200)}`,
    messageType: "opening",
  });

  // 각 에이전트가 자신의 역할 + 태스크 발표 (PM 포함 전원)
  agents.forEach((a, i) => {
    const roleTag = a.projectRoleLabel ?? (a.projectRole ? ROLE_LABEL[a.projectRole] : null);
    const rolePrefix = roleTag ? `[${roleTag}] ` : "";

    if (a.taskTitles.length === 0) {
      // 태스크 미배정 에이전트 — 지원 대기 발언
      lines.push({
        agentIdx: i,
        content: `${rolePrefix}배정된 태스크는 아직 없지만, 필요 시 지원하겠습니다.`,
        messageType: "support_standby",
      });
    } else if (a.taskTitles.length === 1) {
      lines.push({
        agentIdx: i,
        content: `${rolePrefix}담당 업무 확인 — «${a.taskTitles[0]}». 착수하겠습니다.`,
        messageType: "task_confirm",
      });
    } else {
      const taskList = a.taskTitles.map((t, j) => `${j + 1}. ${t}`).join(", ");
      lines.push({
        agentIdx: i,
        content: `${rolePrefix}담당 업무 ${a.taskTitles.length}건 확인 — ${taskList}. 순서대로 진행하겠습니다.`,
        messageType: "task_confirm",
      });
    }
  });

  // 마무리 (PM이 클로징)
  const totalTasks = agents.reduce((sum, a) => sum + a.taskTitles.length, 0);
  lines.push({
    agentIdx: facilitatorIdx,
    content: `전원 확인 완료. 총 ${totalTasks}건 태스크, ${agents.length}명 투입. 각자 담당 업무를 시작해주세요.`,
    messageType: "closing",
  });

  // 3. 에이전트들 회의실 입장 (arrive)
  for (let i = 0; i < agents.length; i++) {
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "kickoff",
      action: "arrive",
      task_id: firstTaskId,
      hold_until: startTs + 90_000,
    });
    await delay(300);
  }

  // 4. 발언 순서대로 meeting_minute_entries 저장 + speak 브로드캐스트
  let seq = 0;
  for (const line of lines) {
    const agent = agents[line.agentIdx];
    const entryTs = nowMs();
    // role_label: 프로젝트 역할 (PM/PL/Dev 등)이 있으면 우선 사용, 없으면 에이전트 직급(senior/junior)
    const roleLabel = agent.projectRoleLabel
      ?? (agent.projectRole ? { pm: "PM", pl: "PL", dev: "Dev" }[agent.projectRole] ?? agent.role : agent.role);
    db.prepare(`
      INSERT INTO meeting_minute_entries
        (meeting_id, seq, speaker_agent_id, speaker_name, department_name, role_label, message_type, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingId, seq++,
      agent.id, agent.name,
      agent.dept_name ?? null,
      roleLabel ?? null,
      line.messageType, line.content,
      entryTs,
    );

    broadcast("client_office_call", {
      from_agent_id: agent.id,
      seat_index: line.agentIdx,
      phase: "kickoff",
      action: "speak",
      line: line.content,
      task_id: firstTaskId,
      hold_until: entryTs + 90_000,
    });
    broadcast("meeting_minutes_update", { task_id: firstTaskId, meeting_id: meetingId, phase: "entry" });

    await delay(600);
  }

  // 5. 회의 완료
  db.prepare("UPDATE meeting_minutes SET status = 'completed', completed_at = ? WHERE id = ?")
    .run(nowMs(), meetingId);
  broadcast("meeting_minutes_update", { task_id: firstTaskId, meeting_id: meetingId, phase: "completed", status: "completed" });

  // 6. 에이전트 퇴장
  for (let i = 0; i < agents.length; i++) {
    await delay(200);
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "kickoff",
      action: "dismiss",
      task_id: firstTaskId,
    });
  }

  logger.info({ meetingId, projectName, agentCount: agents.length }, "[kickoff] meeting completed");

  // 7. 회의 완료 후 planned 태스크 자동 실행 (안전망)
  if (onComplete) {
    try { onComplete(); } catch (err) {
      logger.warn({ err, meetingId }, "[kickoff] post-meeting onComplete failed");
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * CLI 프로바이더(claude/codex/gemini 등)를 통해 단순 텍스트 생성 (API 키 없을 때 fallback).
 * --print 모드로 LLM에게 JSON 응답을 요청한다.
 */
async function callViaCliProvider(cliProvider: string, fullPrompt: string): Promise<string> {
  let args: string[];
  if (cliProvider === "codex") {
    args = ["codex", "exec", "--json"];
  } else if (cliProvider === "gemini") {
    args = ["gemini", "--yolo"];
  } else {
    // claude (default), cursor, windsurf 등
    args = ["claude", "--dangerously-skip-permissions", "--print", "--max-turns", "1"];
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
    });
    const timeoutId = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error(`CLI provider '${cliProvider}' timed out after 30s`));
    }, 30_000);
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.on("error", (err) => { clearTimeout(timeoutId); reject(err); });
    child.on("close", () => { clearTimeout(timeoutId); resolve(output); });
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
}

// ── PM Oversight — PM이 프로젝트를 지속적으로 관리 ─────────────────────────

interface PmOversightEntry {
  projectId: string;
  projectName: string;
  pmAgentId: string | null;
  pmAgentName: string;
  startedAt: number;
}

/** 활성 PM 관리 대상 프로젝트 */
const pmOversightProjects = new Map<string, PmOversightEntry>();

/** 이미 큐에 enqueue된 taskId — 중복 시작 방지 */
const enqueuedTaskIds = new Set<string>();

/** PM 관리 sweep 주기 (ms) */
const PM_SWEEP_INTERVAL = 15_000;

/** 최대 관리 시간 (1시간) */
const PM_OVERSIGHT_TTL = 3_600_000;

let pmSweepTimer: ReturnType<typeof setInterval> | null = null;
let _pmSweepFn: (() => void) | null = null;

function startPmOversightSweep(deps: {
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  nowMs: () => number;
  resolveProjectPath: (projectId: string) => string;
  startTaskExecutionForAgent?: (taskId: string, agentId: string) => void;
}): void {
  if (pmSweepTimer) return; // 이미 실행 중
  const { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, startTaskExecutionForAgent } = deps;

  // Sweep 로직을 별도 함수로 — triggerImmediatePmSweep에서도 호출
  _pmSweepFn = () => {
    for (const [projectId, entry] of pmOversightProjects) {
      // TTL 초과 시 관리 종료
      if (Date.now() - entry.startedAt > PM_OVERSIGHT_TTL) {
        pmOversightProjects.delete(projectId);
        logger.info({ projectId }, "[pm-oversight] TTL expired, stopping oversight");
        continue;
      }

      try {
        // 프로젝트의 태스크 상태 집계
        const counts = db.prepare(`
          SELECT status, COUNT(*) as cnt FROM tasks
          WHERE project_id = ?
          GROUP BY status
        `).all(projectId) as { status: string; cnt: number }[];

        const statusMap = new Map(counts.map((c) => [c.status, c.cnt]));
        const planned = statusMap.get("planned") ?? 0;
        const inProgress = statusMap.get("in_progress") ?? 0;
        const done = statusMap.get("done") ?? 0;
        const failed = statusMap.get("error") ?? 0;
        const total = counts.reduce((s, c) => s + c.cnt, 0);

        // 모든 태스크 완료/실패 → PM 관리 종료
        if (planned === 0 && inProgress === 0 && total > 0) {
          pmOversightProjects.delete(projectId);
          // 해당 프로젝트 태스크 추적 정리
          const projectTaskIds = (db.prepare("SELECT id FROM tasks WHERE project_id = ?").all(projectId) as { id: string }[]);
          for (const t of projectTaskIds) enqueuedTaskIds.delete(t.id);

          const msg = `프로젝트 «${entry.projectName}» 전체 완료. 완료 ${done}건, 실패 ${failed}건.`;
          appendTaskLog(null, "pm_oversight", msg);
          // PM이 퇴장하면서 최종 보고 (기존 client_office_call UI에 표시)
          if (entry.pmAgentId) {
            broadcast("client_office_call", {
              from_agent_id: entry.pmAgentId,
              seat_index: 0,
              phase: "kickoff",
              action: "speak",
              line: msg,
            });
            setTimeout(() => {
              broadcast("client_office_call", {
                from_agent_id: entry.pmAgentId,
                seat_index: 0,
                phase: "kickoff",
                action: "dismiss",
              });
            }, 3000);
          }
          logger.info({ projectId, done, failed }, "[pm-oversight] project completed");
          continue;
        }

        // planned 태스크가 있고 실행 중이 아닌 에이전트 → 다음 태스크 시작
        if (planned > 0) {
          const plannedTasks = db.prepare(`
            SELECT t.id, t.title, t.assigned_agent_id
            FROM tasks t
            WHERE t.project_id = ? AND t.status = 'planned' AND t.assigned_agent_id IS NOT NULL
            ORDER BY t.created_at ASC
          `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

          // 현재 실행 중/검토 중인 에이전트 ID 세트
          const busyAgents = new Set(
            (db.prepare(`
              SELECT DISTINCT assigned_agent_id FROM tasks
              WHERE project_id = ? AND status IN ('in_progress', 'review') AND assigned_agent_id IS NOT NULL
            `).all(projectId) as { assigned_agent_id: string }[]).map((r) => r.assigned_agent_id),
          );

          // 이미 완료/실행 중인 태스크는 enqueuedTaskIds에서 정리
          for (const tid of enqueuedTaskIds) {
            const st = db.prepare("SELECT status FROM tasks WHERE id = ?").get(tid) as { status: string } | undefined;
            if (st && st.status !== "planned") enqueuedTaskIds.delete(tid);
          }

          // 유휴 에이전트의 planned 태스크를 시작
          const started: string[] = [];
          const seenAgents = new Set<string>();
          for (const task of plannedTasks) {
            if (busyAgents.has(task.assigned_agent_id)) continue;
            if (seenAgents.has(task.assigned_agent_id)) continue;
            if (enqueuedTaskIds.has(task.id)) continue; // 이미 큐에 있으면 스킵
            seenAgents.add(task.assigned_agent_id);

            try {
              enqueuedTaskIds.add(task.id);
              if (startTaskExecutionForAgent) {
                startTaskExecutionForAgent(task.id, task.assigned_agent_id);
              } else {
                let pp = "";
                try { pp = resolveProjectPath(projectId); } catch { /* optional */ }
                const ac = new AbortController();
                void startExecutionLoop(
                  { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
                  { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp, chainExecution: true },
                  task.title,
                  ac,
                ).then((runId) => { kickoffRuns.set(runId, ac); }).catch((e) => {
                  enqueuedTaskIds.delete(task.id);
                  logger.error({ err: e, taskId: task.id }, "[pm-oversight] execution-loop failed");
                });
              }
              started.push(task.title);
              logger.info({ taskId: task.id, agentId: task.assigned_agent_id }, "[pm-oversight] started planned task");
            } catch (err) {
              enqueuedTaskIds.delete(task.id);
              logger.error({ err, taskId: task.id }, "[pm-oversight] failed to start task");
            }
          }

          if (started.length > 0 && entry.pmAgentId) {
            const msg = `${started.length}건 태스크 착수 지시: ${started.join(", ")}`;
            broadcast("client_office_call", {
              from_agent_id: entry.pmAgentId,
              seat_index: 0,
              phase: "kickoff",
              action: "speak",
              line: msg,
            });
          }
        }

        // 진행 상황 로그 (60초마다 — 4회 sweep 당 1회)
        if (inProgress > 0 && entry.pmAgentId && Math.floor((Date.now() - entry.startedAt) / PM_SWEEP_INTERVAL) % 4 === 0) {
          broadcast("client_office_call", {
            from_agent_id: entry.pmAgentId,
            seat_index: 0,
            phase: "kickoff",
            action: "speak",
            line: `진행 현황: 실행중 ${inProgress}, 대기 ${planned}, 완료 ${done}/${total}`,
            hold_until: Date.now() + 10_000,
          });
        }
      } catch (err) {
        logger.error({ err, projectId }, "[pm-oversight] sweep error");
      }
    }

    // 모든 프로젝트가 완료되면 타이머 정리
    if (pmOversightProjects.size === 0 && pmSweepTimer) {
      clearInterval(pmSweepTimer);
      pmSweepTimer = null;
      _pmSweepFn = null;
      logger.info("[pm-oversight] all projects complete, sweep stopped");
    }
  };

  pmSweepTimer = setInterval(_pmSweepFn, PM_SWEEP_INTERVAL);
}

/** Immediately run PM oversight sweep for a specific project (skip 15s wait). */
export function triggerImmediatePmSweep(projectId?: string): void {
  if (!_pmSweepFn) return;
  logger.info({ projectId }, "[pm-oversight] immediate sweep triggered");
  _pmSweepFn();
}

interface KickoffDeps {
  app: Express;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  resolveProjectPath: (projectId: string) => string;
  nowMs: () => number;
  /** Full AgentOffice execution engine (injected from RuntimeContext) */
  startTaskExecutionForAgent?: (taskId: string, agentId: string) => void;
  /** Insert & broadcast a notification (optional — kickoff/task start events) */
  insertNotification?: (params: { type: "task_complete" | "task_error" | "task_started" | "kickoff" | "decision_created" | "agent_error" | "system" | "cost_alert" | "agent_anomaly" | "heartbeat"; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string;
}

// In-memory map of kickoff-triggered runs → AbortControllers (fallback용)
const kickoffRuns = new Map<string, AbortController>();

export function registerProjectKickoffRoutes({ app, db, broadcast, appendTaskLog, resolveProjectPath, nowMs, startTaskExecutionForAgent, insertNotification }: KickoffDeps): void {

  // POST /api/projects/:id/kickoff
  // 프로젝트 directive + core_goal + 에이전트 구성을 LLM에 전달해 태스크 목록 자동 생성.
  // 태스크 생성 직후 첫 번째 태스크를 에이전트가 자동 실행.
  // 정보 부족 시 clarification_request WS 이벤트로 유저에게 질문.
  app.post("/api/projects/:id/kickoff", async (req, res) => {
    const projectId = req.params.id;
    const { clarification_answer, additional_directive, clarification_id } = (req.body ?? {}) as { clarification_answer?: string; additional_directive?: string; clarification_id?: string };

    // clarification 답변이 함께 왔으면 DB 업데이트 (별도 API 호출 불필요)
    if (clarification_id && clarification_answer?.trim()) {
      db.prepare(
        "UPDATE project_clarifications SET answer = ?, status = 'answered', answered_at = ? WHERE id = ? AND project_id = ?",
      ).run(clarification_answer.trim(), nowMs(), clarification_id, projectId);
    }

    const project = db.prepare(
      "SELECT id, name, core_goal, directive FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    // 이미 실행 중인 태스크가 있으면 킥오프 거부
    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) {
      return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });
    }

    // 프로젝트에 배정된 에이전트 목록 (부서·역할·프로젝트역할 포함, 멀티 에이전트 배분용)
    const assignedAgents = db.prepare(`
      SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
      FROM agents a
      JOIN project_agents pa ON a.id = pa.agent_id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE pa.project_id = ?
      LIMIT 20
    `).all(projectId) as { id: string; name: string; role: string | null; department_id: string | null; dept_name: string | null; project_role: string | null; project_role_label: string | null }[];

    // 프롬프트 구성
    const parts: string[] = [
      `Project Name: ${project.name}`,
      `Goal: ${project.core_goal}`,
    ];
    if (project.directive) parts.push(`Directive:\n${project.directive}`);
    if (assignedAgents.length > 0) {
      const STANDARD_ROLE_LABEL: Record<string, string> = { pm: "PROJECT MANAGER", pl: "PROJECT LEAD", dev: "DEVELOPER" };
      const agentList = assignedAgents
        .map((a) => {
          const dept = a.dept_name ? `, dept: ${a.dept_name}` : "";
          const role = a.role ? `, seniority: ${a.role}` : "";
          const displayRole = a.project_role_label
            ?? (a.project_role ? STANDARD_ROLE_LABEL[a.project_role] : null);
          const projectRole = displayRole ? ` [${displayRole.toUpperCase()}]` : "";
          return `- ${a.name}${projectRole}${dept}${role}`;
        })
        .join("\n");
      parts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    const additionalDir = (additional_directive ?? "").trim();
    if (additionalDir) parts.push(`This Round's Task:\n${additionalDir}`);
    if (clarification_answer) parts.push(`User clarification: ${clarification_answer}`);

    const systemPrompt = loadPrompt("system/project-kickoff");

    try {
      // 가용한 API 프로바이더 자동 탐색 (Anthropic → OpenAI → Google 등 순)
      const provider = findApiProvider(db, "api");

      let rawText: string;
      if (provider) {
        // HTTP API 키 기반 호출
        const model = resolveModel(provider);
        const signal = AbortSignal.timeout(30_000);
        rawText = await callProvider(provider, model, systemPrompt, parts.join("\n\n"), signal);
      } else {
        // API 키 없음 → Settings → CLI에 설정된 프로바이더로 fallback
        const cliProvider = readDefaultProvider(db);
        const fullPrompt = `${systemPrompt}\n\n${parts.join("\n\n")}`;
        rawText = await callViaCliProvider(cliProvider, fullPrompt);
      }

      // JSON 추출 (마크다운 펜스가 있어도 처리)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "invalid_llm_response" });

      let parsed: {
        tasks?: { title: string; description?: string; agent_name?: string | null }[];
        needs_clarification?: boolean;
        question?: string;
      };
      try {
        parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
      } catch {
        return res.status(500).json({ error: "json_parse_failed" });
      }

      // 추가 정보 필요한 경우
      if (parsed.needs_clarification && parsed.question) {
        const clarificationId = randomUUID();
        db.prepare(
          "INSERT INTO project_clarifications (id, project_id, question, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
        ).run(clarificationId, projectId, parsed.question, nowMs());

        broadcast("clarification_request", { projectId, clarificationId, question: parsed.question });
        return res.json({ status: "clarification_needed", clarificationId, question: parsed.question });
      }

      // ── 태스크 생성 + 에이전트 분배 ───────────────────────────────────────
      const tasks = parsed.tasks ?? [];
      const created: { id: string; title: string; assigned_agent_id: string | null }[] = [];

      // agent_name → id 매핑
      const agentByName = new Map(assignedAgents.map((a) => [a.name.toLowerCase(), a.id]));
      const fallbackAgentId = assignedAgents[0]?.id ?? null;

      for (const task of tasks) {
        if (!task.title?.trim()) continue;
        const taskId = randomUUID();
        const now = nowMs();

        // LLM이 제안한 에이전트명으로 매핑, 없으면 첫 번째 에이전트
        const suggestedId = task.agent_name
          ? (agentByName.get(task.agent_name.toLowerCase()) ?? fallbackAgentId)
          : fallbackAgentId;

        db.prepare(`
          INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'planned', 3, 'general', ?, ?)
        `).run(taskId, task.title.trim(), task.description ?? "", projectId, suggestedId, now, now);

        const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as { id: string; title: string; assigned_agent_id: string | null };
        broadcast("task_update", row);
        created.push(row);
      }

      // ── 킥오프 회의 (백그라운드) ──────────────────────────────────────
      const firstTask = created[0];
      if (firstTask) {
        // project_agents 전원 참석 (태스크 배정 여부 무관)
        // 각 에이전트별 배정된 태스크 목록도 함께 매핑
        const tasksByAgent = new Map<string, string[]>();
        for (const t of created) {
          if (!t.assigned_agent_id) continue;
          const list = tasksByAgent.get(t.assigned_agent_id) ?? [];
          list.push(t.title);
          tasksByAgent.set(t.assigned_agent_id, list);
        }

        const meetingAgents: KickoffMeetingAgent[] = assignedAgents.map((ag) => ({
          id: ag.id,
          name: ag.name,
          role: ag.role,
          dept_name: ag.dept_name,
          projectRole: ag.project_role,
          projectRoleLabel: ag.project_role_label,
          taskTitles: tasksByAgent.get(ag.id) ?? [],
        }));

        // 회의 완료 후 아직 planned 상태인 태스크를 자동 시작하는 안전망
        const postMeetingResume = () => {
          const plannedTasks = db.prepare(`
            SELECT id, title, assigned_agent_id FROM tasks
            WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
            ORDER BY created_at ASC
          `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

          if (plannedTasks.length === 0) return;
          logger.info({ projectId, count: plannedTasks.length }, "[kickoff] post-meeting: resuming planned tasks");

          // 에이전트별 첫 번째 planned 태스크만 시작
          const seen = new Set<string>();
          for (const task of plannedTasks) {
            if (seen.has(task.assigned_agent_id)) continue;
            seen.add(task.assigned_agent_id);
            try {
              if (startTaskExecutionForAgent) {
                startTaskExecutionForAgent(task.id, task.assigned_agent_id);
              } else {
                let pp = "";
                try { pp = resolveProjectPath(projectId); } catch { /* optional */ }
                const ac = new AbortController();
                void startExecutionLoop(
                  { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
                  { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp, chainExecution: true },
                  task.title,
                  ac,
                ).then((runId) => { kickoffRuns.set(runId, ac); }).catch((e) => {
                  logger.error({ err: e, taskId: task.id }, "[kickoff] post-meeting execution-loop failed");
                });
              }
              logger.info({ taskId: task.id, agentId: task.assigned_agent_id }, "[kickoff] post-meeting: task started");
            } catch (err) {
              logger.error({ err, taskId: task.id }, "[kickoff] post-meeting: task start failed");
            }
          }
        };

        void runKickoffMeeting(
          project.name,
          project.core_goal,
          firstTask.id,
          meetingAgents,
          db,
          broadcast,
          nowMs,
          postMeetingResume,
        ).catch((err) => {
          logger.warn({ err, projectId }, "[kickoff] meeting failed (non-fatal)");
        });
      }

      // ── 에이전트별 병렬 실행 ─────────────────────────────────────────
      // 각 에이전트에 배정된 첫 번째 태스크를 동시에 시작 (서로 다른 에이전트는 병렬).

      // 에이전트별 첫 번째 태스크만 추출
      const firstByAgent = created.reduce<Map<string, { id: string; title: string }>>(
        (map, t) => {
          if (t.assigned_agent_id && !map.has(t.assigned_agent_id)) {
            map.set(t.assigned_agent_id, { id: t.id, title: t.title });
          }
          return map;
        },
        new Map(),
      );

      const autoRunIds: string[] = [];

      if (startTaskExecutionForAgent) {
        // ── Full AgentOffice 엔진 사용 (spawnCliAgent + review + report) ──
        for (const [agentId, task] of firstByAgent) {
          try {
            startTaskExecutionForAgent(task.id, agentId);
            autoRunIds.push(task.id);
            logger.info({ agentId, taskId: task.id }, "[kickoff] agent started via full engine");
          } catch (runErr) {
            logger.error({ err: runErr, agentId, projectId }, "[kickoff] full engine start failed");
          }
        }
      } else {
        // ── Fallback: execution-loop (API/CLI 심플 모드) ──
        let projectPath = "";
        try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

        for (const [agentId, task] of firstByAgent) {
          try {
            const abortController = new AbortController();
            const runId = await startExecutionLoop(
              { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
              { agentId, taskId: task.id, projectId, projectPath, chainExecution: true },
              task.title,
              abortController,
            );
            kickoffRuns.set(runId, abortController);
            autoRunIds.push(runId);
            logger.info({ runId, agentId, taskId: task.id }, "[kickoff] agent started via execution-loop");
          } catch (runErr) {
            logger.error({ err: runErr, agentId, projectId }, "[kickoff] auto-run failed");
          }
        }
      }

      // ── PM 관리 등록 — PM이 프로젝트를 지속적으로 관리 ──
      const pmAgent = assignedAgents.find((a) => a.project_role === "pm");
      pmOversightProjects.set(projectId, {
        projectId,
        projectName: project.name,
        pmAgentId: pmAgent?.id ?? null,
        pmAgentName: pmAgent?.name ?? "PM",
        startedAt: Date.now(),
      });
      startPmOversightSweep({ db, broadcast, appendTaskLog, nowMs, resolveProjectPath, startTaskExecutionForAgent });
      logger.info({ projectId, pmAgentId: pmAgent?.id }, "[kickoff] PM oversight started");

      // 킥오프 알림
      insertNotification?.({
        type: "kickoff",
        title: `${project.name} 킥오프 완료`,
        body: `${created.length}건 태스크 생성, ${autoRunIds.length}건 자동 실행 시작`,
      });

      return res.json({ status: "ok", tasks: created, autoRunIds });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "kickoff_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/resume
  // 중단된 연쇄 실행을 재개 — 다음 planned 태스크부터 chain 실행 시작.
  app.post("/api/projects/:id/resume", async (req, res) => {
    const projectId = req.params.id;

    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    // 이미 실행 중인 태스크가 있으면 재개 거부
    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) {
      return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });
    }

    // 다음 실행 대상: planned + 에이전트 배정된 태스크 (created_at 순)
    const nextTask = db.prepare(`
      SELECT id, title, assigned_agent_id FROM tasks
      WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `).get(projectId) as { id: string; title: string; assigned_agent_id: string } | undefined;

    if (!nextTask) {
      return res.json({ status: "nothing_to_resume", message: "No planned tasks with assigned agents" });
    }

    try {
      let projectPath = "";
      try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

      const abortController = new AbortController();
      const runId = await startExecutionLoop(
        { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
        {
          agentId: nextTask.assigned_agent_id,
          taskId: nextTask.id,
          projectId,
          projectPath,
          chainExecution: true,
        },
        nextTask.title,
        abortController,
      );
      kickoffRuns.set(runId, abortController);

      logger.info({ runId, taskId: nextTask.id, projectId }, "[resume] chain execution resumed");
      return res.json({ status: "ok", runId, taskId: nextTask.id, title: nextTask.title });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, projectId }, "[resume] failed");
      return res.status(500).json({ error: "resume_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/clarification-reply
  app.post("/api/projects/:id/clarification-reply", (req, res) => {
    const projectId = req.params.id;
    const { clarification_id, answer } = (req.body ?? {}) as { clarification_id?: string; answer?: string };

    if (!clarification_id || !answer?.trim()) {
      return res.status(400).json({ error: "missing_fields" });
    }

    db.prepare(
      "UPDATE project_clarifications SET answer = ?, status = 'answered', answered_at = ? WHERE id = ? AND project_id = ?",
    ).run(answer.trim(), nowMs(), clarification_id, projectId);

    return res.json({ status: "ok" });
  });
}
