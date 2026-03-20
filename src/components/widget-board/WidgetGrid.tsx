import { useState, useCallback } from "react";
import type { WidgetCell } from "./useWidgetBoard";
import type { CustomFeature } from "../../types";
import WidgetGridCell from "./WidgetGridCell";

interface Props {
  cells: WidgetCell[];
  features: CustomFeature[];
  onRemove: (cellId: string) => void;
  onChangeSpan: (cellId: string, span: 1 | 2 | 3) => void;
  onMove: (cellId: string, targetId: string | null) => void;
}

const mono = "var(--th-font-mono, monospace)";

export default function WidgetGrid({ cells, features, onRemove, onChangeSpan, onMove }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((cellId: string) => {
    setDraggingId(cellId);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, cellId: string) => {
    if (cellId !== draggingId) setDragOverId(cellId);
  }, [draggingId]);

  const handleDrop = useCallback((targetId: string) => {
    if (draggingId && draggingId !== targetId) {
      onMove(draggingId, targetId);
    }
    setDraggingId(null);
    setDragOverId(null);
  }, [draggingId, onMove]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  if (cells.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 10,
        fontFamily: mono,
      }}>
        <span style={{ fontSize: 32, opacity: 0.15 }}>⊞</span>
        <div style={{ fontSize: 12, color: "var(--th-text-muted)", fontWeight: 600 }}>
          No widgets added yet
        </div>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
          Click "+ Add Widget" to get started
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        // drop on empty area → move to end
        if (draggingId && !dragOverId) {
          onMove(draggingId, null);
          setDraggingId(null);
        }
      }}
      onDragEnd={handleDragEnd}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
        padding: 16,
        alignContent: "start",
        minHeight: "100%",
      }}
    >
      {cells.map((cell) => {
        const feature = features.find((f) => f.id === cell.featureId);
        return (
          <WidgetGridCell
            key={cell.id}
            cell={cell}
            feature={feature}
            onRemove={onRemove}
            onChangeSpan={onChangeSpan}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={draggingId === cell.id}
            isDragOver={dragOverId === cell.id}
          />
        );
      })}
    </div>
  );
}
