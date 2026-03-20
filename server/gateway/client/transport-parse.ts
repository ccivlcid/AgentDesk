import type { MessengerChannel } from "../../messenger/channels.ts";
import { normalizeText } from "./normalize.ts";

export function splitPipeParts(raw: string): string[] {
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function removeChannelPrefix(channel: MessengerChannel, value: string): string {
  const lower = value.toLowerCase();
  const prefixes: string[] = [`${channel}:`, "channel:", "chat:"];
  if (channel === "googlechat") {
    prefixes.push("googlechat:", "google-chat:", "google_chat:", "gchat:");
  }
  if (channel === "imessage") {
    prefixes.push("imessage:", "i-message:", "i_message:");
  }
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      return value.slice(prefix.length).trim();
    }
  }
  return value.trim();
}

export function normalizeSignalBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return `http://${trimmed}`.replace(/\/+$/, "");
}

export function parseWhatsAppTransport(
  tokenRaw: string,
  targetRaw: string,
): {
  accessToken: string;
  phoneNumberId: string;
  recipient: string;
} {
  let accessToken = normalizeText(tokenRaw);
  const target = removeChannelPrefix("whatsapp", targetRaw);
  const targetMatch = target.match(/^(\d+)\s*[:|/]\s*(.+)$/);
  let phoneNumberId = targetMatch?.[1]?.trim() ?? "";
  const recipient = (targetMatch?.[2] ?? target).trim();

  const tokenParts = splitPipeParts(accessToken);
  if (!phoneNumberId && tokenParts.length >= 2) {
    const first = tokenParts[0];
    const last = tokenParts[tokenParts.length - 1];
    if (/^\d+$/.test(first)) {
      phoneNumberId = first;
      accessToken = tokenParts.slice(1).join("|");
    } else if (/^\d+$/.test(last)) {
      phoneNumberId = last;
      accessToken = tokenParts.slice(0, -1).join("|");
    }
  }

  if (!accessToken) {
    throw new Error("whatsapp token missing");
  }
  if (!phoneNumberId) {
    throw new Error(
      "whatsapp phone_number_id missing (targetId: `<phone_number_id>:<recipient>` or include numeric id in token)",
    );
  }
  if (!recipient) {
    throw new Error("whatsapp recipient missing");
  }

  return { accessToken, phoneNumberId, recipient };
}

export function parseGoogleChatTransport(tokenRaw: string, targetRaw: string): { url: string } {
  const token = normalizeText(tokenRaw);
  const target = removeChannelPrefix("googlechat", targetRaw).replace(/^\/+/, "");
  if (!token) {
    throw new Error("googlechat token missing");
  }

  if (/^https?:\/\//i.test(token)) {
    return { url: token };
  }

  const tokenParts = splitPipeParts(token);
  if (tokenParts.length >= 2 && target) {
    const apiKey = tokenParts[0];
    const webhookToken = tokenParts.slice(1).join("|");
    if (!apiKey || !webhookToken) {
      throw new Error("googlechat token format invalid");
    }
    return {
      url: `https://chat.googleapis.com/v1/${target}/messages?key=${encodeURIComponent(
        apiKey,
      )}&token=${encodeURIComponent(webhookToken)}`,
    };
  }

  throw new Error("googlechat token must be webhook URL or `key|token` (with targetId `spaces/...`)");
}

export function parseSignalTransport(tokenRaw: string): { baseUrl: string; account?: string } {
  const token = normalizeText(tokenRaw);
  if (!token) {
    throw new Error("signal token missing");
  }
  const tokenParts = splitPipeParts(token);
  const baseUrl = normalizeSignalBaseUrl(tokenParts[0] ?? token);
  if (!baseUrl) {
    throw new Error("signal base URL missing");
  }
  let account: string | undefined;
  for (const part of tokenParts.slice(1)) {
    const normalized = part.trim();
    if (!normalized) continue;
    if (/^(account|acct|accountid)\s*=/i.test(normalized)) {
      account = normalized.replace(/^(account|acct|accountid)\s*=\s*/i, "").trim() || account;
      continue;
    }
    if (!account && !normalized.includes("=")) {
      account = normalized;
    }
  }
  return { baseUrl, account };
}

export function parseSignalTarget(targetRaw: string): { recipient?: string[]; groupId?: string; username?: string[] } {
  let value = removeChannelPrefix("signal", targetRaw);
  if (!value) {
    throw new Error("signal target missing");
  }
  const lower = value.toLowerCase();
  if (lower.startsWith("group:")) {
    value = value.slice("group:".length).trim();
    if (!value) throw new Error("signal group id missing");
    return { groupId: value };
  }
  if (lower.startsWith("username:")) {
    value = value.slice("username:".length).trim();
    if (!value) throw new Error("signal username missing");
    return { username: [value] };
  }
  if (lower.startsWith("u:")) {
    value = value.slice("u:".length).trim();
    if (!value) throw new Error("signal username missing");
    return { username: [value] };
  }
  return { recipient: [value] };
}
