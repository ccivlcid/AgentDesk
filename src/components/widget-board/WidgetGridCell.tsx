import type { WidgetCell } from "./useWidgetBoard";
import type { CustomFeature } from "../../types";
import CustomFeatureRenderer from "../widget-builder/CustomFeatureRenderer";

interface Props {
  cell: WidgetCell;
  feature: CustomFeature | undefined;
  onRemove: (cellId: string) => void;
  onChangeSpan: (cellId: string, span: 1 | 2 | 3) => void;
  onDragStart: (cellId: string) => void;
  onDragOver: (e: React.DragEvent, cellId: string) => void;
  onDrop: (cellId: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
}

const mono = "var(--th-font-mono, monospace)";

export default function WidgetGridCell({
  cell,
  feature,
  onRemove,
  onChangeSpan,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: Props) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(cell.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, cell.id); }}
      onDrop={(e) => { e.preventDefault(); onDrop(cell.id); }}
      style={{
        gridColumn: `span ${cell.span}`,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        border: `1.5px solid ${isDragOver ? "var(--th-accent)" : "var(--th-border)"}`,
        borderRadius: 10,
        overflow: "hidden",
        opacity: isDragging ? 0.4 : 1,
        transition: "border-color 0.15s, opacity 0.15s",
        minHeight: 180,
        boxShadow: isDragOver ? "0 0 0 2px var(--th-accent)" : "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* Cell header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 10px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        flexShrink: 0,
        cursor: "grab",
        userSelect: "none",
      }}>
        {/* Drag handle */}
        <span style={{ color: "var(--th-text-muted)", fontSize: 11, lineHeight: 1, opacity: 0.5 }}>⠿</span>

        {/* Feature icon + name */}
        {feature?.icon_svg ? (
          <span
            style={{ width: 14, height: 14, flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: feature.icon_svg }}
          />
        ) : (
          <span style={{ fontSize: 12 }}>⊙</span>
        )}
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--th-text)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {feature?.name ?? cell.featureId}
        </span>

        {/* Span controls */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpan(cell.id, s)}
              title={`${s} col span`}
              style={{
                fontFamily: mono,
                fontSize: 8,
                width: 16,
                height: 16,
                borderRadius: 3,
                border: `1px solid ${cell.span === s ? "var(--th-accent)" : "var(--th-border)"}`,
                background: cell.span === s ? "var(--th-accent)" : "none",
                color: cell.span === s ? "#fff" : "var(--th-text-muted)",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(cell.id)}
          title="Remove widget"
          style={{
            fontFamily: mono,
            fontSize: 13,
            lineHeight: 1,
            background: "none",
            border: "none",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            padding: "0 2px",
            flexShrink: 0,
            opacity: 0.5,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
        >
          ×
        </button>
      </div>

      {/* Widget content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {feature ? (
          <CustomFeatureRenderer feature={feature} />
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            fontStyle: "italic",
          }}>
            Widget not found
          </div>
        )}
      </div>
    </div>
  );
}
