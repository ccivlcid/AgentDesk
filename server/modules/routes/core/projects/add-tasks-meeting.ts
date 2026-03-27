import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { callLlmOneShotAuto } from "../../../agent-runtime/llm-client.ts";
import { type KickoffMeetingAgent, readLang, t, delay } from "./kickoff-shared.ts";

const ROLE_LABEL: Record<string, string> = { pm: "PM", pl: "PL", dev: "Dev" };

/**
 * 추가 업무 회의 — 킥오프보다 짧은 버전.
 * PM이 추가 업무 배경을 공유하고, 에이전트들이 간단히 확인 후 바로 종료.
 */
export async function runAddTasksMeeting(
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

  let llmMeetingGenerated = false;
  try {
    const systemPrompt = loadPrompt("system/add-tasks-meeting");
    const agentList = agents.map((a, i) => {
      const roleTag = a.projectRoleLabel ?? (a.projectRole ? ROLE_LABEL[a.projectRole] : null) ?? a.role ?? "agent";
      const dept = a.dept_name ? ` (${a.dept_name})` : "";
      return `- ${a.name}${dept}: ${roleTag}${i === facilitatorIdx ? " [facilitator/PM]" : ""}`;
    }).join("\n");

    const userPrompt = [
      `Project: ${projectName}`,
      `New directive: ${additionalDirective.slice(0, 600)}`,
      `Language: ${lang}`,
      `Agents:\n${agentList}`,
    ].join("\n\n");

    const raw = await callLlmOneShotAuto({ db, systemPrompt, userPrompt, maxTokens: 800, timeoutMs: 90_000 });
    const jsonStr = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    const parsed = JSON.parse(jsonStr) as { lines: Array<{ agentName: string; messageType: string; content: string }> };

    for (const item of parsed.lines) {
      const agentIdx = agents.findIndex((a) => a.name === item.agentName);
      if (agentIdx < 0) continue;
      lines.push({ agentIdx, content: item.content, messageType: item.messageType });
    }
    if (lines.length >= 2) llmMeetingGenerated = true;
  } catch (err) {
    logger.warn({ err, projectName }, "[add-tasks] LLM meeting generation failed — using fallback script");
  }

  if (!llmMeetingGenerated) {
    const directiveSnippet = additionalDirective.slice(0, 200);
    const execCount = agents.length - 1;
    lines.length = 0;
    lines.push({
      agentIdx: facilitatorIdx,
      content: t(lang, {
        ko: `«${projectName}» 추가 업무 회의를 시작합니다.\n추가 요청: ${directiveSnippet}\n추가 태스크를 생성하고 배정하겠습니다.`,
        en: `Additional tasks meeting for «${projectName}».\nNew directive: ${directiveSnippet}\nCreating and assigning tasks now.`,
        ja: `«${projectName}» 追加タスク会議開始。\n追加要請: ${directiveSnippet}\nタスクを作成し配属します。`,
        zh: `«${projectName}» 追加任务会议开始。\n追加要求: ${directiveSnippet}\n将创建并分配追加任务。`,
      }),
      messageType: "opening",
    });
    agents.forEach((a, i) => {
      if (i === facilitatorIdx) return;
      lines.push({
        agentIdx: i,
        content: t(lang, {
          ko: `${a.name}, 확인했습니다. 배정 대기합니다.`,
          en: `${a.name}, acknowledged. Standing by.`,
          ja: `${a.name}、確認しました。配属をお待ちします。`,
          zh: `${a.name}，已确认。等待分配。`,
        }),
        messageType: "acknowledge",
      });
    });
    lines.push({
      agentIdx: facilitatorIdx,
      content: t(lang, {
        ko: `확인 완료. ${execCount}명 투입. 태스크 생성하겠습니다.`,
        en: `Confirmed. ${execCount} members ready. Creating tasks now.`,
        ja: `確認完了。${execCount}名投入。タスク作成します。`,
        zh: `确认完毕。${execCount}名可投入。现在创建任务。`,
      }),
      messageType: "closing",
    });
  }

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
