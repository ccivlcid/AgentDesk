import logger from "../../lib/logger.ts";
import {
  MESSENGER_CHANNELS,
  NATIVE_MESSENGER_CHANNELS,
  isNativeMessengerChannel,
  type MessengerChannel,
} from "../../messenger/channels.ts";
import { DISCORD_CHANNEL_LIST_GUILD_LIMIT, WAKE_DEBOUNCE_DEFAULT_MS } from "./constants.ts";
import {
  fetchDiscordJson,
  isDiscordTextChannelType,
  normalizeDiscordToken,
} from "./messenger-config.ts";
import { loadMessengerConfig, shouldSendWake } from "./messenger-config.ts";
import { sendByChannel, sendTypingByChannel } from "./messenger-low-level.ts";
import { normalizeText } from "./normalize.ts";
import {
  normalizeComparableTarget,
  resolveSessionFromKey,
  resolveSessionTokenForTarget,
} from "./session-targets.ts";
import type { DiscordDiscoverableChannel, MessengerRuntimeSession } from "./types.ts";
import type { MessengerChannelConfig, MessengerSession } from "./types.ts";

export async function listDiscordChannelsByToken(tokenRaw: string): Promise<DiscordDiscoverableChannel[]> {
  const token = normalizeDiscordToken(tokenRaw);
  if (!token) {
    throw new Error("discord token missing");
  }

  const guildPayload = await fetchDiscordJson(token, "/users/@me/guilds?limit=200");
  const guilds = Array.isArray(guildPayload) ? guildPayload : [];
  const collected: DiscordDiscoverableChannel[] = [];

  for (let index = 0; index < guilds.length && index < DISCORD_CHANNEL_LIST_GUILD_LIMIT; index += 1) {
    const guild = guilds[index] as { id?: unknown; name?: unknown };
    const guildId = normalizeText(guild.id);
    if (!guildId) continue;
    const guildName = normalizeText(guild.name) || `Guild ${index + 1}`;

    let channelPayload: unknown;
    try {
      channelPayload = await fetchDiscordJson(token, `/guilds/${encodeURIComponent(guildId)}/channels`);
    } catch {
      continue;
    }
    if (!Array.isArray(channelPayload)) {
      continue;
    }

    for (const entry of channelPayload) {
      const channel = entry as { id?: unknown; name?: unknown; type?: unknown };
      const channelType = typeof channel.type === "number" ? channel.type : Number(channel.type);
      if (!isDiscordTextChannelType(channelType)) {
        continue;
      }
      const channelId = normalizeText(channel.id);
      if (!channelId) {
        continue;
      }
      const channelName = normalizeText(channel.name) || `channel-${channelId}`;
      collected.push({
        id: channelId,
        name: channelName,
        guildId,
        guildName,
        type: channelType,
      });
    }
  }

  const deduped = new Map<string, DiscordDiscoverableChannel>();
  for (const row of collected) {
    if (!deduped.has(row.id)) {
      deduped.set(row.id, row);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const guildCompare = a.guildName.localeCompare(b.guildName, undefined, { sensitivity: "base" });
    if (guildCompare !== 0) return guildCompare;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function listMessengerSessions(): MessengerRuntimeSession[] {
  const config = loadMessengerConfig();
  const sessions: MessengerRuntimeSession[] = [];

  for (const channel of MESSENGER_CHANNELS) {
    const channelConfig = config[channel];
    for (const session of channelConfig.sessions) {
      const sessionKey = `${channel}:${session.id}`;
      sessions.push({
        sessionKey,
        channel,
        targetId: session.targetId,
        enabled: session.enabled,
        displayName: session.name,
      });
    }
  }

  return sessions;
}

export async function sendMessengerMessage(params: {
  channel: MessengerChannel;
  targetId: string;
  text: string;
}): Promise<void> {
  const text = normalizeText(params.text);
  if (!text) {
    throw new Error("message text required");
  }

  const config = loadMessengerConfig();
  const channelConfig = config[params.channel];
  if (!channelConfig) {
    throw new Error(`unsupported channel: ${params.channel}`);
  }

  const token = resolveSessionTokenForTarget(params.channel, channelConfig, params.targetId);
  await sendByChannel(params.channel, token, params.targetId, text);
}

export async function sendMessengerTyping(params: { channel: MessengerChannel; targetId: string }): Promise<void> {
  const config = loadMessengerConfig();
  const channelConfig = config[params.channel];
  if (!channelConfig) {
    throw new Error(`unsupported channel: ${params.channel}`);
  }
  if (
    !isNativeMessengerChannel(params.channel) ||
    params.channel === "slack" ||
    params.channel === "whatsapp" ||
    params.channel === "googlechat" ||
    params.channel === "imessage"
  ) {
    return;
  }
  const token = resolveSessionTokenForTarget(params.channel, channelConfig, params.targetId);
  await sendTypingByChannel(params.channel, token, params.targetId);
}

export async function sendMessengerSessionTyping(sessionKey: string): Promise<void> {
  const normalizedKey = normalizeText(sessionKey);
  if (!normalizedKey) {
    throw new Error("sessionKey required");
  }

  const config = loadMessengerConfig();
  const resolved = resolveSessionFromKey(config, normalizedKey);
  if (!resolved) {
    throw new Error("session not found");
  }
  if (!resolved.session.enabled) {
    throw new Error("session disabled");
  }
  if (
    !isNativeMessengerChannel(resolved.channel) ||
    resolved.channel === "slack" ||
    resolved.channel === "whatsapp" ||
    resolved.channel === "googlechat" ||
    resolved.channel === "imessage"
  ) {
    return;
  }

  const token = normalizeText(resolved.session.token) || config[resolved.channel].token;
  await sendTypingByChannel(resolved.channel, token, resolved.session.targetId);
}

export async function sendMessengerSessionMessage(sessionKey: string, text: string): Promise<void> {
  const normalizedKey = normalizeText(sessionKey);
  if (!normalizedKey) {
    throw new Error("sessionKey required");
  }
  const payload = normalizeText(text);
  if (!payload) {
    throw new Error("message text required");
  }

  const config = loadMessengerConfig();
  const resolved = resolveSessionFromKey(config, normalizedKey);
  if (!resolved) {
    throw new Error("session not found");
  }

  const token = normalizeText(resolved.session.token) || config[resolved.channel].token;
  await sendByChannel(resolved.channel, token, resolved.session.targetId, payload);
}

async function sendMessengerWake(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const config = loadMessengerConfig();
  const targets: Array<{ channel: MessengerChannel; targetId: string; token: string }> = [];
  for (const channel of NATIVE_MESSENGER_CHANNELS) {
    const channelToken = config[channel]?.token;
    for (const session of config[channel].sessions) {
      if (!session.enabled) continue;
      if (session.agentId) continue;
      const token = normalizeText(session.token) || channelToken;
      if (channel !== "imessage" && !token) continue;
      targets.push({ channel, targetId: session.targetId, token });
    }
  }

  if (targets.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      await sendByChannel(target.channel, target.token, target.targetId, trimmed);
    }),
  );

  const failures: string[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result?.status === "fulfilled") {
      continue;
    }
    const target = targets[i];
    failures.push(`${target.channel}:${target.targetId} => ${String(result?.reason ?? "unknown error")}`);
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" | "));
  }
}

export function queueWake(params: { key: string; text: string; debounceMs?: number }) {
  const debounceMs = params.debounceMs ?? WAKE_DEBOUNCE_DEFAULT_MS;
  if (!shouldSendWake(params.key, debounceMs)) {
    return;
  }

  void sendMessengerWake(params.text).catch((err) => {
    logger.warn(`[AgentDesk] messenger notification failed (${params.key}): ${String(err)}`);
  });
}
