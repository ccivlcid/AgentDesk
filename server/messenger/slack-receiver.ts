/**
 * Stub — messenger/slack-receiver has been removed (Chat/Messenger system deleted).
 */

/** No-op: Slack receiver removed. */
 
export function startSlackReceiver(_opts: { db: unknown }): { stop: () => void } {
  return { stop: () => {} };
}

/** No-op status. */
export function getSlackReceiverStatus(): { running: false } {
  return { running: false };
}
