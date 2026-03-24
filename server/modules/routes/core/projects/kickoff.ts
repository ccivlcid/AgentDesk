import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { startExecutionLoop } from "../../../agent-runtime/execution-loop.ts";
import { resolveProvider, getDefaultModel, callLlmOneShot as callLlmOneShotShared } from "../../../agent-runtime/llm-client.ts";

/** Simple one-shot LLM call using resolveProvider. Returns empty string if no provider. */
async function callLlmOneShot(db: import("node:sqlite").DatabaseSync, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const resolved = resolveProvider(db);
  const model = getDefaultModel(resolved.providerType);
  return callLlmOneShotShared({ provider: resolved, model, systemPrompt, userPrompt, maxTokens: 4096, signal });
}

function readDefaultCliProvider(db: import("node:sqlite").DatabaseSync): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'settings'").get() as { value: string } | undefined;
  if (!row) return "claude";
  try {
    const parsed = JSON.parse(row.value) as { defaultProvider?: string };
    return parsed.defaultProvider ?? "claude";
  } catch { return "claude"; }
}

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
type Lang = "ko" | "en" | "ja" | "zh";
function readLang(db: DatabaseSync): Lang {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as { value: string } | undefined;
  if (!row) return "en";
  try { const v = JSON.parse(row.value); return (typeof v === "string" && ["ko", "en", "ja", "zh"].includes(v)) ? v as Lang : "en"; }
  catch { return "en"; }
}
function t(lang: Lang, texts: Record<Lang, string>): string { return texts[lang] ?? texts.en; }

async function runKickoffMeeting(
  projectName: string,
  projectGoal: string,
  meetingTaskId: string | null,
  projectId: string,
  agents: KickoffMeetingAgent[],
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
  nowMs: () => number,
  /** 회의 완료 후 호출 — 태스크 생성 + 배정 + 실행 트리거 */
  onComplete?: () => void,
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string | void,
): Promise<void> {
  if (agents.length === 0) return;

  const lang = readLang(db);
  const meetingId = randomUUID();
  const startTs = nowMs();

  const meetingTitle = t(lang, {
    ko: `[킥오프] ${projectName}`,
    en: `[Kickoff] ${projectName}`,
    ja: `[キックオフ] ${projectName}`,
    zh: `[启动] ${projectName}`,
  });

  // 1. meeting_minutes 레코드 생성 (task_id는 아직 없을 수 있음, project_id로 조회)
  db.prepare(`
    INSERT INTO meeting_minutes (id, task_id, project_id, meeting_type, round, title, status, started_at, created_at)
    VALUES (?, ?, ?, 'planned', 1, ?, 'in_progress', ?, ?)
  `).run(meetingId, meetingTaskId, projectId, meetingTitle, startTs, startTs);

  broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "started" });

  // 2. 회의 스크립트 생성 — 프로젝트 목표 논의 + 에이전트 역량 공유
  const lines: { agentIdx: number; content: string; messageType: string }[] = [];

  const pmIdx = agents.findIndex((a) => a.projectRole === "pm");
  const facilitatorIdx = pmIdx >= 0 ? pmIdx : 0;
  const ROLE_LABEL: Record<string, string> = { pm: "PM", pl: "PL", dev: "Dev" };
  const goalSnippet = projectGoal.slice(0, 200);

  // 오프닝 — PM이 프로젝트 목표 공유, 역할 확인 요청
  lines.push({
    agentIdx: facilitatorIdx,
    content: t(lang, {
      ko: `«${projectName}» 프로젝트 킥오프 회의를 시작합니다.\n목표: ${goalSnippet}\n지금부터 각자 역량과 담당 가능한 영역을 보고해주세요. 보고 내용을 바탕으로 제가 태스크를 생성하고 배정하겠습니다.`,
      en: `Starting kickoff meeting for «${projectName}».\nGoal: ${goalSnippet}\nPlease report your capabilities and areas of expertise. I will create tasks and assign them based on your reports.`,
      ja: `«${projectName}» プロジェクトのキックオフ会議を開始します。\n目標: ${goalSnippet}\n各自の能力と担当可能な領域を報告してください。報告をもとにタスクを作成し配属します。`,
      zh: `«${projectName}» 项目启动会议开始。\n目标: ${goalSnippet}\n请报告各自的能力和可负责的领域。我将根据报告创建任务并分配。`,
    }),
    messageType: "opening",
  });

  // 각 에이전트가 자기소개 + 역량 보고
  agents.forEach((a, i) => {
    if (i === facilitatorIdx) return; // PM은 사회자
    const roleTag = a.projectRoleLabel ?? (a.projectRole ? ROLE_LABEL[a.projectRole] : null);
    const rolePrefix = roleTag ? `[${roleTag}] ` : "";
    const dept = a.dept_name ?? "";
    lines.push({
      agentIdx: i,
      content: t(lang, {
        ko: `${rolePrefix}${dept ? `${dept} 소속, ` : ""}${a.name}입니다. 프로젝트 목표를 확인했습니다. 업무 배정 대기하겠습니다.`,
        en: `${rolePrefix}${dept ? `${dept}, ` : ""}${a.name} reporting. Project goal confirmed. Standing by for task assignment.`,
        ja: `${rolePrefix}${dept ? `${dept}所属、` : ""}${a.name}です。プロジェクト目標を確認しました。タスク配属をお待ちします。`,
        zh: `${rolePrefix}${dept ? `${dept}、` : ""}${a.name}。已确认项目目标。等待任务分配。`,
      }),
      messageType: "role_report",
    });
  });

  const execCount = agents.length - 1;
  // 마무리 — PM이 태스크 생성 및 배정 예고
  lines.push({
    agentIdx: facilitatorIdx,
    content: t(lang, {
      ko: `전원 역량 확인 완료. ${execCount}명 실행 인원 투입 가능.\n지금부터 태스크를 생성하고 각자에게 배정하겠습니다. 배정 완료 후 즉시 업무를 시작해주세요.`,
      en: `All capabilities confirmed. ${execCount} execution members available.\nI will now create tasks and assign them. Please start immediately once assigned.`,
      ja: `全員の能力確認完了。${execCount}名の実行メンバーが投入可能。\nこれからタスクを作成し配属します。配属後、直ちに業務を開始してください。`,
      zh: `全员能力确认完毕。${execCount}名执行人员可投入。\n现在创建任务并分配。分配完成后请立即开始工作。`,
    }),
    messageType: "closing",
  });

  // 3. 에이전트들 회의실 입장 (arrive)
  for (let i = 0; i < agents.length; i++) {
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "kickoff",
      action: "arrive",
      task_id: meetingTaskId,
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
      task_id: meetingTaskId,
      hold_until: entryTs + 90_000,
    });
    broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "entry" });

    await delay(600);
  }

  // 5. 회의 완료
  db.prepare("UPDATE meeting_minutes SET status = 'completed', completed_at = ? WHERE id = ?")
    .run(nowMs(), meetingId);
  broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "completed", status: "completed" });

  // 6. 에이전트 퇴장
  for (let i = 0; i < agents.length; i++) {
    await delay(200);
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "kickoff",
      action: "dismiss",
      task_id: meetingTaskId,
    });
  }

  logger.info({ meetingId, projectName, agentCount: agents.length }, "[kickoff] meeting completed");

  // 6b. 킥오프 회의 완료 알림
  const meetLang = readLang(db);
  insertNotification?.({
    type: "kickoff",
    title: t(meetLang, {
      ko: `${projectName} 킥오프 회의 완료`,
      en: `${projectName} kickoff meeting completed`,
      ja: `${projectName} キックオフ会議完了`,
      zh: `${projectName} 启动会议完成`,
    }),
    body: t(meetLang, {
      ko: `${agents.length}명 에이전트 참여, 태스크 생성 중`,
      en: `${agents.length} agents participated, creating tasks`,
      ja: `${agents.length}名のエージェント参加、タスク作成中`,
      zh: `${agents.length}名代理参与，正在创建任务`,
    }),
  });

  // 7. 회의 완료 후 planned 태스크 자동 실행 (안전망)
  if (onComplete) {
    try { onComplete(); } catch (err) {
      logger.warn({ err, meetingId }, "[kickoff] post-meeting onComplete failed");
    }
  }
}

/**
 * 추가 업무 회의 — 킥오프보다 짧은 버전.
 * PM이 추가 업무 배경을 공유하고, 에이전트들이 간단히 확인 후 바로 종료.
 */
async function runAddTasksMeeting(
  projectName: string,
  additionalDirective: string,
  projectId: string,
  agents: KickoffMeetingAgent[],
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
  nowMs: () => number,
  onComplete?: () => void,
): Promise<void> {
  if (agents.length === 0) { onComplete?.(); return; }

  const lang = readLang(db);
  const meetingId = randomUUID();
  const startTs = nowMs();

  const meetingTitle = t(lang, {
    ko: `[추가 업무 회의] ${projectName}`,
    en: `[Additional Tasks] ${projectName}`,
    ja: `[追加タスク会議] ${projectName}`,
    zh: `[追加任务会议] ${projectName}`,
  });

  db.prepare(`
    INSERT INTO meeting_minutes (id, task_id, project_id, meeting_type, round, title, status, started_at, created_at)
    VALUES (?, ?, ?, 'planned', 1, ?, 'in_progress', ?, ?)
  `).run(meetingId, null, projectId, meetingTitle, startTs, startTs);

  broadcast("meeting_minutes_update", { task_id: null, meeting_id: meetingId, phase: "started" });

  const lines: { agentIdx: number; content: string; messageType: string }[] = [];

  const pmIdx = agents.findIndex((a) => a.projectRole === "pm");
  const facilitatorIdx = pmIdx >= 0 ? pmIdx : 0;
  const directiveSnippet = additionalDirective.slice(0, 200);

  // PM: 추가 업무 배경 공유
  lines.push({
    agentIdx: facilitatorIdx,
    content: t(lang, {
      ko: `«${projectName}» 프로젝트 추가 업무 회의를 시작합니다.\n추가 요청 사항: ${directiveSnippet}\n추가 태스크를 생성하고 배정하겠습니다. 확인 후 즉시 업무를 시작해주세요.`,
      en: `Starting additional tasks meeting for «${projectName}».\nNew directive: ${directiveSnippet}\nI will create and assign additional tasks. Please begin immediately once assigned.`,
      ja: `«${projectName}» 追加タスク会議を開始します。\n追加要請: ${directiveSnippet}\n追加タスクを作成し配属します。配属後、直ちに業務を開始してください。`,
      zh: `«${projectName}» 追加任务会议开始。\n追加要求: ${directiveSnippet}\n将创建并分配追加任务。分配后请立即开始工作。`,
    }),
    messageType: "opening",
  });

  // 에이전트들 간단히 확인 (역량 보고 생략)
  const execCount = agents.length - 1;
  agents.forEach((a, i) => {
    if (i === facilitatorIdx) return;
    lines.push({
      agentIdx: i,
      content: t(lang, {
        ko: `${a.name}, 추가 업무 확인했습니다. 배정 대기합니다.`,
        en: `${a.name}, acknowledged. Standing by for assignment.`,
        ja: `${a.name}、追加タスクを確認しました。配属をお待ちします。`,
        zh: `${a.name}，已确认追加任务。等待分配。`,
      }),
      messageType: "acknowledge",
    });
  });

  // PM 마무리
  lines.push({
    agentIdx: facilitatorIdx,
    content: t(lang, {
      ko: `확인 완료. ${execCount}명 추가 투입 가능. 지금부터 태스크를 생성하고 배정하겠습니다.`,
      en: `Confirmed. ${execCount} members available. Creating and assigning tasks now.`,
      ja: `確認完了。${execCount}名投入可能。タスクを作成し配属します。`,
      zh: `确认完毕。${execCount}名可投入。现在创建并分配任务。`,
    }),
    messageType: "closing",
  });

  // 에이전트 입장
  for (let i = 0; i < agents.length; i++) {
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "add_tasks",
      action: "arrive",
      task_id: null,
      hold_until: startTs + 60_000,
    });
    await delay(200);
  }

  // 발언 + DB 저장
  let seq = 0;
  for (const line of lines) {
    const agent = agents[line.agentIdx];
    const entryTs = nowMs();
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
      phase: "add_tasks",
      action: "speak",
      line: line.content,
      task_id: null,
      hold_until: entryTs + 60_000,
    });
    broadcast("meeting_minutes_update", { task_id: null, meeting_id: meetingId, phase: "entry" });

    await delay(400);
  }

  // 회의 완료
  db.prepare("UPDATE meeting_minutes SET status = 'completed', completed_at = ? WHERE id = ?")
    .run(nowMs(), meetingId);
  broadcast("meeting_minutes_update", { task_id: null, meeting_id: meetingId, phase: "completed", status: "completed" });

  // 에이전트 퇴장
  for (let i = 0; i < agents.length; i++) {
    await delay(150);
    broadcast("client_office_call", {
      from_agent_id: agents[i].id,
      seat_index: i,
      phase: "add_tasks",
      action: "dismiss",
      task_id: null,
    });
  }

  logger.info({ meetingId, projectName, agentCount: agents.length }, "[add-tasks] meeting completed");

  if (onComplete) {
    try { onComplete(); } catch (err) {
      logger.warn({ err, meetingId }, "[add-tasks] post-meeting onComplete failed");
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
      reject(new Error(`CLI provider '${cliProvider}' timed out after 120s`));
    }, 120_000);
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.on("error", (err) => { clearTimeout(timeoutId); reject(err); });
    child.on("close", () => { clearTimeout(timeoutId); resolve(output); });
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
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
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string;
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
      "SELECT id, name, core_goal, directive, project_type FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null; project_type: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (project.project_type === "app") return res.status(400).json({ error: "app_cannot_kickoff" });

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

      // Load fitness data for each agent
      const fitnessRows = db.prepare(`
        SELECT agent_id, task_type, success_count, failure_count, avg_duration_ms
        FROM agent_task_fitness
        WHERE agent_id IN (${assignedAgents.map(() => "?").join(",")})
        ORDER BY agent_id, success_count DESC
      `).all(...assignedAgents.map((a) => a.id)) as { agent_id: string; task_type: string; success_count: number; failure_count: number; avg_duration_ms: number }[];

      const fitnessByAgent = new Map<string, string[]>();
      for (const r of fitnessRows) {
        const total = r.success_count + r.failure_count;
        if (total === 0) continue;
        const rate = Math.round((r.success_count / total) * 100);
        const avgMin = Math.round(r.avg_duration_ms / 60_000);
        const list = fitnessByAgent.get(r.agent_id) ?? [];
        list.push(`${r.task_type}: ${rate}% success (${total} tasks, avg ${avgMin}m)`);
        fitnessByAgent.set(r.agent_id, list);
      }

      const agentList = assignedAgents
        .map((a) => {
          const dept = a.dept_name ? `, dept: ${a.dept_name}` : "";
          const role = a.role ? `, seniority: ${a.role}` : "";
          const displayRole = a.project_role_label
            ?? (a.project_role ? STANDARD_ROLE_LABEL[a.project_role] : null);
          const projectRole = displayRole ? ` [${displayRole.toUpperCase()}]` : "";
          const fitness = fitnessByAgent.get(a.id);
          const fitnessInfo = fitness ? ` | track record: ${fitness.join("; ")}` : "";
          return `- ${a.name}${projectRole}${dept}${role}${fitnessInfo}`;
        })
        .join("\n");
      parts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    const additionalDir = (additional_directive ?? "").trim();
    if (additionalDir) parts.push(`This Round's Task:\n${additionalDir}`);
    if (clarification_answer) parts.push(`User clarification: ${clarification_answer}`);

    const systemPrompt = loadPrompt("system/project-kickoff");

    try {
      // ── Stage 1: kickoff_stage: meeting ──
      // 회의를 먼저 진행 — 프로젝트 목표 공유 + 에이전트 역량 확인
      broadcast("kickoff_stage", { projectId, stage: "meeting" });

      const meetingAgents: KickoffMeetingAgent[] = assignedAgents.map((ag) => ({
        id: ag.id,
        name: ag.name,
        role: ag.role,
        dept_name: ag.dept_name,
        projectRole: ag.project_role,
        projectRoleLabel: ag.project_role_label,
        taskTitles: [], // 아직 태스크 없음
      }));

      // 회의 완료 후: LLM으로 태스크 생성 → PM 배정 → 실행
      const postMeetingCreateAndRun = async () => {
        try {
          // ── Stage 2: kickoff_stage: planning ──
          broadcast("kickoff_stage", { projectId, stage: "planning" });

          let rawText: string;
          try {
            const signal = AbortSignal.timeout(120_000);
            rawText = await callLlmOneShot(db, systemPrompt, parts.join("\n\n"), signal);
          } catch {
            const cliProvider = readDefaultCliProvider(db);
            const fullPrompt = `${systemPrompt}\n\n${parts.join("\n\n")}`;
            rawText = await callViaCliProvider(cliProvider, fullPrompt);
          }

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            logger.error({ projectId }, "[kickoff] invalid LLM response after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          let parsed: {
            tasks?: { title: string; description?: string }[];
            needs_clarification?: boolean;
            question?: string;
          };
          try {
            parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
          } catch {
            logger.error({ projectId }, "[kickoff] JSON parse failed after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          if (parsed.needs_clarification && parsed.question) {
            const clarificationId = randomUUID();
            db.prepare(
              "INSERT INTO project_clarifications (id, project_id, question, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            ).run(clarificationId, projectId, parsed.question, nowMs());
            broadcast("clarification_request", { projectId, clarificationId, question: parsed.question });
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          // 태스크 생성
          const tasks = parsed.tasks ?? [];
          for (const task of tasks) {
            if (!task.title?.trim()) continue;
            const taskId = randomUUID();
            const now = nowMs();
            db.prepare(`
              INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
              VALUES (?, ?, ?, ?, NULL, 'planned', 3, 'general', ?, ?)
            `).run(taskId, task.title.trim(), task.description ?? "", projectId, now, now);
            broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
            appendTaskLog(taskId, "system", `Task created: ${task.title.trim()}`);
          }

          // ── Stage 3: kickoff_stage: assigning ──
          broadcast("kickoff_stage", { projectId, stage: "assigning" });

          const execAgents = assignedAgents.filter((a) => a.project_role !== "pm");
          if (execAgents.length === 0) {
            logger.warn({ projectId }, "[kickoff] no non-PM agents available");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          const unassignedTasks = db.prepare(`
            SELECT id, title FROM tasks
            WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NULL
            ORDER BY created_at ASC
          `).all(projectId) as { id: string; title: string }[];

          for (let i = 0; i < unassignedTasks.length; i++) {
            const task = unassignedTasks[i];
            const agent = execAgents[i % execAgents.length];
            db.prepare("UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?")
              .run(agent.id, nowMs(), task.id);
            appendTaskLog(task.id, "pm_oversight", `PM assigned → ${agent.name}`);
            broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id));
            logger.info({ taskId: task.id, agentId: agent.id }, "[kickoff] PM assigned agent");
          }

          // ── Stage 4: kickoff_stage: executing ──
          const plannedTasks = db.prepare(`
            SELECT id, title, assigned_agent_id FROM tasks
            WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
            ORDER BY created_at ASC
          `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

          if (plannedTasks.length === 0) {
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          broadcast("kickoff_stage", { projectId, stage: "executing" });
          logger.info({ projectId, count: plannedTasks.length }, "[kickoff] starting assigned tasks");

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
                  { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp },
                  task.title,
                  ac,
                ).then((runId) => { kickoffRuns.set(runId, ac); }).catch((e) => {
                  logger.error({ err: e, taskId: task.id }, "[kickoff] execution-loop failed");
                });
              }
              logger.info({ taskId: task.id, agentId: task.assigned_agent_id }, "[kickoff] task started");
            } catch (err) {
              logger.error({ err, taskId: task.id }, "[kickoff] task start failed");
            }
          }

          broadcast("kickoff_stage", { projectId, stage: "done" });
        } catch (err) {
          logger.error({ err, projectId }, "[kickoff] post-meeting pipeline failed");
          broadcast("kickoff_stage", { projectId, stage: "done" });
        }
      };

      if (assignedAgents.length > 0) {
        void runKickoffMeeting(
          project.name,
          project.core_goal,
          null, // 아직 태스크 없음
          projectId,
          meetingAgents,
          db,
          broadcast,
          nowMs,
          () => { void postMeetingCreateAndRun(); },
          insertNotification,
        ).catch((err) => {
          logger.warn({ err, projectId }, "[kickoff] meeting failed — running pipeline directly");
          void postMeetingCreateAndRun();
        });
      } else {
        void postMeetingCreateAndRun();
      }

      const autoRunIds: string[] = [];

      // ── PM 관리 등록 — PM Orchestrator (이벤트 기반) ──
      const pmAgent = assignedAgents.find((a) => a.project_role === "pm");
      try {
        db.prepare(
          "INSERT OR REPLACE INTO pm_oversight_state (project_id, pm_agent_id, started_at) VALUES (?, ?, ?)",
        ).run(projectId, pmAgent?.id ?? null, Date.now());
      } catch { /* table may not exist yet */ }
      logger.info({ projectId, pmAgentId: pmAgent?.id }, "[kickoff] PM orchestrator active for project");

      // 킥오프 알림 (회의 시작됨 — 태스크는 회의 후 비동기 생성)
      const kickoffLang = readLang(db);
      insertNotification?.({
        type: "kickoff",
        title: t(kickoffLang, {
          ko: `${project.name} 킥오프 시작`,
          en: `${project.name} kickoff started`,
          ja: `${project.name} キックオフ開始`,
          zh: `${project.name} 启动开始`,
        }),
        body: t(kickoffLang, {
          ko: `${assignedAgents.length}명 에이전트 참여, 회의 후 태스크 생성 예정`,
          en: `${assignedAgents.length} agents joined, tasks will be created after meeting`,
          ja: `${assignedAgents.length}名のエージェント参加、会議後にタスク作成予定`,
          zh: `${assignedAgents.length}名代理参与，会议后将创建任务`,
        }),
      });

      return res.json({ status: "ok", tasks: [], autoRunIds });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "kickoff_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/add-tasks
  // 완료된 프로젝트에 추가 업무 생성 — 킥오프 회의 없이 태스크 생성 + PM 배정 + 실행.
  app.post("/api/projects/:id/add-tasks", async (req, res) => {
    const projectId = req.params.id;
    const { additional_directive, attached_file } = (req.body ?? {}) as {
      additional_directive?: string;
      attached_file?: { name: string; content: string };
    };

    if (!additional_directive?.trim() && !attached_file) {
      return res.status(400).json({ error: "missing_directive" });
    }

    const project = db.prepare(
      "SELECT id, name, core_goal, directive, project_path, project_type FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null; project_path: string | null; project_type: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (project.project_type === "app") return res.status(400).json({ error: "app_cannot_add_tasks" });

    // 첨부된 MD 파일을 프로젝트 폴더 docs/에 저장
    if (attached_file?.name && attached_file?.content && project.project_path) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const docsDir = path.join(project.project_path, "docs");
        fs.mkdirSync(docsDir, { recursive: true });
        const filePath = path.join(docsDir, attached_file.name);
        fs.writeFileSync(filePath, attached_file.content, "utf-8");
        logger.info({ projectId, filePath }, "[add-tasks] saved attached file to project docs");
      } catch (err) {
        logger.warn({ err, projectId }, "[add-tasks] failed to save attached file");
      }
    }

    // 이미 실행 중인 태스크가 있으면 거부
    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) {
      return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });
    }

    // 프로젝트에 배정된 에이전트 목록
    const assignedAgents = db.prepare(`
      SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
      FROM agents a
      JOIN project_agents pa ON a.id = pa.agent_id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE pa.project_id = ?
      LIMIT 20
    `).all(projectId) as { id: string; name: string; role: string | null; department_id: string | null; dept_name: string | null; project_role: string | null; project_role_label: string | null }[];

    // 기존 완료된 태스크 목록 (컨텍스트로 LLM에 전달)
    const doneTasks = db.prepare(`
      SELECT title FROM tasks
      WHERE project_id = ? AND status = 'done'
      ORDER BY created_at ASC
    `).all(projectId) as { title: string }[];

    // 프롬프트 구성
    const promptParts: string[] = [
      `Project Name: ${project.name}`,
      `Goal: ${project.core_goal}`,
    ];
    if (project.directive) promptParts.push(`Directive:\n${project.directive}`);
    if (doneTasks.length > 0) {
      promptParts.push(`Already completed tasks (do NOT recreate these):\n${doneTasks.map((t_) => `- ${t_.title}`).join("\n")}`);
    }
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
      promptParts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    promptParts.push(`Additional tasks requested:\n${(additional_directive ?? "").trim()}`);

    const systemPrompt = loadPrompt("system/project-kickoff");

    try {
      // ── Stage 1: meeting ──
      broadcast("kickoff_stage", { projectId, stage: "meeting" });

      const meetingAgents: KickoffMeetingAgent[] = assignedAgents.map((ag) => ({
        id: ag.id,
        name: ag.name,
        role: ag.role,
        dept_name: ag.dept_name,
        projectRole: ag.project_role,
        projectRoleLabel: ag.project_role_label,
        taskTitles: [],
      }));

      // 회의 완료 후: LLM 태스크 생성 → PM 배정 → 실행
      const postMeetingPipeline = async () => {
        try {
          // ── Stage 2: planning ──
          broadcast("kickoff_stage", { projectId, stage: "planning" });

          let rawText: string;
          try {
            const signal = AbortSignal.timeout(120_000);
            rawText = await callLlmOneShot(db, systemPrompt, promptParts.join("\n\n"), signal);
          } catch {
            const cliProvider = readDefaultCliProvider(db);
            const fullPrompt = `${systemPrompt}\n\n${promptParts.join("\n\n")}`;
            rawText = await callViaCliProvider(cliProvider, fullPrompt);
          }

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            logger.error({ projectId }, "[add-tasks] invalid LLM response after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          let parsed: { tasks?: { title: string; description?: string }[] };
          try {
            parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
          } catch {
            logger.error({ projectId }, "[add-tasks] JSON parse failed after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          const newTasks = parsed.tasks ?? [];
          for (const task of newTasks) {
            if (!task.title?.trim()) continue;
            const taskId = randomUUID();
            const now = nowMs();
            db.prepare(`
              INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
              VALUES (?, ?, ?, ?, NULL, 'planned', 3, 'general', ?, ?)
            `).run(taskId, task.title.trim(), task.description ?? "", projectId, now, now);
            broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
            appendTaskLog(taskId, "system", `Task created (add-tasks): ${task.title.trim()}`);
          }

          // ── Stage 3: assigning ──
          broadcast("kickoff_stage", { projectId, stage: "assigning" });

          const execAgents = assignedAgents.filter((a) => a.project_role !== "pm");
          if (execAgents.length === 0) {
            logger.warn({ projectId }, "[add-tasks] no non-PM agents available");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          const unassignedTasks = db.prepare(`
            SELECT id, title FROM tasks
            WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NULL
            ORDER BY created_at ASC
          `).all(projectId) as { id: string; title: string }[];

          for (let i = 0; i < unassignedTasks.length; i++) {
            const task = unassignedTasks[i];
            const agent = execAgents[i % execAgents.length];
            db.prepare("UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?")
              .run(agent.id, nowMs(), task.id);
            appendTaskLog(task.id, "pm_oversight", `PM assigned → ${agent.name}`);
            broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id));
            logger.info({ taskId: task.id, agentId: agent.id }, "[add-tasks] PM assigned agent");
          }

          // ── Stage 4: executing ──
          const plannedTasks = db.prepare(`
            SELECT id, title, assigned_agent_id FROM tasks
            WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
            ORDER BY created_at ASC
          `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

          if (plannedTasks.length > 0) {
            broadcast("kickoff_stage", { projectId, stage: "executing" });
            logger.info({ projectId, count: plannedTasks.length }, "[add-tasks] starting assigned tasks");

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
                    { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp },
                    task.title,
                    ac,
                  ).then((runId) => { kickoffRuns.set(runId, ac); }).catch((e) => {
                    logger.error({ err: e, taskId: task.id }, "[add-tasks] execution-loop failed");
                  });
                }
                logger.info({ taskId: task.id, agentId: task.assigned_agent_id }, "[add-tasks] task started");
              } catch (err) {
                logger.error({ err, taskId: task.id }, "[add-tasks] task start failed");
              }
            }
          }

          broadcast("kickoff_stage", { projectId, stage: "done" });

          // 알림
          const addLang = readLang(db);
          insertNotification?.({
            type: "kickoff",
            title: t(addLang, {
              ko: `${project.name} 추가 업무 생성`,
              en: `${project.name} additional tasks created`,
              ja: `${project.name} 追加タスク作成`,
              zh: `${project.name} 追加任务已创建`,
            }),
            body: t(addLang, {
              ko: `${newTasks.length}개 태스크 추가 생성 완료`,
              en: `${newTasks.length} new tasks created and assigned`,
              ja: `${newTasks.length}件の追加タスクを作成完了`,
              zh: `已创建 ${newTasks.length} 个新任务`,
            }),
          });
        } catch (err) {
          logger.error({ err, projectId }, "[add-tasks] post-meeting pipeline failed");
          broadcast("kickoff_stage", { projectId, stage: "done" });
        }
      };

      if (assignedAgents.length > 0) {
        void runAddTasksMeeting(
          project.name,
          (additional_directive ?? "").trim(),
          projectId,
          meetingAgents,
          db,
          broadcast,
          nowMs,
          () => { void postMeetingPipeline(); },
        ).catch((err) => {
          logger.warn({ err, projectId }, "[add-tasks] meeting failed — running pipeline directly");
          void postMeetingPipeline();
        });
      } else {
        void postMeetingPipeline();
      }

      return res.json({ status: "ok", taskCount: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      broadcast("kickoff_stage", { projectId, stage: "done" });
      return res.status(500).json({ error: "add_tasks_failed", detail: msg.slice(0, 200) });
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
