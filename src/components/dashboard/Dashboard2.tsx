import { useState } from "react";
import type { Agent, Category, Project } from "../../types";
import { useDashboardData } from "../../hooks/useDashboardData";
import CategoryBadge from "../project-selector/CategoryBadge";
import WelcomeScreen from "../onboarding/WelcomeScreen";
import ObjectivesPanel from "./ObjectivesPanel";
import RisksPanel from "./RisksPanel";
import GatesPanel from "./GatesPanel";
import OutputsPanel from "./OutputsPanel";
import TeamPanel from "./TeamPanel";
import AgentActivityPanel from "./AgentActivityPanel";
import TerminalPanel from "../TerminalPanel";

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
  const [skipped, setSkipped] = useState(false);

  if (!project) {
    if (!skipped) {
      return (
        <WelcomeScreen
          onCreateProject={onCreateProject}
          onSkip={() => setSkipped(true)}
        />
      );
    }
    /* 건너뛰기 후: 최소 빈 상태 */
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <p className="text-sm text-[var(--th-text-muted)] mb-4">아직 프로젝트가 없어요.</p>
        <button
          onClick={onCreateProject}
          className="text-xs px-4 py-2 bg-[var(--th-accent)] text-white rounded hover:opacity-90 transition-opacity"
        >
          + 첫 번째 프로젝트 만들기
        </button>
      </div>
    );
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
  const [selectedTerminal, setSelectedTerminal] = useState<{ taskId: string; agent: Agent } | null>(null);


  const category = project.category_id ? categories.find((c) => c.id === project.category_id) : undefined;

  const completedObjectives = objectives.filter((o) => o.status === "completed").length;
  const openRisks = risks.filter((r) => r.status === "open").length;
  const passedGates = gates.filter((g) => g.status === "passed").length;
  const doneOutputs = outputs.filter((o) => o.status === "done").length;

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* 프로젝트 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--th-border)", background: "var(--th-bg-elevated)" }}
      >
        {/* 브레드크럼 + 프로젝트명 */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] text-[var(--th-text-muted)]">대시보드</span>
          <span className="text-[11px] text-[var(--th-text-muted)]">/</span>
          <h1 className="text-[13px] font-semibold truncate">{project.name}</h1>
          {category && (
            <CategoryBadge label={category.name_ko ?? category.name} color={category.color} />
          )}
        </div>

        {/* 요약 스탯 */}
        <div className="hidden sm:flex items-center gap-1 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
            <span style={{ color: "#3b82f6" }}>●</span>
            목표 <strong className="font-semibold" style={{ color: "var(--th-text)" }}>{completedObjectives}/{objectives.length}</strong>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              background: openRisks > 0 ? "rgba(239,68,68,0.08)" : "var(--th-bg-surface)",
              border: `1px solid ${openRisks > 0 ? "rgba(239,68,68,0.3)" : "var(--th-border)"}`,
              color: openRisks > 0 ? "#ef4444" : "var(--th-text-muted)",
            }}>
            <span>⚠</span>
            리스크 <strong className="font-semibold">{openRisks}</strong>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
            <span style={{ color: "#8b5cf6" }}>✓</span>
            검토 <strong className="font-semibold" style={{ color: "var(--th-text)" }}>{passedGates}/{gates.length}</strong>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
            <span style={{ color: "#10b981" }}>■</span>
            결과물 <strong className="font-semibold" style={{ color: "var(--th-text)" }}>{doneOutputs}/{outputs.length}</strong>
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
          <div className="px-4 pb-2">
            <TeamPanel projectId={project.id} allAgents={agents} />
          </div>

          {/* 에이전트 활동 섹션 */}
          <div className="px-4 pb-4">
            <AgentActivityPanel
              projectId={project.id}
              allAgents={agents}
              onOpenTerminal={(taskId, agent) => setSelectedTerminal({ taskId, agent })}
            />
          </div>
        </>
      )}

      {/* 터미널 overlay */}
      {selectedTerminal && (
        <div
          className="absolute inset-0 z-50 flex items-stretch"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTerminal(null); }}
        >
          <div className="flex-1 m-4 rounded overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            <TerminalPanel
              taskId={selectedTerminal.taskId}
              task={undefined}
              agent={selectedTerminal.agent}
              agents={agents}
              onClose={() => setSelectedTerminal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
