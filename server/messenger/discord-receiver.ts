/**
 * Stub — messenger/discord-receiver has been removed (Chat/Messenger system deleted).
 */

/** No-op: Discord receiver removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function startDiscordReceiver(_opts: { db: unknown }): { stop: () => void } {
  return { stop: () => {} };
}

/** No-op status. */
export function getDiscordReceiverStatus(): { running: false } {
  return { running: false };
}
