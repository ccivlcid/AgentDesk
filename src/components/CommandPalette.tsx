import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent, Task, Project } from "../types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  agents?: Agent[];
  tasks?: Task[];
  projects?: Project[];
  currentProject?: Project | null;
  onNavigate: (view: string) => void;
  onCreateTask?: () => void;
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

const QUICK_ACTIONS = [
  { label: "New Task", icon: "+", shortcut: "N", action: "new-task" },
  { label: "Go to Task Board", icon: "▦", shortcut: "T", action: "tasks-board" },
  { label: "Open Settings", icon: "⚙", shortcut: ",", action: "settings" },
];

export default function CommandPalette({
  open,
  onClose,
  agents = [],
  tasks = [],
  projects = [],
  currentProject,
  onNavigate,
  onCreateTask,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filtered results
  const q = query.toLowerCase().trim();

  const filteredAgents = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q))
    : agents.slice(0, 5);

  const filteredTasks = q
    ? tasks.filter((t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q))
    : tasks.filter((t) => t.status === "in_progress").slice(0, 5);

  const filteredActions = q
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
    : QUICK_ACTIONS;

  // Flat list for keyboard navigation
  type Item =
    | { kind: "action"; label: string; icon: string; shortcut?: string; action: string }
    | { kind: "agent"; agent: Agent }
    | { kind: "task"; task: Task };

  const items: Item[] = [
    ...filteredActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredAgents.map((a) => ({ kind: "agent" as const, agent: a })),
    ...filteredTasks.map((t) => ({ kind: "task" as const, task: t })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selectedIndex];
      if (!item) return;
      executeItem(item);
    }
  };

  const executeItem = (item: Item) => {
    if (item.kind === "action") {
      if (item.action === "new-task") { onCreateTask?.(); }
      else { onNavigate(item.action); }
    } else if (item.kind === "agent") {
      onNavigate("agents");
    } else if (item.kind === "task") {
      onNavigate("tasks-board");
    }
    onClose();
  };

  if (!open) return null;

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const muted = "var(--th-text-muted)";
  const border = "var(--th-border)";

  let flatIdx = 0;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10100,
        background: "rgba(0,0,0,0.6)",
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
        style={{
          width: "min(600px, 92vw)",
          background: "var(--th-bg-elevated)",
          border: `1px solid ${border}`,
          borderRadius: 0,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${border}` }}>
          <span style={{ ...mono, color: "#f59e0b", fontSize: "0.85rem", marginRight: 8 }}>▶</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search tasks, agents, actions..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              ...mono,
              fontSize: "0.875rem",
              color: "var(--th-text-primary)",
            }}
          />
          <span style={{ ...mono, fontSize: "0.7rem", color: muted, padding: "2px 6px", border: `1px solid ${border}` }}>
            Esc
          </span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                QUICK ACTIONS
              </div>
              {filteredActions.map((act) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={act.action}
                    onClick={() => executeItem({ kind: "action", ...act })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "rgba(245,158,11,0.08)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? "2px solid #f59e0b" : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "#f59e0b" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.85rem", width: 16, textAlign: "center" }}>{act.icon}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{act.label}</span>
                    {act.shortcut && (
                      <span style={{ ...mono, fontSize: "0.65rem", color: muted, padding: "1px 5px", border: `1px solid ${border}` }}>{act.shortcut}</span>
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
                AGENTS
              </div>
              {filteredAgents.map((agent) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
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
                      background: isSelected ? "rgba(245,158,11,0.08)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? "2px solid #f59e0b" : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-primary)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{agent.avatar_emoji ?? "🤖"}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left" }}>{agent.name}</span>
                    <span style={{ ...mono, fontSize: "0.7rem", color: STATUS_COLOR[statusKey] ?? muted }}>
                      {STATUS_ICON[statusKey] ?? "○"} {statusKey.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tasks (recent/in-progress) */}
          {filteredTasks.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: muted, padding: "8px 16px 4px", textTransform: "uppercase" }}>
                {q ? "TASKS" : "RECENT TASKS"}
              </div>
              {filteredTasks.map((task) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={task.id}
                    onClick={() => executeItem({ kind: "task", task })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "8px 16px",
                      background: isSelected ? "rgba(245,158,11,0.08)" : "transparent",
                      border: "none",
                      borderLeft: isSelected ? "2px solid #f59e0b" : "2px solid transparent",
                      cursor: "pointer",
                      gap: 10,
                      color: isSelected ? "var(--th-text-primary)" : "var(--th-text-secondary)",
                    }}
                  >
                    <span style={{ ...mono, fontSize: "0.7rem", color: muted, minWidth: 50 }}>#{task.id}</span>
                    <span style={{ ...mono, fontSize: "0.8rem", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                    <span style={{ ...mono, fontSize: "0.65rem", color: muted, padding: "1px 5px", border: `1px solid ${border}` }}>
                      {task.status?.replace("_", " ").toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", ...mono, fontSize: "0.8rem", color: muted }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
