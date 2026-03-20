import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const WAKE_DEBOUNCE_DEFAULT_MS = 12_000;
export const SETTINGS_CACHE_TTL_MS = 3_000;
export const MESSENGER_SETTINGS_KEY = "messengerChannels";
export const SIGNAL_RPC_TIMEOUT_MS = 10_000;
export const DISCORD_CHANNEL_LIST_GUILD_LIMIT = 100;
export const DISCORD_TEXT_CHANNEL_TYPES = new Set<number>([0, 5, 10, 11, 12]);


export const execFileAsync = promisify(execFile);
