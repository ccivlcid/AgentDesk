import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

const AgentRepl = lazy(() => import("../AgentRepl"));

export default function ReplWindow() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  // 프로젝트가 선택돼있고 에이전트 목록이 로드됐으면 프로젝트 에이전트만, 아니면 전체
  const filteredAgents = currentProject && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  return (
    <AppWindow
      windowType="repl"
      title={t({ ko: "에이전트 REPL", en: "Agent REPL", ja: "エージェント REPL", zh: "代理 REPL" })}
      emoji=">_"
      defaultWidth={720}
      defaultHeight={500}
    >
      <div style={{ height: "100%", overflow: "hidden" }}>
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        }>
          <AgentRepl agents={filteredAgents} currentProject={currentProject} />
        </Suspense>
      </div>
    </AppWindow>
  );
}
