import { type NodeProps, Handle, Position } from "@xyflow/react";
import { useI18n } from "../../../i18n";

export type ConditionNodeData = {
  label: string;
  expression?: string;
};

export default function WbConditionNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const d = data as ConditionNodeData;
  const mono = "var(--th-font-mono)";
  const condColor = "#f59e0b";

  return (
    <div
      style={{
        minWidth: 150,
        background: "var(--th-bg-elevated)",
        border: `2px solid ${selected ? condColor : "var(--th-border)"}`,
        borderTop: `3px solid ${condColor}`,
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected ? `0 0 0 2px ${condColor}33` : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: condColor,
          border: "2px solid var(--th-bg-elevated)",
        }}
      />

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px 4px",
        borderBottom: "1px solid var(--th-border)",
      }}>
        <span style={{ fontSize: 12 }}>◇</span>
        <span style={{ fontSize: 9, color: condColor, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t({ ko: "조건", en: "condition", ja: "条件", zh: "条件" })}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-text-heading)" }}>
          {d.label || t({ ko: "조건 체크", en: "Check Condition", ja: "条件確認", zh: "检查条件" })}
        </div>
        {d.expression && (
          <div style={{
            marginTop: 4,
            padding: "2px 6px",
            background: "var(--th-bg-base)",
            borderRadius: 4,
            fontSize: 10,
            color: condColor,
            fontFamily: mono,
            wordBreak: "break-all",
          }}>
            {d.expression}
          </div>
        )}
        {/* True / False labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "var(--th-text-muted)" }}>
          <span style={{ color: "#10b981" }}>✓ true</span>
          <span style={{ color: "#ef4444" }}>✗ false</span>
        </div>
      </div>

      {/* true handle */}
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "#10b981",
          border: "2px solid var(--th-bg-elevated)",
          left: "33%",
          transform: "translateX(-50%)",
        }}
      />
      {/* false handle */}
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "#ef4444",
          border: "2px solid var(--th-bg-elevated)",
          left: "67%",
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}
