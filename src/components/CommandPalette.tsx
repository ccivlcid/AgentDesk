import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import type { Agent, Task, Project } from "../types";

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

const STATUS_ICON: Record<string, string> = {
  working: "●",
  running: "●",
  idle: "○",
  offline: "─",
  error: "✕",
};

const STATUS_COLOR: Record<string, string> = {
  working: "#22c55e",
  running: "#22c55e",
  idle: "#6e7681",
  offline: "#6e7681",
  error: "#ef4444",
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

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setHistory(loadHistory());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const QUICK_ACTIONS = [
    { label: t({ ko: "새 태스크 만들기", en: "New Task", ja: "新しいタスク", zh: "新建任务" }), icon: "+", shortcut: "N", action: "new-task" },
    { label: t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" }), icon: "▦", shortcut: "D", action: "dashboard" },
    { label: t({ ko: "태스크 보드", en: "Task Board", ja: "タスクボード", zh: "任务板" }), icon: "≡", shortcut: "T", action: "tasks-board" },
    { label: t({ ko: "에이전트 관리", en: "Agents", ja: "エージェント", zh: "代理管理" }), icon: "◎", shortcut: "A", action: "agents" },
    { label: t({ ko: "스킬 라이브러리", en: "Skills", ja: "スキル", zh: "技能库" }), icon: "⬡", shortcut: "S", action: "skills" },
    { label: t({ ko: "메모리", en: "Memory", ja: "メモリー", zh: "记忆" }), icon: "◈", shortcut: "M", action: "memory" },
    { label: t({ ko: "에이전트 룰", en: "Agent Rules", ja: "エージェントルール", zh: "代理规则" }), icon: "⊞", shortcut: "R", action: "agent-rules" },
    { label: t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" }), icon: "⤷", shortcut: "H", action: "hooks" },
    { label: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }), icon: "⚙", shortcut: ",", action: "settings" },
  ];

  // 히스토리 기반 최근 액션 (검색어 없을 때만)
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

  // Flat list for keyboard navigation
  type Item =
    | { kind: "action"; label: string; icon: string; shortcut?: string; action: string }
    | { kind: "agent"; agent: Agent }
    | { kind: "task"; task: Task }
    | { kind: "project"; project: Project };

  const items: Item[] = [
    ...recentActions.map((a) => ({ kind: "action" as const, ...a, _recent: true })),
    ...filteredActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredAgents.map((a) => ({ kind: "agent" as const, agent: a })),
    ...filteredTasks.map((t) => ({ kind: "task" as const, task: t })),
    ...filteredProjects.map((p) => ({ kind: "project" as const, project: p })),
  ];

  const safeIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1) : 0;

  // letter shortcut map (input이 비어있을 때만 동작)
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
    // input이 비어있을 때 letter shortcut 실행
    if (query === "" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const action = SHORTCUT_MAP[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        executeItem({ kind: "action", label: "", icon: "", action });
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
    }
    onClose();
  }, [onClose, onCreateTask, onNavigate, onSelectProject]);

  if (!open) return null;

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const muted = "var(--th-text-muted)";
  const border = "var(--th-border)";
  const accent = "var(--th-accent)";

  let flatIdx = 0;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10100,
        background: "var(--th-modal-overlay)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        tabIndex={-1}
        style={{
          width: "min(600px, 92vw)",
          background: "var(--th-bg-elevated)",
          border: `1px solid ${border}`,
          borderRadius: 10,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderBottom: `1px solid ${border}`,
            background: "var(--th-bg-panel)",
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        >
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-3 w-3 flex-shrink-0 rounded-full border-0 transition-opacity hover:opacity-90"
              style={{ background: "#ff5f57" }}
            />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
          </div>
          <div style={{ width: 1, height: 22, background: border, flexShrink: 0 }} />
          {/* Search input */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ ...mono, color: accent, fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>⌘</span>
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
              placeholder={t({ ko: "태스크, 에이전트, 프로젝트, 뷰 검색...", en: "Search tasks, agents, projects, views...", ja: "タスク、エージェント、プロジェクト、ビューを検索...", zh: "搜索任务、代理、项目、视图..." })}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                ...mono,
                fontSize: "13px",
                color: "var(--th-text-primary)",
                minWidth: 0,
              }}
            />
            <span style={{ ...mono, fontSize: "10px", color: muted, padding: "2px 6px", border: `1px solid ${border}`, flexShrink: 0 }}>
              Esc
            </span>
          </div>
        </div>

        {/* Current project context */}
        {currentProject && (
          <div style={{ padding: "6px 16px", borderBottom: `1px solid ${border}`, background: "var(--th-bg-base)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...mono, fontSize: "9px", color: muted }}>
              {t({ ko: "현재 프로젝트:", en: "project:", ja: "現在:", zh: "当前:" })}
            </span>
            <span style={{ ...mono, fontSize: "10px", color: accent, fontWeight: 600 }}>{currentProject.name}</span>
          </div>
        )}

        {/* Results */}
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {/* 최근 실행 */}
          {recentActions.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {t({ ko: "최근 실행", en: "Recent", ja: "最近の実行", zh: "最近使用" })}
              </div>
              {recentActions.map((act) => {
                const idx = flatIdx++;
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={`recent-${act.action}`}
                    onClick={() => executeItem({ kind: "action", ...act })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "7px 16px",
                      background: isSelected ? "var(--th-bg-surface)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.75rem", width: 16, textAlign: "center", flexShrink: 0, opacity: 0.6 }}>↩</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{act.label}</span>
                    <span style={{ ...mono, fontSize: "0.65rem", color: muted }}>최근</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions / Views */}
          {filteredActions.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {q ? t({ ko: "뷰 / 액션", en: "Views / Actions", ja: "ビュー / アクション", zh: "视图 / 操作" })
                   : t({ ko: "빠른 이동", en: "Quick Navigation", ja: "クイックナビ", zh: "快速导航" })}
              </div>
              {filteredActions.map((act) => {
                const idx = flatIdx++;
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={act.action}
                    onClick={() => executeItem({ kind: "action", ...act })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "var(--th-bg-surface)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.85rem", width: 16, textAlign: "center", flexShrink: 0 }}>{act.icon}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{act.label}</span>
                    {act.shortcut && (
                      <span style={{ ...mono, fontSize: "0.65rem", color: muted, padding: "1px 5px", border: `1px solid ${border}`, flexShrink: 0 }}>{act.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {t({ ko: "프로젝트 전환", en: "Switch Project", ja: "プロジェクト切替", zh: "切换项目" })}
              </div>
              {filteredProjects.map((project) => {
                const idx = flatIdx++;
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={project.id}
                    onClick={() => executeItem({ kind: "project", project })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "var(--th-bg-surface)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.85rem", width: 16, textAlign: "center", flexShrink: 0 }}>◇</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{project.name}</span>
                    {project.project_path && (
                      <span style={{ ...mono, fontSize: "0.65rem", color: muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.project_path}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Agents */}
          {filteredAgents.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" })}
              </div>
              {filteredAgents.map((agent) => {
                const idx = flatIdx++;
                const isSelected = idx === safeIndex;
                const statusKey = agent.status ?? "idle";
                return (
                  <button
                    key={agent.id}
                    onClick={() => executeItem({ kind: "agent", agent })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "var(--th-bg-surface)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ fontSize: "1rem", flexShrink: 0 }}>{agent.avatar_emoji ?? "🤖"}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{agent.name}</span>
                    <span style={{ ...mono, fontSize: "0.7rem", color: STATUS_COLOR[statusKey] ?? muted, flexShrink: 0 }}>
                      {STATUS_ICON[statusKey] ?? "○"} {statusKey.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {q ? t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" })
                   : t({ ko: "진행중 태스크", en: "In-Progress Tasks", ja: "進行中タスク", zh: "进行中任务" })}
              </div>
              {filteredTasks.map((task) => {
                const idx = flatIdx++;
                const isSelected = idx === safeIndex;
                return (
                  <button
                    key={task.id}
                    onClick={() => executeItem({ kind: "task", task })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "var(--th-bg-surface)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.7rem", color: muted, minWidth: 46, flexShrink: 0 }}>#{task.id}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                    <span style={{ ...mono, fontSize: "0.65rem", color: muted, padding: "1px 5px", border: `1px solid ${border}`, flexShrink: 0 }}>
                      {task.status?.replace("_", " ").toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", ...mono, fontSize: "0.8rem", color: muted }}>
              {t({ ko: `"${query}"에 대한 결과 없음`, en: `No results for "${query}"`, ja: `"${query}"の結果なし`, zh: `"${query}"没有结果` })}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${border}`, padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--th-bg-base)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[
                { key: "↑↓", label: t({ ko: "이동", en: "navigate", ja: "移動", zh: "导航" }) },
                { key: "↵", label: t({ ko: "선택", en: "select", ja: "選択", zh: "选择" }) },
                { key: "Esc", label: t({ ko: "닫기", en: "close", ja: "閉じる", zh: "关闭" }) },
              ].map(({ key, label }) => (
                <span key={key} style={{ ...mono, fontSize: "10px", color: muted, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ padding: "1px 5px", border: `1px solid ${border}` }}>{key}</span>
                  {label}
                </span>
              ))}
            </div>
            {onOpenShortcutsGuide && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenShortcutsGuide(); }}
                style={{ ...mono, fontSize: "10px", color: muted, background: "transparent", border: `1px solid ${border}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
                className="hover:!text-[var(--th-text-secondary)] hover:!border-[var(--th-border-strong)]"
              >
                ? {t({ ko: "단축키 가이드", en: "Shortcuts Guide", ja: "ショートカットガイド", zh: "快捷键指南" })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
