/**
 * Stub — gateway/client has been removed (Chat/Messenger system deleted).
 * These no-op exports keep call sites compiling without behavioral changes.
 */

/** No-op: messenger delivery removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notifyTaskStatus(_taskId: string, _title: string, _status: string, _lang: string): void {
  /* removed */
}

/** No-op: messenger delivery removed. */
export async function sendDeliverableFiles(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _title: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _files: Array<{ absolutePath: string; fileName: string }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lang: string,
): Promise<void> {
  /* removed */
}

/** No-op: messenger sessions removed. */
export function listMessengerSessions(): never[] {
  return [];
}

/** No-op: messenger delivery removed. */
export async function sendMessengerMessage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts: { channel: string; targetId: string; text: string },
): Promise<void> {
  /* removed */
}

/** No-op: messenger delivery removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendMessengerSessionMessage(_sessionKey: string, _text: string): Promise<void> {
  /* removed */
}

/** No-op: Discord channel listing removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listDiscordChannelsByToken(_token: string): Promise<never[]> {
  return [];
}

/** MessengerChannel type stub. */
export type MessengerChannel = string;

/** No-op: decision inbox notification removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notifyDecisionInbox(_readyCount: number, _lang: string): void {
  /* removed */
}
