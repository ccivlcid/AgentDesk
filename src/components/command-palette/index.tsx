import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import { getDeliverables, type DeliverableItem } from "../../api/providers-reports-github";
import { getHooks } from "../../api/hooks";
import type { HookEntry } from "../../types";
import { loadHistory, saveHistory } from "./historyStorage";
import { SHORTCUT_MAP } from "./constants";
import { getQuickActions } from "./getQuickActions";
import { buildPaletteModel } from "./buildPaletteModel";
import type { CommandPaletteProps, PaletteItem, WfTemplate } from "./types";
import { CommandPaletteSearchSection } from "./CommandPaletteSearchSection";
import { CommandPaletteResults } from "./CommandPaletteResults";
import { CommandPaletteFooter } from "./CommandPaletteFooter";

export default function CommandPalette({
  open,
  onClose,
  agents = [],
  tasks = [],
  projects = [],
  currentProject,
  onNavigate,
  onSelectProject,
  onOpenShortcutsGuide,
}: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const quickActions = useMemo(() => getQuickActions(t), [t]);

  const model = useMemo(
    () =>
      buildPaletteModel(
        query,
        quickActions,
        history,
        agents,
        tasks,
        projects,
        currentProject,
        deliverables,
        hooks,
        workflows,
      ),
    [query, quickActions, history, agents, tasks, projects, currentProject, deliverables, hooks, workflows],
  );

  const { items } = model;
  const safeIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1) : 0;

  const executeItem = useCallback((item: PaletteItem) => {
    if (item.kind === "action") {
      saveHistory(item.action);
      onNavigate(item.action);
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
  }, [onClose, onNavigate, onSelectProject]);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<Element>) => {
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
  }, [executeItem, items, onClose, query, safeIndex]);

  if (!open) return null;

  const showSearchBottomBorder = items.length > 0 || Boolean(currentProject);

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
        <CommandPaletteSearchSection
          t={t}
          inputRef={inputRef}
          query={query}
          setQuery={setQuery}
          setSelectedIndex={setSelectedIndex}
          currentProject={currentProject}
          showSearchBottomBorder={showSearchBottomBorder}
          onClose={onClose}
          onInputKeyDown={(e) => {
            if (["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
              e.stopPropagation();
              handleKeyDown(e);
            }
          }}
        />

        <CommandPaletteResults
          t={t}
          query={query}
          model={model}
          safeIndex={safeIndex}
          onExecuteItem={executeItem}
        />

        <CommandPaletteFooter
          t={t}
          onClose={onClose}
          onOpenShortcutsGuide={onOpenShortcutsGuide}
        />
      </div>
    </div>,
    document.body,
  );
}
