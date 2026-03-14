import { type NodeProps, Handle, Position } from "@xyflow/react";
import { useI18n } from "../../../i18n";

export type TriggerNodeData = {
  label: string;
  triggerType: "schedule" | "webhook" | "messenger" | "manual";
};

const TRIGGER_ICONS: Record<TriggerNodeData["triggerType"], string> = {
  schedule: "⏱",
  webhook: "⚡",
  messenger: "✉",
  manual: "▶",
};

const TRIGGER_COLORS: Record<TriggerNodeData["triggerType"], string> = {
  schedule: "#6366f1",
  webhook: "#f59e0b",
  messenger: "#10b981",
  manual: "#3b82f6",
};

export default function WbTriggerNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const d = data as TriggerNodeData;
  const icon = TRIGGER_ICONS[d.triggerType] ?? "▶";
  const color = TRIGGER_COLORS[d.triggerType] ?? "#3b82f6";
  const mono = "var(--th-font-mono)";

  return (
    <div
      style={{
        minWidth: 140,
        background: "var(--th-bg-elevated)",
        border: `2px solid ${selected ? color : "var(--th-border)"}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected ? `0 0 0 2px ${color}33` : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px 4px",
        borderBottom: "1px solid var(--th-border)",
      }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 9, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t({ ko: "트리거", en: "trigger", ja: "トリガー", zh: "触发器" })}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-text-heading)" }}>
          {d.label || t({ ko: "트리거", en: "Trigger", ja: "トリガー", zh: "触发" })}
        </div>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
          {d.triggerType}
        </div>
      </div>

      {/* Only output handle — triggers don't receive edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: color,
          border: "2px solid var(--th-bg-elevated)",
        }}
      />
    </div>
  );
}
