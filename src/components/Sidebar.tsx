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

type NavEntry =
  | { kind: "item"; view: View }
  | { kind: "section"; label: { ko: string; en: string; ja: string; zh: string }; id?: string; children?: { view: View }[] };

const NAV_STRUCTURE: NavEntry[] = [
  { kind: "section", label: { ko: "개요", en: "overview", ja: "概要", zh: "概览" } },
  { kind: "item", view: "dashboard" },
  { kind: "item", view: "project-types" },
  {
    kind: "section",
    label: { ko: "업무", en: "tasks", ja: "タスク", zh: "任务" },
    id: "tasks",
    children: [{ view: "tasks-board" }, { view: "tasks-scheduled" }, { view: "tasks-deliverables" }],
  },
  {
    kind: "section",
    label: { ko: "에이전트", en: "agents", ja: "エージェント", zh: "代理" },
    id: "agents",
    children: [{ view: "agents" }, { view: "heartbeat" }],
  },
  {
    kind: "section",
    label: { ko: "라이브러리", en: "library", ja: "ライブラリ", zh: "库" },
    id: "library",
    children: [{ view: "skills" }, { view: "agent-rules" }, { view: "memory" }, { view: "hooks" }],
  },
  { kind: "section", label: { ko: "시스템", en: "system", ja: "システム", zh: "系统" } },
  { kind: "item", view: "cli-usage" },
  { kind: "item", view: "settings" },
];

const AGENTS_CHILDREN: View[] = ["agents", "heartbeat"];
const LIBRARY_CHILDREN: View[] = ["skills", "agent-rules", "memory", "hooks"];
const TASKS_CHILDREN: View[] = ["tasks-board", "tasks-scheduled", "tasks-deliverables"];

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

  const navLabels: Record<string, string> = {
    agents: t({ ko: "에이전트 & 부서", en: "agents & depts", ja: "エージェント & 部署", zh: "代理 & 部门" }),
    heartbeat: t({ ko: "현황 모니터", en: "heartbeat", ja: "稼働モニタ", zh: "心跳监控" }),
    skills: t({ ko: "스킬", en: "skills", ja: "スキル", zh: "技能" }),
    "agent-rules": t({ ko: "에이전트 룰", en: "agent rules", ja: "エージェントルール", zh: "代理规则" }),
    memory: t({ ko: "메모리", en: "memory", ja: "メモリ", zh: "记忆" }),
    hooks: t({ ko: "훅", en: "hooks", ja: "フック", zh: "钩子" }),
    dashboard: t({ ko: "대시보드", en: "dashboard", ja: "ダッシュボード", zh: "仪表盘" }),
    "cli-usage": t({ ko: "cli 사용량", en: "cli usage", ja: "cli使用量", zh: "cli 使用量" }),
    "tasks-board": t({ ko: "업무 보드", en: "task board", ja: "タスクボード", zh: "任务看板" }),
    "tasks-scheduled": t({ ko: "스케줄러", en: "scheduler", ja: "スケジューラ", zh: "调度器" }),
    "tasks-deliverables": t({ ko: "산출물", en: "outputs", ja: "成果物", zh: "产出物" }),
    settings: t({ ko: "설정", en: "settings", ja: "設定", zh: "设置" }),
    "project-types": t({ ko: "프로젝트 유형", en: "project types", ja: "プロジェクト種別", zh: "项目类型" }),
  };

  const isAgentsActive = AGENTS_CHILDREN.includes(currentView as View);
  const isLibraryActive = LIBRARY_CHILDREN.includes(currentView as View);
  const isTasksActive = TASKS_CHILDREN.includes(currentView as View);

  const mono = "var(--th-font-mono)";

  const renderNavItem = (view: View) => {
    const isActive = currentView === view;
    const badge = (view === "dashboard" || view === "tasks-board") && workingCount > 0 ? workingCount : null;
    return (
      <button
        key={view}
        onClick={() => onChangeView(view)}
        title={collapsed ? navLabels[view] : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: collapsed ? "6px" : "5px 12px",
          width: "100%",
          background: isActive ? "var(--th-active-bg)" : "transparent",
          border: "none",
          borderLeft: collapsed ? "none" : isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
          cursor: "pointer",
          fontFamily: mono,
          fontSize: "12px",
          fontWeight: isActive ? 500 : 400,
          color: isActive ? "var(--th-accent)" : "var(--th-text-secondary)",
          justifyContent: collapsed ? "center" : undefined,
          transition: "color 0.1s, background 0.1s",
          borderRadius: 6,
        }}
        className={!isActive ? "hover:bg-[var(--th-hover-bg)] hover:!text-[var(--th-text)]" : ""}
      >
        {!collapsed && (
          <span style={{ width: "10px", flexShrink: 0, fontSize: "12px", color: isActive ? "var(--th-accent)" : "var(--th-text-muted)" }}>
            {isActive ? "›" : "·"}
          </span>
        )}
        {!collapsed && (
          <span className="flex-1 truncate text-left">{navLabels[view]}</span>
        )}
        {collapsed && (
          <span style={{ fontSize: "11px", color: isActive ? "var(--th-accent)" : "var(--th-text-muted)" }}>
            {view === "dashboard" ? "$" :
             view === "tasks-board" ? "▤" :
             view === "tasks-scheduled" ? "⏱" :
             view === "tasks-deliverables" ? "↗" :
             view === "agents" ? "⊙" :
             view === "heartbeat" ? "♡" :
             view === "skills" ? "✦" :
             view === "agent-rules" ? "◈" :
             view === "memory" ? "◻" :
             view === "hooks" ? "⚡" :
             view === "cli-usage" ? "~" :
             view === "settings" ? "⚙" :
             view === "project-types" ? "◫" : "·"}
          </span>
        )}
        {badge !== null && !collapsed && (
          <span style={{
            fontFamily: mono,
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--th-accent)",
            marginLeft: "auto",
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const renderSubItem = (view: View, parentId?: string) => {
    const isActive = currentView === view;
    const label = parentId === "agents"
      ? (view === "agents" ? t({ ko: "에이전트 & 부서", en: "agents & depts", ja: "エージェント & 部署", zh: "代理 & 部门" }) : navLabels[view])
      : navLabels[view];
    return (
      <button
        key={view}
        onClick={() => onChangeView(view)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 12px 4px 28px",
          width: "100%",
          background: isActive ? "var(--th-active-bg)" : "transparent",
          border: "none",
          borderLeft: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
          cursor: "pointer",
          fontFamily: mono,
          fontSize: "11px",
          fontWeight: isActive ? 500 : 400,
          color: isActive ? "var(--th-text)" : "var(--th-text-muted)",
          transition: "color 0.1s, background 0.1s",
          borderRadius: 6,
        }}
        className={!isActive ? "hover:bg-[var(--th-hover-bg)] hover:!text-[var(--th-text-secondary)]" : ""}
      >
        <span style={{ fontSize: "10px", color: isActive ? "var(--th-accent)" : "var(--th-text-muted)", flexShrink: 0 }}>↳</span>
        <span className="truncate">{label}</span>
        {view === "tasks-board" && workingCount > 0 && (
          <span style={{ fontFamily: mono, fontSize: "10px", fontWeight: 700, color: "var(--th-accent)", marginLeft: "auto" }}>
            {workingCount}
          </span>
        )}
      </button>
    );
  };

  const renderCollapsibleSection = (
    id: string,
    label: { ko: string; en: string; ja: string; zh: string },
    children: { view: View }[],
    isActive: boolean,
    isOpen: boolean,
    toggle: () => void,
  ) => {
    if (collapsed) {
      return children.map((child) => renderNavItem(child.view));
    }
    return (
      <div key={`section-${id}`}>
        <button
          onClick={toggle}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "14px 12px 4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            gap: "6px",
            fontFamily: mono,
          }}
        >
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
            textTransform: "uppercase" as const,
            userSelect: "none" as const,
            flex: 1,
            textAlign: "left" as const,
          }}>
            {"// "}{t(label)}
          </span>
          <svg
            width="8" height="8" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--th-text-muted)", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", flexShrink: 0 }}
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>
        {isOpen && (
          <div>
            {children.map((child) => renderSubItem(child.view, id))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{
        width: collapsed ? "44px" : "200px",
        background: "var(--th-bg-panel)",
        borderRight: "1px solid var(--th-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.15s",
        overflow: "hidden",
        fontFamily: mono,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* [A] Brand */}
      <div style={{
        padding: collapsed ? "10px 0" : "10px 12px",
        borderBottom: "1px solid var(--th-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : undefined,
        minHeight: "40px",
      }}>
        {collapsed ? (
          <span style={{ color: "var(--th-accent)", fontFamily: mono, fontWeight: 700, fontSize: "12px" }}>$</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--th-accent)", fontFamily: mono, fontWeight: 700, fontSize: "12px" }}>$</span>
            <span style={{ fontFamily: mono, fontWeight: 700, fontSize: "11px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              agentdesk
            </span>
          </div>
        )}
      </div>

      {/* [B] Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "8px", paddingLeft: "6px", paddingRight: "6px" }}>
        {NAV_STRUCTURE.map((entry, i) => {
          if (entry.kind === "section") {
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
              return renderCollapsibleSection(entry.id, entry.label, entry.children, isActive, isOpen, toggle);
            }
            if (collapsed) return null;
            return (
              <div
                key={`section-label-${i}`}
                style={{
                  padding: "14px 12px 4px",
                  fontFamily: mono,
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--th-text-muted)",
                  textTransform: "uppercase" as const,
                  userSelect: "none" as const,
                }}
              >
                {"// "}{t(entry.label)}
              </div>
            );
          }
          return renderNavItem(entry.view);
        })}
      </nav>

      {/* [C] Department stats */}
      {!collapsed && departments.length > 0 && (
        <div style={{ borderTop: "1px solid var(--th-border)", padding: "8px 0" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              padding: "4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              gap: "6px",
              fontFamily: mono,
            }}
            onClick={() => setDeptOpen(!deptOpen)}
          >
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--th-text-muted)", textTransform: "uppercase", flex: 1, textAlign: "left" }}>
              {"// "}{t({ ko: "부서 현황", en: "departments", ja: "部門状況", zh: "部门状态" })}
            </span>
            <svg width="8" height="8" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--th-text-muted)", transform: deptOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>
              <path d="M6 8l4 4 4-4" />
            </svg>
          </button>
          {deptOpen && departments.map((d) => {
            const deptAgents = agents.filter((a) => a.department_id === d.id);
            const working = deptAgents.filter((a) => a.status === "working").length;
            const total = deptAgents.length;
            const pct = total > 0 ? (working / total) * 100 : 0;
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 12px" }}>
                <span style={{ fontSize: "11px", flexShrink: 0 }}>{d.icon}</span>
                <span style={{ fontFamily: mono, fontSize: "10px", color: "var(--th-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {localeName(locale, d)}
                </span>
                <div style={{ width: "32px", height: "2px", background: "var(--th-border)", flexShrink: 0, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: working > 0 ? "var(--th-accent)" : "var(--th-border-strong)" }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: "10px", color: working > 0 ? "var(--th-accent)" : "var(--th-text-muted)", fontWeight: 600, width: "16px", textAlign: "right" }}>
                  {working}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* [D] Status bar */}
      <div style={{
        borderTop: "1px solid var(--th-border)",
        padding: collapsed ? "8px 0" : "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        justifyContent: collapsed ? "center" : undefined,
      }}>
        <span style={{
          position: "relative",
          display: "inline-flex",
          width: "7px",
          height: "7px",
          flexShrink: 0,
        }}>
          {connected && (
            <span style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--th-green)",
              opacity: 0.5,
              animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
            }} />
          )}
          <span style={{
            position: "relative",
            display: "inline-flex",
            borderRadius: "50%",
            width: "7px",
            height: "7px",
            background: connected ? "var(--th-green)" : "var(--th-red)",
          }} />
        </span>
        {!collapsed && (
          <span style={{ fontFamily: mono, fontSize: "10px", color: "var(--th-text-muted)", flex: 1 }}>
            {connected
              ? t({ ko: "연결됨", en: "live", ja: "接続中", zh: "已连接" })
              : t({ ko: "연결 끊김", en: "offline", ja: "接続なし", zh: "已断开" })}
            {" · "}
            <span style={{ color: workingCount > 0 ? "var(--th-accent)" : "var(--th-text-muted)", fontWeight: 600 }}>
              {workingCount}
            </span>
            <span>/{totalAgents}</span>
          </span>
        )}
      </div>

      {/* [E] Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed
          ? t({ ko: "사이드바 펼치기", en: "expand", ja: "展開", zh: "展开" })
          : t({ ko: "사이드바 접기", en: "collapse", ja: "縮小", zh: "收起" })}
        style={{
          width: "100%",
          padding: "8px 6px",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--th-border)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: mono,
          fontSize: "10px",
          color: "var(--th-text-muted)",
          transition: "color 0.1s",
          borderRadius: "0 0 0 10px",
        }}
        className="hover:!text-[var(--th-text-secondary)]"
      >
        {collapsed ? "»" : "«"}
      </button>
    </aside>
  );
}
