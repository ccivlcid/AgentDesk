import { useCallback, useEffect, useMemo, useState } from "react";
import type { Agent, Category, Department, Project, ProjectObjective, Task } from "../../types";
import CategoryBadge from "../project-selector/CategoryBadge";
import WelcomeScreen from "../onboarding/WelcomeScreen";
import TeamPanel from "./TeamPanel";
import AgentActivityPanel from "./AgentActivityPanel";
import TerminalPanel from "../TerminalPanel";
import { useI18n } from "../../i18n";
import { updateProject } from "../../api/organization-projects";
import ProjectSettingsTab from "../settings/ProjectSettingsTab";
import CreateTaskModal from "../taskboard/CreateTaskModal";
import { fetchProjectAgents, objectivesApi } from "../../api/categories-dashboard";

type DashTab = "overview" | "settings";

interface Dashboard2Props {
  project: Project | null;
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
}

export default function Dashboard2({
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
}) {
  const [selectedTerminal, setSelectedTerminal] = useState<{ taskId: string; agent: Agent } | null>(null);
  const [dashTab, setDashTab] = useState<DashTab>("overview");
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskDefaultAgentId, setCreateTaskDefaultAgentId] = useState<string | undefined>(undefined);
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [objAddingTitle, setObjAddingTitle] = useState("");
  const [objShowInput, setObjShowInput] = useState(false);
  const [objBusy, setObjBusy] = useState(false);

  const { t } = useI18n();

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
  const runningAgents = agents.filter((a) => a.status === "working").length;
  const idleAgents = agents.filter((a) => a.status === "idle" || a.status === "break").length;

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === project.id),
    [tasks, project.id],
  );
  const taskStats = useMemo(() => ({
    done:        projectTasks.filter((t) => t.status === "done").length,
    in_progress: projectTasks.filter((t) => t.status === "in_progress" || t.status === "review" || t.status === "collaborating").length,
    failed:      projectTasks.filter((t) => t.status === "cancelled").length,
    waiting:     projectTasks.filter((t) => t.status === "inbox" || t.status === "planned" || t.status === "pending").length,
    total:       projectTasks.length,
  }), [projectTasks]);

  useEffect(() => {
    setDashTab("overview");
  }, [project.id]);

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const tabItems: { key: DashTab; label: string }[] = [
    { key: "overview", label: "OVERVIEW" },
    { key: "settings", label: "PROJECT SETTINGS" },
  ];

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* ── 헤더 바 ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderLeft: "3px solid var(--th-accent)" }}
      >
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
              DASHBOARD
            </span>
            <span style={{ color: "var(--th-border)", fontSize: "10px" }}>▸</span>
            <h1 style={{ ...mono, fontSize: "12px", fontWeight: 700, color: "var(--th-text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.name}
            </h1>
            {category && (
              <CategoryBadge label={category.name_ko ?? category.name} color={category.color} />
            )}
            {/* quick stats */}
            <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
              <span style={{ color: runningAgents > 0 ? "var(--th-accent)" : "var(--th-text-muted)" }}>
                {runningAgents > 0 ? "●" : "○"} {runningAgents} RUNNING
              </span>
              <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
              <span style={{ opacity: 0.6 }}>{idleAgents} IDLE</span>
              <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
              <span style={{ opacity: 0.5 }}>{dateStr} {timeStr}</span>
            </span>
          </div>
          {project.core_goal && (
            <p style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--th-accent)", opacity: 0.7 }}>▶</span>{" "}
              {project.core_goal}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onCreateProject}
            title={t({ ko: "새 프로젝트 만들기", en: "New project", ja: "新規プロジェクト", zh: "新建项目" })}
            style={{ ...mono, padding: "4px 8px", borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", fontSize: "0.65rem", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + PROJECT
          </button>
          {dashTab === "overview" && onCreateTask && (
            <button
              onClick={() => setShowCreateTask(true)}
              style={{ ...mono, padding: "4px 10px", borderRadius: 0, border: "1px solid var(--th-accent)", background: "rgba(245,158,11,0.1)", color: "var(--th-accent)", fontSize: "0.65rem", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
            >
              + {t({ ko: "새 업무", en: "NEW TASK", ja: "新規タスク", zh: "新建任务" })}
            </button>
          )}
          {dashTab === "overview" && onGoToTasks && (
            <button
              onClick={onGoToTasks}
              style={{ ...mono, padding: "4px 10px", borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", fontSize: "0.65rem", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {t({ ko: "업무 보드 →", en: "TASK BOARD →", ja: "タスクボード →", zh: "任务看板 →" })}
            </button>
          )}
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div
        className="flex items-center gap-0 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", paddingLeft: "12px" }}
      >
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDashTab(tab.key)}
            style={{
              ...mono,
              fontSize: "10px",
              padding: "7px 14px",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "1px solid var(--th-border)",
              borderBottom: dashTab === tab.key ? "2px solid var(--th-accent)" : "2px solid transparent",
              color: dashTab === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              background: dashTab === tab.key ? "var(--th-bg-elevated)" : "none",
              cursor: "pointer",
              fontWeight: dashTab === tab.key ? 700 : 400,
              letterSpacing: "0.05em",
              transition: "color 0.1s linear, border-color 0.1s linear",
            }}
          >
            {dashTab === tab.key ? `▸ ${tab.label}` : `  ${tab.label}`}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW 탭 ── */}
      {dashTab === "overview" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* 상단: 메인 + 팀 패널 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 메인 영역 */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* 터미널 상태 블록 */}
            <div
              className="flex-shrink-0 px-4 py-3"
              style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
            >
              {/* prompt line */}
              <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>$</span>
                <span> agentdesk status </span>
                <span style={{ color: "var(--th-accent)" }}>{project.name}</span>
                <span style={{ marginLeft: "auto", opacity: 0.4, fontSize: "9px" }}>pid:{project.id.slice(0, 8)}</span>
              </div>

              {/* output grid */}
              <div style={{ ...mono, fontSize: "11px", lineHeight: 2, display: "grid", gridTemplateColumns: "4.5rem 1fr", gap: "0 8px", maxWidth: 520 }}>
                {project.project_path && (
                  <>
                    <span style={{ color: "var(--th-text-muted)", userSelect: "none" }}>  path</span>
                    <span style={{ color: "#7dd3fc" }}>{project.project_path}</span>
                  </>
                )}
                {project.core_goal && (
                  <>
                    <span style={{ color: "var(--th-text-muted)", userSelect: "none" }}>  goal</span>
                    <span style={{ color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.core_goal}</span>
                  </>
                )}
                {category && (
                  <>
                    <span style={{ color: "var(--th-text-muted)", userSelect: "none" }}>  type</span>
                    <span style={{ color: category.color ?? "var(--th-accent)" }}>{category.icon} {category.name}</span>
                  </>
                )}
                <>
                  <span style={{ color: "var(--th-text-muted)", userSelect: "none" }}>  status</span>
                  <span>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>● ACTIVE</span>
                    <span style={{ color: "var(--th-text-muted)", marginLeft: 12, fontSize: "10px" }}>
                      {runningAgents} agent{runningAgents !== 1 ? "s" : ""} running
                    </span>
                  </span>
                </>
              </div>
            </div>

            {/* ── Task Stat Bar ── */}
            <div
              className="flex-shrink-0 flex items-stretch"
              style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
            >
              {[
                { key: "done",        label: t({ ko: "완료",   en: "DONE",    ja: "完了",   zh: "完成" }),   color: "#4ade80",          count: taskStats.done },
                { key: "in_progress", label: t({ ko: "진행중", en: "IN PROG", ja: "進行中", zh: "进行中" }), color: "var(--th-accent)",  count: taskStats.in_progress },
                { key: "failed",      label: t({ ko: "에러",   en: "ERROR",   ja: "エラー", zh: "错误" }),   color: "#f87171",          count: taskStats.failed },
                { key: "waiting",     label: t({ ko: "대기중", en: "WAITING", ja: "待機中", zh: "等待中" }), color: "#94a3b8",          count: taskStats.waiting },
              ].map((stat, i, arr) => (
                <div
                  key={stat.key}
                  className="flex flex-col items-center justify-center flex-1 py-2.5"
                  style={{
                    borderRight: i < arr.length - 1 ? "1px solid var(--th-border)" : "none",
                    gap: 4,
                  }}
                >
                  <span style={{ ...mono, fontSize: "20px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                    {stat.count}
                  </span>
                  <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.1em", color: "var(--th-text-muted)", fontWeight: 600 }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* activity feed header */}
            <div
              style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", padding: "4px 16px", background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.05em" }}
            >
              <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>$</span>
              <span>tail -f agent-activity.log</span>
              <span style={{ marginLeft: "auto", opacity: 0.5 }}>live</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
            </div>

            {/* 에이전트 활동 패널 */}
            <div className="flex-1 overflow-auto" style={{ background: "var(--th-bg-primary)" }}>
              <AgentActivityPanel
                projectId={project.id}
                allAgents={agents}
                onOpenTerminal={(taskId, agent) => setSelectedTerminal({ taskId, agent })}
                onCreateTask={onCreateTask ? (agentId) => {
                  setCreateTaskDefaultAgentId(agentId);
                  setShowCreateTask(true);
                } : undefined}
                onManageTeam={() => setDashTab("settings")}
              />
            </div>
          </div>

          {/* 오른쪽: 목표 + 팀 패널 */}
          <div
            className="w-[220px] flex-shrink-0 flex flex-col overflow-y-auto"
            style={{ borderLeft: "1px solid var(--th-border)" }}
          >
            {/* ── 목표 패널 ── */}
            <div style={{ borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
              {/* 목표 헤더 */}
              <div style={{ ...mono, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--th-bg-elevated)", borderBottom: "1px solid var(--th-border)" }}>
                <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "#3b82f6" }}>◎</span>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", flex: 1 }}>{t({ ko: "목표", en: "OBJECTIVES", ja: "目標", zh: "目标" })}</span>
                <span style={{ fontSize: "8px", color: "var(--th-text-muted)", opacity: 0.6 }}>
                  {objectives.filter((o) => o.status === "completed").length}/{objectives.length}
                </span>
                <button
                  type="button"
                  onClick={() => setObjShowInput((v) => !v)}
                  style={{ ...mono, fontSize: "9px", fontWeight: 700, color: objShowInput ? "var(--th-accent)" : "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                  title={t({ ko: "목표 추가", en: "Add objective", ja: "目標追加", zh: "添加目标" })}
                >
                  {objShowInput ? "✕" : "+"}
                </button>
              </div>

              {/* 목표 입력 */}
              {objShowInput && (
                <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", display: "flex", gap: 4 }}>
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
                    style={{ ...mono, flex: 1, fontSize: "9px", padding: "3px 6px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleObjAdd()}
                    disabled={objBusy}
                    style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "3px 8px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", color: "#3b82f6", cursor: "pointer" }}
                  >
                    ADD
                  </button>
                </div>
              )}

              {/* 목표 목록 */}
              {objectives.length === 0 && !objShowInput ? (
                <div style={{ ...mono, padding: "12px 10px", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.4, textAlign: "center" }}>
                  {t({ ko: "— 목표 없음 —", en: "— no objectives —", ja: "— 目標なし —", zh: "— 暂无目标 —" })}
                </div>
              ) : (
                <div>
                  {objectives.map((obj) => {
                    const done = obj.status === "completed";
                    const progress = obj.progress ?? 0;
                    return (
                      <div
                        key={obj.id}
                        className="group"
                        style={{ ...mono, padding: "6px 10px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", display: "flex", flexDirection: "column", gap: 4 }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => void handleObjToggle(obj)}
                            style={{ flexShrink: 0, width: 10, height: 10, borderRadius: "50%", border: `2px solid ${done ? "#3fb950" : "#3b82f6"}`, background: done ? "#3fb950" : "transparent", cursor: "pointer", marginTop: 2 }}
                          />
                          <span style={{ fontSize: "9px", color: done ? "var(--th-text-muted)" : "var(--th-text-secondary)", flex: 1, lineHeight: 1.5, textDecoration: done ? "line-through" : "none", wordBreak: "break-word" }}>
                            {obj.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleObjDelete(obj.id)}
                            className="opacity-0 group-hover:opacity-100"
                            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", fontSize: "8px", lineHeight: 1, padding: 0, transition: "opacity 0.1s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
                          >
                            ✕
                          </button>
                        </div>
                        {/* 진행 바 */}
                        <div style={{ height: 2, background: "var(--th-bg-elevated)", borderRadius: 1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: done ? "#3fb950" : "#3b82f6", transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <TeamPanel projectId={project.id} allAgents={agents} onTeamChange={onTeamChange} />
          </div>
          </div>

        </div>
      )}

      {/* ── PROJECT SETTINGS 탭 ── */}
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
            onDelete={onDeleteProject}
          />
        </div>
      )}

      {/* ── 터미널 overlay ── */}
      {selectedTerminal && (
        <div
          className="absolute inset-0 z-50 flex items-stretch"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTerminal(null); }}
        >
          <div className="flex-1 m-4 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
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

      {/* ── 새 업무 만들기 모달 ── */}
      {showCreateTask && onCreateTask && (
        <CreateTaskModal
          agents={projectAgents}
          departments={departments}
          onClose={() => { setShowCreateTask(false); setCreateTaskDefaultAgentId(undefined); }}
          onCreate={(input) => {
            onCreateTask({ ...input, project_id: project.id, project_path: project.project_path ?? undefined });
            setShowCreateTask(false);
            setCreateTaskDefaultAgentId(undefined);
          }}
          onAssign={onAssignTask ?? (() => {})}
          defaultProjectId={project.id}
          defaultAgentId={createTaskDefaultAgentId}
        />
      )}
    </div>
  );
}
