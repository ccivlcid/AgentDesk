/**
 * Right Shelf 앱 목록 — localStorage 기반 커스텀 설정.
 */
import { useState, useCallback } from "react";
import type { WindowType } from "../../app/types";

const LS_KEY = "agentdesk_right_shelf";

const DEFAULT_IDS: WindowType[] = [];

function load(): WindowType[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as WindowType[];
  } catch { /* ignore */ }
  return DEFAULT_IDS;
}

function save(ids: WindowType[]) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export function useRightShelfConfig() {
  const [items, setItems] = useState<WindowType[]>(load);

  const addItem = useCallback((id: WindowType) => {
    setItems((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      save(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: WindowType) => {
    setItems((prev) => {
      const next = prev.filter((x) => x !== id);
      save(next);
      return next;
    });
  }, []);

  const moveItem = useCallback((from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      save(next);
      return next;
    });
  }, []);

  return { items, addItem, removeItem, moveItem };
}
