import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SETTINGS_DIR = join(homedir(), ".agentdesk");
const SETTINGS_FILE = join(SETTINGS_DIR, "cli-settings.json");

export interface CliSettings {
  language?: "en" | "ko";
}

export function loadCliSettings(): CliSettings {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8")) as CliSettings;
  } catch {
    return {};
  }
}

export function saveCliSettings(settings: CliSettings): void {
  try {
    mkdirSync(SETTINGS_DIR, { recursive: true });
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
    // best-effort
  }
}
