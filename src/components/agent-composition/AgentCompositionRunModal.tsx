import { useState, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";
import { useI18n } from "../../i18n";
import type { CompAgentNodeData } from "./nodes/CompAgentNode";

type RunItem = {
  nodeId: string;
  agentId: string;
  name: string;
  emoji: string;
  role: string;
  taskTitle: string;
};

type Props = {
  nodes: Node[];
  edges: Edge[];
  templateName: string;
  onClose: () => void;
  onSuccess: (taskIds: string[]) => void;
};

type Phase = "config" | "running" | "done" | "error";

const mono = "var(--th-font-mono)";

export default function AgentCompositionRunModal({ nodes, edges, templateName, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();
  const { tasks } = useTaskStore();

  const agentNodes = nodes.filter((n) => n.type === "comp_agent");

  const [items, setItems] = useState<RunItem[]>(() =>
    agentNodes.map((n) => {
      const d = n.data as CompAgentNodeData;
      return {
        nodeId: n.id,
        agentId: d.agentId,
        name: d.name,
        emoji: d.emoji ?? "🤖",
        role: d.role ?? "",
        taskTitle: `${d.name} — ${templateName}`,
      };
    }),
  );

  const [projectId, setProjectId] = useState<string>(currentProjectId ?? "");
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const updateTitle = useCallback((nodeId: string, val: string) => {
    setItems((prev) => prev.map((it) => (it.nodeId === nodeId ? { ...it, taskTitle: val } : it)));
  }, []);

  const addLog = (msg: string) => setLog((l) => [...l, msg]);

  const handleRun = useCallback(async () => {
    if (items.length === 0) return;
    setPhase("running");
    setProgress(0);

    addLog(
      t({ ko: `${items.length}개 태스크 동시 생성 중...`, en: `Creating ${items.length} tasks in parallel...`, ja: `${items.length}件のタスクを並列作成中...`, zh: `并行创建${items.length}个任务...` }),
    );

    // Step 1: Create all tasks in parallel (independent of each other)
    const results = await Promise.allSettled(
      items.map((item) => {
        const body: Record<string, unknown> = {
          title: item.taskTitle,
          assigned_agent_id: item.agentId,
          status: "planned",
        };
        if (projectId) body.project_id = projectId;
        return fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
          .then((r) => r.json())
          .then((data) => {
            if (!data.id) throw new Error("no id");
            return { nodeId: item.nodeId, taskId: data.id as string, name: item.name, emoji: item.emoji };
          });
      }),
    );

    setProgress(50);
    const nodeTaskMap: Record<string, string> = {};
    const taskIds: string[] = [];
    let hasError = false;
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { nodeId, taskId, name, emoji } = result.value;
        nodeTaskMap[nodeId] = taskId;
        taskIds.push(taskId);
        addLog(`  ✓ ${emoji} ${name} → ${taskId.slice(0, 8)}`);
      } else {
        addLog(`  ✗ ${t({ ko: "태스크 생성 실패", en: "failed to create task", ja: "タスク作成失敗", zh: "创建任务失败" })}`);
        hasError = true;
      }
    }
    if (hasError) {
      setPhase("error");
      return;
    }

    // Step 2: Create dependencies sequentially (target must exist before linking)
    const edgesWithDeps = edges.filter(
      (e) => e.source && e.target && nodeTaskMap[e.source] && nodeTaskMap[e.target],
    );
    for (let i = 0; i < edgesWithDeps.length; i++) {
      const edge = edgesWithDeps[i];
      const dependentTaskId = nodeTaskMap[edge.target];
      const prerequisiteTaskId = nodeTaskMap[edge.source];
      addLog(
        `🔗 ${t({ ko: "의존 관계", en: "dependency", ja: "依存関係", zh: "依赖关系" })}: ${prerequisiteTaskId.slice(0, 8)} → ${dependentTaskId.slice(0, 8)}`,
      );
      try {
        await fetch(`/api/tasks/${dependentTaskId}/dependencies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ depends_on_task_id: prerequisiteTaskId }),
        });
        addLog(`  ✓`);
      } catch {
        addLog(`  ✗ ${t({ ko: "의존 관계 설정 실패", en: "dependency failed", ja: "依存関係失敗", zh: "依赖设置失败" })}`);
        // non-fatal
      }
      setProgress(50 + Math.round(((i + 1) / edgesWithDeps.length) * 50));
    }

    addLog(
      `\n✅ ${t({ ko: `${taskIds.length}개 태스크 생성 완료`, en: `${taskIds.length} tasks created`, ja: `${taskIds.length}件のタスクを作成`, zh: `已创建${taskIds.length}个任务` })}`,
    );
    setCreatedIds(taskIds);
    setPhase("done");
    onSuccess(taskIds);
  }, [items, edges, projectId, t, onSuccess]);

  const isBtnDisabled = items.some((it) => !it.taskTitle.trim()) || phase === "running";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--th-modal-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && phase !== "running" && onClose()}
    >
      <div
        style={{
          background: "var(--th-bg-panel)",
          border: "1px solid var(--th-border)",
          borderRadius: 10,
          width: 520,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
              ▶{" "}
              {t({
                ko: "조합 실행",
                en: "Run Composition",
                ja: "構成を実行",
                zh: "运行构成",
              })}
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
              {templateName}
            </div>
          </div>
          {phase !== "running" && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--th-text-muted)",
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {phase === "config" && (
            <>
              {/* Project selector */}
              <div>
                <label style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 5,
                    fontFamily: mono,
                    fontSize: 11,
                    padding: "6px 9px",
                    background: "var(--th-bg-elevated)",
                    border: "1px solid var(--th-border)",
                    borderRadius: 5,
                    color: "var(--th-text)",
                    outline: "none",
                  }}
                >
                  <option value="">— {t({ ko: "프로젝트 없음", en: "No project", ja: "プロジェクトなし", zh: "无项目" })} —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agent task titles */}
              <div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  {t({ ko: "에이전트별 태스크 제목", en: "Task title per agent", ja: "エージェントごとのタスクタイトル", zh: "每个代理的任务标题" })}
                </div>
                {items.length === 0 ? (
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "16px 0" }}>
                    {t({ ko: "캔버스에 에이전트가 없습니다", en: "No agents on canvas", ja: "キャンバスにエージェントがありません", zh: "画布上没有代理" })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item) => (
                      <div
                        key={item.nodeId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: "var(--th-bg-elevated)",
                          border: "1px solid var(--th-border)",
                          borderRadius: 6,
                          padding: "7px 10px",
                        }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
                        <div style={{ flexShrink: 0, width: 70 }}>
                          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--th-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.name}
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", textTransform: "uppercase" }}>
                            {item.role?.replace("_", " ")}
                          </div>
                        </div>
                        <input
                          value={item.taskTitle}
                          onChange={(e) => updateTitle(item.nodeId, e.target.value)}
                          placeholder={t({ ko: "태스크 제목", en: "Task title", ja: "タスクタイトル", zh: "任务标题" })}
                          style={{
                            flex: 1,
                            fontFamily: mono,
                            fontSize: 11,
                            padding: "5px 8px",
                            background: "var(--th-bg-panel)",
                            border: "1px solid var(--th-border)",
                            borderRadius: 4,
                            color: "var(--th-text)",
                            outline: "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edge summary */}
              {edges.length > 0 && (
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", padding: "8px 10px", background: "var(--th-bg-elevated)", borderRadius: 5, border: "1px solid var(--th-border)" }}>
                  🔗 {edges.length}{" "}
                  {t({ ko: "개 의존 관계가 태스크에 연결됩니다", en: "dependencies will be linked between tasks", ja: "件の依存関係がリンクされます", zh: "个依赖关系将被链接" })}
                </div>
              )}
            </>
          )}

          {(phase === "running" || phase === "done" || phase === "error") && (
            <div>
              {/* Progress bar */}
              {phase === "running" && (
                <div style={{ height: 4, background: "var(--th-border)", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: "var(--th-accent)",
                      borderRadius: 2,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              )}

              {/* Log */}
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: "var(--th-text-muted)",
                  background: "var(--th-bg-elevated)",
                  border: "1px solid var(--th-border)",
                  borderRadius: 5,
                  padding: "10px 12px",
                  whiteSpace: "pre-wrap",
                  maxHeight: 260,
                  overflowY: "auto",
                  lineHeight: 1.8,
                }}
              >
                {log.join("\n") || "..."}
              </div>

              {phase === "done" && (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "#10b98122",
                      border: "1px solid #10b98155",
                      borderRadius: 5,
                      fontFamily: mono,
                      fontSize: 11,
                      color: "#10b981",
                    }}
                  >
                    ✅ {createdIds.length}{" "}
                    {t({ ko: "개 태스크가 생성되었습니다", en: "tasks created successfully", ja: "件のタスクが作成されました", zh: "个任务已成功创建" })}
                  </div>

                  {/* Live execution monitor */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      {t({ ko: "실시간 실행 현황", en: "Live Execution Status", ja: "リアルタイム実行状況", zh: "实时执行状态" })}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.map((item) => {
                        const liveTask = tasks.find((tk) => createdIds.includes(tk.id) && tk.assigned_agent_id === item.agentId);
                        const status = liveTask?.status ?? "planned";
                        const statusColor =
                          status === "done" ? "#22c55e" :
                          status === "in_progress" || status === "collaborating" ? "var(--th-accent)" :
                          status === "review" ? "#8b5cf6" :
                          status === "cancelled" ? "var(--th-danger-border)" :
                          "var(--th-text-muted)";
                        const statusDot =
                          status === "done" ? "✓" :
                          status === "in_progress" || status === "collaborating" ? "▶" :
                          status === "review" ? "◎" :
                          status === "cancelled" ? "✗" :
                          "·";
                        return (
                          <div
                            key={item.nodeId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "5px 8px",
                              background: "var(--th-bg-elevated)",
                              border: "1px solid var(--th-border)",
                              borderRadius: 5,
                            }}
                          >
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{item.emoji}</span>
                            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.name}
                            </span>
                            <span style={{ fontFamily: mono, fontSize: 10, color: statusColor, fontWeight: 600, flexShrink: 0 }}>
                              {statusDot} {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {phase === "error" && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#ef444422",
                    border: "1px solid #ef444455",
                    borderRadius: 5,
                    fontFamily: mono,
                    fontSize: 11,
                    color: "#ef4444",
                  }}
                >
                  ✗ {t({ ko: "오류가 발생했습니다", en: "An error occurred", ja: "エラーが発生しました", zh: "发生错误" })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--th-border)",
            flexShrink: 0,
          }}
        >
          {phase === "config" && (
            <>
              <button
                onClick={onClose}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  padding: "6px 14px",
                  background: "transparent",
                  border: "1px solid var(--th-border)",
                  borderRadius: 5,
                  cursor: "pointer",
                  color: "var(--th-text-muted)",
                }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                onClick={handleRun}
                disabled={isBtnDisabled}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 18px",
                  background: isBtnDisabled ? "var(--th-border)" : "var(--th-accent)",
                  border: "none",
                  borderRadius: 5,
                  cursor: isBtnDisabled ? "not-allowed" : "pointer",
                  color: "#fff",
                }}
              >
                ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
              </button>
            </>
          )}
          {(phase === "done" || phase === "error") && (
            <button
              onClick={onClose}
              style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 18px",
                background: "var(--th-accent)",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                color: "#fff",
              }}
            >
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
