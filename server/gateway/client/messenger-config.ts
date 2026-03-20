import { DatabaseSync } from "node:sqlite";

import logger from "../../lib/logger.ts";
import { DEFAULT_DB_PATH } from "../../config/runtime.ts";
import { decryptMessengerTokenForRuntime } from "../../messenger/token-crypto.ts";
import { MESSENGER_CHANNELS } from "../../messenger/channels.ts";
import type { MessengerChannel } from "../../messenger/channels.ts";
import { DISCORD_TEXT_CHANNEL_TYPES, SETTINGS_CACHE_TTL_MS, MESSENGER_SETTINGS_KEY } from "./constants.ts";
import { normalizeText } from "./normalize.ts";
import type {
  MessengerChannelConfig,
  MessengerRuntimeConfig,
  MessengerSession,
  PersistedChannelConfig,
  PersistedMessengerChannels,
  PersistedSession,
} from "./types.ts";

const wakeDebounce = new Map<string, number>();
let cachedMessengerConfig: { loadedAt: number; value: MessengerRuntimeConfig } | null = null;

export function normalizeDiscordToken(value: unknown): string {
  const token = normalizeText(value);
  if (!token) return "";
  if (/^bot\s+/i.test(token)) {
    return token.replace(/^bot\s+/i, "").trim();
  }
  return token;
}

export function isDiscordTextChannelType(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && DISCORD_TEXT_CHANNEL_TYPES.has(value);
}

export async function fetchDiscordJson(token: string, apiPath: string): Promise<unknown> {
  const response = await fetch(`https://discord.com/api/v10${apiPath}`, {
    headers: {
      authorization: `Bot ${token}`,
    },
  });
  const bodyText = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`discord api failed (${response.status})${bodyText ? `: ${bodyText}` : ""}`);
  }
  if (!bodyText.trim()) {
    return null;
  }
  return JSON.parse(bodyText) as unknown;
}

function normalizeSession(
  session: PersistedSession,
  channel: MessengerChannel,
  index: number,
): MessengerSession | null {
  const targetId = normalizeText(session.targetId);
  if (!targetId) {
    return null;
  }
  const rawId = normalizeText(session.id);
  const id = rawId || `${channel}-${index + 1}`;
  const name = normalizeText(session.name) || `${channel.toUpperCase()} ${index + 1}`;
  const token = normalizeText(session.token);
  return {
    id,
    name,
    targetId,
    enabled: session.enabled !== false,
    token: token ? decryptMessengerTokenForRuntime(channel, token) : undefined,
    agentId: normalizeText(session.agentId) || undefined,
  };
}

function buildEmptyConfig(): MessengerRuntimeConfig {
  return MESSENGER_CHANNELS.reduce((acc, channel) => {
    acc[channel] = { token: "", sessions: [] };
    return acc;
  }, {} as MessengerRuntimeConfig);
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function readPersistedMessengerChannels(): PersistedMessengerChannels | null {
  const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH;
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath);
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(MESSENGER_SETTINGS_KEY) as
      | { value?: unknown }
      | undefined;
    const raw = typeof row?.value === "string" ? row.value.trim() : "";
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as PersistedMessengerChannels;
  } catch (err) {
    logger.warn(`[AgentDesk] failed to load messenger channels settings: ${String(err)}`);
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      // ignore
    }
  }
}

function mergeChannelConfig(
  channel: MessengerChannel,
  base: MessengerChannelConfig,
  persistedChannels: PersistedMessengerChannels | null,
): MessengerChannelConfig {
  const persisted = persistedChannels?.[channel];
  if (!persisted || typeof persisted !== "object") {
    return base;
  }

  const nextToken = hasOwn(persisted, "token") ? decryptMessengerTokenForRuntime(channel, persisted.token) : base.token;

  let nextSessions = base.sessions;
  if (hasOwn(persisted, "sessions") && Array.isArray(persisted.sessions)) {
    nextSessions = persisted.sessions
      .map((session, index) => normalizeSession(session ?? {}, channel, index))
      .filter((session): session is MessengerSession => Boolean(session));
  }

  return {
    token: nextToken,
    sessions: nextSessions,
  };
}

export function loadMessengerConfig(): MessengerRuntimeConfig {
  const now = Date.now();
  if (cachedMessengerConfig && now - cachedMessengerConfig.loadedAt < SETTINGS_CACHE_TTL_MS) {
    return cachedMessengerConfig.value;
  }

  const persistedChannels = readPersistedMessengerChannels();
  const defaults = buildEmptyConfig();
  const merged = MESSENGER_CHANNELS.reduce((acc, channel) => {
    acc[channel] = mergeChannelConfig(channel, defaults[channel], persistedChannels);
    return acc;
  }, {} as MessengerRuntimeConfig);

  cachedMessengerConfig = { loadedAt: now, value: merged };
  return merged;
}

export function shouldSendWake(key: string, debounceMs: number): boolean {
  const now = Date.now();
  const last = wakeDebounce.get(key);
  if (last && now - last < debounceMs) {
    return false;
  }

  wakeDebounce.set(key, now);
  if (wakeDebounce.size > 2000) {
    for (const [candidateKey, ts] of wakeDebounce) {
      if (now - ts > debounceMs * 4) {
        wakeDebounce.delete(candidateKey);
      }
    }
  }

  return true;
}
