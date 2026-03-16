import { useCallback, useEffect, useState } from "react";
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
import WbNodeEditPanel from "./WbNodeEditPanel";
import WbRunModal from "./WbRunModal";
import WbScheduleModal from "./WbScheduleModal";

const NODE_TYPES: NodeTypes = {
  trigger: WbTriggerNode,
  agent: WbAgentNode,
  gate: WbGateNode,
  condition: WbConditionNode,
};

const API = "/api/composition-templates";

const INITIAL_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 320, y: 40 },
    data: { label: "PR Created", triggerType: "webhook" } satisfies TriggerNodeData,
  },
  {
    id: "agent-1",
    type: "agent",
    position: { x: 260, y: 200 },
    data: { label: "Code Review", emoji: "⊙", skill: "code-review" } satisfies AgentNodeData,
  },
  {
    id: "gate-1",
    type: "gate",
    position: { x: 260, y: 400 },
    data: { label: "Review Result", branches: ["success", "failure"] } satisfies GateNodeData,
  },
  {
    id: "agent-2",
    type: "agent",
    position: { x: 480, y: 570 },
    data: { label: "Merge", emoji: "↗" } satisfies AgentNodeData,
  },
  {
    id: "agent-3",
    type: "agent",
    position: { x: 40, y: 570 },
    data: { label: "Fix Issues", emoji: "⊙", skill: "development" } satisfies AgentNodeData,
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e1", source: "trigger-1", target: "agent-1", animated: true },
  { id: "e2", source: "agent-1", target: "gate-1" },
  { id: "e3", source: "gate-1", sourceHandle: "success", target: "agent-2", label: "pass", style: { stroke: "#10b981" }, labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 10 } },
  { id: "e4", source: "gate-1", sourceHandle: "failure", target: "agent-3", label: "fail", style: { stroke: "#ef4444" }, labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 10 } },
];

const LS_KEY = "agentdesk_workflow_builder_v2";

type Template = {
  id: string;
  name: string;
  nodes_json: string;
  edges_json: string;
  updated_at: number;
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

type PaletteItem = {
  type: "trigger" | "agent" | "gate" | "condition";
  label: string;
  icon: string;
  color: string;
  defaultData: TriggerNodeData | AgentNodeData | GateNodeData | ConditionNodeData;
};

export default function WorkflowBuilder() {
  const { t } = useI18n();
  const _initial = loadSaved();
  const [nodes, setNodes, onNodesChange] = useNodesState(_initial?.nodes ?? INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(_initial?.edges ?? INITIAL_EDGES);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [workflowName, setWorkflowName] = useState(_initial?.name ?? "PR Review Pipeline");
  const [currentId, setCurrentId] = useState<string | null>(_initial?.currentId ?? null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const mono = "var(--th-font-mono)";

  // Load templates from server
  const loadTemplates = useCallback(() => {
    fetch(API)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // Auto-save to localStorage when nodes/edges/name/currentId change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ name: workflowName, nodes, edges, currentId }));
    setDirty(true);
  }, [nodes, edges, workflowName, currentId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges],
  );

  // Save (create or update)
  const handleSave = useCallback(async () => {
    try {
      if (currentId) {
        await fetch(`${API}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges }),
        });
      } else {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges }),
        });
        const data = await res.json() as { id?: string };
        if (data.id) setCurrentId(data.id);
      }
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      loadTemplates();
    } catch { /* non-fatal */ }
  }, [workflowName, nodes, edges, currentId, loadTemplates]);

  // New workflow — confirm if dirty
  const handleNew = useCallback(() => {
    if (dirty) { setConfirmNew(true); return; }
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setWorkflowName(t({ ko: "새 워크플로", en: "New Workflow", ja: "新しいワークフロー", zh: "新工作流" }));
    setCurrentId(null);
    setDirty(false);
    localStorage.removeItem(LS_KEY);
  }, [dirty, setNodes, setEdges, t]);

  const handleConfirmNew = useCallback(() => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setWorkflowName(t({ ko: "새 워크플로", en: "New Workflow", ja: "新しいワークフロー", zh: "新工作流" }));
    setCurrentId(null);
    setDirty(false);
    setConfirmNew(false);
    localStorage.removeItem(LS_KEY);
  }, [setNodes, setEdges, t]);

  // Load template
  const handleLoadTemplate = useCallback((tpl: Template) => {
    try {
      setNodes(JSON.parse(tpl.nodes_json) as Node[]);
      setEdges(JSON.parse(tpl.edges_json) as Edge[]);
      setWorkflowName(tpl.name);
      setCurrentId(tpl.id);
      setDirty(false);
      setShowTemplates(false);
    } catch { /* ignore parse errors */ }
  }, [setNodes, setEdges]);

  // Delete template
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      if (currentId === id) handleNew();
      loadTemplates();
    } catch { /* ignore */ }
  }, [currentId, handleNew, loadTemplates]);

  const handleUpdateNodeData = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const handleAddNode = useCallback((item: PaletteItem) => {
    const id = `${item.type}-${Date.now()}`;
    setNodes((nds) => {
      const col = nds.length % 3;
      const row = Math.floor(nds.length / 3);
      const newNode: Node = {
        id,
        type: item.type,
        position: { x: 160 + col * 220, y: 100 + row * 200 },
        data: { ...item.defaultData },
      };
      return [...nds, newNode];
    });
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
            minWidth: 140,
          }}
        />
        {currentId && (
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
            #{currentId.slice(0, 8)}
          </span>
        )}
        {dirty && !saved && (
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)", opacity: 0.7 }}>●</span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {/* Templates */}
          <button
            onClick={() => setShowTemplates((v) => !v)}
            style={{
              fontFamily: mono, fontSize: 10, padding: "4px 10px",
              background: showTemplates ? "var(--th-active-bg)" : "transparent",
              border: "1px solid var(--th-border)", borderRadius: 5, cursor: "pointer",
              color: showTemplates ? "var(--th-accent)" : "var(--th-text-muted)",
            }}
          >
            {t({ ko: "불러오기", en: "Templates", ja: "テンプレート", zh: "模板" })} ({templates.length})
          </button>

          {/* New */}
          <button
            onClick={handleNew}
            style={{
              fontFamily: mono, fontSize: 10, padding: "4px 10px",
              background: "transparent", border: "1px solid var(--th-border)",
              borderRadius: 5, cursor: "pointer", color: "var(--th-text-muted)",
            }}
            className="hover:bg-[var(--th-hover-bg)] hover:!text-[var(--th-text)]"
          >
            {t({ ko: "+ 신규", en: "+ New", ja: "+ 新規", zh: "+ 新建" })}
          </button>

          {/* Save */}
          <button
            onClick={() => { void handleSave(); }}
            style={{
              fontFamily: mono, fontSize: 10, padding: "4px 10px",
              background: saved ? "#10b98122" : "var(--th-accent)",
              border: "none", borderRadius: 5, cursor: "pointer",
              color: saved ? "#10b981" : "#fff",
              fontWeight: 600, transition: "background 0.2s",
            }}
          >
            {saved
              ? t({ ko: "저장됨 ✓", en: "Saved ✓", ja: "保存済み ✓", zh: "已保存 ✓" })
              : currentId
                ? t({ ko: "업데이트", en: "Update", ja: "更新", zh: "更新" })
                : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
          </button>

          {/* Schedule — only when workflow is saved */}
          {currentId && (
            <button
              onClick={() => setShowScheduleModal(true)}
              title={t({ ko: "스케줄 설정", en: "Schedule", ja: "スケジュール", zh: "调度" })}
              style={{
                fontFamily: mono, fontSize: 10, padding: "4px 10px",
                background: "transparent", border: "1px solid var(--th-border)",
                borderRadius: 5, cursor: "pointer", color: "var(--th-text-muted)",
              }}
            >
              ⏰
            </button>
          )}

          {/* Run */}
          <button
            onClick={() => setShowRunModal(true)}
            style={{
              fontFamily: mono, fontSize: 10, padding: "4px 12px",
              background: "#10b981", border: "none", borderRadius: 5, cursor: "pointer",
              color: "#fff", fontWeight: 700,
            }}
          >
            ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div style={{
          background: "var(--th-bg-panel)",
          borderBottom: "1px solid var(--th-border)",
          padding: "8px 16px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          maxHeight: 130,
          overflowY: "auto",
          flexShrink: 0,
        }}>
          {templates.length === 0 ? (
            <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {t({ ko: "저장된 워크플로 없음", en: "No saved workflows", ja: "保存済みワークフローなし", zh: "没有保存的工作流" })}
            </span>
          ) : (
            templates.map((tpl) => {
              let nodeCount = 0;
              try { nodeCount = (JSON.parse(tpl.nodes_json) as unknown[]).length; } catch { /* ignore */ }
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 10px",
                    background: tpl.id === currentId ? "var(--th-active-bg)" : "var(--th-bg-elevated)",
                    border: `1px solid ${tpl.id === currentId ? "var(--th-accent)" : "var(--th-border)"}`,
                    borderRadius: 6, cursor: "pointer",
                    fontFamily: mono,
                  }}
                  className="hover:border-[var(--th-accent)]"
                >
                  <span style={{ fontSize: 11, color: "var(--th-text)", fontWeight: tpl.id === currentId ? 700 : 400 }}>{tpl.name}</span>
                  <span style={{ fontSize: 9, color: "var(--th-text-muted)", marginLeft: 2 }}>{nodeCount} nodes</span>
                  <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>· {formatRelative(tpl.updated_at)}</span>
                  <button
                    onClick={(e) => { void handleDelete(tpl.id, e); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--th-text-muted)", fontSize: 14, padding: "0 0 0 4px", lineHeight: 1, marginLeft: "auto",
                    }}
                    title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                    className="hover:!text-red-400"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

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
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "8px 4px",
                background: "var(--th-bg-elevated)",
                border: `1px solid var(--th-border)`,
                borderTop: `2px solid ${typeof item.color === "string" && item.color.startsWith("var") ? "var(--th-accent)" : item.color}`,
                borderRadius: 6, cursor: "pointer", fontFamily: mono, transition: "box-shadow 0.1s",
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
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--th-border)" />
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
            <Panel position="bottom-center">
              <div style={{
                fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)",
                background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
                borderRadius: 5, padding: "3px 10px", pointerEvents: "none",
              }}>
                {t({
                  ko: "노드를 드래그하여 이동 · 핸들에서 드래그하여 연결 · 클릭하여 편집",
                  en: "Drag nodes to move · Drag from handles to connect · Click to edit",
                  ja: "ノードをドラッグして移動 · ハンドルからドラッグして接続 · クリックして編集",
                  zh: "拖动节点移动 · 从连接点拖动连接 · 点击编辑",
                })}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Node Edit Panel (right side) */}
        {selectedNodeId && (() => {
          const selNode = nodes.find((n) => n.id === selectedNodeId);
          return selNode ? (
            <WbNodeEditPanel
              node={selNode}
              onUpdate={handleUpdateNodeData}
              onDelete={handleDeleteNode}
            />
          ) : null;
        })()}
      </div>

      {showRunModal && (
        <WbRunModal
          nodes={nodes}
          edges={edges}
          workflowName={workflowName}
          onClose={() => setShowRunModal(false)}
          onSuccess={() => setShowRunModal(false)}
        />
      )}

      {showScheduleModal && currentId && (
        <WbScheduleModal
          templateId={currentId}
          workflowName={workflowName}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Confirm New dialog */}
      {confirmNew && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: mono, background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
            borderRadius: 8, padding: "20px 24px", width: 320, display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--th-text-primary)" }}>
              {t({ ko: "미저장 변경사항", en: "Unsaved changes", ja: "未保存の変更", zh: "未保存的更改" })}
            </div>
            <div style={{ fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
              {t({
                ko: "현재 워크플로의 변경사항이 저장되지 않았습니다. 새 워크플로를 시작하면 변경사항이 사라집니다.",
                en: "The current workflow has unsaved changes. Starting a new workflow will discard them.",
                ja: "現在のワークフローに未保存の変更があります。新規作成すると破棄されます。",
                zh: "当前工作流有未保存的更改，新建将丢弃这些更改。",
              })}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmNew(false)}
                style={{ fontFamily: mono, fontSize: 10, padding: "4px 12px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 4 }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                onClick={handleConfirmNew}
                style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, padding: "4px 12px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", borderRadius: 4 }}
              >
                {t({ ko: "변경사항 버리고 새로 만들기", en: "Discard & New", ja: "破棄して新規作成", zh: "放弃并新建" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function loadSaved(): { name: string; nodes: Node[]; edges: Edge[]; currentId: string | null } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { name: string; nodes: Node[]; edges: Edge[]; currentId: string | null };
  } catch {
    return null;
  }
}
