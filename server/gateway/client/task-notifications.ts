import fs from "node:fs";

import { translateMessage, type SharedLanguage } from "../../../shared/i18n/index.ts";
import logger from "../../lib/logger.ts";
import { NATIVE_MESSENGER_CHANNELS } from "../../messenger/channels.ts";
import { loadMessengerConfig } from "./messenger-config.ts";
import { sendByChannel } from "./messenger-low-level.ts";
import { normalizeText } from "./normalize.ts";
import { sendTelegramDocument } from "./channel-transports.ts";
import { queueWake } from "./messenger-public.ts";

type GatewayLang = SharedLanguage;

function detectGatewayLang(text: string): GatewayLang {
  const ko = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g)?.length ?? 0;
  const ja = text.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length ?? 0;
  const zh = text.match(/[\u4E00-\u9FFF]/g)?.length ?? 0;
  const total = text.replace(/\s/g, "").length || 1;
  if (ko / total > 0.15) return "ko";
  if (ja / total > 0.15) return "ja";
  if (zh / total > 0.3) return "zh";
  return "en";
}

function normalizeGatewayLang(lang: string | null | undefined, title: string): GatewayLang {
  if (lang === "ko" || lang === "en" || lang === "ja" || lang === "zh") return lang;
  if (title.trim()) return detectGatewayLang(title);
  return "en";
}

function resolveStatusLabel(status: string, lang: GatewayLang): string {
  if (status === "in_progress") {
    return translateMessage(lang, "task.status.inProgress");
  }
  if (status === "review") {
    return translateMessage(lang, "task.status.review");
  }
  if (status === "done") {
    return translateMessage(lang, "task.status.done");
  }
  return status;
}

export function notifyTaskStatus(taskId: string, title: string, status: string, lang?: string): void {
  const resolvedLang = normalizeGatewayLang(lang, title);
  const emoji =
    status === "in_progress"
      ? "\u{1F680}"
      : status === "review"
        ? "\u{1F50D}"
        : status === "done"
          ? "\u2705"
          : "\u{1F4CB}";
  const label = resolveStatusLabel(status, resolvedLang);
  queueWake({
    key: `task:${taskId}:${status}`,
    text: `${emoji} [${label}] ${title}`,
    debounceMs: 5_000,
  });
}

/** Send deliverable files to all enabled messenger sessions (Client-level, non-agent) */
export async function sendDeliverableFiles(
  taskTitle: string,
  filePaths: Array<{ absolutePath: string; fileName: string }>,
  lang?: string,
): Promise<void> {
  const config = loadMessengerConfig();
  const resolvedLang = normalizeGatewayLang(lang, taskTitle);
  const prefix = translateMessage(resolvedLang, "gateway.deliverable.prefix");

  for (const channel of NATIVE_MESSENGER_CHANNELS) {
    const channelConfig = config[channel];
    if (!channelConfig) continue;
    const channelToken = channelConfig.token;

    for (const session of channelConfig.sessions) {
      if (!session.enabled) continue;
      if (session.agentId) continue; // skip agent sessions, only send to Client
      const token = normalizeText(session.token) || channelToken;
      if (channel !== "imessage" && !token) continue;

      for (const file of filePaths) {
        try {
          if (!fs.existsSync(file.absolutePath)) continue;
          const caption = `📎 [${prefix}] ${taskTitle}\n${file.fileName}`;

          if (channel === "telegram") {
            await sendTelegramDocument(token, session.targetId, file.absolutePath, caption);
          } else {
            // For non-Telegram channels, send a text notification with file info
            const sizeBytes = fs.statSync(file.absolutePath).size;
            const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
            await sendByChannel(channel, token, session.targetId, `${caption} (${sizeMB} MB)`);
          }
        } catch (err) {
          logger.warn(`[AgentDesk] deliverable file send failed (${channel}/${file.fileName}): ${String(err)}`);
        }
      }
    }
  }
}

export function notifyDecisionInbox(count: number, lang?: string): void {
  if (count <= 0) return;
  const resolvedLang = normalizeGatewayLang(lang, "");
  queueWake({
    key: `decision-inbox:${count}`,
    text: `\u{1F4EC} ${translateMessage(resolvedLang, "gateway.decisionInbox.waiting", { count })}`,
    debounceMs: 30_000,
  });
}

export async function gatewayHttpInvoke(_req: {
  tool: string;
  action?: string;
  args?: Record<string, any>;
}): Promise<any> {
  throw new Error("agentdesk gateway integration has been removed; use direct messenger transports");
}
