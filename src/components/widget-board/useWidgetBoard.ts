import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "agentdesk:widget-board-layout";

export interface WidgetCell {
  id: string;         // unique cell id (uuid)
  featureId: string;  // custom feature id
  span: 1 | 2 | 3;   // column span in 3-col grid
}

function loadLayout(): WidgetCell[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WidgetCell[]) : [];
  } catch {
    return [];
  }
}

function saveLayout(cells: WidgetCell[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
  } catch { /* ignore */ }
}

export function useWidgetBoard() {
  const [cells, setCells] = useState<WidgetCell[]>(loadLayout);

  // persist on change
  useEffect(() => { saveLayout(cells); }, [cells]);

  const addWidget = useCallback((featureId: string) => {
    const id = crypto.randomUUID();
    setCells((prev) => [...prev, { id, featureId, span: 1 }]);
  }, []);

  const removeWidget = useCallback((cellId: string) => {
    setCells((prev) => prev.filter((c) => c.id !== cellId));
  }, []);

  const changeSpan = useCallback((cellId: string, span: 1 | 2 | 3) => {
    setCells((prev) => prev.map((c) => c.id === cellId ? { ...c, span } : c));
  }, []);

  /** Move cellId to just before targetId (or end if targetId is null) */
  const moveCell = useCallback((cellId: string, targetId: string | null) => {
    setCells((prev) => {
      const cell = prev.find((c) => c.id === cellId);
      if (!cell) return prev;
      const without = prev.filter((c) => c.id !== cellId);
      if (!targetId) return [...without, cell];
      const idx = without.findIndex((c) => c.id === targetId);
      if (idx === -1) return [...without, cell];
      const next = [...without];
      next.splice(idx, 0, cell);
      return next;
    });
  }, []);

  return { cells, addWidget, removeWidget, changeSpan, moveCell };
}
