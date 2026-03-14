import { Handle, Position, type NodeProps } from "@xyflow/react";

export type CompAgentNodeData = {
  agentId: string;
  name: string;
  emoji: string;
  role: string;
  deptName: string;
  provider: string;
};

const ROLE_COLOR: Record<string, string> = {
  team_leader: "#f59e0b",
  senior: "var(--th-accent)",
  junior: "#10b981",
  intern: "#6b7280",
};

export default function CompAgentNode({ data, selected }: NodeProps) {
  const d = data as CompAgentNodeData;
  const roleColor = ROLE_COLOR[d.role] ?? "var(--th-accent)";
  const mono = "var(--th-font-mono)";

  return (
    <div
      style={{
        minWidth: 140,
        background: "var(--th-bg-elevated)",
        border: `1.5px solid ${selected ? "var(--th-accent)" : "var(--th-border)"}`,
        borderTop: `3px solid ${roleColor}`,
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected
          ? "0 0 0 2px var(--th-accent)33, 0 4px 12px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10, background: "var(--th-accent)", border: "2px solid var(--th-bg-elevated)" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px 5px" }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{d.emoji || "🤖"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--th-text-heading)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {d.name}
          </div>
          {d.deptName && (
            <div
              style={{
                fontSize: 9,
                color: "var(--th-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.deptName}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 10px 8px", display: "flex", alignItems: "center", gap: 5 }}>
        <span
          style={{
            fontSize: 9,
            padding: "1px 6px",
            borderRadius: 3,
            background: `${roleColor}22`,
            color: roleColor,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {d.role?.replace("_", " ") || "agent"}
        </span>
        {d.provider && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 3,
              background: "var(--th-bg-panel)",
              color: "var(--th-text-muted)",
              border: "1px solid var(--th-border)",
            }}
          >
            {d.provider}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10, background: "var(--th-accent)", border: "2px solid var(--th-bg-elevated)" }}
      />
    </div>
  );
}
