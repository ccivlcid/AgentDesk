import type { CliProvider, ProviderModelConfig } from "../../../types";
import { CLI_BASE } from "./constants";

/** settings의 providerModelConfig를 반영해 실제 실행할 명령어를 반환 */
export function buildCliCmd(provider: CliProvider, cfg?: ProviderModelConfig): string {
  const base = CLI_BASE[provider];
  if (!base) return provider;
  const model = cfg?.model;
  if (!model) return base;
  switch (provider) {
    case "claude":   return `claude --model ${model}`;
    case "codex":    return `codex -m ${model}`;
    case "gemini":   return `gemini -m ${model}`;
    case "opencode": return `opencode -m ${model}`;
    case "cursor":   return `cursor . --model ${model}`;
    default:         return base;
  }
}

export function makePtyId() {
  return `pty-${Math.random().toString(36).slice(2, 8)}`;
}
