import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import type { Agent, Task, Project, HookEntry } from "../types";
import { getDeliverables, type DeliverableItem } from "../api/providers-reports-github";
import { getHooks } from "../api/hooks";
import TrafficLights from "./desktop/TrafficLights";

type WfTemplate = { id: string; name: string; nodes_json: string; updated_at: number };

const HISTORY_KEY = "cp_history_v1";
const MAX_HISTORY = 6;

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveHistory(action: string): void {
  const prev = loadHistory().filter((a) => a !== action);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([action, ...prev].slice(0, MAX_HISTORY)));
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  agents?: Agent[];
  tasks?: Task[];
  projects?: Project[];
  currentProject?: Project | null;
  onNavigate: (view: string) => void;
  onCreateTask?: () => void;
  onSelectProject?: (project: Project) => void;
  onOpenShortcutsGuide?: () => void;
}

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  working:  { color: "#30d158", label: "working" },
  running:  { color: "#30d158", label: "running" },
  idle:     { color: "#636366", label: "idle" },
  offline:  { color: "#636366", label: "offline" },
  error:    { color: "#ff453a", label: "error" },
};

export default function CommandPalette({
  open,
  onClose,
  agents = [],
  tasks = [],
  projects = [],
  currentProject,
  onNavigate,
  onCreateTask,
  onSelectProject,
  onOpenShortcutsGuide,
}: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-loaded global data
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [hooks, setHooks] = useState<HookEntry[]>([]);
  const [workflows, setWorkflows] = useState<WfTemplate[]>([]);
  const lazyLoaded = useRef(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setHistory(loadHistory());
      setTimeout(() => inputRef.current?.focus(), 50);
      // Fetch extended data once per open session
      if (!lazyLoaded.current) {
        lazyLoaded.current = true;
        getDeliverables().then(setDeliverables).catch(() => {});
        getHooks().then(setHooks).catch(() => {});
        fetch("/api/composition-templates")
          .then((r) => r.json())
          .then((d: { templates?: WfTemplate[] }) => setWorkflows(d.templates ?? []))
          .catch(() => {});
      }
    } else {
      lazyLoaded.current = false;
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const QUICK_ACTIONS = [
    { label: t({ ko: "새 태스크 만들기", en: "New Task", ja: "新しいタスク", zh: "新建任务" }), icon: "＋", bg: "#0a84ff", action: "new-task" },
    { label: t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" }), icon: "▦", bg: "#636366", action: "dashboard" },
    { label: t({ ko: "태스크 보드", en: "Task Board", ja: "タスクボード", zh: "任务板" }), icon: "≡", bg: "#30d158", action: "tasks-board" },
    { label: t({ ko: "에이전트 관리", en: "Agents", ja: "エージェント", zh: "代理管理" }), icon: "◎", bg: "#ff9f0a", action: "agents" },
    { label: t({ ko: "스킬 라이브러리", en: "Skills", ja: "スキル", zh: "技能库" }), icon: "⬡", bg: "#bf5af2", action: "skills" },
    { label: t({ ko: "메모리", en: "Memory", ja: "メモリー", zh: "记忆" }), icon: "◈", bg: "#ff375f", action: "memory" },
    { label: t({ ko: "에이전트 룰", en: "Agent Rules", ja: "エージェントルール", zh: "代理规则" }), icon: "⊞", bg: "#ffd60a", action: "agent-rules" },
    { label: t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" }), icon: "⤷", bg: "#32ade6", action: "hooks" },
    { label: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }), icon: "⚙", bg: "#636366", action: "settings" },
  ];

  const recentActions = !q
    ? history
        .map((h) => QUICK_ACTIONS.find((a) => a.action === h))
        .filter((a): a is typeof QUICK_ACTIONS[number] => Boolean(a))
        .slice(0, 3)
    : [];

  const filteredActions = q
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.action.includes(q))
    : QUICK_ACTIONS;

  const filteredAgents = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q))
    : agents.slice(0, 5);

  const filteredTasks = q
    ? tasks.filter((t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q)).slice(0, 8)
    : tasks.filter((t) => t.status === "in_progress").slice(0, 5);

  const filteredProjects = q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.project_path?.toLowerCase().includes(q)).slice(0, 5)
    : projects.filter((p) => p.id !== currentProject?.id).slice(0, 4);

  const filteredDeliverables = q
    ? deliverables.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.agent_name?.toLowerCase().includes(q) ||
        d.project_name?.toLowerCase().includes(q),
      ).slice(0, 5)
    : [];

  const filteredHooks = q
    ? hooks.filter((h) =>
        h.title.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.command.toLowerCase().includes(q),
      ).slice(0, 5)
    : [];

  const filteredWorkflows = q
    ? workflows.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 4)
    : workflows.slice(0, 3);

  type Item =
    | { kind: "action"; label: string; icon: string; bg: string; action: string }
    | { kind: "agent"; agent: Agent }
    | { kind: "task"; task: Task }
    | { kind: "project"; project: Project }
    | { kind: "deliverable"; item: DeliverableItem }
    | { kind: "hook"; hook: HookEntry }
    | { kind: "workflow"; wf: WfTemplate };

  const items: Item[] = [
    ...recentActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredProjects.map((p) => ({ kind: "project" as const, project: p })),
    ...filteredAgents.map((a) => ({ kind: "agent" as const, agent: a })),
    ...filteredTasks.map((t) => ({ kind: "task" as const, task: t })),
    ...filteredDeliverables.map((d) => ({ kind: "deliverable" as const, item: d })),
    ...filteredHooks.map((h) => ({ kind: "hook" as const, hook: h })),
    ...filteredWorkflows.map((w) => ({ kind: "workflow" as const, wf: w })),
  ];

  const safeIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1) : 0;

  const SHORTCUT_MAP: Record<string, string> = {
    n: "new-task", d: "dashboard", t: "tasks-board",
    a: "agents", s: "skills", m: "memory",
    r: "agent-rules", h: "hooks", ",": "settings",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, items.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[safeIndex];
      if (!item) return;
      executeItem(item);
      return;
    }
    if (query === "" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const action = SHORTCUT_MAP[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        executeItem({ kind: "action", label: "", icon: "", bg: "", action });
        return;
      }
    }
  };

  const executeItem = useCallback((item: Item) => {
    if (item.kind === "action") {
      saveHistory(item.action);
      if (item.action === "new-task") {
        onCreateTask?.();
        onNavigate("tasks-board");
      } else {
        onNavigate(item.action);
      }
    } else if (item.kind === "agent") {
      saveHistory(`agent:${item.agent.id}`);
      onNavigate("agents");
    } else if (item.kind === "task") {
      saveHistory(`task:${item.task.id}`);
      onNavigate("tasks-board");
    } else if (item.kind === "project") {
      saveHistory(`project:${item.project.id}`);
      onSelectProject?.(item.project);
    } else if (item.kind === "deliverable") {
      saveHistory(`deliverable:${item.item.id}`);
      onNavigate("deliverables");
    } else if (item.kind === "hook") {
      saveHistory(`hook:${item.hook.id}`);
      onNavigate("hooks");
    } else if (item.kind === "workflow") {
      saveHistory(`workflow:${item.wf.id}`);
      onNavigate("workflow");
    }
    onClose();
  }, [onClose, onCreateTask, onNavigate, onSelectProject]);

  if (!open) return null;

  let flatIdx = 0;

  // macOS row renderer
  function Row({ item, idx, children }: { item: Item; idx: number; children: React.ReactNode }) {
    const isSelected = idx === safeIndex;
    return (
      <button
        onClick={() => executeItem(item)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "0 10px",
          height: 44,
          background: "none",
          border: "none",
          cursor: "pointer",
          gap: 10,
          position: "relative",
        }}
      >
        {isSelected && (
          <span
            style={{
              position: "absolute",
              inset: "2px 6px",
              borderRadius: 8,
              background: "var(--th-hover-bg)",
              border: "1px solid var(--th-border)",
              pointerEvents: "none",
            }}
          />
        )}
        {children}
      </button>
    );
  }

  function IconBox({ icon, bg }: { icon: string; bg: string }) {
    return (
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      >
        {icon}
      </span>
    );
  }

  function SectionHeader({ label }: { label: string }) {
    return (
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--th-text-muted)",
          padding: "10px 16px 4px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    );
  }

  const sf: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  };

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10100,
        background: "var(--th-modal-overlay)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: "12vh",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-label="Spotlight"
        tabIndex={-1}
        style={{
          width: "min(680px, 92vw)",
          background: "var(--th-bg-elevated)",
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
          border: "1px solid var(--th-border-strong)",
          borderRadius: 18,
          boxShadow: "0 40px 120px rgba(0,0,0,0.5), var(--th-glass-shadow)",
          overflow: "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* ── Traffic Lights 타이틀바 ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px 6px",
          }}
        >
          <TrafficLights onClose={onClose} />
        </div>

        {/* ── 검색 입력창 ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 18px",
            height: 56,
            borderBottom: items.length > 0 || currentProject
              ? "1px solid var(--th-border)"
              : "none",
          }}
        >
          <svg
            width="20" height="20" viewBox="0 0 20 20" fill="none"
            style={{ flexShrink: 0, color: "var(--th-text-muted)" }}
          >
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.8" />
            <line x1="12.9" y1="12.9" x2="17.5" y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={(e) => {
              if (["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
                e.stopPropagation();
                handleKeyDown(e as unknown as React.KeyboardEvent<HTMLDivElement>);
              }
            }}
            placeholder={t({ ko: "AgentDesk 검색...", en: "Search AgentDesk...", ja: "AgentDesk を検索...", zh: "搜索 AgentDesk..." })}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              ...sf,
              fontSize: 22,
              fontWeight: 300,
              color: "var(--th-text-primary)",
              minWidth: 0,
              letterSpacing: "-0.01em",
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "var(--th-hover-bg)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--th-text-muted)", fontSize: 12, flexShrink: 0,
              }}
            >
              ✕
            </button>
          ) : (
            <kbd
              style={{
                ...sf,
                fontSize: 11,
                color: "var(--th-text-muted)",
                background: "var(--th-bg-panel)",
                border: "1px solid var(--th-border)",
                borderRadius: 5,
                padding: "2px 7px",
                flexShrink: 0,
              }}
            >
              Esc
            </kbd>
          )}
        </div>

        {/* ── 현재 프로젝트 컨텍스트 ── */}
        {currentProject && (
          <div
            style={{
              padding: "5px 18px",
              borderBottom: "1px solid var(--th-border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)" }}>
              {t({ ko: "현재 프로젝트", en: "Project", ja: "現在", zh: "当前" })}
            </span>
            <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>›</span>
            <span style={{ ...sf, fontSize: 11, color: "var(--th-accent)", fontWeight: 600 }}>{currentProject.name}</span>
          </div>
        )}

        {/* ── 결과 목록 ── */}
        <div style={{ maxHeight: "58vh", overflowY: "auto", paddingBottom: 8 }}>

          {/* 최근 실행 */}
          {recentActions.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "최근 실행", en: "Recent", ja: "最近", zh: "最近" })} />
              {recentActions.map((act) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                return (
                  <Row key={`recent-${act.action}`} item={{ kind: "action", ...act }} idx={idx}>
                    <IconBox icon="↩" bg="var(--th-bg-panel)" />
                    <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-secondary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                      {act.label}
                    </span>
                    <span style={{ ...sf, fontSize: 10, color: "var(--th-text-muted)", position: "relative", zIndex: 1 }}>
                      {t({ ko: "최근", en: "recent", ja: "最近", zh: "最近" })}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <SectionHeader label={q
                ? t({ ko: "뷰 / 액션", en: "Actions", ja: "アクション", zh: "操作" })
                : t({ ko: "빠른 이동", en: "Navigation", ja: "ナビ", zh: "导航" })}
              />
              {filteredActions.map((act) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                return (
                  <Row key={act.action} item={{ kind: "action", ...act }} idx={idx}>
                    <IconBox icon={act.icon} bg={act.bg} />
                    <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                      {act.label}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 프로젝트 */}
          {filteredProjects.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "프로젝트 전환", en: "Projects", ja: "プロジェクト", zh: "项目" })} />
              {filteredProjects.map((project) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                return (
                  <Row key={project.id} item={{ kind: "project", project }} idx={idx}>
                    <IconBox icon="📁" bg="var(--th-bg-panel)" />
                    <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                      <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                      </div>
                      {project.project_path && (
                        <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                          {project.project_path}
                        </div>
                      )}
                    </div>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 에이전트 */}
          {filteredAgents.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" })} />
              {filteredAgents.map((agent) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                const dot = STATUS_DOT[agent.status] ?? STATUS_DOT.idle;
                return (
                  <Row key={agent.id} item={{ kind: "agent", agent }} idx={idx}>
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: "var(--th-bg-panel)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0, position: "relative", zIndex: 1,
                      }}
                    >
                      {agent.avatar_emoji ?? "🤖"}
                    </span>
                    <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
                      {agent.name}
                    </span>
                    <span
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        position: "relative", zIndex: 1,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot.color, display: "inline-block" }} />
                      <span style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", textTransform: "uppercase" }}>{dot.label}</span>
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 태스크 */}
          {filteredTasks.length > 0 && (
            <div>
              <SectionHeader label={q
                ? t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" })
                : t({ ko: "진행중 태스크", en: "In Progress", ja: "進行中", zh: "进行中" })}
              />
              {filteredTasks.map((task) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                return (
                  <Row key={task.id} item={{ kind: "task", task }} idx={idx}>
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: "rgba(48,209,88,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, flexShrink: 0, position: "relative", zIndex: 1,
                        color: "#30d158", fontFamily: "var(--th-font-mono)", fontWeight: 700,
                      }}
                    >
                      #{task.id}
                    </span>
                    <span style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>
                      {task.title}
                    </span>
                    <span
                      style={{
                        ...sf, fontSize: 10,
                        color: "var(--th-text-muted)",
                        background: "var(--th-bg-panel)",
                        borderRadius: 5,
                        padding: "2px 7px",
                        flexShrink: 0,
                        position: "relative", zIndex: 1,
                      }}
                    >
                      {task.status?.replace("_", " ").toUpperCase()}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 산출물 */}
          {filteredDeliverables.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "산출물", en: "Deliverables", ja: "成果物", zh: "产出物" })} />
              {filteredDeliverables.map((d) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                const isDone = d.status === "done";
                return (
                  <Row key={d.id} item={{ kind: "deliverable", item: d }} idx={idx}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: isDone ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, position: "relative", zIndex: 1 }}>
                      {isDone ? "✓" : "·"}
                    </span>
                    <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                      <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                      {d.agent_name && <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", marginTop: 1 }}>{d.agent_name}{d.project_name ? ` · ${d.project_name}` : ""}</div>}
                    </div>
                    <span style={{ ...sf, fontSize: 10, color: isDone ? "#4ade80" : "var(--th-accent)", background: "var(--th-bg-panel)", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1, textTransform: "uppercase" }}>
                      {d.status}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 훅 */}
          {filteredHooks.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" })} />
              {filteredHooks.map((h) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                return (
                  <Row key={h.id} item={{ kind: "hook", hook: h }} idx={idx}>
                    <IconBox icon="⤷" bg="#32ade6" />
                    <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                      <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                      <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1, fontFamily: "var(--th-font-mono)" }}>{h.command}</div>
                    </div>
                    <span style={{ ...sf, fontSize: 10, color: "var(--th-text-muted)", background: "var(--th-bg-panel)", borderRadius: 5, padding: "2px 7px", flexShrink: 0, position: "relative", zIndex: 1 }}>
                      {h.event_type}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 워크플로 */}
          {filteredWorkflows.length > 0 && (
            <div>
              <SectionHeader label={t({ ko: "저장된 워크플로", en: "Workflows", ja: "ワークフロー", zh: "工作流" })} />
              {filteredWorkflows.map((wf) => {
                const idx = flatIdx++;
                const isSel = idx === safeIndex;
                let nodeCount = 0;
                try { nodeCount = (JSON.parse(wf.nodes_json) as unknown[]).length; } catch { /* ignore */ }
                return (
                  <Row key={wf.id} item={{ kind: "workflow", wf }} idx={idx}>
                    <IconBox icon="⬡" bg="#8b5cf6" />
                    <div style={{ flex: 1, textAlign: "left", overflow: "hidden", position: "relative", zIndex: 1 }}>
                      <div style={{ ...sf, fontSize: 14, color: isSel ? "var(--th-text-heading)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</div>
                      <div style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", marginTop: 1 }}>{nodeCount} nodes</div>
                    </div>
                  </Row>
                );
              })}
            </div>
          )}

          {/* 결과 없음 */}
          {items.length === 0 && query && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                ...sf,
                fontSize: 14,
                color: "var(--th-text-muted)",
              }}
            >
              {t({ ko: `"${query}"에 대한 결과 없음`, en: `No results for "${query}"`, ja: `"${query}"の結果なし`, zh: `"${query}"没有结果` })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            borderTop: "1px solid var(--th-border)",
            padding: "7px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--th-bg-panel)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {[
              { key: "↑↓", label: t({ ko: "이동", en: "navigate", ja: "移動", zh: "导航" }) },
              { key: "↵", label: t({ ko: "선택", en: "select", ja: "選択", zh: "选择" }) },
              { key: "Esc", label: t({ ko: "닫기", en: "close", ja: "閉じる", zh: "关闭" }) },
            ].map(({ key, label }) => (
              <span key={key} style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <kbd
                  style={{
                    background: "var(--th-bg-elevated)",
                    border: "1px solid var(--th-border)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: 10,
                    color: "var(--th-text-muted)",
                    fontFamily: "inherit",
                  }}
                >
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
          {onOpenShortcutsGuide && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenShortcutsGuide(); }}
              style={{
                ...sf,
                fontSize: 11,
                color: "var(--th-text-muted)",
                background: "var(--th-bg-elevated)",
                border: "1px solid var(--th-border)",
                borderRadius: 5,
                padding: "2px 9px",
                cursor: "pointer",
              }}
            >
              ? {t({ ko: "단축키", en: "Shortcuts", ja: "ショートカット", zh: "快捷键" })}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
