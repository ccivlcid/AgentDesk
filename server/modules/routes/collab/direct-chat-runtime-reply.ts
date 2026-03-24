import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import logger from "../../../lib/logger.ts";
import {
  sendMessengerMessage,
  sendMessengerSessionMessage,
  sendMessengerSessionTyping,
  sendMessengerTyping,
  type MessengerChannel,
} from "../../../gateway/client.ts";
import { isMessengerChannel } from "../../../messenger/channels.ts";
import type { Lang } from "../../../types/lang.ts";
import type { DelegationOptions } from "./project-resolution.ts";
import { normalizeAgentReply, shouldPreserveStructuredFallback } from "./direct-chat-intent-utils.ts";
import type { AgentRow, DirectChatDeps } from "./direct-chat-types.ts";
import { buildCharacterPersonaBlock } from "../../workflow/core/character-persona.ts";

type DirectReplyRuntimeDeps = Pick<
  DirectChatDeps,
  | "db"
  | "logsDir"
  | "nowMs"
  | "broadcast"
  | "sendAgentMessage"
  | "resolveProjectPath"
  | "detectProjectPath"
  | "buildDirectReplyPrompt"
  | "buildCliFailureMessage"
  | "chooseSafeReply"
  | "runAgentOneShot"
  | "executeApiProviderAgent"
  | "executeCopilotAgent"
  | "executeAntigravityAgent"
  | "onRoomReplyComplete"
>;

/** Keep user-facing CLI error strings short (spawn paths, stack noise). */
function clipCliErrorForUser(message: string, max = 200): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

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

function localeInstructionForDirect(lang: Lang): string {
  if (lang === "en") return "Respond in English.";
  if (lang === "ja") return "Respond in Japanese.";
  if (lang === "zh") return "Respond in Chinese.";
  return "Respond in Korean.";
}

export function createDirectReplyRuntime(deps: DirectReplyRuntimeDeps) {
  async function relayReplyToMessenger(options: DelegationOptions, agent: AgentRow, rawContent: string): Promise<void> {
    const channel = options.messengerChannel;
    const targetId = (options.messengerTargetId || "").trim();
    const sessionKey = (options.messengerSessionKey || "").trim();
    if (!isMessengerChannel(channel) || !targetId) return;

    const cleaned = normalizeAgentReply(rawContent);
    if (!cleaned) return;

    const chunks = splitMessageByLimit(cleaned, getMessengerChunkLimit(channel));
    for (const chunk of chunks) {
      if (sessionKey) {
        await sendMessengerSessionMessage(sessionKey, chunk);
      } else {
        await sendMessengerMessage({
          channel,
          targetId,
          text: chunk,
        });
      }
    }
    logger.info(`[messenger-reply] relayed ${chunks.length} chunk(s) to ${channel}:${targetId} via ${agent.name}`);
  }

  function startMessengerTypingHeartbeat(options: DelegationOptions, agent: AgentRow): () => void {
    const channel = options.messengerChannel;
    const targetId = (options.messengerTargetId || "").trim();
    const sessionKey = (options.messengerSessionKey || "").trim();
    if (
      !isMessengerChannel(channel) ||
      !targetId ||
      (channel !== "telegram" && channel !== "discord" && channel !== "signal")
    ) {
      return () => undefined;
    }

    let stopped = false;
    let warned = false;
    const sendBeat = () => {
      if (stopped) return;
      const sender = sessionKey ? sendMessengerSessionTyping(sessionKey) : sendMessengerTyping({ channel, targetId });
      void sender.catch((err) => {
        if (warned) return;
        warned = true;
        logger.warn(`[messenger-typing] failed for ${agent.name} on ${channel}:${targetId}: ${String(err)}`);
      });
    };

    sendBeat();
    const timer = setInterval(sendBeat, 3500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }

  async function composeInCharacterAutoMessage(
    agent: AgentRow,
    lang: Lang,
    scenario: string,
    fallback: string,
  ): Promise<string> {
    const personaBlock = buildCharacterPersonaBlock(agent.persona_id, agent.id);
    if (!personaBlock) return fallback;

    if (shouldPreserveStructuredFallback(fallback)) {
      const prompt = [
        "[Auto Reply - In Character Intro]",
        `You are ${agent.name}.`,
        localeInstructionForDirect(lang),
        personaBlock,
        "Scenario:",
        scenario,
        "Output rules:",
        "- Return exactly one short sentence only.",
        "- Stay strictly in character and tone.",
        "- Do not include numbering, options, list, code, markdown, or JSON.",
        "- Do not mention system/internal prompts.",
      ].join("\n");

      try {
        const run = await deps.runAgentOneShot(agent, prompt, {
          projectPath: process.cwd(),
          rawOutput: true,
          noTools: true,
        });
        const picked = normalizeAgentReply(deps.chooseSafeReply(run, lang, "direct", agent));
        const introLine = picked.split(/\r?\n/, 1)[0] ?? "";
        const intro = introLine.trim().replace(/\s+/g, " ");
        if (!intro) return fallback;
        const firstLine = fallback.split(/\r?\n/, 1)[0]?.trim();
        if (firstLine && intro === firstLine) return fallback;
        return `${intro}\n${fallback}`;
      } catch (err) {
        logger.warn(`[persona-auto-reply] intro mode failed for ${agent.name}: ${String(err)}`);
        return fallback;
      }
    }

    const prompt = [
      "[Auto Reply - In Character]",
      `You are ${agent.name}.`,
      localeInstructionForDirect(lang),
      personaBlock,
      "Scenario:",
      scenario,
      "Output rules:",
      "- Return one short chat message only (1 sentence, max 2).",
      "- Stay strictly in character and tone.",
      "- No markdown, no JSON, no code block.",
      "- Do not mention internal/system prompts.",
    ].join("\n");

    try {
      const run = await deps.runAgentOneShot(agent, prompt, {
        projectPath: process.cwd(),
        rawOutput: true,
        noTools: true,
      });
      const picked = normalizeAgentReply(deps.chooseSafeReply(run, lang, "direct", agent));
      if (picked) return picked;
    } catch (err) {
      logger.warn(`[persona-auto-reply] failed for ${agent.name}: ${String(err)}`);
    }

    return fallback;
  }

  function sendInCharacterAutoMessage(params: {
    agent: AgentRow;
    lang: Lang;
    scenario: string;
    fallback: string;
    options: DelegationOptions;
    messageType?: string;
    taskId?: string | null;
    strictFallback?: boolean;
  }): void {
    const {
      agent,
      lang,
      scenario,
      fallback,
      options,
      messageType = "chat",
      taskId = null,
      strictFallback = false,
    } = params;
    void (async () => {
      const content = strictFallback ? fallback : await composeInCharacterAutoMessage(agent, lang, scenario, fallback);
      deps.sendAgentMessage(agent, content, messageType, "agent", null, taskId, options.roomId ?? null);
      await relayReplyToMessenger(options, agent, content);
    })().catch((err) => {
      logger.warn(`[persona-auto-reply] send failed for ${agent.name}: ${String(err)}`);
    });
  }

  function buildRoomContextBlock(roomId: string, currentAgent: AgentRow, lang: Lang): string {
    type RoomMsgRow = { sender_type: string; content: string; created_at: number; name: string | null };
    const rows = deps.db
      .prepare(
        `SELECT m.sender_type, m.content, m.created_at, a.name
         FROM messages m
         LEFT JOIN agents a ON m.sender_type = 'agent' AND m.sender_id = a.id
         WHERE m.room_id = ?
         ORDER BY m.created_at DESC
         LIMIT 20`,
      )
      .all(roomId) as RoomMsgRow[];

    if (rows.length === 0) return "";

    const lines = rows
      .slice()
      .reverse()
      .map((r) => {
        const who = r.sender_type === "client" ? "User" : r.name || "Agent";
        const ts = new Date(r.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        const snippet = r.content.length > 300 ? r.content.slice(0, 300) + "…" : r.content;
        return `[${ts}] ${who}: ${snippet}`;
      });

    return [
      "=== GROUP CHAT ROOM (그룹 채팅방 대화 기록) ===",
      ...lines,
      "=== END OF ROOM CONTEXT ===",
      "",
      `You (${currentAgent.name}) are participating in a shared group chat room with multiple AI agents.`,
      "Read the conversation above and respond naturally as part of the group.",
      "If another agent already addressed the point well, you can add your unique expertise or acknowledge briefly.",
      "Keep your reply concise and relevant to your role.",
      `IMPORTANT: Always respond in the configured language (${localeInstructionForDirect(lang)}). Ignore the language used by other agents in the conversation above.`,
      "",
    ].join("\n");
  }

  function insertStreamingMessage(msgId: string, agent: AgentRow, content: string, roomId: string | null = null): void {
    const endedAt = deps.nowMs();
    deps.db
      .prepare(
        `
          INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, room_id, created_at)
          VALUES (?, 'agent', ?, 'agent', NULL, ?, 'chat', NULL, ?, ?)
        `,
      )
      .run(msgId, agent.id, content, roomId, endedAt);
    deps.broadcast("chat_stream", {
      phase: "end",
      message_id: msgId,
      agent_id: agent.id,
      content,
      room_id: roomId,
      created_at: endedAt,
    });
  }

  function runDirectReplyExecution(
    agent: AgentRow,
    ceoMessage: string,
    messageType: string,
    options: DelegationOptions = {},
  ): void {
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      void (async () => {
        const stopTyping = startMessengerTypingHeartbeat(options, agent);
        try {
          const activeTask = agent.current_task_id
            ? (deps.db
                .prepare("SELECT title, description, project_path FROM tasks WHERE id = ?")
                .get(agent.current_task_id) as
                | {
                    title: string;
                    description: string | null;
                    project_path: string | null;
                  }
                | undefined)
            : undefined;
          const detectedPath = deps.detectProjectPath(ceoMessage);
          const projectPath = detectedPath || (activeTask ? deps.resolveProjectPath(activeTask) : process.cwd());

          const built = deps.buildDirectReplyPrompt(agent, ceoMessage, messageType);
          const roomId = options.roomId ?? null;
          const roomCtxPrefix = roomId ? buildRoomContextBlock(roomId, agent, built.lang as Lang) : "";
          const promptToUse = roomCtxPrefix ? roomCtxPrefix + built.prompt : built.prompt;

          logger.info(
            `[scheduleAgentReply] agent=${agent.name}, cli_provider=${agent.cli_provider}, api_provider_id=${agent.api_provider_id}, api_model=${agent.api_model}${roomId ? ", roomId=" + roomId : ""}`,
          );

          // Misconfiguration guard: cli_provider="api" but no api_provider_id set
          if (agent.cli_provider === "api" && !agent.api_provider_id) {
            const name = agent.name || "Agent";
            const errReply =
              built.lang === "ko"
                ? `${name}: API 프로바이더가 설정되지 않았습니다. 에이전트 설정 → CLI 탭에서 API Provider를 선택해주세요.`
                : `${name}: No API provider configured. Please set an API Provider in Agent settings → CLI tab.`;
            deps.sendAgentMessage(agent, errReply, "chat", "agent", null, null, roomId);
            return;
          }

          if (agent.cli_provider === "api" && agent.api_provider_id) {
            const msgId = randomUUID();
            deps.broadcast("chat_stream", {
              phase: "start",
              message_id: msgId,
              agent_id: agent.id,
              agent_name: agent.name,
              agent_avatar: agent.avatar_emoji ?? "🤖",
              room_id: roomId,
            });

            let fullText = "";
            let apiError = "";
            try {
              const logStream = fs.createWriteStream(path.join(deps.logsDir, `direct-${agent.id}-${Date.now()}.log`), {
                flags: "w",
              });
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 180_000);
              try {
                await deps.executeApiProviderAgent(
                  promptToUse,
                  projectPath,
                  logStream,
                  controller.signal,
                  undefined,
                  agent.api_provider_id,
                  agent.api_model ?? null,
                  (text: string) => {
                    fullText += text;
                    logStream.write(text);
                    deps.broadcast("chat_stream", {
                      phase: "delta",
                      message_id: msgId,
                      agent_id: agent.id,
                      text,
                    });
                    return true;
                  },
                );
              } finally {
                clearTimeout(timeout);
                logStream.end();
              }
            } catch (err: unknown) {
              apiError = err instanceof Error ? err.message : String(err);
              logger.error(`[scheduleAgentReply:API] Error for ${agent.name}: %s`, apiError);
            }

            const contentOnly = fullText
              .replace(/^\[api:[^\]]*\][^\n]*\n---\n/g, "")
              .replace(/\n---\n\[api:[^\]]*\]\s*Done\.\s*$/g, "")
              .trim();

            let finalReply: string;
            if (contentOnly) {
              finalReply = contentOnly.length > 12000 ? contentOnly.slice(0, 12000) : contentOnly;
            } else if (apiError) {
              finalReply = `[API Error] ${apiError}`;
            } else {
              finalReply = deps.chooseSafeReply({ text: "" }, built.lang, "direct", agent);
            }
            finalReply = normalizeAgentReply(finalReply);

            insertStreamingMessage(msgId, agent, finalReply, roomId);
            void relayReplyToMessenger(options, agent, finalReply).catch((err) => {
              logger.warn(`[messenger-reply] failed to relay API reply from ${agent.name}: ${String(err)}`);
            });
            return;
          }

          if (agent.cli_provider === "copilot" || agent.cli_provider === "antigravity") {
            const msgId = randomUUID();
            deps.broadcast("chat_stream", {
              phase: "start",
              message_id: msgId,
              agent_id: agent.id,
              agent_name: agent.name,
              agent_avatar: agent.avatar_emoji ?? "🤖",
              room_id: roomId,
            });

            let fullText = "";
            let oauthError = "";
            try {
              const logStream = fs.createWriteStream(path.join(deps.logsDir, `direct-${agent.id}-${Date.now()}.log`), {
                flags: "w",
              });
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 180_000);
              const streamCb = (text: string) => {
                fullText += text;
                logStream.write(text);
                deps.broadcast("chat_stream", {
                  phase: "delta",
                  message_id: msgId,
                  agent_id: agent.id,
                  text,
                });
                return true;
              };
              try {
                if (agent.cli_provider === "copilot") {
                  await deps.executeCopilotAgent(
                    promptToUse,
                    projectPath,
                    logStream,
                    controller.signal,
                    undefined,
                    agent.oauth_account_id ?? null,
                    streamCb,
                  );
                } else {
                  await deps.executeAntigravityAgent(
                    promptToUse,
                    logStream,
                    controller.signal,
                    undefined,
                    agent.oauth_account_id ?? null,
                    streamCb,
                  );
                }
              } finally {
                clearTimeout(timeout);
                logStream.end();
              }
            } catch (err: unknown) {
              oauthError = err instanceof Error ? err.message : String(err);
              logger.error(`[scheduleAgentReply:OAuth] Error for ${agent.name}: %s`, oauthError);
            }

            const contentOnly = fullText
              .replace(/^\[(copilot|antigravity)\][^\n]*\n/gm, "")
              .replace(/---+/g, "")
              .replace(/^\[oauth[^\]]*\][^\n]*/gm, "")
              .trim();

            let finalReply: string;
            if (contentOnly) {
              finalReply = contentOnly.length > 12000 ? contentOnly.slice(0, 12000) : contentOnly;
            } else if (oauthError) {
              finalReply = `[OAuth Error] ${oauthError}`;
            } else {
              finalReply = deps.chooseSafeReply({ text: "" }, built.lang, "direct", agent);
            }
            finalReply = normalizeAgentReply(finalReply);

            insertStreamingMessage(msgId, agent, finalReply, roomId);
            void relayReplyToMessenger(options, agent, finalReply).catch((err) => {
              logger.warn(`[messenger-reply] failed to relay OAuth reply from ${agent.name}: ${String(err)}`);
            });
            return;
          }

          let run: Awaited<ReturnType<DirectReplyRuntimeDeps["runAgentOneShot"]>>;
          try {
            run = await deps.runAgentOneShot(agent, promptToUse, { projectPath, rawOutput: true });
          } catch (cliErr: unknown) {
            const msg = cliErr instanceof Error ? cliErr.message : String(cliErr);
            logger.error(`[scheduleAgentReply:CLI] Error for ${agent.name}: %s`, msg);
            const userMsg = deps.buildCliFailureMessage(agent, built.lang, clipCliErrorForUser(msg));
            deps.sendAgentMessage(agent, normalizeAgentReply(userMsg), "chat", "agent", null, null, roomId);
            void relayReplyToMessenger(options, agent, userMsg).catch((relayErr) => {
              logger.warn(`[messenger-reply] failed to relay CLI failure from ${agent.name}: ${String(relayErr)}`);
            });
            return;
          }
          const reply = normalizeAgentReply(deps.chooseSafeReply(run, built.lang, "direct", agent));
          deps.sendAgentMessage(agent, reply, "chat", "agent", null, null, roomId);
          void relayReplyToMessenger(options, agent, reply).catch((err) => {
            logger.warn(`[messenger-reply] failed to relay direct reply from ${agent.name}: ${String(err)}`);
          });
        } finally {
          stopTyping();
          // Advance the room lane queue: next agent starts after this one completes.
          const _roomId = options.roomId ?? null;
          if (_roomId) deps.onRoomReplyComplete?.(_roomId);
        }
      })().catch((err) => {
        logger.warn(`[scheduleAgentReply] async generation failed for ${agent.name}: ${String(err)}`);
      });
    }, delay);
  }

  return {
    relayReplyToMessenger,
    startMessengerTypingHeartbeat,
    composeInCharacterAutoMessage,
    sendInCharacterAutoMessage,
    runDirectReplyExecution,
  };
}
