import { lazy, Suspense, useEffect } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";

const AgentCli = lazy(() => import("../AgentCli"));

export default function CliWindow() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { cliInitialAgentId, clearCliInitialAgentId } = useUiStore();

  // Clear stale initialAgentId after this mount consumes it
  useEffect(() => {
    if (cliInitialAgentId) clearCliInitialAgentId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  const filteredAgents = currentProject && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  return (
    <AppWindow
      windowType="cli"
      title={t({ ko: "Agent CLI", en: "Agent CLI", ja: "Agent CLI", zh: "Agent CLI" })}
      emoji=">_"
      defaultWidth={720}
      defaultHeight={500}
    >
      <div style={{ height: "100%", overflow: "hidden" }}>
        <Suspense fallback={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
            <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        }>
          <AgentCli agents={filteredAgents} currentProject={currentProject} initialAgentId={cliInitialAgentId} />
        </Suspense>
      </div>
    </AppWindow>
  );
}
