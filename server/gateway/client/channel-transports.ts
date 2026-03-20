import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { SIGNAL_RPC_TIMEOUT_MS } from "./constants.ts";
import { execFileAsync } from "./constants.ts";
import type { MessengerChannel } from "../../messenger/channels.ts";
import { normalizeText } from "./normalize.ts";
import {
  parseGoogleChatTransport,
  parseSignalTarget,
  parseSignalTransport,
  parseWhatsAppTransport,
  removeChannelPrefix,
} from "./transport-parse.ts";

export async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const payload = (await r.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!r.ok || payload?.ok === false) {
    throw new Error(payload?.description || `telegram send failed (${r.status})`);
  }
}

export async function sendTelegramDocument(
  token: string,
  chatId: string,
  filePath: string,
  caption?: string,
): Promise<void> {
  const fileName = path.basename(filePath);
  const fileStream = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", new Blob([fileStream]), fileName);
  if (caption) formData.append("caption", caption);

  const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  const payload = (await r.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!r.ok || payload?.ok === false) {
    throw new Error(payload?.description || `telegram sendDocument failed (${r.status})`);
  }
}

export async function sendTelegramTyping(token: string, chatId: string): Promise<void> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing",
    }),
  });

  const payload = (await r.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!r.ok || payload?.ok === false) {
    throw new Error(payload?.description || `telegram typing failed (${r.status})`);
  }
}

export async function sendDiscordMessage(token: string, channelId: string, text: string): Promise<void> {
  const r = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bot ${token}`,
    },
    body: JSON.stringify({ content: text }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`discord send failed (${r.status})${detail ? `: ${detail}` : ""}`);
  }
}

export async function sendDiscordTyping(token: string, channelId: string): Promise<void> {
  const r = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/typing`, {
    method: "POST",
    headers: {
      authorization: `Bot ${token}`,
    },
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`discord typing failed (${r.status})${detail ? `: ${detail}` : ""}`);
  }
}

export async function sendSlackMessage(token: string, channelId: string, text: string): Promise<void> {
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel: channelId, text }),
  });

  const payload = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!r.ok || payload?.ok === false) {
    throw new Error(payload?.error || `slack send failed (${r.status})`);
  }
}

export async function sendWhatsAppMessage(token: string, targetId: string, text: string): Promise<void> {
  const { accessToken, phoneNumberId, recipient } = parseWhatsAppTransport(token, targetId);
  const r = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        body: text,
        preview_url: false,
      },
    }),
  });

  const payload = (await r.json().catch(() => null)) as {
    error?: { message?: string } | null;
    messages?: Array<{ id?: string }>;
  } | null;
  if (!r.ok || payload?.error) {
    const message = payload?.error?.message;
    throw new Error(message || `whatsapp send failed (${r.status})`);
  }
}

export async function sendGoogleChatMessage(token: string, targetId: string, text: string): Promise<void> {
  const { url } = parseGoogleChatTransport(token, targetId);
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`googlechat send failed (${r.status})${detail ? `: ${detail}` : ""}`);
  }
}

export async function signalRpcRequest(params: {
  baseUrl: string;
  method: "send" | "sendTyping";
  payload: Record<string, unknown>;
}): Promise<void> {
  const r = await fetch(`${params.baseUrl}/api/v1/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: randomUUID(),
      method: params.method,
      params: params.payload,
    }),
    signal: AbortSignal.timeout(SIGNAL_RPC_TIMEOUT_MS),
  });
  if (r.status === 201) {
    return;
  }
  const responseText = await r.text().catch(() => "");
  if (!r.ok) {
    throw new Error(`signal rpc failed (${r.status})${responseText ? `: ${responseText}` : ""}`);
  }
  if (!responseText.trim()) {
    return;
  }
  const payload = JSON.parse(responseText) as {
    error?: { code?: number; message?: string };
  };
  if (payload?.error) {
    throw new Error(`signal rpc ${payload.error.code ?? "unknown"}: ${payload.error.message ?? "unknown error"}`);
  }
}

export async function sendSignalMessage(token: string, targetId: string, text: string): Promise<void> {
  const transport = parseSignalTransport(token);
  const target = parseSignalTarget(targetId);
  const payload: Record<string, unknown> = { ...target, message: text };
  if (transport.account) {
    payload.account = transport.account;
  }
  await signalRpcRequest({
    baseUrl: transport.baseUrl,
    method: "send",
    payload,
  });
}

export async function sendSignalTyping(token: string, targetId: string): Promise<void> {
  const transport = parseSignalTransport(token);
  const target = parseSignalTarget(targetId);
  const payload: Record<string, unknown> = { ...target };
  if (transport.account) {
    payload.account = transport.account;
  }
  await signalRpcRequest({
    baseUrl: transport.baseUrl,
    method: "sendTyping",
    payload,
  });
}

export async function sendIMessageMessage(targetId: string, text: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("imessage transport requires macOS");
  }
  const normalizedTarget = removeChannelPrefix("imessage", targetId);
  if (!normalizedTarget) {
    throw new Error("imessage target missing");
  }
  const script = [
    "on run argv",
    "set targetHandle to item 1 of argv",
    "set targetMessage to item 2 of argv",
    'tell application "Messages"',
    "set targetService to 1st service whose service type = iMessage",
    "set targetBuddy to buddy targetHandle of targetService",
    "send targetMessage to targetBuddy",
    "end tell",
    "end run",
  ].join("\n");
  await execFileAsync("osascript", ["-e", script, normalizedTarget, text], {
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });
}
