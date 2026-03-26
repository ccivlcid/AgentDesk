import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import { useUiStore } from "../../store/uiStore";

const SkillsLibrary     = lazy(() => import("../SkillsLibrary"));
const AgentRulesLibrary = lazy(() => import("../AgentRulesLibrary"));
const MemoryLibrary     = lazy(() => import("../MemoryLibrary"));
const HooksLibrary      = lazy(() => import("../HooksLibrary"));

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "#9CA3AF" }}>
      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );
}

export default function LibraryWindow() {
  const { agents, libraryAgents, departments } = useAgentStore();
  const { currentProjectId, projects, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { t } = useI18n();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { toggleWindow } = useUiStore();
  const allAgents = libraryAgents.length > 0 ? libraryAgents : agents;

  // 현재 프로젝트에 배정된 에이전트만 필터링 (프로젝트가 선택되면 프로젝트 에이전트만 표시)
  const libAgents = currentProjectId && projectAgentsLoaded
    ? allAgents.filter((a) => projectAgentIds.has(a.id))
    : allAgents;

  const helpButton = (
    <button
      type="button"
      onClick={() => toggleWindow("library-guide")}
      title={t({ ko: "도움말", en: "Help", ja: "ヘルプ", zh: "帮助" })}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        border: "1px solid #E5E7EB",
        borderRadius: "50%",
        background: "transparent",
        color: "#9CA3AF",
        fontFamily: "var(--th-font-mono)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        lineHeight: 1,
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#3B82F6";
        (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E7EB";
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      ?
    </button>
  );

  return (
    <>
    <AppWindow
      windowType="library"
      title={t({ ko: "라이브러리", en: "Knowledge Library", ja: "ライブラリ", zh: "知识库" })}
      emoji="📚"
      defaultWidth={860}
      defaultHeight={600}

      headerActions={helpButton}
      tabs={[
        {
          id: "skills",
          label: t({ ko: "스킬", en: "Skills", ja: "スキル", zh: "技能" }),
          content: (
            <Suspense fallback={<Loading />}>
              <SkillsLibrary agents={libAgents} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "rules",
          label: t({ ko: "규칙", en: "Rules", ja: "ルール", zh: "规则" }),
          content: (
            <Suspense fallback={<Loading />}>
              <AgentRulesLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "memory",
          label: t({ ko: "메모리", en: "Memory", ja: "メモリ", zh: "记忆" }),
          content: (
            <Suspense fallback={<Loading />}>
              <MemoryLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "hooks",
          label: t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" }),
          content: (
            <Suspense fallback={<Loading />}>
              <HooksLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
      ]}
    />
    </>
  );
}

