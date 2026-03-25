/**
 * Stub — messenger/token-crypto has been removed (Chat/Messenger system deleted).
 * These pass-through exports keep settings-stats.ts compiling.
 */

/** Pass-through: no encryption needed without messenger. */
export function decryptMessengerChannelsForClient(parsed: unknown): unknown {
  return parsed;
}

/** Pass-through: no encryption needed without messenger. */
export function encryptMessengerChannelsForStorage(value: unknown): unknown {
  return value;
}
