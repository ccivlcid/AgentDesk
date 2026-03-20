import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import logger from "../../../lib/logger.ts";
import { sendMessengerMessage, sendMessengerSessionMessage, type MessengerChannel } from "../../../gateway/client.ts";
import type { AgentRow } from "./direct-chat.ts";
import { TASK_MESSENGER_RELAY_MESSAGE_TYPES } from "./messenger-task-routing.ts";

type FormatSendCtx = {
  db: {
    prepare: (sql: string) => {
      run: (...args: SQLInputValue[]) => unknown;
      get: (...args: SQLInputValue[]) => unknown;
    };
  };
  broadcast: (event: string, payload: unknown) => void;
  nowMs: () => number;
  resolveTaskMessengerRoute: (
    taskId: string,
  ) => { channel: MessengerChannel; targetId: string; sessionKey?: string } | null;
};

export function createMessengerFormatAndSend(ctx: FormatSendCtx) {
  const { db, broadcast, nowMs, resolveTaskMessengerRoute } = ctx;

  function getMessengerChunkLimit(channel: MessengerChannel): number {
    if (channel === "discord") return 1900;
    if (channel === "telegram") return 3800;
    if (channel === "slack") return 3900;
    if (channel === "whatsapp") return 3900;
    if (channel === "googlechat") return 3900;
    if (channel === "signal") return 3900;
    if (channel === "imessage") return 3900;
    return 35000;
  }

  function splitMessageByLimit(text: string, limit: number): string[] {
    const source = text.trim();
    if (!source) return [];
    if (source.length <= limit) return [source];

    const chunks: string[] = [];
    let remaining = source;
    while (remaining.length > limit) {
      let cut = remaining.lastIndexOf("\n", limit);
      if (cut < Math.floor(limit * 0.4)) {
        cut = remaining.lastIndexOf(" ", limit);
      }
      if (cut < Math.floor(limit * 0.4)) {
        cut = limit;
      }
      const chunk = remaining.slice(0, cut).trim();
      if (chunk) chunks.push(chunk);
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  function normalizeMessengerTextLine(raw: string): string {
    return raw
      .replace(/[`*_~>#]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncateMessengerText(value: string, max = 160): string {
    const normalized = value.trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
  }

  function extractTaskTitleFromReportText(content: string, requestLine: string): string {
    const source = requestLine || content;
    const quoted =
      source.match(/['"]([^'"]{2,220})['"]/) ??
      source.match(/「([^」]{2,220})」/) ??
      source.match(/『([^』]{2,220})』/);
    const picked = quoted?.[1] ?? "";
    return truncateMessengerText(normalizeMessengerTextLine(picked), 90);
  }

  function buildMessengerReportIdentityIntro(agent: AgentRow, content: string, requestLine: string): string {
    const hasKorean = /[가-힣]/.test(content);
    const hasJapanese = /[ぁ-んァ-ン一-龯]/.test(content);
    const hasChinese = /[\u4e00-\u9fff]/.test(content) && !hasJapanese;
    const displayName = normalizeMessengerTextLine(agent.name_ko || agent.name || "Agent");
    const avatar = normalizeMessengerTextLine(agent.avatar_emoji || "🤖");
    const taskTitle = extractTaskTitleFromReportText(content, requestLine);

    if (hasKorean) {
      return taskTitle
        ? `${avatar} ${displayName} 보고: '${taskTitle}' 완료 결과를 전달드려요.`
        : `${avatar} ${displayName} 보고: 완료 결과를 전달드려요.`;
    }
    if (hasJapanese) {
      return taskTitle
        ? `${avatar} ${displayName} から報告: '${taskTitle}' の完了結果を共有します。`
        : `${avatar} ${displayName} から報告: 完了結果を共有します。`;
    }
    if (hasChinese) {
      return taskTitle
        ? `${avatar} ${displayName} 汇报：'${taskTitle}' 已完成，现发送结果。`
        : `${avatar} ${displayName} 汇报：任务已完成，现发送结果。`;
    }
    return taskTitle
      ? `${avatar} ${displayName} report: sharing completion result for '${taskTitle}'.`
      : `${avatar} ${displayName} report: sharing completion result.`;
  }

  function buildMessengerReportSummary(agent: AgentRow, content: string): string {
    const shouldSummarize =
      /\|\s*#\s*\|/i.test(content) ||
      /\|\s*1\s*\|/.test(content) ||
      /📋\s*(결과|Result|結果|结果)\s*:/i.test(content) ||
      content.length >= 900;
    if (!shouldSummarize) return content;

    const rawLines = content.split(/\r?\n/);
    const plainLines = rawLines.map((line) => normalizeMessengerTextLine(line));

    const requestLine =
      plainLines.find((line) =>
        /(업무 완료 보고드립니다|reporting completion|完了をご報告します|汇报.+已完成)/i.test(line),
      ) ?? "";
    const identityIntro = buildMessengerReportIdentityIntro(agent, content, requestLine);
    const progressLine =
      plainLines.find((line) =>
        /(?:전체|total)\s*:\s*\d+\s*\/\s*\d+|(?:완료율|completion|progress|진행)\s*[:：]?\s*(?:\d+\s*%|\d+\s*\/\s*\d+)/i.test(
          line,
        ),
      ) ?? "";

    const tableItems: string[] = [];
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;
      const cells = trimmed
        .split("|")
        .map((cell) => normalizeMessengerTextLine(cell))
        .filter(Boolean);
      if (cells.length < 3) continue;
      const index = Number.parseInt(cells[0] ?? "", 10);
      if (!Number.isFinite(index)) continue;
      const issue = cells[1] || "-";
      const severity = cells[2] || "";
      tableItems.push(`${index}. ${severity ? `[${severity}] ` : ""}${truncateMessengerText(issue, 120)}`);
      if (tableItems.length >= 3) break;
    }

    const resultItems: string[] = [];
    let inResultSection = false;
    for (let i = 0; i < rawLines.length; i += 1) {
      const rawLine = rawLines[i] ?? "";
      const plain = plainLines[i] ?? "";
      if (!inResultSection) {
        if (/📋\s*(결과|Result|結果|结果)\s*:?/i.test(rawLine) || /^(결과|result|結果|结果)\s*:?$/i.test(plain)) {
          inResultSection = true;
        }
        continue;
      }
      if (!plain || plain === "...") continue;
      if (/^[📌📝]/u.test(rawLine.trim())) break;
      if (/(보완\/협업 진행 요약|Remediation\/Collaboration Progress|変更点|변경사항|Changes)/i.test(plain)) break;
      if (rawLine.trim().startsWith("|")) continue;
      const cleaned = plain.replace(/^[-•]\s*/, "").trim();
      if (!cleaned) continue;
      resultItems.push(truncateMessengerText(cleaned, 150));
      if (resultItems.length >= 3) break;
    }

    const keyItems = tableItems.length > 0 ? tableItems : resultItems.map((line, idx) => `${idx + 1}. ${line}`);
    if (keyItems.length <= 0) return content;

    const hasKorean = /[가-힣]/.test(content);
    const title = hasKorean ? "업무 완료 요약" : "Task Completion Summary";
    const keyLabel = hasKorean ? "핵심 결과" : "Key Results";
    const progressLabel = hasKorean ? "진행 요약" : "Progress";
    const detailHint = hasKorean
      ? "상세 내용은 AgentDesk 채팅창에서 확인하세요."
      : "See AgentDesk chat for full details.";

    const out: string[] = [title, identityIntro];
    out.push(`${keyLabel}:`);
    out.push(...keyItems);
    if (progressLine) out.push(`${progressLabel}: ${truncateMessengerText(progressLine, 160)}`);
    out.push(detailHint);
    return out.join("\n");
  }

  function formatMessengerBroadcastContent(agent: AgentRow, messageType: string, rawContent: string): string {
    const content = rawContent.trim();
    if (!content) return "";
    if (messageType === "report") {
      return buildMessengerReportSummary(agent, content);
    }
    return content;
  }

  async function relayTaskBroadcastToAssignedMessengerSessions(
    taskId: string,
    agent: AgentRow,
    messageType: string,
    rawContent: string,
  ): Promise<void> {
    const content = formatMessengerBroadcastContent(agent, messageType, rawContent);
    if (!content) return;

    const route = resolveTaskMessengerRoute(taskId);
    if (!route) return;

    const chunks = splitMessageByLimit(content, getMessengerChunkLimit(route.channel));
    for (const chunk of chunks) {
      if (route.sessionKey) {
        await sendMessengerSessionMessage(route.sessionKey, chunk);
      } else {
        await sendMessengerMessage({
          channel: route.channel,
          targetId: route.targetId,
          text: chunk,
        });
      }
    }
  }

  function shouldRelayTaskBroadcastToMessenger(
    messageType: string,
    receiverType: string,
    taskId: string | null,
  ): taskId is string {
    if (!taskId) return false;
    if (receiverType !== "all") return false;
    return TASK_MESSENGER_RELAY_MESSAGE_TYPES.has(messageType);
  }

  function sendAgentMessage(
    agent: AgentRow,
    content: string,
    messageType: string = "chat",
    receiverType: string = "agent",
    receiverId: string | null = null,
    taskId: string | null = null,
  ): void {
    const id = randomUUID();
    const t = nowMs();
    const taskExists = (idValue: string): boolean => {
      try {
        const row = db.prepare("SELECT 1 AS ok FROM tasks WHERE id = ?").get(idValue) as { ok?: number } | undefined;
        return row?.ok === 1;
      } catch {
        return false;
      }
    };
    const isForeignKeyError = (err: unknown): boolean => {
      const msg = err instanceof Error ? err.message : String(err);
      return /foreign key constraint failed/i.test(msg);
    };
    let persistedTaskId = taskId && taskExists(taskId) ? taskId : null;

    try {
      db.prepare(
        `
      INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, created_at)
      VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?)
    `,
      ).run(id, agent.id, receiverType, receiverId, content, messageType, persistedTaskId, t);
    } catch (err) {
      if (persistedTaskId && isForeignKeyError(err)) {
        try {
          persistedTaskId = null;
          db.prepare(
            `
          INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, created_at)
          VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?)
        `,
          ).run(id, agent.id, receiverType, receiverId, content, messageType, null, t);
        } catch (fallbackErr) {
          logger.warn(`[sendAgentMessage] drop message after FK fallback failure: ${String(fallbackErr)}`);
          return;
        }
      } else {
        logger.warn(`[sendAgentMessage] drop message due to insert failure: ${String(err)}`);
        return;
      }
    }

    broadcast("new_message", {
      id,
      sender_type: "agent",
      sender_id: agent.id,
      receiver_type: receiverType,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      task_id: persistedTaskId,
      created_at: t,
      sender_name: agent.name,
      sender_avatar: agent.avatar_emoji ?? "🤖",
    });

    if (shouldRelayTaskBroadcastToMessenger(messageType, receiverType, persistedTaskId)) {
      void relayTaskBroadcastToAssignedMessengerSessions(persistedTaskId, agent, messageType, content).catch((err) => {
        logger.warn(
          `[messenger-relay] failed to relay task broadcast (task=${persistedTaskId}, type=${messageType}): ${String(err)}`,
        );
      });
    }
  }

  return { sendAgentMessage };
}
