import type { Agent, ReasoningLevelOption } from "../../types";

export const CLI_MODEL_OVERRIDE_PROVIDERS: Agent["cli_provider"][] = [
  "claude",
  "codex",
  "gemini",
  "opencode",
  "cursor",
];

export const CODEX_REASONING_FALLBACK_OPTIONS: ReasoningLevelOption[] = [
  { effort: "low", description: "Faster, lower depth" },
  { effort: "medium", description: "Balanced default" },
  { effort: "high", description: "Higher reasoning depth" },
  { effort: "xhigh", description: "Maximum reasoning depth" },
];
