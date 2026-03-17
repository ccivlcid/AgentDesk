import { useState, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";
import { useI18n } from "../../i18n";
import { runTask } from "../../api/organization-projects";

type RunItem = {
  nodeId: string;
  agentId: string;
  agentName: string;
  emoji: string;
  instruction: string;
  taskTitle: string;
};

type Props = {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  figmaUrl?: string;
  onClose: () => void;
  onSuccess: (taskIds: string[]) => void;
};

type Phase = "config" | "running" | "done" | "error";

const mono = "var(--th-font-mono)";

type AgentDep = {
  from: string;
  to: string;
  gateCondition?: string;
  gateBranch?: "true" | "false";
};

/** Resolve agent→agent dependencies, traversing through gate/condition/trigger nodes.
 *  Captures condition expression + branch when a Condition node is in the path. */
function resolveAgentDeps(agentIds: Set<string>, nodes: Node[], edges: Edge[]): AgentDep[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outEdgeMap: Record<string, Edge[]> = {};
  for (const e of edges) {
    if (!outEdgeMap[e.source]) outEdgeMap[e.source] = [];
    outEdgeMap[e.source].push(e);
  }

  const deps: AgentDep[] = [];

  for (const srcId of agentIds) {
    type State = { nodeId: string; gateCondition?: string; gateBranch?: "true" | "false" };
    const visited = new Set<string>();
    const queue: State[] = [{ nodeId: srcId }];

    while (queue.length > 0) {
      const { nodeId, gateCondition, gateBranch } = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      for (const edge of outEdgeMap[nodeId] ?? []) {
        const nextId = edge.target;
        const currentNode = nodeMap.get(nodeId);
        let nextGateCondition = gateCondition;
        let nextGateBranch = gateBranch;

        // When leaving a Condition node, capture its expression and the edge's branch handle
        if (currentNode?.type === "condition") {
          const condData = currentNode.data as Record<string, unknown>;
          const expr = typeof condData.expression === "string" ? condData.expression.trim() : undefined;
          nextGateCondition = expr || undefined;
          nextGateBranch = edge.sourceHandle === "false" ? "false" : "true";
        }

        if (agentIds.has(nextId)) {
          deps.push({
            from: srcId,
            to: nextId,
            ...(nextGateCondition ? { gateCondition: nextGateCondition, gateBranch: nextGateBranch ?? "true" } : {}),
          });
        } else {
          queue.push({ nodeId: nextId, gateCondition: nextGateCondition, gateBranch: nextGateBranch });
        }
      }
    }
  }

  return deps;
}

export default function WbRunModal({ nodes, edges, workflowName, figmaUrl = "", onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === (currentProjectId ?? "")) ?? null;
  const { tasks } = useTaskStore();

  const agentNodes = nodes.filter((n) => n.type === "agent");
  const agentIdSet = new Set(agentNodes.map((n) => n.id));
  const agentDeps = resolveAgentDeps(agentIdSet, nodes, edges);

  const [items, setItems] = useState<RunItem[]>(() =>
    agentNodes.map((n) => {
      const d = n.data as Record<string, unknown>;
      return {
        nodeId: n.id,
        agentId: (d.agentId as string) ?? "",
        agentName: (d.agentName as string) ?? (d.label as string) ?? "Agent",
        emoji: (d.emoji as string) ?? "⊙",
        instruction: (d.instruction as string) ?? "",
        taskTitle: `${(d.agentName as string) ?? (d.label as string) ?? "Agent"} — ${workflowName}`,
      };
    }),
  );

  const [projectId, setProjectId] = useState(currentProjectId ?? "");
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((l) => [...l, msg]);

  const updateTitle = useCallback((nodeId: string, val: string) => {
    setItems((prev) => prev.map((it) => (it.nodeId === nodeId ? { ...it, taskTitle: val } : it)));
  }, []);

  const handleRun = useCallback(async () => {
    const validItems = items.filter((it) => it.agentId && it.taskTitle.trim());
    if (validItems.length === 0) return;
    setPhase("running");
    setProgress(0);

    // WB-03: extract trigger node type as context_hint
    const triggerNode = nodes.find((n) => n.type === "trigger");
    const contextHint = (triggerNode?.data as Record<string, unknown>)?.triggerType as string | undefined;

    addLog(t({ ko: `${validItems.length}개 태스크 생성 중...`, en: `Creating ${validItems.length} tasks...`, ja: `${validItems.length}件のタスクを作成中...`, zh: `正在创建${validItems.length}个任务...` }));

    // First agent node ID (for figma_url injection)
    const firstAgentNodeId = validItems[0]?.nodeId;

    const results = await Promise.allSettled(
      validItems.map((item) => {
        const body: Record<string, unknown> = {
          title: item.taskTitle,
          assigned_agent_id: item.agentId,
          status: "planned",
        };
        if (item.instruction) body.description = item.instruction;
        if (projectId) body.project_id = projectId;
        if (contextHint) body.context_hint = contextHint;
        const selectedProject = projects.find((p) => p.id === projectId) ?? currentProject;
        if (selectedProject?.project_path) body.project_path = selectedProject.project_path;
        // Inject figma_url into the first agent node's task
        if (figmaUrl && item.nodeId === firstAgentNodeId) body.figma_url = figmaUrl;
        return fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
          .then((r) => r.json() as Promise<{ id?: string }>)
          .then((data) => {
            if (!data.id) throw new Error("no id");
            return { nodeId: item.nodeId, taskId: data.id, agentId: item.agentId, emoji: item.emoji, name: item.agentName };
          });
      }),
    );

    setProgress(50);
    const nodeTaskMap: Record<string, string> = {};
    const taskIds: string[] = [];
    let hasError = false;

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { nodeId, taskId, emoji, name } = r.value;
        nodeTaskMap[nodeId] = taskId;
        taskIds.push(taskId);
        addLog(`  ✓ ${emoji} ${name} → ${taskId.slice(0, 8)}`);
      } else {
        addLog(`  ✗ ${t({ ko: "태스크 생성 실패", en: "failed to create task", ja: "タスク作成失敗", zh: "创建任务失败" })}`);
        hasError = true;
      }
    }

    if (hasError) { setPhase("error"); return; }

    // Set up dependencies
    const depsToLink = agentDeps.filter((d) => nodeTaskMap[d.from] && nodeTaskMap[d.to]);
    let hasDepError = false;
    for (let i = 0; i < depsToLink.length; i++) {
      const dep = depsToLink[i];
      addLog(`🔗 ${nodeTaskMap[dep.from].slice(0, 8)} → ${nodeTaskMap[dep.to].slice(0, 8)}`);
      try {
        const depBody: Record<string, unknown> = { depends_on_task_id: nodeTaskMap[dep.from] };
        if (dep.gateCondition) {
          depBody.gate_condition = dep.gateCondition;
          depBody.gate_branch = dep.gateBranch ?? "true";
        }
        const r = await fetch(`/api/tasks/${nodeTaskMap[dep.to]}/dependencies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(depBody),
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
        addLog("  ✓");
      } catch {
        addLog(`  ✗ ${t({ ko: "의존 관계 설정 실패", en: "dependency failed", ja: "依存関係失敗", zh: "依赖设置失败" })}`);
        hasDepError = true;
      }
      setProgress(50 + Math.round(((i + 1) / Math.max(depsToLink.length, 1)) * 50));
    }

    // WB-02: rollback if any dependency failed
    if (hasDepError) {
      addLog(`\n${t({ ko: "⚠ 의존 관계 설정 실패 — 생성된 태스크를 정리합니다...", en: "⚠ Dependency setup failed — rolling back created tasks...", ja: "⚠ 依存関係設定失敗 — 作成済みタスクをロールバック中...", zh: "⚠ 依赖设置失败 — 正在回滚已创建的任务..." })}`);
      await Promise.allSettled(
        taskIds.map((id) => fetch(`/api/tasks/${id}`, { method: "DELETE" }))
      );
      setPhase("error");
      return;
    }

    addLog(`\n✅ ${t({ ko: `${taskIds.length}개 태스크 생성 완료`, en: `${taskIds.length} tasks created`, ja: `${taskIds.length}件のタスクを作成`, zh: `已创建${taskIds.length}个任务` })}`);
    setCreatedIds(taskIds);

    // Auto-start root tasks (those with no incoming dependencies from other workflow tasks)
    const depTargetNodeIds = new Set(agentDeps.map((d) => d.to));
    const rootItems = validItems.filter((it) => !depTargetNodeIds.has(it.nodeId));
    if (rootItems.length > 0) {
      addLog(`\n${t({ ko: `▶ 루트 태스크 ${rootItems.length}개 자동 시작...`, en: `▶ Auto-starting ${rootItems.length} root task(s)...`, ja: `▶ ルートタスク${rootItems.length}件を自動開始...`, zh: `▶ 自动启动${rootItems.length}个根任务...` })}`);
      await Promise.allSettled(
        rootItems.map(async (item) => {
          const taskId = nodeTaskMap[item.nodeId];
          if (!taskId) return;
          try {
            await runTask(taskId);
            addLog(`  ▶ ${item.emoji} ${item.agentName}`);
          } catch {
            addLog(`  ✗ ${item.emoji} ${item.agentName} — ${t({ ko: "시작 실패", en: "start failed", ja: "開始失敗", zh: "启动失败" })}`);
          }
        }),
      );
    }

    setPhase("done");
    onSuccess(taskIds);
  }, [items, agentDeps, projectId, nodes, t, onSuccess, currentProject, figmaUrl, projects]);

  const canRun = items.some((it) => it.agentId && it.taskTitle.trim()) && phase !== "running";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--th-modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
      onClick={(e) => e.target === e.currentTarget && phase !== "running" && onClose()}
    >
      <div style={{
        background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
        borderRadius: 10, width: 520, maxWidth: "90vw", maxHeight: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
              ▶ {t({ ko: "워크플로 실행", en: "Run Workflow", ja: "ワークフロー実行", zh: "运行工作流" })}
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>{workflowName}</div>
          </div>
          {phase !== "running" && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {phase === "config" && (
            <>
              {/* Project */}
              <div>
                <label style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 5, fontFamily: mono, fontSize: 11, padding: "6px 9px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 5, color: "var(--th-text)", outline: "none" }}
                >
                  <option value="">— {t({ ko: "프로젝트 없음", en: "No project", ja: "プロジェクトなし", zh: "无项目" })} —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Agent task config */}
              <div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  {t({ ko: "에이전트 태스크 설정", en: "Agent Tasks", ja: "エージェントタスク", zh: "代理任务设置" })}
                </div>
                {items.length === 0 ? (
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "16px 0" }}>
                    {t({ ko: "캔버스에 에이전트 노드가 없습니다", en: "No agent nodes on canvas", ja: "キャンバスにエージェントノードがありません", zh: "画布上没有代理节点" })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((item) => (
                      <div key={item.nodeId} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "var(--th-bg-elevated)", border: `1px solid ${item.agentId ? "var(--th-border)" : "#ef444455"}`,
                        borderRadius: 6, padding: "7px 10px",
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
                        <div style={{ flexShrink: 0, width: 80 }}>
                          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--th-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.agentName}
                          </div>
                          {!item.agentId && (
                            <div style={{ fontFamily: mono, fontSize: 9, color: "#ef4444" }}>
                              {t({ ko: "에이전트 미지정", en: "no agent", ja: "未指定", zh: "未指定" })}
                            </div>
                          )}
                        </div>
                        <input
                          value={item.taskTitle}
                          onChange={(e) => updateTitle(item.nodeId, e.target.value)}
                          placeholder={t({ ko: "태스크 제목", en: "Task title", ja: "タスクタイトル", zh: "任务标题" })}
                          disabled={!item.agentId}
                          style={{ flex: 1, fontFamily: mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text)", outline: "none", opacity: item.agentId ? 1 : 0.4 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {agentDeps.length > 0 && (
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "8px 10px", background: "var(--th-bg-elevated)", borderRadius: 5, border: "1px solid var(--th-border)" }}>
                  🔗 {agentDeps.length} {t({ ko: "개 의존 관계가 연결됩니다", en: "dependencies will be linked", ja: "件の依存関係がリンクされます", zh: "个依赖关系将被链接" })}
                </div>
              )}
            </>
          )}

          {(phase === "running" || phase === "done" || phase === "error") && (
            <div>
              {phase === "running" && (
                <div style={{ height: 4, background: "var(--th-border)", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "var(--th-accent)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              )}
              <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 5, padding: "10px 12px", whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto", lineHeight: 1.8 }}>
                {log.join("\n") || "..."}
              </div>

              {phase === "done" && (
                <>
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "#10b98122", border: "1px solid #10b98155", borderRadius: 5, fontFamily: mono, fontSize: 11, color: "#10b981" }}>
                    ✅ {createdIds.length} {t({ ko: "개 태스크 생성 완료", en: "tasks created successfully", ja: "件のタスクが作成されました", zh: "个任务已成功创建" })}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      {t({ ko: "실시간 실행 현황", en: "Live Execution Status", ja: "実行状況", zh: "实时执行状态" })}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.filter((it) => it.agentId).map((item) => {
                        const liveTask = tasks.find((tk) => createdIds.includes(tk.id) && tk.assigned_agent_id === item.agentId);
                        const status = liveTask?.status ?? "planned";
                        const statusColor = status === "done" ? "#22c55e" : status === "in_progress" || status === "collaborating" ? "var(--th-accent)" : status === "cancelled" ? "#ef4444" : "var(--th-text-muted)";
                        const dot = status === "done" ? "✓" : status === "in_progress" || status === "collaborating" ? "▶" : status === "cancelled" ? "✗" : "·";
                        return (
                          <div key={item.nodeId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 5 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{item.emoji}</span>
                            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.agentName}</span>
                            <span style={{ fontFamily: mono, fontSize: 10, color: statusColor, fontWeight: 600, flexShrink: 0 }}>{dot} {status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {phase === "error" && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#ef444422", border: "1px solid #ef444455", borderRadius: 5, fontFamily: mono, fontSize: 11, color: "#ef4444" }}>
                  ✗ {t({ ko: "오류가 발생했습니다", en: "An error occurred", ja: "エラーが発生しました", zh: "发生错误" })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--th-border)", flexShrink: 0 }}>
          {phase === "config" && (
            <>
              <button onClick={onClose} style={{ fontFamily: mono, fontSize: 11, padding: "6px 14px", background: "transparent", border: "1px solid var(--th-border)", borderRadius: 5, cursor: "pointer", color: "var(--th-text-muted)" }}>
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                onClick={() => { void handleRun(); }}
                disabled={!canRun}
                style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, padding: "6px 18px", background: canRun ? "var(--th-accent)" : "var(--th-border)", border: "none", borderRadius: 5, cursor: canRun ? "pointer" : "not-allowed", color: "#fff" }}
              >
                ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
              </button>
            </>
          )}
          {(phase === "done" || phase === "error") && (
            <button onClick={onClose} style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, padding: "6px 18px", background: "var(--th-accent)", border: "none", borderRadius: 5, cursor: "pointer", color: "#fff" }}>
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
