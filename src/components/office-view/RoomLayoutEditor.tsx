/* ================================================================== */
/*  Room Layout Editor — drag & drop furniture placement               */
/* ================================================================== */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  type FurnitureLayout,
  type FurniturePlacement,
  getRoomFurniture,
  getItemDef,
  updateFurniturePlacement,
  removeFurnitureFromRoom,
  saveFurnitureLayouts,
  snapToGrid,
} from "./furniture-catalog";

interface RoomLayoutEditorProps {
  roomId: string;
  roomW: number;
  roomH: number;
  layouts: FurnitureLayout;
  onLayoutChange: (layouts: FurnitureLayout) => void;
  language: "ko" | "en" | "ja" | "zh";
}

const L = {
  editorTitle: { ko: "\uBC30\uCE58 \uD3B8\uC9D1", en: "Layout Editor", ja: "\u30EC\u30A4\u30A2\u30A6\u30C8\u7DE8\u96C6", zh: "\u5E03\u5C40\u7F16\u8F91" },
  dragHint: { ko: "\uAC00\uAD6C\uB97C \uB4DC\uB798\uADF8\uD558\uC5EC \uC774\uB3D9\uD558\uC138\uC694", en: "Drag items to reposition", ja: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u79FB\u52D5", zh: "\u62D6\u52A8\u5BB6\u5177\u6765\u79FB\u52A8" },
  undo: { ko: "\uC2E4\uD589\uCDE8\uC18C", en: "Undo", ja: "\u5143\u306B\u623B\u3059", zh: "\u64A4\u9500" },
  redo: { ko: "\uB2E4\uC2DC\uC2E4\uD589", en: "Redo", ja: "\u3084\u308A\u76F4\u3057", zh: "\u91CD\u505A" },
  remove: { ko: "\uC81C\uAC70", en: "Remove", ja: "\u524A\u9664", zh: "\u79FB\u9664" },
};

const EDITOR_SCALE = 1.8;
const MIN_ROOM_DISPLAY_W = 200;

export default function RoomLayoutEditor({ roomId, roomW, roomH, layouts, onLayoutChange, language }: RoomLayoutEditorProps) {
  const placed = getRoomFurniture(layouts, roomId);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Undo/Redo
  const [history, setHistory] = useState<FurnitureLayout[]>([layouts]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const pushHistory = useCallback(
    (next: FurnitureLayout) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIdx + 1);
        const updated = [...truncated, next];
        if (updated.length > 30) updated.shift();
        return updated;
      });
      setHistoryIdx((prev) => Math.min(prev + 1, 30));
    },
    [historyIdx],
  );

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    const restored = history[newIdx];
    if (restored) {
      onLayoutChange(restored);
      saveFurnitureLayouts(restored);
    }
  }, [historyIdx, history, onLayoutChange]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const restored = history[newIdx];
    if (restored) {
      onLayoutChange(restored);
      saveFurnitureLayouts(restored);
    }
  }, [historyIdx, history, onLayoutChange]);

  // Dragging state
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const displayW = Math.max(MIN_ROOM_DISPLAY_W, roomW * EDITOR_SCALE);
  const displayH = roomH * EDITOR_SCALE;
  const scaleX = displayW / roomW;
  const scaleY = displayH / roomH;

  const getRelativePos = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scaleX,
        y: (e.clientY - rect.top) / scaleY,
      };
    },
    [scaleX, scaleY],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      const pos = getRelativePos(e);
      const item = placed[idx];
      const itemX = item.x ?? 20 + idx * 28;
      const itemY = item.y ?? roomH - 18;
      setDraggingIdx(idx);
      setSelectedIdx(idx);
      setDragOffset({ x: pos.x - itemX, y: pos.y - itemY });
      setDragPos({ x: itemX, y: itemY });
    },
    [getRelativePos, placed, roomH],
  );

  useEffect(() => {
    if (draggingIdx === null) return;

    const handleMove = (e: MouseEvent) => {
      const pos = getRelativePos(e);
      const newX = snapToGrid(Math.max(5, Math.min(roomW - 5, pos.x - dragOffset.x)));
      const newY = snapToGrid(Math.max(20, Math.min(roomH - 5, pos.y - dragOffset.y)));
      setDragPos({ x: newX, y: newY });
    };

    const handleUp = () => {
      if (draggingIdx !== null) {
        const next = updateFurniturePlacement(layouts, roomId, draggingIdx, dragPos.x, dragPos.y);
        onLayoutChange(next);
        saveFurnitureLayouts(next);
        pushHistory(next);
      }
      setDraggingIdx(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingIdx, dragOffset, dragPos, layouts, roomId, roomW, roomH, getRelativePos, onLayoutChange, pushHistory]);

  const handleRemove = useCallback(() => {
    if (selectedIdx === null) return;
    const next = removeFurnitureFromRoom(layouts, roomId, selectedIdx);
    onLayoutChange(next);
    saveFurnitureLayouts(next);
    pushHistory(next);
    setSelectedIdx(null);
  }, [selectedIdx, layouts, roomId, onLayoutChange, pushHistory]);

  // Handle keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdx !== null) {
          e.preventDefault();
          handleRemove();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedIdx, handleRemove]);

  if (placed.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{L.editorTitle[language]}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIdx <= 0}
            className="text-[10px] px-1.5 py-0.5 font-mono border disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
            title={`${L.undo[language]} (Ctrl+Z)`}
          >{L.undo[language]}</button>
          <button
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
            className="text-[10px] px-1.5 py-0.5 font-mono border disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
            title={`${L.redo[language]} (Ctrl+Shift+Z)`}
          >{L.redo[language]}</button>
          {selectedIdx !== null && (
            <button
              onClick={handleRemove}
              className="text-[10px] px-1.5 py-0.5 font-mono"
              style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.5)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.08)" }}
              title={`${L.remove[language]} (Del)`}
            >{L.remove[language]}</button>
          )}
        </div>
      </div>
      <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.dragHint[language]}</div>
      <div
        ref={canvasRef}
        className="relative border overflow-hidden select-none"
        style={{
          borderRadius: "4px",
          borderColor: "var(--th-border)",
          width: displayW,
          height: displayH,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
        onClick={() => setSelectedIdx(null)}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
          {Array.from({ length: Math.ceil(roomW / 10) }, (_, i) => (
            <line key={`v${i}`} x1={i * 10 * scaleX} y1={0} x2={i * 10 * scaleX} y2={displayH} stroke="#4a5568" strokeWidth={0.5} />
          ))}
          {Array.from({ length: Math.ceil(roomH / 10) }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 10 * scaleY} x2={displayW} y2={i * 10 * scaleY} stroke="#4a5568" strokeWidth={0.5} />
          ))}
        </svg>

        {/* Room boundary */}
        <div
          className="absolute pointer-events-none"
          style={{ borderRadius: "2px", border: "1px solid rgba(100,116,139,0.4)", left: 2, top: 2, width: displayW - 4, height: displayH - 4 }}
        />

        {/* Agent area hint */}
        <div
          className="absolute pointer-events-none"
          style={{
            borderRadius: "2px",
            border: "1px dashed rgba(51,65,85,0.5)",
            left: 16 * scaleX,
            top: 38 * scaleY,
            width: (roomW - 32) * scaleX,
            height: Math.max(0, (roomH - 60)) * scaleY,
          }}
        >
          <span className="absolute top-0.5 left-1 text-[8px]" style={{ color: "var(--th-text-muted)" }}>Agent Area</span>
        </div>

        {/* Placed items */}
        {placed.map((p, idx) => {
          const def = getItemDef(p.itemId);
          if (!def) return null;
          const isDragging = draggingIdx === idx;
          const isSelected = selectedIdx === idx;
          const itemX = isDragging ? dragPos.x : p.x ?? 20 + idx * 28;
          const itemY = isDragging ? dragPos.y : p.y ?? roomH - 18;
          return (
            <div
              key={idx}
              className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow ${
                isSelected ? "ring-2 ring-[var(--th-accent)] z-20" : isDragging ? "z-30" : "z-10"
              }`}
              style={{
                left: itemX * scaleX - (def.gridW * scaleX) / 2,
                top: itemY * scaleY - (def.gridH * scaleY) / 2,
                width: def.gridW * scaleX,
                height: def.gridH * scaleY,
                opacity: isDragging ? 0.8 : 1,
                background: isSelected ? "rgba(59,130,246,0.15)" : "rgba(30,41,59,0.6)",
                border: `1px solid ${isSelected ? "#3b82f6" : "#475569"}`,
                borderRadius: 3,
              }}
              onMouseDown={(e) => handleMouseDown(e, idx)}
              title={def.label[language]}
            >
              <span style={{ fontSize: Math.max(10, Math.min(16, def.gridW * scaleX * 0.5)) }}>
                {def.emoji}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
