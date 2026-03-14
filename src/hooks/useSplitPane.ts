import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "../app/types";

const LS_KEY = "agentdesk_split_pane";
const DEFAULT_SPLIT = 50; // percent
const MIN_SPLIT = 25;
const MAX_SPLIT = 75;

// Views allowed in secondary pane (monitoring/overview views)
export const SECONDARY_VIEWS: View[] = ["flow-graph", "heartbeat", "dashboard", "cli-usage"];

interface SplitPaneState {
  enabled: boolean;
  secondaryView: View;
  splitPct: number; // 25-75, left pane width %
}

function readFromStorage(): Partial<SplitPaneState> {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<SplitPaneState>;
  } catch { return {}; }
}

function writeToStorage(state: SplitPaneState) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function useSplitPane() {
  const saved = readFromStorage();
  const [enabled, setEnabled] = useState(saved.enabled ?? false);
  const [secondaryView, setSecondaryView] = useState<View>(saved.secondaryView ?? "flow-graph");
  const [splitPct, setSplitPct] = useState(saved.splitPct ?? DEFAULT_SPLIT);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Persist state
  useEffect(() => {
    writeToStorage({ enabled, secondaryView, splitPct });
  }, [enabled, secondaryView, splitPct]);

  const toggle = useCallback(() => setEnabled(v => !v), []);
  const close = useCallback(() => setEnabled(false), []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
      setSplitPct(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)));
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return { enabled, secondaryView, splitPct, containerRef, toggle, close, setSecondaryView, onDragStart };
}
