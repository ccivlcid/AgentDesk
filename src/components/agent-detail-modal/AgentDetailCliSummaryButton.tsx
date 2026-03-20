import type { I18nContextValue } from "../../i18n";
import type { Agent } from "../../types";
import { CLI_LABELS } from "../agent-detail/constants";
import { CLI_MODEL_OVERRIDE_PROVIDERS } from "./constants";
import type { UseAgentDetailCliStateResult } from "./useAgentDetailCliState";

interface Props {
  agent: Agent;
  t: I18nContextValue["t"];
  cli: Pick<UseAgentDetailCliStateResult, "setEditingCli">;
}

export function AgentDetailCliSummaryButton({ agent, t, cli }: Props) {
  const { setEditingCli } = cli;

  return (
    <button
      type="button"
      onClick={() => setEditingCli(true)}
      className="flex items-center gap-1 transition-colors"
      style={{ color: "var(--th-text-muted)" }}
      title={t({
        ko: "클릭하여 CLI 변경",
        en: "Click to change CLI",
        ja: "クリックして CLI を変更",
        zh: "点击更改 CLI",
      })}
    >
      🔧{" "}
      {agent.cli_provider === "api" && agent.api_model
        ? `API: ${agent.api_model}`
        : agent.cli_model &&
            CLI_MODEL_OVERRIDE_PROVIDERS.includes(agent.cli_provider) &&
            agent.cli_provider !== "api"
          ? `${CLI_LABELS[agent.cli_provider] ?? agent.cli_provider} · ${agent.cli_model}${agent.cli_provider === "codex" && agent.cli_reasoning_level ? ` (${agent.cli_reasoning_level})` : ""}`
          : agent.cli_provider === "codex" && agent.cli_reasoning_level
            ? `${CLI_LABELS[agent.cli_provider] ?? agent.cli_provider} · (${agent.cli_reasoning_level})`
            : (CLI_LABELS[agent.cli_provider] ?? agent.cli_provider)}
      <span className="text-[9px] ml-0.5" style={{ color: "var(--th-text-muted)" }}>
        ✏️
      </span>
    </button>
  );
}
