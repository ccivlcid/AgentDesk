import type { DatabaseSync } from "node:sqlite";
import logger from "../lib/logger.ts";
import { INBOX_WEBHOOK_SECRET, OAUTH_BASE_HOST, PORT } from "../config/runtime.ts";
import { buildMessengerSourceWithTokenHint, buildMessengerTokenKey } from "./token-hint.ts";
import { decryptMessengerTokenForRuntime } from "./token-crypto.ts";

const MESSENGER_SETTINGS_KEY = "messengerChannels";
const SLACK_RECEIVER_CURSOR_KEY = "slackReceiverCursor";
const SLACK_ACTIVE_DELAY_MS = 3_000;
const SLACK_IDLE_DELAY_MS = 8_000;
const SLACK_FETCH_LIMIT = 50;
const INBOX_FORWARD_MAX_RETRIES = 3;
const INBOX_FORWARD_RETRY_BASE_MS = 2_000;

type PersistedSession = {
  targetId?: unknown;
  enabled?: unknown;
  token?: unknown;
};

type PersistedSlackChannel = {
  token?: unknown;
  sessions?: unknown;
};

type PersistedMessengerChannels = {
  slack?: PersistedSlackChannel;
};

type SlackUser = {
  id?: unknown;
  name?: unknown;
  real_name?: unknown;
  is_bot?: unknown;
};

type SlackMessage = {
  ts?: unknown;
  text?: unknown;
  user?: unknown;
  bot_id?: unknown;
  subtype?: unknown;
};

type SlackConversationsHistoryResponse = {
  ok?: boolean;
  error?: string;
  messages?: SlackMessage[];
  has_more?: boolean;
};

type SlackUsersInfoResponse = {
  ok?: boolean;
  user?: SlackUser;
};

type SlackRoute = {
  routeKey: string;
  token: string;
  source: string;
  channelId: string;
};

type SlackReceiverConfig = {
  hasToken: boolean;
  hasSession: boolean;
  routes: SlackRoute[];
};

export type SlackReceiverStatus = {
  running: boolean;
  configured: boolean;
  enabled: boolean;
  routeCount: number;
  nextCursorCount: number;
  lastPollAt: number | null;
  lastForwardAt: number | null;
  lastMessageTs: string | null;
  lastError: string | null;
};

export type StartSlackReceiverOptions = {
  db: DatabaseSync;
  fetchImpl?: typeof fetch;
};

type ReceiverHandle = {
  stop: () => void;
  getStatus: () => SlackReceiverStatus;
};

const initialStatus = (): SlackReceiverStatus => ({
  running: false,
  configured: false,
  enabled: false,
  routeCount: 0,
  nextCursorCount: 0,
  lastPollAt: null,
  lastForwardAt: null,
  lastMessageTs: null,
  lastError: null,
});

let receiverHandle: ReceiverHandle | null = null;
const runtimeCursorByStatus = new WeakMap<SlackReceiverStatus, Map<string, string>>();

function cloneStatus(status: SlackReceiverStatus): SlackReceiverStatus {
  return { ...status };
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlackToken(value: unknown): string {
  const token = normalizeText(value);
  if (!token) return "";
  // Accept both Bot User OAuth token (xoxb-...) and App-level token
  return token;
}

function normalizeChannelId(value: unknown): string {
  let target = normalizeText(value);
  if (!target) return "";
  const lower = target.toLowerCase();
  const prefixes = ["slack:", "channel:", "chat:"];
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      target = target.slice(prefix.length).trim();
      break;
    }
  }
  return target;
}

function readMessengerChannels(db: DatabaseSync): PersistedMessengerChannels | null {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(MESSENGER_SETTINGS_KEY) as
      | { value: string }
      | undefined;
    if (!row) return null;
    return JSON.parse(row.value) as PersistedMessengerChannels;
  } catch {
    return null;
  }
}

function readSlackReceiverCursors(db: DatabaseSync): Map<string, string> {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(SLACK_RECEIVER_CURSOR_KEY) as
      | { value: string }
      | undefined;
    if (!row) return new Map();
    const parsed = JSON.parse(row.value) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function writeSlackReceiverCursors(db: DatabaseSync, cursors: Map<string, string>): void {
  const value = JSON.stringify(Object.fromEntries(cursors));
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(SLACK_RECEIVER_CURSOR_KEY, value);
}

function buildSlackConfig(db: DatabaseSync): SlackReceiverConfig {
  const channels = readMessengerChannels(db);
  const slack = channels?.slack;
  if (!slack) return { hasToken: false, hasSession: false, routes: [] };

  const rawToken = (slack as PersistedSlackChannel).token;
  const tokenKey = buildMessengerTokenKey("slack", "token");
  const decrypted = decryptMessengerTokenForRuntime(rawToken, tokenKey);
  const token = normalizeSlackToken(decrypted);
  if (!token) return { hasToken: false, hasSession: false, routes: [] };

  const sessions = (slack as PersistedSlackChannel).sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { hasToken: true, hasSession: false, routes: [] };
  }

  const routes: SlackRoute[] = [];
  for (const session of sessions as PersistedSession[]) {
    if (!session || typeof session !== "object") continue;
    if (session.enabled === false || session.enabled === 0) continue;
    const channelId = normalizeChannelId(session.targetId);
    if (!channelId) continue;

    const routeKey = buildMessengerTokenKey("slack", channelId);
    const source = buildMessengerSourceWithTokenHint("slack", channelId, token);
    routes.push({ routeKey, token, source, channelId });
  }

  return { hasToken: true, hasSession: routes.length > 0, routes };
}

async function forwardToInboxWithRetry(params: {
  fetchImpl: typeof fetch;
  body: string;
  attempt?: number;
}): Promise<void> {
  const { fetchImpl, body } = params;
  const attempt = params.attempt ?? 1;
  const res = await fetchImpl(`http://${OAUTH_BASE_HOST}:${PORT}/api/inbox`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-inbox-secret": INBOX_WEBHOOK_SECRET,
    },
    body,
  });
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  const err = new Error(`inbox forward failed (${res.status})${detail ? `: ${detail}` : ""}`);
  if (attempt >= INBOX_FORWARD_MAX_RETRIES) throw err;
  const backoffMs = INBOX_FORWARD_RETRY_BASE_MS * 2 ** (attempt - 1);
  await new Promise((resolve) => setTimeout(resolve, backoffMs));
  return forwardToInboxWithRetry({ fetchImpl, body, attempt: attempt + 1 });
}

async function resolveSlackUsername(
  token: string,
  userId: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  try {
    const r = await fetchImpl(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const payload = (await r.json().catch(() => null)) as SlackUsersInfoResponse | null;
    if (payload?.ok && payload.user) {
      const realName = normalizeText(payload.user.real_name);
      const name = normalizeText(payload.user.name);
      return realName || name || userId;
    }
  } catch {
    // fall through
  }
  return userId;
}

async function pollSlackRoute(params: {
  route: SlackRoute;
  cursors: Map<string, string>;
  fetchImpl: typeof fetch;
  status: SlackReceiverStatus;
}): Promise<number> {
  const { route, cursors, fetchImpl, status } = params;
  const { token, channelId, source, routeKey } = route;

  const lastTs = cursors.get(routeKey) ?? null;
  const url = new URL("https://slack.com/api/conversations.history");
  url.searchParams.set("channel", channelId);
  url.searchParams.set("limit", String(SLACK_FETCH_LIMIT));
  if (lastTs) url.searchParams.set("oldest", lastTs);

  const r = await fetchImpl(url.toString(), {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = (await r.json().catch(() => null)) as SlackConversationsHistoryResponse | null;

  if (!r.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? `slack history fetch failed (${r.status})`);
  }

  const messages = payload?.messages ?? [];
  // Slack returns newest first — reverse for chronological order
  const ordered = [...messages].reverse();

  let forwarded = 0;
  let latestTs = lastTs;

  for (const msg of ordered) {
    const ts = normalizeText(msg.ts);
    if (!ts) continue;
    // Skip if same or older than cursor
    if (lastTs && ts <= lastTs) continue;
    // Skip bot messages and system subtypes
    if (msg.bot_id || (msg.subtype && msg.subtype !== "bot_message")) continue;
    if (typeof msg.subtype === "string" && msg.subtype !== "") continue;

    const text = normalizeText(msg.text);
    if (!text) { latestTs = ts; continue; }

    // Skip "$" only directives
    const raw = text.trimStart();
    if (raw.startsWith("$") && !raw.slice(1).trim()) { latestTs = ts; continue; }

    const userId = normalizeText(msg.user);
    const author = userId ? await resolveSlackUsername(token, userId, fetchImpl) : "slack";

    await forwardToInboxWithRetry({
      fetchImpl,
      body: JSON.stringify({
        source,
        message_id: ts,
        author,
        chat: `slack:${channelId}`,
        text,
      }),
    });

    latestTs = ts;
    forwarded++;
    status.lastForwardAt = Date.now();
    status.lastMessageTs = ts;
  }

  if (latestTs && latestTs !== lastTs) {
    cursors.set(routeKey, latestTs);
  }

  return forwarded;
}

export async function pollSlackReceiverOnce(options: {
  db: DatabaseSync;
  status: SlackReceiverStatus;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const { db, status } = options;
  const fetchImpl = options.fetchImpl ?? fetch;

  status.lastPollAt = Date.now();

  const config = buildSlackConfig(db);
  status.configured = config.hasToken;
  status.enabled = config.hasSession;
  status.routeCount = config.routes.length;

  if (!config.routes.length) return;

  let cursors = runtimeCursorByStatus.get(status);
  if (!cursors) {
    cursors = readSlackReceiverCursors(db);
    runtimeCursorByStatus.set(status, cursors);
  }

  let totalForwarded = 0;
  for (const route of config.routes) {
    try {
      const n = await pollSlackRoute({ route, cursors, fetchImpl, status });
      totalForwarded += n;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[slack-receiver] route ${route.channelId}: ${msg}`);
      status.lastError = msg;
    }
  }

  if (totalForwarded > 0) {
    writeSlackReceiverCursors(db, cursors);
  }

  status.nextCursorCount = cursors.size;
}

export function startSlackReceiver(options: StartSlackReceiverOptions): ReceiverHandle {
  if (receiverHandle) {
    return receiverHandle;
  }

  const { db } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const status = initialStatus();
  status.running = true;

  let stopped = false;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => { void tick(); },
      Math.max(250, delayMs),
    );
    timer.unref?.();
  };

  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      await pollSlackReceiverOnce({ db, status, fetchImpl });
    } catch (err) {
      status.lastError = err instanceof Error ? err.message : String(err);
      logger.warn(`[AgentDesk] slack receiver error: ${status.lastError}`);
    } finally {
      busy = false;
      schedule(status.enabled ? SLACK_ACTIVE_DELAY_MS : SLACK_IDLE_DELAY_MS);
    }
  };

  schedule(2_000);

  receiverHandle = {
    stop() {
      stopped = true;
      status.running = false;
      status.enabled = false;
      runtimeCursorByStatus.delete(status);
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      receiverHandle = null;
    },
    getStatus() {
      return cloneStatus(status);
    },
  };

  return receiverHandle;
}

export function getSlackReceiverStatus(): SlackReceiverStatus {
  if (!receiverHandle) {
    return initialStatus();
  }
  return receiverHandle.getStatus();
}
