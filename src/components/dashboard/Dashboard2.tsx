import type { Agent, Category, Project } from "../../types";
import { useDashboardData } from "../../hooks/useDashboardData";
import CategoryBadge from "../project-selector/CategoryBadge";
import WelcomeScreen from "../onboarding/WelcomeScreen";
import ObjectivesPanel from "./ObjectivesPanel";
import RisksPanel from "./RisksPanel";
import GatesPanel from "./GatesPanel";
import OutputsPanel from "./OutputsPanel";
import TeamPanel from "./TeamPanel";

interface Dashboard2Props {
  project: Project | null;
  agents: Agent[];
  categories: Category[];
  onCreateProject: () => void;
}

function LoadingPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 flex-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-[var(--th-border)] rounded bg-[var(--th-bg-surface)] animate-pulse"
          style={{ minHeight: 200 }}
        />
      ))}
    </div>
  );
}

export default function Dashboard2({ project, agents, categories, onCreateProject }: Dashboard2Props) {
  if (!project) {
    return <WelcomeScreen onCreateProject={onCreateProject} />;
  }

  return <Dashboard2Inner project={project} agents={agents} categories={categories} onCreateProject={onCreateProject} />;
}

function Dashboard2Inner({
  project,
  agents,
  categories,
  onCreateProject: _onCreateProject,
}: {
  project: Project;
  agents: Agent[];
  categories: Category[];
  onCreateProject: () => void;
}) {
  const { objectives, risks, gates, outputs, loading, setObjectives, setRisks, setGates, setOutputs } =
    useDashboardData(project.id);


  const category = project.category_id ? categories.find((c) => c.id === project.category_id) : undefined;

  const completedObjectives = objectives.filter((o) => o.status === "completed").length;
  const openRisks = risks.filter((r) => r.status === "open").length;
  const passedGates = gates.filter((g) => g.status === "passed").length;
  const doneOutputs = outputs.filter((o) => o.status === "done").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* project_path 없는 프로젝트 경고 배너 */}
      {!project.project_path && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs border-b flex-shrink-0"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "var(--th-text)" }}
        >
          <span style={{ color: "#f59e0b" }}>⚠</span>
          <span>
            <strong style={{ color: "#f59e0b" }}>프로젝트 경로 미설정</strong>
            {" — AI 에이전트가 이 프로젝트를 실행하려면 로컬 폴더 경로가 필요합니다."}
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            설정 → 프로젝트 관리에서 지정하세요
          </span>
        </div>
      )}

      {/* 프로젝트 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--th-border)] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold truncate">{project.name}</h1>
            {category && (
              <CategoryBadge label={category.name_ko ?? category.name} color={category.color} />
            )}
          </div>
          {project.project_path && (
            <p className="text-[10px] font-mono text-[var(--th-text-muted)] truncate mt-0.5" title={project.project_path}>
              {project.project_path}
            </p>
          )}
        </div>

        {/* 요약 스탯 */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-[var(--th-bg-surface)] border border-[var(--th-border)] text-[var(--th-text-muted)]">
            목표 <strong className="text-[var(--th-text)] font-semibold">{completedObjectives}/{objectives.length}</strong>
          </span>
          <span className={[
            "px-2 py-0.5 rounded-full border",
            openRisks > 0
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-[var(--th-bg-surface)] border-[var(--th-border)] text-[var(--th-text-muted)]",
          ].join(" ")}>
            리스크 <strong className="font-semibold">{openRisks}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--th-bg-surface)] border border-[var(--th-border)] text-[var(--th-text-muted)]">
            게이트 <strong className="text-[var(--th-text)] font-semibold">{passedGates}/{gates.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--th-bg-surface)] border border-[var(--th-border)] text-[var(--th-text-muted)]">
            산출물 <strong className="text-[var(--th-text)] font-semibold">{doneOutputs}/{outputs.length}</strong>
          </span>
        </div>
      </div>

      {/* 4분면 그리드 */}
      {loading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4 flex-1 min-h-0 overflow-auto">
            <ObjectivesPanel
              projectId={project.id}
              objectives={objectives}
              onUpdate={setObjectives}
            />
            <RisksPanel
              projectId={project.id}
              risks={risks}
              onUpdate={setRisks}
            />
            <GatesPanel
              projectId={project.id}
              gates={gates}
              onUpdate={setGates}
            />
            <OutputsPanel
              projectId={project.id}
              outputs={outputs}
              onUpdate={setOutputs}
            />
          </div>

          {/* 팀 섹션 */}
          <div className="px-4 pb-4">
            <TeamPanel projectId={project.id} allAgents={agents} />
          </div>
        </>
      )}
    </div>
  );
}
