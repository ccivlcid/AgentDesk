import type { MessengerChannel } from "../../messenger/channels.ts";
import { isMessengerChannel } from "../../messenger/channels.ts";
import { normalizeText } from "./normalize.ts";
import type { MessengerChannelConfig, MessengerRuntimeConfig, MessengerSession } from "./types.ts";
import { removeChannelPrefix } from "./transport-parse.ts";

export function normalizeComparableTarget(channel: MessengerChannel, targetId: string): string {
  return removeChannelPrefix(channel, normalizeText(targetId));
}

export function resolveSessionTokenForTarget(
  channel: MessengerChannel,
  channelConfig: MessengerChannelConfig,
  targetId: string,
): string {
  const target = normalizeComparableTarget(channel, targetId);
  if (!target) return channelConfig.token;
  for (const session of channelConfig.sessions) {
    if (!session.enabled) continue;
    const sessionTarget = normalizeComparableTarget(channel, session.targetId);
    if (sessionTarget !== target) continue;
    const sessionToken = normalizeText(session.token);
    if (sessionToken) return sessionToken;
  }
  return channelConfig.token;
}

export function resolveSessionFromKey(
  config: MessengerRuntimeConfig,
  sessionKey: string,
): { channel: MessengerChannel; session: MessengerSession } | null {
  const [channelRaw, ...rest] = sessionKey.split(":");
  const sessionId = rest.join(":").trim();
  if (!channelRaw || !sessionId) return null;
  const channel = normalizeText(channelRaw).toLowerCase();
  if (!isMessengerChannel(channel)) return null;
  const channelConfig = config[channel];
  if (!channelConfig) return null;
  const session = channelConfig.sessions.find((entry) => normalizeText(entry.id) === sessionId);
  if (!session) return null;
  return { channel, session };
}
