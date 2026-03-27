import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { callLlmOneShotAuto } from "../../../agent-runtime/llm-client.ts";
import { type KickoffMeetingAgent, type Lang, readLang, t, delay } from "./kickoff-shared.ts";

const ROLE_LABEL: Record<string, string> = { pm: "PM", pl: "PL", dev: "Dev" };

/**
 * 프로젝트 킥오프 직후 에이전트들이 모여 회의를 진행.
 * meeting_minutes + meeting_minute_entries DB 저장 + client_office_call WS 브로드캐스트.
 * 백그라운드 비동기 실행 (킥오프 응답을 블록하지 않음).
 */
export async function runKickoffMeeting(
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

  db.prepare(`
    INSERT INTO meeting_minutes (id, task_id, project_id, meeting_type, round, title, status, started_at, created_at)
    VALUES (?, ?, ?, 'planned', 1, ?, 'in_progress', ?, ?)
  `).run(meetingId, meetingTaskId, projectId, meetingTitle, startTs, startTs);

  broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "started" });

  const lines: { agentIdx: number; content: string; messageType: string }[] = [];

  const pmIdx = agents.findIndex((a) => a.projectRole === "pm");
  const facilitatorIdx = pmIdx >= 0 ? pmIdx : 0;

  let llmMeetingGenerated = false;
  try {
    const systemPrompt = loadPrompt("system/kickoff-meeting");
    const agentList = agents.map((a, i) => {
      const roleTag = a.projectRoleLabel ?? (a.projectRole ? ROLE_LABEL[a.projectRole] : null) ?? a.role ?? "agent";
      const dept = a.dept_name ? ` (${a.dept_name})` : "";
      return `- ${a.name}${dept}: ${roleTag}${i === facilitatorIdx ? " [meeting facilitator/PM]" : ""}`;
    }).join("\n");

    const userPrompt = [
      `Project: ${projectName}`,
      `Goal: ${projectGoal.slice(0, 600)}`,
      `Language: ${lang}`,
      `Agents:\n${agentList}`,
    ].join("\n\n");

    const raw = await callLlmOneShotAuto({ db, systemPrompt, userPrompt, maxTokens: 1024, timeoutMs: 90_000 });

    const jsonStr = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    const parsed = JSON.parse(jsonStr) as { lines: Array<{ agentName: string; messageType: string; content: string }> };

    for (const item of parsed.lines) {
      const agentIdx = agents.findIndex((a) => a.name === item.agentName);
      if (agentIdx < 0) continue;
      lines.push({ agentIdx, content: item.content, messageType: item.messageType });
    }

    if (lines.length >= 2) llmMeetingGenerated = true;
  } catch (err) {
    logger.warn({ err, projectName }, "[kickoff] LLM meeting generation failed — using fallback script");
  }

  // 폴백: LLM 실패 시 하드코딩 스크립트
  if (!llmMeetingGenerated) {
    const goalSnippet = projectGoal.slice(0, 200);
    const execCount = agents.length - 1;
    lines.length = 0;
    lines.push({
      agentIdx: facilitatorIdx,
      content: t(lang, {
        ko: `«${projectName}» 프로젝트 킥오프 회의를 시작합니다.\n목표: ${goalSnippet}\n각자 담당 가능한 영역을 보고해주세요.`,
        en: `Starting kickoff meeting for «${projectName}».\nGoal: ${goalSnippet}\nPlease report your areas of expertise.`,
        ja: `«${projectName}» キックオフ会議を開始します。\n目標: ${goalSnippet}\n担당可能な領域を報告してください。`,
        zh: `«${projectName}» 项目启动会议开始。\n目标: ${goalSnippet}\n请报告各自可负责的领域。`,
      }),
      messageType: "opening",
    });
    agents.forEach((a, i) => {
      if (i === facilitatorIdx) return;
      const roleTag = a.projectRoleLabel ?? (a.projectRole ? ROLE_LABEL[a.projectRole] : null);
      const rolePrefix = roleTag ? `[${roleTag}] ` : "";
      const dept = a.dept_name ?? "";
      lines.push({
        agentIdx: i,
        content: t(lang, {
          ko: `${rolePrefix}${dept ? `${dept} 소속, ` : ""}${a.name}입니다. 프로젝트 목표를 확인했습니다. 업무 배정 대기하겠습니다.`,
          en: `${rolePrefix}${dept ? `${dept}, ` : ""}${a.name} reporting. Goal confirmed. Standing by for assignment.`,
          ja: `${rolePrefix}${dept ? `${dept}所属、` : ""}${a.name}です。目標確認しました。配属をお待ちします。`,
          zh: `${rolePrefix}${dept ? `${dept}、` : ""}${a.name}。已确认目标。等待任务分配。`,
        }),
        messageType: "role_report",
      });
    });
    lines.push({
      agentIdx: facilitatorIdx,
      content: t(lang, {
        ko: `전원 확인 완료. ${execCount}명 투입 가능. 지금부터 태스크를 생성하고 배정하겠습니다.`,
        en: `All confirmed. ${execCount} members available. Creating and assigning tasks now.`,
        ja: `全員確認完了。${execCount}名投入可能。タスクを作成し配属します。`,
        zh: `全员确认完毕。${execCount}名可投入。现在创建并分配任务。`,
      }),
      messageType: "closing",
    });
  }

  // 에이전트들 회의실 입장
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

  // 발언 순서대로 meeting_minute_entries 저장 + speak 브로드캐스트
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
      phase: "kickoff",
      action: "speak",
      line: line.content,
      task_id: meetingTaskId,
      hold_until: entryTs + 90_000,
    });
    broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "entry" });

    await delay(600);
  }

  // 회의 완료
  db.prepare("UPDATE meeting_minutes SET status = 'completed', completed_at = ? WHERE id = ?")
    .run(nowMs(), meetingId);
  broadcast("meeting_minutes_update", { task_id: meetingTaskId, meeting_id: meetingId, phase: "completed", status: "completed" });

  // 에이전트 퇴장
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

  const meetLang: Lang = readLang(db);
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

  if (onComplete) {
    try { onComplete(); } catch (err) {
      logger.warn({ err, meetingId }, "[kickoff] post-meeting onComplete failed");
    }
  }
}
