/**
 * Stub — messenger/slack-receiver has been removed (Chat/Messenger system deleted).
 */

/** No-op: Slack receiver removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function startSlackReceiver(_opts: { db: unknown }): { stop: () => void } {
  return { stop: () => {} };
}

/** No-op status. */
export function getSlackReceiverStatus(): { running: false } {
  return { running: false };
}
