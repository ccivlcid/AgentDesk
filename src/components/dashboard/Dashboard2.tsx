import { useEffect, useState } from "react";
import type { Agent, Category, Department, Project } from "../../types";
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
import { useI18n } from "../../i18n";
import { useConfirm, useToast } from "../ui";
import { updateProject, deleteProject } from "../../api/organization-projects";
import CategoriesTab from "../settings/CategoriesTab";
import ProjectSettingsTab from "../settings/ProjectSettingsTab";
import CreateTaskModal from "../taskboard/CreateTaskModal";

type DashTab = "overview" | "settings" | "categories";

interface Dashboard2Props {
  project: Project | null;
  agents: Agent[];
  departments: Department[];
  categories: Category[];
  onCreateProject: () => void;
  onDeleteProject?: (id: string) => void;
  onProjectUpdated?: (id: string, patch: { name: string; core_goal: string }) => void;
  onGoToTasks?: () => void;
  onCreateTask?: (input: {
    title: string;
    description?: string;
    department_id?: string;
    task_type?: string;
    priority?: number;
    project_id?: string;
    project_path?: string;
    assigned_agent_id?: string;
  }) => void;
  onAssignTask?: (taskId: string, agentId: string) => void;
}

function LoadingPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 flex-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-[var(--th-border)] bg-[var(--th-bg-surface)] animate-pulse"
          style={{ minHeight: 200 }}
        />
      ))}
    </div>
  );
}

export default function Dashboard2({
  project,
  agents,
  departments,
  categories,
  onCreateProject,
  onDeleteProject,
  onProjectUpdated,
  onGoToTasks,
  onCreateTask,
  onAssignTask,
}: Dashboard2Props) {
  const [skipped, setSkipped] = useState(false);
  const { t } = useI18n();

  if (!project) {
    if (!skipped) {
      return (
        <WelcomeScreen
          onCreateProject={onCreateProject}
          onSkip={() => setSkipped(true)}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <p className="text-sm mb-4" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "아직 프로젝트가 없어요.", en: "No projects yet.", ja: "まだプロジェクトがありません。", zh: "暂无项目。" })}
        </p>
        <button
          onClick={onCreateProject}
          className="text-xs px-4 py-2 hover:opacity-90 transition-opacity"
          style={{ background: "var(--th-accent)", color: "#000", borderRadius: 0 }}
        >
          {t({ ko: "+ 첫 번째 프로젝트 만들기", en: "+ Create first project", ja: "+ 最初のプロジェクトを作成", zh: "+ 创建第一个项目" })}
        </button>
      </div>
    );
  }

  return (
    <Dashboard2Inner
      project={project}
      agents={agents}
      departments={departments}
      categories={categories}
      onCreateProject={onCreateProject}
      onDeleteProject={onDeleteProject}
      onProjectUpdated={onProjectUpdated}
      onGoToTasks={onGoToTasks}
      onCreateTask={onCreateTask}
      onAssignTask={onAssignTask}
    />
  );
}

function Dashboard2Inner({
  project,
  agents,
  departments,
  categories,
  onDeleteProject,
  onProjectUpdated,
  onGoToTasks,
  onCreateTask,
  onAssignTask,
}: {
  project: Project;
  agents: Agent[];
  departments: Department[];
  categories: Category[];
  onCreateProject: () => void;
  onDeleteProject?: (id: string) => void;
  onProjectUpdated?: (id: string, patch: { name: string; core_goal: string }) => void;
  onGoToTasks?: () => void;
  onCreateTask?: (input: {
    title: string;
    description?: string;
    department_id?: string;
    task_type?: string;
    priority?: number;
    project_id?: string;
    project_path?: string;
    assigned_agent_id?: string;
  }) => void;
  onAssignTask?: (taskId: string, agentId: string) => void;
}) {
  const { objectives, risks, gates, outputs, loading, setObjectives, setRisks, setGates, setOutputs } =
    useDashboardData(project.id);
  const [selectedTerminal, setSelectedTerminal] = useState<{ taskId: string; agent: Agent } | null>(null);
  const [dashTab, setDashTab] = useState<DashTab>("overview");
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { t } = useI18n();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const category = project.category_id ? categories.find((c) => c.id === project.category_id) : undefined;

  useEffect(() => {
    setDashTab("overview");
    setGuideDismissed(false);
  }, [project.id]);

  const handleDeleteProject = async () => {
    const ok = await confirm({
      title: t({ ko: `"${project.name}" 프로젝트를 삭제할까요?`, en: `Delete "${project.name}"?`, ja: `「${project.name}」を削除しますか？`, zh: `删除"${project.name}"？` }),
      message: t({ ko: "모든 업무·목표·결과물이 영구 삭제됩니다. 되돌릴 수 없습니다.", en: "All tasks, objectives, and outputs will be permanently deleted. This cannot be undone.", ja: "すべてのタスク・目標・成果物が永久に削除されます。", zh: "所有任务、目标和交付物将被永久删除，无法撤销。" }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteProject(project.id);
      onDeleteProject?.(project.id);
    } catch {
      showToast(t({ ko: "프로젝트 삭제 실패", en: "Failed to delete project.", ja: "削除に失敗しました。", zh: "删除失败。" }), "error");
    }
  };

  const completedObjectives = objectives.filter((o) => o.status === "completed").length;
  const openRisks = risks.filter((r) => r.status === "open").length;
  const passedGates = gates.filter((g) => g.status === "passed").length;
  const doneOutputs = outputs.filter((o) => o.status === "done").length;

  const showGuide = !loading && !guideDismissed && dashTab === "overview" &&
    objectives.length === 0 && gates.length === 0 && outputs.length === 0;

  const tabItems: { key: DashTab; label: string }[] = [
    { key: "overview", label: t({ ko: "개요", en: "Overview", ja: "概要", zh: "概览" }) },
    { key: "settings", label: t({ ko: "프로젝트 설정", en: "Project Settings", ja: "プロジェクト設定", zh: "项目设置" }) },
    { key: "categories", label: t({ ko: "프로젝트 유형", en: "Project Types", ja: "プロジェクトタイプ", zh: "项目类型" }) },
  ];

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
      >
        {/* 프로젝트명 + core_goal */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
              DASHBOARD
            </span>
            <span className="text-[10px]" style={{ color: "var(--th-border)" }}>·</span>
            <h1 className="text-[13px] font-semibold truncate">{project.name}</h1>
            {category && (
              <CategoryBadge label={category.name_ko ?? category.name} color={category.color} />
            )}
          </div>
          {project.core_goal && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--th-text-muted)", fontStyle: "italic" }}>
              {project.core_goal}
            </p>
          )}
        </div>

        {/* 스탯 (개요 탭에서만) */}
        {dashTab === "overview" && (
          <div className="hidden sm:flex items-center gap-1 text-[10px]">
            {[
              { color: "#3b82f6", icon: "●", label: t({ ko: "목표", en: "Goals", ja: "目標", zh: "目标" }), val: `${completedObjectives}/${objectives.length}` },
              { color: openRisks > 0 ? "#ef4444" : undefined, icon: "⚠", label: t({ ko: "리스크", en: "Risks", ja: "リスク", zh: "风险" }), val: String(openRisks) },
              { color: "#8b5cf6", icon: "✓", label: t({ ko: "검토", en: "Gates", ja: "ゲート", zh: "审查" }), val: `${passedGates}/${gates.length}` },
              { color: "#10b981", icon: "■", label: t({ ko: "결과물", en: "Outputs", ja: "成果物", zh: "交付物" }), val: `${doneOutputs}/${outputs.length}` },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1 px-2 py-0.5"
                style={{
                  background: s.color === "#ef4444" && openRisks > 0 ? "rgba(239,68,68,0.08)" : "var(--th-bg-surface)",
                  border: `1px solid ${s.color === "#ef4444" && openRisks > 0 ? "rgba(239,68,68,0.3)" : "var(--th-border)"}`,
                  color: s.color && openRisks > 0 && s.icon === "⚠" ? s.color : "var(--th-text-muted)",
                }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                {s.label} <strong className="font-semibold" style={{ color: "var(--th-text)" }}>{s.val}</strong>
              </span>
            ))}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {dashTab === "overview" && onCreateTask && (
            <button
              onClick={() => setShowCreateTask(true)}
              style={{
                padding: "4px 10px",
                borderRadius: "2px",
                border: "1px solid var(--th-accent)",
                background: "rgba(245,158,11,0.1)",
                color: "var(--th-accent)",
                fontFamily: "var(--th-font-mono)",
                fontSize: "0.65rem",
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              + {t({ ko: "새 업무", en: "New Task", ja: "新規タスク", zh: "新建任务" })}
            </button>
          )}
          {dashTab === "overview" && onGoToTasks && (
            <button
              onClick={onGoToTasks}
              style={{
                padding: "4px 10px",
                borderRadius: "2px",
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-surface)",
                color: "var(--th-text-secondary)",
                fontFamily: "var(--th-font-mono)",
                fontSize: "0.65rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t({ ko: "업무 보드 →", en: "Task Board →", ja: "タスクボード →", zh: "任务看板 →" })}
            </button>
          )}
        </div>
      </div>

      {/* 탭 바 */}
      <div
        className="flex items-center gap-0 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", paddingLeft: "16px" }}
      >
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDashTab(tab.key)}
            className="text-[11px] font-mono px-4 py-2 transition-colors"
            style={{
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: dashTab === tab.key ? "2px solid var(--th-accent)" : "2px solid transparent",
              color: dashTab === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              background: "none",
              cursor: "pointer",
              fontWeight: dashTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {dashTab === "overview" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 왼쪽: 메인 콘텐츠 */}
          <div className="flex-1 flex flex-col min-w-0 overflow-auto">
            {/* Getting Started 가이드 */}
            {showGuide && (
              <div
                className="mx-4 mt-3 flex-shrink-0"
                style={{
                  borderRadius: "2px",
                  border: "1px solid var(--th-border-accent)",
                  background: "var(--th-amber-glow)",
                }}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold font-mono" style={{ color: "var(--th-accent)" }}>
                    ▶ {t({ ko: "시작하는 방법", en: "Getting Started", ja: "始め方", zh: "如何开始" })}
                  </p>
                  <button
                    onClick={() => setGuideDismissed(true)}
                    style={{ fontSize: "0.6rem", color: "var(--th-text-muted)", cursor: "pointer", background: "none", border: "none" }}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-4 pb-3 flex flex-col gap-1.5 text-[11px]" style={{ color: "var(--th-text-secondary)" }}>
                  {[
                    t({ ko: "① 상단 '+ 새 업무' 버튼을 눌러 AI에게 시킬 작업을 등록하세요.", en: "① Click '+ New Task' above to register a task for your AI agent.", ja: "① 上部の「+ 新規タスク」ボタンでAIに作業を登録します。", zh: "① 点击上方 '+ 新建任务' 为 AI 注册任务。" }),
                    t({ ko: "② 업무에 에이전트(AI 작업자)를 할당하세요.", en: "② Assign an agent (AI worker) to the task.", ja: "② タスクにエージェント（AI作業者）を割り当てます。", zh: "② 为任务分配代理（AI 工作者）。" }),
                    t({ ko: "③ ▶ 실행 버튼을 누르면 AI가 프로젝트 폴더에서 자동으로 작업합니다.", en: "③ Press ▶ Run — the AI agent works automatically in your project folder.", ja: "③ ▶ 実行を押すとAIがプロジェクトフォルダで自動作業します。", zh: "③ 按 ▶ 运行，AI 将在项目文件夹中自动工作。" }),
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span>{step}</span>
                    </div>
                  ))}
                  {onCreateTask && (
                    <button
                      onClick={() => { setShowCreateTask(true); setGuideDismissed(true); }}
                      className="self-start mt-1 text-[10px] font-mono px-3 py-1.5 hover:opacity-80 transition-opacity"
                      style={{ borderRadius: 0, background: "var(--th-accent)", color: "#000", border: "none", cursor: "pointer", fontWeight: 600 }}
                    >
                      {t({ ko: "+ 첫 번째 업무 만들기 →", en: "+ Create first task →", ja: "+ 最初のタスクを作成 →", zh: "+ 创建第一个任务 →" })}
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-3 p-4 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border border-[var(--th-border)] bg-[var(--th-bg-surface)] animate-pulse"
                    style={{ minHeight: 200 }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 flex-1 min-h-0">
                <ObjectivesPanel projectId={project.id} objectives={objectives} onUpdate={setObjectives} />
                <RisksPanel projectId={project.id} risks={risks} onUpdate={setRisks} />
                <GatesPanel projectId={project.id} gates={gates} onUpdate={setGates} />
                <OutputsPanel projectId={project.id} outputs={outputs} onUpdate={setOutputs} />
              </div>
            )}
          </div>

          {/* 오른쪽: 사이드바 (팀 + 에이전트 활동) */}
          <div
            className="w-[260px] flex-shrink-0 flex flex-col overflow-y-auto"
            style={{ borderLeft: "1px solid var(--th-border)" }}
          >
            <TeamPanel projectId={project.id} allAgents={agents} />
            <AgentActivityPanel
              projectId={project.id}
              allAgents={agents}
              onOpenTerminal={(taskId, agent) => setSelectedTerminal({ taskId, agent })}
            />
          </div>
        </div>
      )}

      {/* 프로젝트 설정 탭 */}
      {dashTab === "settings" && (
        <div className="flex-1 overflow-auto p-6 max-w-lg">
          <ProjectSettingsTab
            project={project}
            categories={categories}
            t={t}
            onUpdate={async (patch) => {
              await updateProject(project.id, patch);
              if (patch.name !== undefined || patch.core_goal !== undefined) {
                onProjectUpdated?.(project.id, {
                  name: patch.name ?? project.name,
                  core_goal: patch.core_goal ?? project.core_goal ?? "",
                });
              }
            }}
            onDelete={(id) => {
              void handleDeleteProject();
              void id;
            }}
          />
        </div>
      )}

      {/* 프로젝트 유형 탭 */}
      {dashTab === "categories" && (
        <div className="flex-1 overflow-auto p-4">
          <CategoriesTab />
        </div>
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

      {/* 새 업무 만들기 모달 */}
      {showCreateTask && onCreateTask && (
        <CreateTaskModal
          agents={agents}
          departments={departments}
          onClose={() => setShowCreateTask(false)}
          onCreate={(input) => {
            onCreateTask({ ...input, project_id: project.id, project_path: project.project_path ?? undefined });
            setShowCreateTask(false);
          }}
          onAssign={onAssignTask ?? (() => {})}
          defaultProjectId={project.id}
        />
      )}
    </div>
  );
}
