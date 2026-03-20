import type { ProjectFolderWindowProps } from "./types";
import { useProjectFolderWindowState } from "./useProjectFolderWindowState";
import { useI18n } from "../../../i18n";
import TrafficLights from "../TrafficLights";
import { timeAgo } from "./utils";
import { StatPill, Divider } from "./DetailsTab";
import { FilesTab } from "./FilesTab";
import { TasksTab } from "./TasksTab";
import { AgentsTab } from "./AgentsTab";
import { DetailsTab } from "./DetailsTab";
import { TerminalTab } from "./TerminalTab";
import { GitTab } from "./GitTab";

export default function ProjectFolderWindow({
  project,
  tasks,
  agents,
  onClose,
  onSelectProject,
  onDeleteProject,
  initialX = 160,
  initialY = 80,
}: ProjectFolderWindowProps) {
  const { t } = useI18n();
  const {
    tab,
    setTab,
    isActive,
    pos,
    size,
    onTitleMouseDown,
    onResizeMouseDown,
    projectTasks,
    projectAgents,
    statusCounts,
    activeTasks,
    doneTasks,
    setCurrentProjectId,
  } = useProjectFolderWindowState(project, tasks, agents, initialX, initialY);

  const TABS: { id: typeof tab; label: string; count?: number }[] = [
    { id: "files",    label: t({ ko: "파일",    en: "Files",    ja: "ファイル",       zh: "文件" }) },
    { id: "tasks",    label: t({ ko: "태스크",  en: "Tasks",    ja: "タスク",         zh: "任务" }), count: projectTasks.length },
    { id: "agents",   label: t({ ko: "에이전트", en: "Agents",  ja: "エージェント",   zh: "代理" }), count: projectAgents.length },
    { id: "terminal", label: t({ ko: "터미널",  en: "Terminal", ja: "ターミナル",     zh: "终端" }) },
    { id: "details",  label: t({ ko: "상세",    en: "Details",  ja: "詳細",           zh: "详情" }) },
    { id: "git",      label: t({ ko: "Git",     en: "Git",      ja: "Git",            zh: "Git" }) },
  ];

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 800,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--th-border-strong)",
        borderRadius: 12,
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        fontFamily: "var(--th-font-mono)",
        overflow: "hidden",
      }}
    >
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          height: 40,
          flexShrink: 0,
          background: "var(--th-glass-bg)",
          borderBottom: "1px solid var(--th-border)",
          cursor: "default",
          userSelect: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <TrafficLights onClose={onClose} />
        <span style={{ fontSize: 13, marginLeft: 4 }}>📁</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }} onMouseDown={(e) => e.stopPropagation()}>
          {isActive ? (
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontFamily: "var(--th-font-mono)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 7 }}>◉</span> {t({ ko: "활성", en: "Active", ja: "アクティブ", zh: "活跃" })}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { onSelectProject(project.id); setCurrentProjectId(project.id); }}
              style={{ fontSize: 10, padding: "3px 10px", background: "var(--th-accent-glow)", border: "1px solid var(--th-accent-border)", borderRadius: 4, color: "var(--th-accent)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
            >
              ▶ {t({ ko: "활성화", en: "Activate", ja: "起動", zh: "激活" })}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0, height: 30, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", flexShrink: 0, padding: "0 16px" }}>
        <StatPill icon="▦" value={`${activeTasks.length} ${t({ ko: "실행중", en: "running", ja: "実行中", zh: "运行中" })}`} color={activeTasks.length > 0 ? "var(--th-success, #22c55e)" : "var(--th-text-muted)"} />
        <Divider />
        <StatPill icon="✓" value={`${doneTasks.length} ${t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}`} color="var(--th-text-muted)" />
        <Divider />
        <StatPill icon="👤" value={`${projectAgents.length} ${t({ ko: "에이전트", en: "agents", ja: "エージェント", zh: "代理" })}`} color="var(--th-text-muted)" />
        <Divider />
        <StatPill icon="🕐" value={project.last_used_at ? timeAgo(project.last_used_at) : t({ ko: "없음", en: "never", ja: "なし", zh: "无" })} color="var(--th-text-muted)" />
        {project.project_path && (
          <>
            <Divider />
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
              {project.project_path}
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", padding: "0 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", flexShrink: 0 }}>
        {TABS.map((tabEntry) => (
          <button
            key={tabEntry.id}
            type="button"
            onClick={() => setTab(tabEntry.id)}
            style={{
              padding: "8px 14px",
              fontSize: 11,
              fontFamily: "var(--th-font-mono)",
              fontWeight: tab === tabEntry.id ? 600 : 400,
              color: tab === tabEntry.id ? "var(--th-accent)" : "var(--th-text-secondary)",
              background: "none",
              border: "none",
              borderBottom: tab === tabEntry.id ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: -1,
            }}
          >
            {tabEntry.label}
            {tabEntry.count !== undefined && (
              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: tab === tabEntry.id ? "var(--th-accent-glow)" : "var(--th-bg-surface)", color: tab === tabEntry.id ? "var(--th-accent)" : "var(--th-text-muted)", border: "1px solid var(--th-border)" }}>
                {tabEntry.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "files"    && <FilesTab projectPath={project.project_path} projectName={project.name} />}
        {tab === "tasks"    && <TasksTab tasks={projectTasks} statusCounts={statusCounts} allAgents={agents} />}
        {tab === "agents"   && <AgentsTab agents={projectAgents} projectTasks={projectTasks} />}
        {tab === "terminal" && <TerminalTab projectPath={project.project_path} projectName={project.name} />}
        {tab === "details"  && <DetailsTab project={project} taskCount={projectTasks.length} agentCount={projectAgents.length} onDelete={() => { onDeleteProject(project.id); onClose(); }} />}
        {tab === "git"      && <GitTab project={project} />}
      </div>

      <div onMouseDown={onResizeMouseDown} style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-border)", fontSize: 10, userSelect: "none" }}>
        ⌟
      </div>
    </div>
  );
}
