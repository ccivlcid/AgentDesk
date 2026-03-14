import { type NodeProps, Handle, Position } from "@xyflow/react";
import { useI18n } from "../../../i18n";

export type GateNodeData = {
  label: string;
  branches: Array<"success" | "failure" | "timeout">;
};

const BRANCH_COLORS: Record<string, string> = {
  success: "#10b981",
  failure: "#ef4444",
  timeout: "#f59e0b",
};

const BRANCH_LABELS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  success: { ko: "성공", en: "success", ja: "成功", zh: "成功" },
  failure: { ko: "실패", en: "failure", ja: "失敗", zh: "失败" },
  timeout: { ko: "타임아웃", en: "timeout", ja: "タイムアウト", zh: "超时" },
};

export default function WbGateNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const d = data as GateNodeData;
  const mono = "var(--th-font-mono)";
  const gateColor = "#8b5cf6";

  const branches = d.branches?.length ? d.branches : ["success", "failure"];

  return (
    <div
      style={{
        minWidth: 150,
        background: "var(--th-bg-elevated)",
        border: `2px solid ${selected ? gateColor : "var(--th-border)"}`,
        borderTop: `3px solid ${gateColor}`,
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected ? `0 0 0 2px ${gateColor}33` : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: gateColor,
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
        <span style={{ fontSize: 12 }}>⑂</span>
        <span style={{ fontSize: 9, color: gateColor, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t({ ko: "게이트", en: "gate", ja: "ゲート", zh: "门控" })}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 10px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-text-heading)" }}>
          {d.label || t({ ko: "분기", en: "Branch", ja: "分岐", zh: "分支" })}
        </div>
        {/* Branch indicators */}
        <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
          {branches.map((b) => (
            <span
              key={b}
              style={{
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 9,
                background: `${BRANCH_COLORS[b] ?? "#999"}22`,
                color: BRANCH_COLORS[b] ?? "#999",
                fontWeight: 600,
              }}
            >
              {t(BRANCH_LABELS[b] ?? { ko: b, en: b, ja: b, zh: b })}
            </span>
          ))}
        </div>
      </div>

      {/* Multiple source handles — one per branch */}
      {branches.map((b, i) => (
        <Handle
          key={b}
          id={b}
          type="source"
          position={Position.Bottom}
          style={{
            width: 10,
            height: 10,
            background: BRANCH_COLORS[b] ?? gateColor,
            border: "2px solid var(--th-bg-elevated)",
            left: `${((i + 1) / (branches.length + 1)) * 100}%`,
            transform: "translateX(-50%)",
          }}
        />
      ))}
    </div>
  );
}
