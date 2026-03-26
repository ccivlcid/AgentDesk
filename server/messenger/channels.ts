/**
 * Stub — messenger/channels has been removed (Chat/Messenger system deleted).
 * These no-op exports keep call sites compiling.
 */

export type MessengerChannel = string;

/** Always returns false — messenger removed. */
 
export function isMessengerChannel(_ch: string): boolean {
  return false;
}

/** Always returns false — messenger removed. */
 
export function isNativeMessengerChannel(_ch: string): boolean {
  return false;
}
