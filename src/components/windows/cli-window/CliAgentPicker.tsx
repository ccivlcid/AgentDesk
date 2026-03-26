import type { I18nContextValue } from "../../../i18n";
import type { Agent, Project, ProviderModelConfig } from "../../../types";
import { CLI_BASE } from "./constants";
import { buildCliCmd } from "./cliCommands";

interface CliAgentPickerProps {
  t: I18nContextValue["t"];
  filteredAgents: Agent[];
  currentProject: Project | null;
  providerModelConfig: Record<string, ProviderModelConfig>;
  onPickAgent: (id: string) => void;
}

export function CliAgentPicker({
  t,
  filteredAgents,
  currentProject,
  providerModelConfig,
  onPickAgent,
}: CliAgentPickerProps) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 40px",
      gap: 24,
      background: "var(--th-bg-primary)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontFamily: "var(--th-font-mono)", color: "var(--th-text-secondary)", letterSpacing: "0.08em", marginBottom: 6 }}>
          {">_"} {t({ ko: "에이전트 CLI", en: "Agent CLI", ja: "エージェントCLI", zh: "代理CLI" })}
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
          {t({ ko: "실행할 직원을 선택하세요", en: "Select an agent to run", ja: "実行するエージェントを選択", zh: "选择要运行的代理" })}
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div style={{ fontSize: 11, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", opacity: 0.5 }}>
          {t({ ko: "등록된 에이전트가 없습니다", en: "No agents registered", ja: "エージェントが登録されていません", zh: "没有注册的代理" })}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          width: "100%",
          maxWidth: 680,
          maxHeight: 360,
          overflowY: "auto",
        }}>
          {filteredAgents.map((agent) => {
            const cliCmd = CLI_BASE[agent.cli_provider];
            const isWorking = agent.status === "working";
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onPickAgent(agent.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  padding: "14px 16px",
                  background: "var(--th-bg-elevated)",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s, background 0.15s",
                  fontFamily: "var(--th-font-mono)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-elevated)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{ fontSize: 22 }}>{agent.avatar_emoji}</span>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: isWorking ? "#f59e0b" : agent.status === "idle" ? "#22c55e" : "#64748b",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)", lineHeight: 1.3 }}>
                  {agent.name}
                </span>
                {cliCmd && (
                  <span style={{ fontSize: 10, color: "var(--th-accent)", opacity: 0.8 }}>
                    {buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider])}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {currentProject && (
        <div style={{ fontSize: 10, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", letterSpacing: "0.04em", opacity: 0.5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {currentProject.name}
        </div>
      )}
    </div>
  );
}
