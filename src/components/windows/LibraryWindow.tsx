import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

const SkillsLibrary     = lazy(() => import("../SkillsLibrary"));
const AgentRulesLibrary = lazy(() => import("../AgentRulesLibrary"));
const MemoryLibrary     = lazy(() => import("../MemoryLibrary"));
const HooksLibrary      = lazy(() => import("../HooksLibrary"));
const Deliverables      = lazy(() => import("../deliverables/Deliverables"));
const TemplatesLibrary         = lazy(() => import("../templates-library/TemplatesLibrary"));
const AgentPerformanceDashboard = lazy(() => import("../performance/AgentPerformanceDashboard"));

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );
}

export default function LibraryWindow() {
  const { agents, libraryAgents, departments } = useAgentStore();
  const { currentProjectId, projects, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { t } = useI18n();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const allAgents = libraryAgents.length > 0 ? libraryAgents : agents;

  // 현재 프로젝트에 배정된 에이전트만 필터링
  const libAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? allAgents.filter((a) => projectAgentIds.has(a.id))
    : allAgents;

  return (
    <AppWindow
      windowType="library"
      title={t({ ko: "라이브러리", en: "Library", ja: "ライブラリ", zh: "库" })}
      emoji="📚"
      defaultWidth={860}
      defaultHeight={600}
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
        {
          id: "deliverables",
          label: t({ ko: "산출물", en: "Deliverables", ja: "成果物", zh: "交付物" }),
          content: (
            <Suspense fallback={<Loading />}>
              <Deliverables agents={libAgents} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "templates",
          label: t({ ko: "템플릿", en: "Templates", ja: "テンプレート", zh: "模板" }),
          content: (
            <Suspense fallback={<Loading />}>
              <TemplatesLibrary />
            </Suspense>
          ),
        },
        {
          id: "performance",
          label: t({ ko: "성과", en: "Performance", ja: "パフォーマンス", zh: "性能" }),
          content: (
            <Suspense fallback={<Loading />}>
              <AgentPerformanceDashboard />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
