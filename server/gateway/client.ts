/**
 * Stub — gateway/client has been removed (Chat/Messenger system deleted).
 * These no-op exports keep call sites compiling without behavioral changes.
 */

/** No-op: messenger delivery removed. */
 
export function notifyTaskStatus(_taskId: string, _title: string, _status: string, _lang: string): void {
  /* removed */
}

/** No-op: messenger delivery removed. */
export async function sendDeliverableFiles(
   
  _title: string,
   
  _files: Array<{ absolutePath: string; fileName: string }>,
   
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
   
  _opts: { channel: string; targetId: string; text: string },
): Promise<void> {
  /* removed */
}

/** No-op: messenger delivery removed. */
 
export async function sendMessengerSessionMessage(_sessionKey: string, _text: string): Promise<void> {
  /* removed */
}

/** No-op: Discord channel listing removed. */
 
export async function listDiscordChannelsByToken(_token: string): Promise<never[]> {
  return [];
}

/** MessengerChannel type stub. */
export type MessengerChannel = string;

/** No-op: decision inbox notification removed. */
 
export function notifyDecisionInbox(_readyCount: number, _lang: string): void {
  /* removed */
}
