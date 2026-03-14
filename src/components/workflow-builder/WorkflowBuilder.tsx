import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useI18n } from "../../i18n";
import WbTriggerNode, { type TriggerNodeData } from "./nodes/WbTriggerNode";
import WbAgentNode, { type AgentNodeData } from "./nodes/WbAgentNode";
import WbGateNode, { type GateNodeData } from "./nodes/WbGateNode";
import WbConditionNode, { type ConditionNodeData } from "./nodes/WbConditionNode";

const NODE_TYPES: NodeTypes = {
  trigger: WbTriggerNode,
  agent: WbAgentNode,
  gate: WbGateNode,
  condition: WbConditionNode,
};

const INITIAL_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 300, y: 40 },
    data: { label: "PR Created", triggerType: "webhook" } satisfies TriggerNodeData,
  },
  {
    id: "agent-1",
    type: "agent",
    position: { x: 240, y: 160 },
    data: { label: "Code Review", agentName: "reviewer", emoji: "⊙", skill: "code-review" } satisfies AgentNodeData,
  },
  {
    id: "gate-1",
    type: "gate",
    position: { x: 240, y: 300 },
    data: { label: "Review Result", branches: ["success", "failure"] } satisfies GateNodeData,
  },
  {
    id: "agent-2",
    type: "agent",
    position: { x: 440, y: 420 },
    data: { label: "Merge", agentName: "merger", emoji: "↗" } satisfies AgentNodeData,
  },
  {
    id: "agent-3",
    type: "agent",
    position: { x: 80, y: 420 },
    data: { label: "Fix Issues", agentName: "dev", emoji: "⊙", skill: "development" } satisfies AgentNodeData,
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e1", source: "trigger-1", target: "agent-1", animated: true },
  { id: "e2", source: "agent-1", target: "gate-1" },
  { id: "e3", source: "gate-1", sourceHandle: "success", target: "agent-2", label: "pass", style: { stroke: "#10b981" }, labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 10 } },
  { id: "e4", source: "gate-1", sourceHandle: "failure", target: "agent-3", label: "fail", style: { stroke: "#ef4444" }, labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 10 } },
];

const LS_KEY = "agentdesk_workflow_builder";

type PaletteItem = {
  type: "trigger" | "agent" | "gate" | "condition";
  label: string;
  icon: string;
  color: string;
  defaultData: TriggerNodeData | AgentNodeData | GateNodeData | ConditionNodeData;
};

export default function WorkflowBuilder() {
  const { t } = useI18n();
  const [nodes, setNodes, onNodesChange] = useNodesState(loadSaved()?.nodes ?? INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadSaved()?.edges ?? INITIAL_EDGES);
  const [saved, setSaved] = useState(false);
  const [workflowName, setWorkflowName] = useState(loadSaved()?.name ?? "PR Review Pipeline");

  const mono = "var(--th-font-mono)";

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges],
  );

  const handleSave = useCallback(() => {
    const state = { name: workflowName, nodes, edges };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [workflowName, nodes, edges]);

  const handleReset = useCallback(() => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setWorkflowName("PR Review Pipeline");
    localStorage.removeItem(LS_KEY);
  }, [setNodes, setEdges]);

  const handleAddNode = useCallback((item: PaletteItem) => {
    const id = `${item.type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: item.type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { ...item.defaultData },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const paletteItems: PaletteItem[] = [
    {
      type: "trigger",
      icon: "▶",
      color: "#3b82f6",
      label: t({ ko: "트리거", en: "Trigger", ja: "トリガー", zh: "触发器" }),
      defaultData: { label: t({ ko: "트리거", en: "Trigger", ja: "トリガー", zh: "触发器" }), triggerType: "manual" } as TriggerNodeData,
    },
    {
      type: "agent",
      icon: "⊙",
      color: "var(--th-accent)",
      label: t({ ko: "에이전트", en: "Agent", ja: "エージェント", zh: "代理" }),
      defaultData: { label: t({ ko: "에이전트 스텝", en: "Agent Step", ja: "エージェントステップ", zh: "代理步骤" }), emoji: "⊙" } as AgentNodeData,
    },
    {
      type: "gate",
      icon: "⑂",
      color: "#8b5cf6",
      label: t({ ko: "게이트", en: "Gate", ja: "ゲート", zh: "门控" }),
      defaultData: { label: t({ ko: "분기", en: "Branch", ja: "分岐", zh: "分支" }), branches: ["success", "failure"] } as GateNodeData,
    },
    {
      type: "condition",
      icon: "◇",
      color: "#f59e0b",
      label: t({ ko: "조건", en: "Condition", ja: "条件", zh: "条件" }),
      defaultData: { label: t({ ko: "조건 체크", en: "Check Condition", ja: "条件確認", zh: "检查条件" }) } as ConditionNodeData,
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Top toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {t({ ko: "워크플로 빌더", en: "Workflow Builder", ja: "ワークフロービルダー", zh: "工作流构建器" })}
        </span>
        <div style={{ width: 1, height: 16, background: "var(--th-border)" }} />
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--th-text-heading)",
            background: "transparent",
            border: "none",
            outline: "none",
            minWidth: 120,
          }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={handleReset}
            style={{
              fontFamily: mono,
              fontSize: 10,
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: 5,
              cursor: "pointer",
              color: "var(--th-text-muted)",
            }}
            className="hover:bg-[var(--th-hover-bg)] hover:!text-[var(--th-text)]"
          >
            {t({ ko: "초기화", en: "Reset", ja: "リセット", zh: "重置" })}
          </button>
          <button
            onClick={handleSave}
            style={{
              fontFamily: mono,
              fontSize: 10,
              padding: "4px 10px",
              background: saved ? "#10b98122" : "var(--th-accent)",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              color: saved ? "#10b981" : "#fff",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {saved
              ? t({ ko: "저장됨 ✓", en: "Saved ✓", ja: "保存済み ✓", zh: "已保存 ✓" })
              : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* Node palette */}
        <div style={{
          width: 120,
          flexShrink: 0,
          borderRight: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          display: "flex",
          flexDirection: "column",
          padding: "12px 8px",
          gap: 6,
          overflowY: "auto",
        }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            {t({ ko: "노드", en: "nodes", ja: "ノード", zh: "节点" })}
          </div>
          {paletteItems.map((item) => (
            <button
              key={item.type}
              onClick={() => handleAddNode(item)}
              title={t({ ko: "클릭해서 추가", en: "Click to add", ja: "クリックして追加", zh: "点击添加" })}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "8px 4px",
                background: "var(--th-bg-elevated)",
                border: `1px solid var(--th-border)`,
                borderTop: `2px solid ${typeof item.color === "string" && item.color.startsWith("var") ? "var(--th-accent)" : item.color}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: mono,
                transition: "box-shadow 0.1s",
              }}
              className="hover:shadow-md hover:border-[var(--th-accent)]"
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>{item.label}</span>
            </button>
          ))}
          <div style={{ marginTop: "auto", fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            {t({ ko: "노드를 클릭해서 캔버스에 추가", en: "Click nodes to add to canvas", ja: "ノードをクリックして追加", zh: "点击添加节点" })}
          </div>
        </div>

        {/* React Flow canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              style: { stroke: "var(--th-border)", strokeWidth: 1.5 },
              animated: false,
            }}
            style={{ background: "var(--th-bg-primary)" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--th-border)"
            />
            <Controls
              style={{
                fontFamily: "var(--th-font-mono)",
                background: "var(--th-bg-panel)",
                border: "1px solid var(--th-border)",
                borderRadius: 6,
              }}
            />
            <MiniMap
              style={{
                background: "var(--th-bg-panel)",
                border: "1px solid var(--th-border)",
                borderRadius: 6,
              }}
              nodeColor="var(--th-accent)"
              maskColor="var(--th-modal-overlay)"
            />

            {/* Help hint */}
            <Panel position="bottom-center">
              <div style={{
                fontFamily: mono,
                fontSize: 10,
                color: "var(--th-text-muted)",
                background: "var(--th-bg-panel)",
                border: "1px solid var(--th-border)",
                borderRadius: 5,
                padding: "3px 10px",
                pointerEvents: "none",
              }}>
                {t({
                  ko: "노드를 드래그하여 이동 · 핸들에서 드래그하여 연결",
                  en: "Drag nodes to move · Drag from handles to connect",
                  ja: "ノードをドラッグして移動 · ハンドルからドラッグして接続",
                  zh: "拖动节点移动 · 从连接点拖动连接",
                })}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

function loadSaved(): { name: string; nodes: Node[]; edges: Edge[] } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { name: string; nodes: Node[]; edges: Edge[] };
  } catch {
    return null;
  }
}
