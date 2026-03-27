import type { DatabaseSync } from "node:sqlite";

export interface KickoffMeetingAgent {
  id: string;
  name: string;
  role: string | null;
  dept_name: string | null;
  projectRole: string | null;       // pm | pl | dev
  projectRoleLabel: string | null;  // 사용자 지정 역할명
  taskTitles: string[];             // 배정된 태스크 목록 (0개일 수 있음)
}

export type Lang = "ko" | "en" | "ja" | "zh";

export function readLang(db: DatabaseSync): Lang {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as { value: string } | undefined;
  if (!row) return "en";
  // Value may be a raw string ("ko") or a JSON-encoded string ('"ko"')
  const LANGS = new Set<string>(["ko", "en", "ja", "zh"]);
  try {
    const parsed = JSON.parse(row.value);
    const v = typeof parsed === "string" ? parsed : row.value;
    return LANGS.has(v) ? (v as Lang) : "en";
  } catch {
    return LANGS.has(row.value) ? (row.value as Lang) : "en";
  }
}

export function t(lang: Lang, texts: Record<Lang, string>): string {
  return texts[lang] ?? texts.en;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const VALID_TASK_TYPES = new Set([
  "general", "development", "design", "analysis", "presentation", "documentation",
]);

export const STANDARD_ROLE_LABEL: Record<string, string> = {
  pm: "PROJECT MANAGER",
  pl: "PROJECT LEAD",
  dev: "DEVELOPER",
};
