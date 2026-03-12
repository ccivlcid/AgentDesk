import { useCallback, useEffect, useMemo, useState } from "react";
import type { Agent, Category, Department, Project, ProjectObjective, Task } from "../../types";
import CategoryBadge from "../project-selector/CategoryBadge";
import WelcomeScreen from "../onboarding/WelcomeScreen";
import GettingStartedGuidePanel from "../onboarding/GettingStartedGuidePanel";
import DashboardGuidePanel from "./DashboardGuidePanel";
import TeamPanel from "./TeamPanel";
import AgentActivityPanel from "./AgentActivityPanel";
import TerminalPanel from "../TerminalPanel";
import { useI18n } from "../../i18n";
import { updateProject } from "../../api/organization-projects";
import ProjectSettingsTab from "../settings/ProjectSettingsTab";
import Modal, { ModalBody, ModalHeader } from "../ui/Modal";
import CreateTaskModal from "../taskboard/CreateTaskModal";
import { fetchProjectAgents, objectivesApi } from "../../api/categories-dashboard";
import ProjectManagerModal from "../ProjectManagerModal";
import ProjectFileTree from "./ProjectFileTree";
import DashboardTaskList from "./DashboardTaskList";

interface Dashboard2Props {
  project: Project | null;
  agents: Agent[];
  tasks?: Task[];
  departments: Department[];
  categories: Category[];
  onCreateProject: () => void;
  onGitHubImport?: () => void;
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
  onTeamChange?: () => void;
}

const DASHBOARD_GUIDE_STORAGE_KEY = "agentdesk.dashboardGuidePanel";

function readGuidePanelPreference(): boolean {
  try {
    const v = localStorage.getItem(DASHBOARD_GUIDE_STORAGE_KEY);
    if (v === null) return false; // 기본값: 패널 숨김 (깔끔한 대시보드)
    return v === "true";
  } catch {
    return false;
  }
}

export default function Dashboard2({
  project,
  agents,
  tasks = [],
  departments,
  categories,
  onCreateProject,
  onGitHubImport,
  onDeleteProject,
  onProjectUpdated,
  onGoToTasks,
  onCreateTask,
  onAssignTask,
  onTeamChange,
}: Dashboard2Props) {
  const [skipped, setSkipped] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [guidePanelOpen, setGuidePanelOpen] = useState(readGuidePanelPreference);
  const { t } = useI18n();

  const toggleGuidePanel = useCallback(() => {
    setGuidePanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DASHBOARD_GUIDE_STORAGE_KEY, next ? "true" : "false");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleGitHubImport = onGitHubImport ?? (() => setShowGitHubModal(true));

  if (!project) {
    const monoStyle: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
    return (
      <>
        <div
          className="flex flex-1 min-h-0 flex-col lg:flex-row"
          style={{ overflow: "hidden", gap: 0 }}
        >
          {/* 프로젝트 유형과 동일한 macOS 카드 (터미널 헤더 + 본문) */}
          <div
            style={{
              ...monoStyle,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              flex: 1,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {/* 터미널 헤더 (macOS) — 프로젝트 유형과 동일 */}
            <div
              style={{
                borderBottom: "1px solid var(--th-border)",
                padding: "12px 18px",
                background: "var(--th-bg-panel)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div className="flex flex-shrink-0 items-center gap-1.5" aria-hidden>
                <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
                <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
              </div>
              <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
              <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>agentdesk init</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "10px",
                  color: "var(--th-text-muted)",
                  background: "var(--th-bg-surface)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--th-border)",
                }}
              >
                0 {t({ ko: "프로젝트", en: "projects", ja: "プロジェクト", zh: "项目" })}
              </span>
              <button
                type="button"
                onClick={toggleGuidePanel}
                style={{
                  ...monoStyle,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--th-border)",
                  background: guidePanelOpen ? "var(--th-accent)" : "transparent",
                  color: guidePanelOpen ? "#000" : "var(--th-text-muted)",
                  fontSize: "10px",
                  fontWeight: guidePanelOpen ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title={guidePanelOpen ? t({ ko: "가이드 패널 숨기기", en: "Hide guide panel", ja: "ガイドを非表示", zh: "隐藏指南面板" }) : t({ ko: "가이드 패널 표시", en: "Show guide panel", ja: "ガイドを表示", zh: "显示指南面板" })}
              >
                {t({ ko: "가이드", en: "Guide", ja: "ガイド", zh: "指南" })}
              </button>
            </div>
            {/* 본문 (프로젝트 유형과 동일 패딩) */}
            <div style={{ flex: 1, overflow: "auto", background: "var(--th-bg-primary)", padding: "20px 18px 24px" }}>
              {!skipped ? (
                <WelcomeScreen
                  onCreateProject={onCreateProject}
                  onGitHubImport={handleGitHubImport}
                  onSkip={() => setSkipped(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-full text-center px-8 py-12">
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
              )}
            </div>
          </div>
          {guidePanelOpen && <GettingStartedGuidePanel />}
        </div>
        {showGitHubModal && (
          <ProjectManagerModal
            agents={agents}
            departments={departments}
            onClose={() => setShowGitHubModal(false)}
            onCreateProject={onCreateProject}
            initialGithubImportMode
          />
        )}
      </>
    );
  }


  return (
    <Dashboard2Inner
      project={project}
      agents={agents}
      tasks={tasks}
      departments={departments}
      categories={categories}
      onCreateProject={onCreateProject}
      onDeleteProject={onDeleteProject}
      onProjectUpdated={onProjectUpdated}
      onGoToTasks={onGoToTasks}
      onCreateTask={onCreateTask}
      onAssignTask={onAssignTask}
      onTeamChange={onTeamChange}
      guidePanelOpen={guidePanelOpen}
      onToggleGuidePanel={toggleGuidePanel}
    />
  );
}

function Dashboard2Inner({
  project,
  agents,
  tasks = [],
  departments,
  categories,
  onCreateProject,
  onDeleteProject,
  onProjectUpdated,
  onGoToTasks,
  onCreateTask,
  onAssignTask,
  onTeamChange,
  guidePanelOpen = false,
  onToggleGuidePanel,
}: {
  project: Project;
  agents: Agent[];
  tasks?: Task[];
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
  onTeamChange?: () => void;
  guidePanelOpen?: boolean;
  onToggleGuidePanel?: () => void;
}) {
  const [selectedTerminal, setSelectedTerminal] = useState<{ taskId: string; agent: Agent } | null>(null);
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskDefaultAgentId, setCreateTaskDefaultAgentId] = useState<string | undefined>(undefined);
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [objAddingTitle, setObjAddingTitle] = useState("");
  const [objShowInput, setObjShowInput] = useState(false);
  const [objBusy, setObjBusy] = useState(false);
  const [agentActivityCollapsed, setAgentActivityCollapsed] = useState(() => {
    try {
      return localStorage.getItem("agentdesk.dashboardAgentActivityCollapsed") === "true";
    } catch {
      return false;
    }
  });

  const { t } = useI18n();

  const toggleAgentActivityCollapsed = useCallback(() => {
    setAgentActivityCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("agentdesk.dashboardAgentActivityCollapsed", next ? "true" : "false");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // 프로젝트 팀 에이전트 목록 fetch
  const loadTeamAgents = useCallback(async () => {
    try {
      const res = await fetchProjectAgents(project.id);
      setTeamAgentIds(new Set(res.map((a) => a.id)));
    } catch { /* ignore */ }
  }, [project.id]);

  useEffect(() => {
    void loadTeamAgents();
  }, [loadTeamAgents]);

  // 목표 fetch
  const loadObjectives = useCallback(async () => {
    try {
      const res = await objectivesApi.list(project.id);
      setObjectives(res);
    } catch { /* ignore */ }
  }, [project.id]);

  useEffect(() => { void loadObjectives(); }, [loadObjectives]);

  const handleObjAdd = async () => {
    const title = objAddingTitle.trim();
    if (!title || objBusy) return;
    setObjBusy(true);
    try {
      const created = await objectivesApi.create(project.id, { title });
      setObjectives((prev) => [...prev, created]);
      setObjAddingTitle("");
      setObjShowInput(false);
    } finally {
      setObjBusy(false);
    }
  };

  const handleObjToggle = async (obj: ProjectObjective) => {
    const nextStatus: ProjectObjective["status"] = obj.status === "active" ? "completed" : "active";
    const updated = await objectivesApi.update(project.id, obj.id, { status: nextStatus });
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? updated : o)));
  };

  const handleObjDelete = async (id: string) => {
    await objectivesApi.delete(project.id, id);
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  };

  // 프로젝트에 배정된 에이전트만 필터 (새 업무 모달용)
  const projectAgents = useMemo(
    () => teamAgentIds.size > 0 ? agents.filter((a) => teamAgentIds.has(a.id)) : agents,
    [agents, teamAgentIds],
  );

  const category = project.category_id ? categories.find((c) => c.id === project.category_id) : undefined;
  const runningAgents = projectAgents.filter((a) => a.status === "working").length;
  const idleAgents = projectAgents.filter((a) => a.status === "idle" || a.status === "break").length;

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === project.id),
    [tasks, project.id],
  );
  const taskStats = useMemo(() => {
    // 진행 중인 상태 — review/in_progress/collaborating/planned 모두 "작업중"으로 분류
    const ACTIVE_STATUSES = new Set<Task["status"]>(["in_progress", "review", "collaborating", "planned"]);
    const isActive = (t: Task) => ACTIVE_STATUSES.has(t.status);
    return {
      done:        projectTasks.filter((t) => t.status === "done").length,
      in_progress: projectTasks.filter(isActive).length,
      cancelled:   projectTasks.filter((t) => t.status === "cancelled").length,
      waiting:     projectTasks.filter((t) => t.status === "pending" || t.status === "inbox").length,
    };
  }, [projectTasks]);


  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row">
      <div
        className="relative flex flex-col flex-1 min-h-0 overflow-hidden"
        style={{
          borderRadius: 10,
          border: "1px solid var(--th-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          background: "var(--th-bg-elevated)",
        }}
      >
      {/* ── 터미널 헤더 (macOS) — 프로젝트 유형과 동일 스타일 ── */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex flex-shrink-0 items-center gap-1.5" aria-hidden>
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
        </div>
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>
          dashboard/ --project &quot;{project.name}&quot;
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--th-text-muted)",
            background: "var(--th-bg-surface)",
            padding: "2px 8px",
            borderRadius: 6,
            border: "1px solid var(--th-border)",
          }}
        >
          {taskStats.in_progress} {t({ ko: "진행중", en: "active", ja: "進行中", zh: "进行中" })} · {taskStats.waiting} {t({ ko: "대기", en: "waiting", ja: "待機", zh: "等待" })}
        </span>
        <button
          onClick={() => setShowProjectSettingsModal(true)}
          style={{ ...mono, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" })}
        </button>
        <button
          onClick={onCreateProject}
          style={{ ...mono, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + {t({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}
        </button>
        {onCreateTask && (
          <button
            onClick={() => setShowCreateTask(true)}
            style={{ ...mono, padding: "4px 12px", borderRadius: 6, border: "none", background: "var(--th-accent)", color: "#000", fontSize: "10px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
          >
            + {t({ ko: "새 업무", en: "New Task", ja: "新規タスク", zh: "新建任务" })}
          </button>
        )}
        {onToggleGuidePanel && (
          <button
            type="button"
            onClick={onToggleGuidePanel}
            style={{
              ...mono,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--th-border)",
              background: guidePanelOpen ? "var(--th-accent)" : "transparent",
              color: guidePanelOpen ? "#000" : "var(--th-text-muted)",
              fontSize: "10px",
              fontWeight: guidePanelOpen ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title={guidePanelOpen ? t({ ko: "가이드 패널 숨기기", en: "Hide guide panel", ja: "ガイドを非表示", zh: "隐藏指南面板" }) : t({ ko: "가이드 패널 표시", en: "Show guide panel", ja: "ガイドを表示", zh: "显示指南面板" })}
          >
            {t({ ko: "가이드", en: "Guide", ja: "ガイド", zh: "指南" })}
          </button>
        )}
      </div>

      {/* ── 오버뷰 + 업무 보드 링크 ── */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", padding: "0 18px" }}
      >
        {onGoToTasks && (
          <button
            onClick={onGoToTasks}
            style={{ ...mono, fontSize: "11px", padding: "9px 16px", border: "none", borderBottom: "2px solid transparent", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer", marginLeft: "auto", opacity: 0.7 }}
          >
            {t({ ko: "업무 보드 →", en: "Task Board →", ja: "タスクボード →", zh: "任务看板 →" })}
          </button>
        )}
      </div>

      {/* ── 오버뷰 본문 ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden" style={{ background: "var(--th-bg-primary)", padding: "20px 18px 24px", gap: 10, display: "flex" }}>

          {/* ── 좌측 메인 컬럼 ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ gap: 10, display: "flex" }}>

            {/* 스탯 카드 row (고정) */}
            <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { key: "done",      label: t({ ko: "완료",   en: "Done",        ja: "完了",   zh: "完成" }),   color: "#4ade80",          count: taskStats.done },
                { key: "running",   label: t({ ko: "진행중", en: "In Progress",  ja: "進行中", zh: "进行中" }), color: "var(--th-accent)", count: taskStats.in_progress },
                { key: "cancelled", label: t({ ko: "취소",   en: "Cancelled",   ja: "取消",   zh: "取消" }),  color: "#f87171",          count: taskStats.cancelled },
                { key: "waiting",   label: t({ ko: "대기중", en: "Waiting",     ja: "待機中", zh: "等待中" }), color: "#94a3b8",          count: taskStats.waiting },
              ].map((stat) => (
                <div
                  key={stat.key}
                  style={{ background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <span style={{ ...mono, fontSize: "22px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                    {stat.count}
                  </span>
                  <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", fontWeight: 500 }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* 태스크 목록 카드 (고정 높이) */}
            <div style={{ flexShrink: 0, background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 220 }}>
              <DashboardTaskList
                tasks={projectTasks}
                agents={projectAgents}
                onGoToTasks={onGoToTasks}
                t={t}
                fillHeight
              />
            </div>

            {/* 에이전트 활동 카드 (접기/펴기, 상태 localStorage 유지) */}
            <div style={{ flex: 1, minHeight: 0, background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <button
                type="button"
                onClick={toggleAgentActivityCollapsed}
                style={{
                  ...mono,
                  width: "100%",
                  fontSize: "10px",
                  color: "var(--th-text-muted)",
                  padding: "8px 14px",
                  border: "none",
                  borderBottom: "1px solid var(--th-border)",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                  textAlign: "left",
                }}
                className="hover:opacity-90"
              >
                <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>$</span>
                <span>tail -f agent-activity.log</span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, opacity: 0.6 }}>
                  {t({ ko: "실시간", en: "live", ja: "ライブ", zh: "实时" })}
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
                </span>
                <span style={{ fontSize: "9px", opacity: 0.7 }}>
                  {agentActivityCollapsed ? t({ ko: "펴기", en: "Expand", ja: "展開", zh: "展开" }) + " ▼" : t({ ko: "접기", en: "Collapse", ja: "折りたたむ", zh: "折叠" }) + " ▲"}
                </span>
              </button>
              {!agentActivityCollapsed && (
                <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <AgentActivityPanel
                    projectId={project.id}
                    allAgents={agents}
                    onOpenTerminal={(taskId, agent) => setSelectedTerminal({ taskId, agent })}
                    onCreateTask={onCreateTask ? (agentId) => {
                      setCreateTaskDefaultAgentId(agentId);
                      setShowCreateTask(true);
                    } : undefined}
                    onManageTeam={() => setShowProjectSettingsModal(true)}
                  />
                </div>
              )}
            </div>

          </div>

          {/* ── 우측 사이드바 (독립 스크롤) ── */}
          <div
            className="flex-shrink-0 overflow-y-auto"
            style={{ width: 260, borderLeft: "1px solid var(--th-border)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 10 }}
          >
            {/* 목표 카드 */}
            <div style={{ background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", overflow: "hidden" }}>
              <div style={{ ...mono, display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--th-border)" }}>
                <span style={{ fontSize: "12px", color: "#3b82f6" }}>◎</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--th-text-secondary)", flex: 1 }}>
                  {t({ ko: "목표", en: "Objectives", ja: "目標", zh: "目标" })}
                </span>
                <span style={{ fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.6 }}>
                  {objectives.filter((o) => o.status === "completed").length}/{objectives.length}
                </span>
                <button
                  type="button"
                  onClick={() => setObjShowInput((v) => !v)}
                  style={{ ...mono, fontSize: "14px", fontWeight: 700, color: objShowInput ? "var(--th-accent)" : "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                  title={t({ ko: "목표 추가", en: "Add objective", ja: "目標追加", zh: "添加目标" })}
                >
                  {objShowInput ? "✕" : "+"}
                </button>
              </div>

              {objShowInput && (
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    type="text"
                    value={objAddingTitle}
                    onChange={(e) => setObjAddingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleObjAdd();
                      if (e.key === "Escape") { setObjShowInput(false); setObjAddingTitle(""); }
                    }}
                    placeholder={t({ ko: "목표 입력…", en: "Enter objective…", ja: "目標を入力…", zh: "输入目标…" })}
                    style={{ ...mono, flex: 1, fontSize: "11px", padding: "5px 8px", borderRadius: 6, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleObjAdd()}
                    disabled={objBusy}
                    style={{ ...mono, fontSize: "11px", fontWeight: 600, padding: "5px 10px", borderRadius: 6, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", color: "#3b82f6", cursor: "pointer" }}
                  >
                    {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
                  </button>
                </div>
              )}

              {objectives.length === 0 && !objShowInput ? (
                <div style={{ ...mono, padding: "14px", fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.4, textAlign: "center" }}>
                  {t({ ko: "목표 없음", en: "No objectives", ja: "目標なし", zh: "暂无目标" })}
                </div>
              ) : (
                <div>
                  {objectives.map((obj) => {
                    const done = obj.status === "completed";
                    const progress = obj.progress ?? 0;
                    return (
                      <div key={obj.id} className="group" style={{ padding: "8px 14px", borderBottom: "1px solid var(--th-border)", display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => void handleObjToggle(obj)}
                            style={{ flexShrink: 0, width: 14, height: 14, borderRadius: "50%", border: `2px solid ${done ? "#3fb950" : "#3b82f6"}`, background: done ? "#3fb950" : "transparent", cursor: "pointer", marginTop: 1 }}
                          />
                          <span style={{ ...mono, fontSize: "11px", color: done ? "var(--th-text-muted)" : "var(--th-text-secondary)", flex: 1, lineHeight: 1.5, textDecoration: done ? "line-through" : "none", wordBreak: "break-word" }}>
                            {obj.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleObjDelete(obj.id)}
                            className="opacity-0 group-hover:opacity-100"
                            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", fontSize: "10px", padding: 0 }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: done ? "#3fb950" : "#3b82f6", borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 팀 카드 */}
            <div style={{ background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", overflow: "hidden" }}>
              <TeamPanel projectId={project.id} allAgents={agents} onTeamChange={onTeamChange} />
            </div>

            {/* 파일트리 카드 */}
            {project.project_path && (
              <div style={{ background: "var(--th-bg-elevated)", borderRadius: 10, border: "1px solid var(--th-border)", overflow: "hidden" }}>
                <ProjectFileTree projectPath={project.project_path} />
              </div>
            )}
          </div>

        </div>

      {/* ── 프로젝트 설정 모달 ── */}
      <Modal open={showProjectSettingsModal} onClose={() => setShowProjectSettingsModal(false)} width="lg">
        <ModalHeader onClose={() => setShowProjectSettingsModal(false)}>
          {t({ ko: "프로젝트 설정", en: "Project Settings", ja: "プロジェクト設定", zh: "项目设置" })}
        </ModalHeader>
        <ModalBody>
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
              onDeleteProject?.(id);
              setShowProjectSettingsModal(false);
            }}
          />
        </ModalBody>
      </Modal>

      {/* ── 터미널 overlay ── */}
      {selectedTerminal && (
        <div
          className="absolute inset-0 z-50 flex items-stretch"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTerminal(null); }}
        >
          <div className="flex-1 m-4 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            <TerminalPanel
              taskId={selectedTerminal!.taskId}
              task={undefined}
              agent={selectedTerminal!.agent}
              agents={agents}
              onClose={() => setSelectedTerminal(null)}
            />
          </div>
        </div>
      )}

      {/* ── 새 업무 만들기 모달 ── */}
      {showCreateTask && onCreateTask && (
        <CreateTaskModal
          agents={projectAgents}
          departments={departments}
          onClose={() => { setShowCreateTask(false); setCreateTaskDefaultAgentId(undefined); }}
          onCreate={(input) => {
            onCreateTask?.({ ...input, project_id: project.id, project_path: project.project_path ?? undefined });
            setShowCreateTask(false);
            setCreateTaskDefaultAgentId(undefined);
          }}
          onAssign={onAssignTask ?? (() => {})}
          defaultProjectId={project.id}
          defaultAgentId={createTaskDefaultAgentId}
        />
      )}
      </div>
      {guidePanelOpen && <DashboardGuidePanel />}
    </div>
  );
}
