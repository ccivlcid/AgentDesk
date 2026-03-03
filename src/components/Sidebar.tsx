import { useState } from "react";
import type { Department, Agent, CompanySettings } from "../types";
import { useI18n, localeName } from "../i18n";
import type { View } from "../app/types";

interface SidebarProps {
  currentView: View;
  onChangeView: (v: View) => void;
  departments: Department[];
  agents: Agent[];
  settings: CompanySettings;
  connected: boolean;
}

/* Top-level nav items. "library" is a group parent, not a view itself. */
type NavEntry =
  | { kind: "item"; view: View }
  | { kind: "group"; id: string; children: { view: View }[] };

const NAV_STRUCTURE: NavEntry[] = [
  { kind: "item", view: "office" },
  { kind: "item", view: "agents" },
  {
    kind: "group",
    id: "library",
    children: [{ view: "skills" }, { view: "agent-rules" }],
  },
  { kind: "item", view: "dashboard" },
  { kind: "item", view: "tasks" },
  { kind: "item", view: "settings" },
];

const LIBRARY_CHILDREN: View[] = ["skills", "agent-rules"];

const NAV_ICONS: Partial<Record<View | "library", React.ReactNode>> = {
  office: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V5a1 1 0 011-1h5a1 1 0 011 1v12" />
      <path d="M10 17V9a1 1 0 011-1h5a1 1 0 011 1v8" />
      <path d="M1 17h18" />
      <path d="M5.5 7h1M5.5 10h1M5.5 13h1" />
      <path d="M12.5 11h1M12.5 14h1" />
    </svg>
  ),
  agents: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 17v-1.5A3.5 3.5 0 015.5 12h3A3.5 3.5 0 0112 15.5V17" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 12.5a3 3 0 013 3V17" />
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
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1" />
      <rect x="11" y="2" width="7" height="5" rx="1" />
      <rect x="2" y="12" width="7" height="6" rx="1" />
      <rect x="11" y="9" width="7" height="9" rx="1" />
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
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.66 4.34l-1.06 1.06M5.4 14.6l-1.06 1.06M15.66 15.66l-1.06-1.06M5.4 5.4L4.34 4.34" />
    </svg>
  ),
};

export default function Sidebar({ currentView, onChangeView, departments, agents, settings, connected }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deptOpen, setDeptOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(() => LIBRARY_CHILDREN.includes(currentView as View));
  const { t, locale } = useI18n();
  const workingCount = agents.filter((a) => a.status === "working").length;
  const totalAgents = agents.length;

  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const navLabels: Record<string, string> = {
    office: tr("오피스", "Office", "オフィス", "办公室"),
    agents: tr("직원관리", "Agents", "社員管理", "员工管理"),
    library: tr("도서관", "Library", "ライブラリ", "图书馆"),
    skills: tr("스킬스", "Skills", "スキル", "技能"),
    "agent-rules": tr("에이전트 룰", "Agent Rules", "エージェントルール", "代理规则"),
    dashboard: tr("대시보드", "Dashboard", "ダッシュボード", "仪表盘"),
    tasks: tr("업무 관리", "Tasks", "タスク管理", "任务管理"),
    settings: tr("설정", "Settings", "設定", "设置"),
  };

  const isLibraryActive = LIBRARY_CHILDREN.includes(currentView as View);

  const renderNavItem = (view: View) => (
    <button
      key={view}
      onClick={() => onChangeView(view)}
      title={collapsed ? navLabels[view] : undefined}
      className={`sidebar-nav-item ${currentView === view ? "active" : ""}`}
    >
      <span className="sidebar-nav-icon">{NAV_ICONS[view]}</span>
      {!collapsed && <span className="sidebar-nav-label">{navLabels[view]}</span>}
      {view === "agents" && workingCount > 0 && (
        <span className="sidebar-nav-badge">{workingCount}</span>
      )}
    </button>
  );

  const renderSubItem = (view: View) => (
    <button
      key={view}
      onClick={() => onChangeView(view)}
      className={`sidebar-sub-item ${currentView === view ? "active" : ""}`}
    >
      <span className="sidebar-sub-icon">{NAV_ICONS[view]}</span>
      <span className="sidebar-nav-label">{navLabels[view]}</span>
    </button>
  );

  return (
    <aside className={`sidebar-shell ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      {/* [A] Brand header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-inner">
          <div className="sidebar-brand-avatar">
            <img
              src="/sprites/ceo-lobster.png"
              alt={tr("CEO", "CEO")}
              className="w-8 h-8 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <span className="sidebar-brand-crown">👑</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="sidebar-brand-company">{settings.companyName}</div>
              <div className="sidebar-brand-ceo">{settings.ceoName}</div>
            </div>
          )}
        </div>
      </div>

      {/* [B] Navigation */}
      <nav className="sidebar-nav">
        {NAV_STRUCTURE.map((entry) => {
          if (entry.kind === "item") {
            return renderNavItem(entry.view);
          }
          /* Group: library */
          return (
            <div key={entry.id} className="sidebar-nav-group">
              <button
                onClick={() => {
                  if (collapsed) {
                    onChangeView(entry.children[0].view);
                  } else {
                    setLibraryOpen(!libraryOpen);
                  }
                }}
                title={collapsed ? navLabels[entry.id] : undefined}
                className={`sidebar-nav-item ${isLibraryActive ? "active" : ""}`}
              >
                <span className="sidebar-nav-icon">{NAV_ICONS[entry.id as keyof typeof NAV_ICONS]}</span>
                {!collapsed && (
                  <>
                    <span className="sidebar-nav-label">{navLabels[entry.id]}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`sidebar-group-chevron ${libraryOpen ? "open" : ""}`}
                    >
                      <path d="M6 8l4 4 4-4" />
                    </svg>
                  </>
                )}
              </button>
              {!collapsed && libraryOpen && (
                <div className="sidebar-sub-list">
                  {entry.children.map((child) => renderSubItem(child.view))}
                </div>
              )}
            </div>
          );
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
