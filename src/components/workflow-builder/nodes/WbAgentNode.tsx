import { type NodeProps, Handle, Position } from "@xyflow/react";
import { useI18n } from "../../../i18n";

export type AgentNodeData = {
  label: string;
  agentName?: string;
  skill?: string;
  provider?: string;
  emoji?: string;
};

export default function WbAgentNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const d = data as AgentNodeData;
  const mono = "var(--th-font-mono)";
  const accent = "var(--th-accent)";

  return (
    <div
      style={{
        minWidth: 160,
        background: "var(--th-bg-elevated)",
        border: `2px solid ${selected ? accent : "var(--th-border)"}`,
        borderTop: "3px solid var(--th-accent)",
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected ? "0 0 0 2px var(--th-accent)33" : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: "var(--th-accent)",
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
        <span style={{ fontSize: 12 }}>{d.emoji ?? "⊙"}</span>
        <span style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {t({ ko: "에이전트", en: "agent", ja: "エージェント", zh: "代理" })}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 10px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
          {d.label || t({ ko: "에이전트 스텝", en: "Agent Step", ja: "エージェントステップ", zh: "代理步骤" })}
        </div>
        {d.agentName && (
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
            @{d.agentName}
          </div>
        )}
        {d.skill && (
          <div style={{
            display: "inline-block",
            marginTop: 4,
            padding: "1px 6px",
            background: "var(--th-active-bg)",
            borderRadius: 4,
            fontSize: 9,
            color: accent,
          }}>
            {d.skill}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "var(--th-accent)",
          border: "2px solid var(--th-bg-elevated)",
        }}
      />
    </div>
  );
}
