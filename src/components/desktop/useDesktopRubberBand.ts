import { useState, useRef, useCallback } from "react";
import { useUiStore } from "../../store/uiStore";

export function useDesktopRubberBand(
  setSelectedIconIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
  setSelectedProjectId: (v: string | null) => void,
) {
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const selectionRectLive = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const justFinishedRubberBand = useRef(false);
  const iconPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onContentMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (e.target !== e.currentTarget) return;

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        setSelectedIconIds(new Set());
      }

      selectionStart.current = { x: e.clientX, y: e.clientY - 44 };
      selectionRectLive.current = null;

      function onMove(ev: MouseEvent) {
        if (!selectionStart.current) return;
        const sx = selectionStart.current.x;
        const sy = selectionStart.current.y;
        const cx = ev.clientX;
        const cy = ev.clientY - 44;
        const dx = Math.abs(cx - sx);
        const dy = Math.abs(cy - sy);
        if (dx < 4 && dy < 4) return;

        const rect = {
          x: Math.min(sx, cx),
          y: Math.min(sy, cy),
          w: Math.abs(cx - sx),
          h: Math.abs(cy - sy),
        };
        selectionRectLive.current = rect;
        setSelectionRect({ ...rect });
      }

      function onUp() {
        const rect = selectionRectLive.current;
        if (rect && (rect.w > 4 || rect.h > 4)) {
          const layout = useUiStore.getState().desktopIconLayout;
          const newSel = new Set<string>();
          iconPositionsRef.current.forEach((pos, id) => {
            const p = layout[id] ?? pos;
            const inRect =
              p.x < rect.x + rect.w &&
              p.x + 72 > rect.x &&
              p.y < rect.y + rect.h &&
              p.y + 80 > rect.y;
            if (inRect) newSel.add(id);
          });
          if (newSel.size > 0) {
            justFinishedRubberBand.current = true;
            setSelectedIconIds(newSel);
          }
        }
        setSelectionRect(null);
        selectionRectLive.current = null;
        selectionStart.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [setSelectedIconIds],
  );

  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (justFinishedRubberBand.current) {
        justFinishedRubberBand.current = false;
        return;
      }
      setSelectedIconIds(new Set());
      setSelectedProjectId(null);
    },
    [setSelectedIconIds, setSelectedProjectId],
  );

  return {
    selectionRect,
    onContentMouseDown,
    onContentClick,
    iconPositionsRef,
  };
}
