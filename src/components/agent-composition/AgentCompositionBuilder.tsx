import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type ReactFlowInstance,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import AgentCompositionRunModal from "./AgentCompositionRunModal";
import CompAgentNode, { type CompAgentNodeData } from "./nodes/CompAgentNode";
import type { Agent, Department } from "../../types";

const NODE_TYPES: NodeTypes = { comp_agent: CompAgentNode };
const API = "/api/composition-templates";

type Template = {
  id: string;
  name: string;
  description: string;
  nodes_json: string;
  edges_json: string;
  updated_at: number;
};

export default function AgentCompositionBuilder() {
  const { t } = useI18n();
  const { agents, departments } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [templateName, setTemplateName] = useState(
    t({ ko: "새 조합 템플릿", en: "New Composition Template", ja: "新しい構成テンプレート", zh: "新构成模板" }),
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const mono = "var(--th-font-mono)";

  // Load templates list
  const loadTemplates = useCallback(() => {
    fetch(API)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges],
  );

  // Build CompAgentNodeData from an Agent
  const makeNodeData = useCallback((agent: Agent): CompAgentNodeData => {
    const dept = (departments as Department[]).find((d) => d.id === agent.department_id);
    return {
      agentId: agent.id,
      name: agent.name,
      emoji: agent.avatar_emoji ?? "🤖",
      role: agent.role ?? "junior",
      deptName: dept?.name ?? "",
      provider: agent.cli_provider ?? "",
    };
  }, [departments]);

  // Drag start: store agent id in dataTransfer
  function handleAgentDragStart(e: React.DragEvent, agent: Agent) {
    e.dataTransfer.setData("application/agentdesk-agent-id", agent.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  // Drop on canvas: create node at drop position
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const agentId = e.dataTransfer.getData("application/agentdesk-agent-id");
      if (!agentId || !rfInstance || !reactFlowWrapper.current) return;
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const nodeId = `agent-${agentId}-${Date.now()}`;
      const newNode: Node = {
        id: nodeId,
        type: "comp_agent",
        position,
        data: makeNodeData(agent),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [agents, rfInstance, setNodes, makeNodeData],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Save template
  const handleSave = useCallback(async () => {
    const body = { name: templateName, nodes, edges };
    try {
      if (currentId) {
        await fetch(`${API}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.id) setCurrentId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadTemplates();
    } catch {
      // ignore save errors
    }
  }, [templateName, nodes, edges, currentId, loadTemplates]);

  // Load template
  function handleLoadTemplate(tpl: Template) {
    try {
      const parsedNodes = JSON.parse(tpl.nodes_json) as Node[];
      const parsedEdges = JSON.parse(tpl.edges_json) as Edge[];
      setNodes(parsedNodes);
      setEdges(parsedEdges);
      setTemplateName(tpl.name);
      setCurrentId(tpl.id);
      setShowTemplates(false);
    } catch {
      // ignore parse errors
    }
  }

  // Delete template
  async function handleDeleteTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      if (currentId === id) {
        setCurrentId(null);
        setNodes([]);
        setEdges([]);
      }
      loadTemplates();
    } catch {
      // ignore
    }
  }

  // Reset canvas
  function handleReset() {
    setNodes([]);
    setEdges([]);
    setCurrentId(null);
    setTemplateName(
      t({ ko: "새 조합 템플릿", en: "New Composition Template", ja: "新しい構成テンプレート", zh: "新构成模板" }),
    );
  }

  // Whether canvas has any agent nodes (for Run button state)
  const hasCompAgents = useMemo(() => nodes.some((n) => n.type === "comp_agent"), [nodes]);

  // Agent list — project filter first, then search
  const projectAgents = useMemo(
    () => currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents,
    [agents, currentProjectId, projectAgentIds, projectAgentsLoaded],
  );

  const filteredAgents = useMemo(() => {
    const q = agentSearch.toLowerCase();
    return projectAgents.filter((a) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.name_ko ?? "").toLowerCase().includes(q) ||
      (a.role ?? "").includes(q),
    );
  }, [projectAgents, agentSearch]);

  const deptGroups = useMemo(
    () => (departments as Department[]).map((d) => ({
      dept: d,
      agents: filteredAgents.filter((a) => a.department_id === d.id),
    })),
    [departments, filteredAgents],
  );

  const unassigned = useMemo(
    () => filteredAgents.filter((a) => !a.department_id),
    [filteredAgents],
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: "var(--th-text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {t({ ko: "에이전트 조합", en: "Agent Composition", ja: "エージェント構成", zh: "代理组合" })}
        </span>
        <div style={{ width: 1, height: 16, background: "var(--th-border)" }} />
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
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
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.05em" }}>
            #{currentId.slice(0, 8)}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            style={{
              fontFamily: mono,
              fontSize: 10,
              padding: "4px 10px",
              background: showTemplates ? "var(--th-active-bg)" : "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: 5,
              cursor: "pointer",
              color: showTemplates ? "var(--th-accent)" : "var(--th-text-muted)",
            }}
          >
            {t({ ko: "템플릿", en: "Templates", ja: "テンプレート", zh: "模板" })} ({templates.length})
          </button>
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
            }}
          >
            {saved
              ? t({ ko: "저장됨 ✓", en: "Saved ✓", ja: "保存済み ✓", zh: "已保存 ✓" })
              : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
          </button>
          <div style={{ width: 1, height: 20, background: "var(--th-border)", alignSelf: "center" }} />
          <button
            onClick={() => setShowRunModal(true)}
            disabled={!hasCompAgents}
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 12px",
              background: hasCompAgents ? "#10b981" : "var(--th-border)",
              border: "none",
              borderRadius: 5,
              cursor: hasCompAgents ? "pointer" : "not-allowed",
              color: "#fff",
            }}
          >
            ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div
          style={{
            background: "var(--th-bg-panel)",
            borderBottom: "1px solid var(--th-border)",
            padding: "8px 16px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            maxHeight: 130,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {templates.length === 0 ? (
            <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {t({ ko: "저장된 템플릿 없음", en: "No saved templates", ja: "保存済みテンプレートなし", zh: "没有保存的模板" })}
            </span>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => handleLoadTemplate(tpl)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: tpl.id === currentId ? "var(--th-active-bg)" : "var(--th-bg-elevated)",
                  border: `1px solid ${tpl.id === currentId ? "var(--th-accent)" : "var(--th-border)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 11,
                  color: "var(--th-text)",
                }}
                className="hover:border-[var(--th-accent)]"
              >
                <span>{tpl.name}</span>
                <button
                  onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--th-text-muted)",
                    fontSize: 12,
                    padding: 0,
                    lineHeight: 1,
                  }}
                  title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                  className="hover:!text-red-400"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* Agent list panel */}
        <div
          style={{
            width: 160,
            flexShrink: 0,
            borderRight: "1px solid var(--th-border)",
            background: "var(--th-bg-panel)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder={t({ ko: "에이전트 검색", en: "Search agents", ja: "エージェント検索", zh: "搜索代理" })}
              style={{
                width: "100%",
                fontFamily: mono,
                fontSize: 10,
                padding: "4px 7px",
                background: "var(--th-bg-elevated)",
                border: "1px solid var(--th-border)",
                borderRadius: 5,
                color: "var(--th-text)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 6px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {[...deptGroups.filter((g) => g.agents.length > 0), unassigned.length > 0 ? { dept: null, agents: unassigned } : null]
              .filter(Boolean)
              .map((group, gi) => {
                const g = group as { dept: Department | null; agents: Agent[] };
                return (
                  <div key={g.dept?.id ?? "unassigned"}>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 9,
                        color: "var(--th-text-muted)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        padding: "6px 4px 2px",
                        marginTop: gi > 0 ? 4 : 0,
                      }}
                    >
                      {g.dept?.name ?? t({ ko: "미배정", en: "Unassigned", ja: "未配属", zh: "未分配" })}
                    </div>
                    {g.agents.map((agent) => (
                      <div
                        key={agent.id}
                        draggable
                        onDragStart={(e) => handleAgentDragStart(e, agent)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 7px",
                          borderRadius: 6,
                          cursor: "grab",
                          userSelect: "none",
                          background: "transparent",
                          border: "1px solid transparent",
                        }}
                        className="hover:bg-[var(--th-hover-bg)] hover:border-[var(--th-border)]"
                        title={t({ ko: "캔버스로 드래그", en: "Drag to canvas", ja: "キャンバスにドラッグ", zh: "拖到画布" })}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                          {agent.avatar_emoji ?? "🤖"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: mono,
                              fontSize: 11,
                              color: "var(--th-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {agent.name}
                          </div>
                          <div
                            style={{
                              fontFamily: mono,
                              fontSize: 9,
                              color: "var(--th-text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {agent.role?.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            {filteredAgents.length === 0 && (
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: "var(--th-text-muted)",
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                {t({ ko: "에이전트 없음", en: "No agents", ja: "エージェントなし", zh: "没有代理" })}
              </div>
            )}
          </div>
          <div
            style={{
              padding: "6px 8px",
              borderTop: "1px solid var(--th-border)",
              fontFamily: mono,
              fontSize: 9,
              color: "var(--th-text-muted)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {t({ ko: "드래그하여 캔버스에 추가", en: "Drag to canvas", ja: "ドラッグして追加", zh: "拖放到画布" })}
          </div>
        </div>

        {/* React Flow canvas */}
        <div ref={reactFlowWrapper} style={{ flex: 1, minWidth: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3 }}
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
                fontFamily: mono,
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
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: "var(--th-text-muted)",
                  background: "var(--th-bg-panel)",
                  border: "1px solid var(--th-border)",
                  borderRadius: 5,
                  padding: "3px 10px",
                  pointerEvents: "none",
                }}
              >
                {nodes.length === 0
                  ? t({
                      ko: "← 왼쪽에서 에이전트를 드래그하여 구성 시작",
                      en: "← Drag agents from the left to start composing",
                      ja: "← 左からエージェントをドラッグして構成を開始",
                      zh: "← 从左侧拖动代理开始组合",
                    })
                  : t({
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

      {showRunModal && (
        <AgentCompositionRunModal
          nodes={nodes}
          edges={edges}
          templateName={templateName}
          onClose={() => setShowRunModal(false)}
          onSuccess={() => setShowRunModal(false)}
        />
      )}
    </div>
  );
}
