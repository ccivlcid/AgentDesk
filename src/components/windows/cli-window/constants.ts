import type { CliProvider } from "../../../types";

/** 모델 플래그 없는 기본 CLI 커맨드 (표시용) */
export const CLI_BASE: Partial<Record<CliProvider, string>> = {
  claude:      "claude",
  codex:       "codex",
  gemini:      "gemini",
  opencode:    "opencode",
  copilot:     "copilot",
  antigravity: "antigravity",
  cursor:      "cursor .",
};

export const FREE_MODE_NOTICE_STORAGE_KEY = "agentdesk.cli.free_mode_notice_dismissed";
