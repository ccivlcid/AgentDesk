import type { I18nContextValue } from "../../i18n";
import type { Agent } from "../../types";
import { AgentDetailCliEditorCodex } from "./AgentDetailCliEditorCodex";
import { AgentDetailCliEditorStandard } from "./AgentDetailCliEditorStandard";
import { AgentDetailCliSummaryButton } from "./AgentDetailCliSummaryButton";
import type { UseAgentDetailCliStateResult } from "./useAgentDetailCliState";

interface AgentDetailCliControlsProps {
  agent: Agent;
  t: I18nContextValue["t"];
  cli: UseAgentDetailCliStateResult;
}

export function AgentDetailCliControls({ agent, t, cli }: AgentDetailCliControlsProps) {
  const { editingCli, selectedCli } = cli;

  return (
    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
      {editingCli ? (
        selectedCli === "codex" ? (
          <AgentDetailCliEditorCodex t={t} cli={cli} />
        ) : (
          <AgentDetailCliEditorStandard t={t} cli={cli} />
        )
      ) : (
        <AgentDetailCliSummaryButton agent={agent} t={t} cli={cli} />
      )}
    </div>
  );
}
