import { useState } from "react";
import type { Department, Agent, CompanySettings, Project, Category } from "../types";
import { useI18n, localeName } from "../i18n";
import type { View } from "../app/types";

interface SidebarProps {
  currentView: View;
  onChangeView: (v: View) => void;
  departments: Department[];
  agents: Agent[];
  settings: CompanySettings;
  connected: boolean;
  projects?: Project[];
  categories?: Category[];
  currentProject?: Project | null;
  onProjectSelect?: (id: string) => void;
  onProjectCreate?: () => void;
}

/* Top-level nav items. Sections with children are collapsible. */
type NavEntry =
  | { kind: "item"; view: View }
  | { kind: "section"; label: string; id?: string; children?: { view: View }[] };

const NAV_STRUCTURE: NavEntry[] = [
  { kind: "section", label: "OVERVIEW" },
  { kind: "item", view: "dashboard" },
  { kind: "item", view: "project-types" },
  { kind: "section", label: "TASKS", id: "tasks", children: [{ view: "tasks-board" }, { view: "tasks-scheduled" }, { view: "tasks-deliverables" }] },
  { kind: "section", label: "AGENTS", id: "agents", children: [{ view: "agents" }, { view: "heartbeat" }] },
  { kind: "section", label: "LIBRARY", id: "library", children: [{ view: "skills" }, { view: "agent-rules" }, { view: "memory" }, { view: "hooks" }] },
  { kind: "section", label: "SYSTEM" },
  { kind: "item", view: "cli-usage" },
  { kind: "item", view: "settings" },
];

const AGENTS_CHILDREN: View[] = ["agents", "heartbeat"];
const LIBRARY_CHILDREN: View[] = ["skills", "agent-rules", "memory", "hooks"];
const TASKS_CHILDREN: View[] = ["tasks-board", "tasks-scheduled", "tasks-deliverables"];

const NAV_ICONS: Partial<Record<View | "library", React.ReactNode>> = {
  agents: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 17v-1.5A3.5 3.5 0 015.5 12h3A3.5 3.5 0 0112 15.5V17" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 12.5a3 3 0 013 3V17" />
    </svg>
  ),
  heartbeat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  library: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4.5C2 3.67 2.67 3 3.5 3H8c1.1 0 2 .9 2 2v11.5l-.5-.5c-.83-.83-2-1-3-1H3.5A1.5 1.5 0 012 13.5v-9z" />
      <path d="M18 4.5c0-.83-.67-1.5-1.5-1.5H12c-1.1 0-2 .9-2 2v11.5l.5-.5c.83-.83 2-1 3-1h3a1.5 1.5 0 001.5-1.5v-9z" />
    </svg>
  ),
  skills: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.4l-4.33 2.1.83-4.82L3 7.27l4.91-1.01L10 2z" />
    </svg>
  ),
  "agent-rules": (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L3 5v5c0 4.25 3 7.5 7 8.5 4-1 7-4.25 7-8.5V5l-7-3z" />
      <path d="M7.5 10l1.5 1.5L12.5 8" />
    </svg>
  ),
  memory: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M3 8h14" />
      <path d="M7 12h4" />
    </svg>
  ),
  hooks: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v4M10 14v4M4 10H2M18 10h-2" />
      <circle cx="10" cy="10" r="4" />
      <path d="M6.5 6.5l-1-1M14.5 14.5l-1-1M6.5 13.5l-1 1M14.5 5.5l-1 1" />
    </svg>
  ),
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1" />
      <rect x="11" y="2" width="7" height="5" rx="1" />
      <rect x="2" y="12" width="7" height="6" rx="1" />
      <rect x="11" y="9" width="7" height="9" rx="1" />
    </svg>
  ),
  "project-types": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      <path d="M7 11h6M7 14h4" />
    </svg>
  ),
  "cli-usage": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17v-4M7 17v-8M11 17V9M15 17v-6" />
      <path d="M2 18h16" />
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <path d="M7 2v1.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V2" />
      <path d="M7.5 9l1.5 1.5L12.5 7" />
      <path d="M7.5 13h5" />
    </svg>
  ),
  "tasks-board": (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="5" height="14" rx="1" />
      <rect x="8" y="3" width="5" height="10" rx="1" />
      <rect x="14" y="3" width="5" height="7" rx="1" />
    </svg>
  ),
  "tasks-scheduled": (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2.5" />
      <path d="M16 4l1.5-1.5M4 4L2.5 2.5" />
    </svg>
  ),
  "tasks-deliverables": (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M7 8h6M7 11h4" />
      <path d="M13 14l1.5 1.5" />
      <circle cx="14" cy="15" r="1" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.66 4.34l-1.06 1.06M5.4 14.6l-1.06 1.06M15.66 15.66l-1.06-1.06M5.4 5.4L4.34 4.34" />
    </svg>
  ),
};

export default function Sidebar({
  currentView,
  onChangeView,
  departments,
  agents,
  settings,
  connected,
  projects = [],
  categories = [],
  currentProject = null,
  onProjectSelect,
  onProjectCreate,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deptOpen, setDeptOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(() => AGENTS_CHILDREN.includes(currentView as View));
  const [libraryOpen, setLibraryOpen] = useState(() => LIBRARY_CHILDREN.includes(currentView as View));
  const [tasksOpen, setTasksOpen] = useState(() => TASKS_CHILDREN.includes(currentView as View));
  const { t, locale } = useI18n();
  const workingCount = agents.filter((a) => a.status === "working").length;
  const totalAgents = agents.length;

  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const navLabels: Record<string, string> = {
    agents: tr("팀", "Team", "チーム", "团队"),
    heartbeat: tr("직원 살펴보기", "Heartbeat", "社員の様子", "员工动态"),
    library: tr("도서관", "Library", "ライブラリ", "图书馆"),
    skills: tr("스킬스", "Skills", "スキル", "技能"),
    "agent-rules": tr("에이전트 룰", "Agent Rules", "エージェントルール", "代理规则"),
    memory: tr("메모리", "Memory", "メモリ", "记忆"),
    hooks: tr("훅", "Hooks", "フック", "钩子"),
    dashboard: tr("대시보드", "Dashboard", "ダッシュボード", "仪表盘"),
    "cli-usage": tr("CLI 사용량", "CLI Usage", "CLI使用量", "CLI 使用量"),
    tasks: tr("업무 관리", "Tasks", "タスク管理", "任务管理"),
    "tasks-board": tr("업무 보드", "Task Board", "タスクボード", "任务看板"),
    "tasks-scheduled": tr("스케줄러", "Scheduler", "スケジューラ", "调度器"),
    "tasks-deliverables": tr("산출물", "Outputs", "成果物", "产出物"),
    settings: tr("설정", "Settings", "設定", "设置"),
    "project-types": tr("프로젝트 유형", "Project Types", "プロジェクト種別", "项目类型"),
  };

  const isAgentsActive = AGENTS_CHILDREN.includes(currentView as View);
  const isLibraryActive = LIBRARY_CHILDREN.includes(currentView as View);
  const isTasksActive = TASKS_CHILDREN.includes(currentView as View);

  /** 직원관리 그룹 내 서브 메뉴 라벨 (직원·부서 / Heartbeat) */
  const agentsGroupSubLabels: Record<string, string> = {
    agents: tr("직원·부서", "Agents & Depts", "社員・部署", "员工与部门"),
    heartbeat: navLabels["heartbeat"] ?? "",
  };

  const renderNavItem = (view: View) => (
    <button
      key={view}
      onClick={() => onChangeView(view)}
      title={collapsed ? navLabels[view] : undefined}
      className={`sidebar-nav-item ${currentView === view ? "active" : ""}`}
    >
      <span className="sidebar-nav-icon">{NAV_ICONS[view]}</span>
      {!collapsed && <span className="sidebar-nav-label">{navLabels[view]}</span>}
      {(view === "dashboard" || view === "tasks-board") && workingCount > 0 && (
        <span className="sidebar-nav-badge">{workingCount}</span>
      )}
    </button>
  );

  const renderSubItem = (view: View, parentId?: string) => (
    <button
      key={view}
      onClick={() => onChangeView(view)}
      className={`sidebar-sub-item ${currentView === view ? "active" : ""}`}
    >
      <span className="sidebar-sub-icon">{NAV_ICONS[view]}</span>
      <span className="sidebar-nav-label">
        {parentId === "agents" ? (agentsGroupSubLabels[view] ?? navLabels[view]) : navLabels[view]}
      </span>
      {view === "tasks-board" && workingCount > 0 && (
        <span className="sidebar-nav-badge">{workingCount}</span>
      )}
    </button>
  );

  return (
    <aside className={`sidebar-shell ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      {/* [A] Brand header — logo only; project selector lives in AppHeaderBar */}
      <div className="sidebar-brand">
        {!collapsed && (
          <div className="px-3 py-2 text-[11px] font-bold tracking-widest" style={{ fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", letterSpacing: "0.12em" }}>
            AGENTDESK
          </div>
        )}
      </div>

      {/* [B] Navigation */}
      <nav className="sidebar-nav">
        {NAV_STRUCTURE.map((entry, i) => {
          if (entry.kind === "section") {
            /* Collapsible section (TASKS / AGENTS / LIBRARY) */
            if (entry.children && entry.id) {
              const isActive =
                entry.id === "agents" ? isAgentsActive :
                entry.id === "library" ? isLibraryActive : isTasksActive;
              const isOpen =
                entry.id === "agents" ? agentsOpen :
                entry.id === "library" ? libraryOpen : tasksOpen;
              const toggle =
                entry.id === "agents" ? () => setAgentsOpen(!agentsOpen) :
                entry.id === "library" ? () => setLibraryOpen(!libraryOpen) :
                () => setTasksOpen(!tasksOpen);
              if (collapsed) {
                /* collapsed: show first child as icon nav button */
                return entry.children.map((child) => renderNavItem(child.view));
              }
              return (
                <div key={`section-${entry.id}`}>
                  <button
                    onClick={toggle}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "12px 12px 4px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      gap: "4px",
                    }}
                  >
                    <span style={{
                      fontFamily: "var(--th-font-mono)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
                      textTransform: "uppercase" as const,
                      userSelect: "none" as const,
                      flex: 1,
                      textAlign: "left" as const,
                    }}>
                      {entry.label}
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 20 20" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: "var(--th-text-muted)", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}
                    >
                      <path d="M6 8l4 4 4-4" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="sidebar-sub-list">
                      {entry.children.map((child) => renderSubItem(child.view, entry.id))}
                    </div>
                  )}
                </div>
              );
            }
            /* Static section label (OVERVIEW / SYSTEM) */
            if (collapsed) return null;
            return (
              <div
                key={`section-${entry.label}-${i}`}
                style={{
                  padding: "12px 12px 4px",
                  fontFamily: "var(--th-font-mono)",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--th-text-muted)",
                  textTransform: "uppercase" as const,
                  userSelect: "none" as const,
                }}
              >
                {entry.label}
              </div>
            );
          }
          return renderNavItem(entry.view);
        })}
      </nav>

      {/* [C] Department stats */}
      {!collapsed && departments.length > 0 && (
        <div className="sidebar-dept-section">
          <button className="sidebar-section-toggle" onClick={() => setDeptOpen(!deptOpen)}>
            <span className="sidebar-section-label">
              {tr("부서 현황", "Departments", "部門状況", "部门状态")}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`sidebar-section-chevron ${deptOpen ? "open" : ""}`}
            >
              <path d="M6 8l4 4 4-4" />
            </svg>
          </button>
          {deptOpen &&
            departments.map((d) => {
              const deptAgents = agents.filter((a) => a.department_id === d.id);
              const working = deptAgents.filter((a) => a.status === "working").length;
              const total = deptAgents.length;
              const pct = total > 0 ? (working / total) * 100 : 0;
              return (
                <div key={d.id} className="sidebar-dept-row">
                  <span className="sidebar-dept-icon">{d.icon}</span>
                  <span className="sidebar-dept-name">{localeName(locale, d)}</span>
                  <div className="sidebar-dept-bar">
                    <div className="sidebar-dept-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`sidebar-dept-count ${working > 0 ? "active" : ""}`}>
                    {working}
                  </span>
                </div>
              );
            })}
        </div>
      )}
      {collapsed && departments.length > 0 && (
        <div className="sidebar-dept-dots" title={tr("부서 현황", "Departments", "部門状況", "部门状态")}>
          {departments.map((d) => {
            const hasWorking = agents.some((a) => a.department_id === d.id && a.status === "working");
            return (
              <div
                key={d.id}
                className={`sidebar-dept-dot ${hasWorking ? "active" : ""}`}
                title={localeName(locale, d)}
              />
            );
          })}
        </div>
      )}

      {/* [D] Status bar */}
      <div className="sidebar-status-bar">
        <div className="sidebar-status-row">
          <div className={`sidebar-status-dot ${connected ? "connected" : "disconnected"}`}>
            {connected && <div className="sidebar-status-dot-ring" />}
          </div>
          {!collapsed ? (
            <div className="sidebar-status-text">
              <span className="sidebar-status-label">
                {connected
                  ? tr("연결됨", "Online", "接続中", "已连接")
                  : tr("연결 끊김", "Offline", "接続なし", "已断开")}
              </span>
              <span className="sidebar-status-divider">·</span>
              <span className="sidebar-status-agents">
                <strong>{workingCount}</strong>/{totalAgents}
              </span>
            </div>
          ) : (
            <span
              className="sidebar-status-count-collapsed"
              title={`${workingCount}/${totalAgents} ${tr("근무중", "working", "稼働中", "工作中")}`}
            >
              {workingCount}
            </span>
          )}
        </div>
      </div>

      {/* [E] Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-collapse-btn"
        title={
          collapsed
            ? tr("사이드바 펼치기", "Expand sidebar", "サイドバーを展開", "展开侧栏")
            : tr("사이드바 접기", "Collapse sidebar", "サイドバーを縮小", "收起侧栏")
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`sidebar-collapse-chevron ${collapsed ? "collapsed" : ""}`}
        >
          <path d="M12.5 4l-6 6 6 6" />
        </svg>
      </button>
    </aside>
  );
}
