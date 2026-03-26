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
      style={{ color: "#9CA3AF" }}
      title={t({
        ko: "클릭하여 CLI 변경",
        en: "Click to change CLI",
        ja: "クリックして CLI を変更",
        zh: "点击更改 CLI",
      })}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>{" "}
      {agent.cli_provider === "api" && agent.api_model
        ? `API: ${agent.api_model}`
        : agent.cli_model &&
            CLI_MODEL_OVERRIDE_PROVIDERS.includes(agent.cli_provider) &&
            agent.cli_provider !== "api"
          ? `${CLI_LABELS[agent.cli_provider] ?? agent.cli_provider} · ${agent.cli_model}${agent.cli_provider === "codex" && agent.cli_reasoning_level ? ` (${agent.cli_reasoning_level})` : ""}`
          : agent.cli_provider === "codex" && agent.cli_reasoning_level
            ? `${CLI_LABELS[agent.cli_provider] ?? agent.cli_provider} · (${agent.cli_reasoning_level})`
            : (CLI_LABELS[agent.cli_provider] ?? agent.cli_provider)}
      <span className="ml-0.5" style={{ color: "#9CA3AF" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </span>
    </button>
  );
}
