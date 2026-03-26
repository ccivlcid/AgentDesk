import { useEffect, useRef, useState } from "react";
import { localeName, type UiLanguage } from "../../i18n";
import type { Agent, Department, Persona, SubAgent, SubTask, Task } from "../../types";
import { SUBTASK_STATUS_ICON, taskStatusLabel, taskTypeLabel, type TFunction } from "./constants";
import AgentPerformancePanel from "./AgentPerformancePanel";
import PersonaCatalog from "../persona/PersonaCatalog";
import PersonaDetailPanel from "../persona/PersonaDetailPanel";
import * as api from "../../api";
import { fetchPersonas } from "../../api/categories-dashboard";

interface AgentDetailTabContentProps {
  tab: "info" | "tasks" | "alba" | "performance" | "chat";
  t: TFunction;
  language: UiLanguage;
  agent: Agent;
  departments: Department[];
  agentTasks: Task[];
  agentSubAgents: SubAgent[];
  subtasksByTask: Record<string, SubTask[]>;
  expandedTaskId: string | null;
  setExpandedTaskId: (taskId: string | null) => void;
  onChat: (agent: Agent) => void;
  onAssignTask: (agentId: string) => void;
  onOpenTerminal?: (taskId: string) => void;
}

export default function AgentDetailTabContent({
  tab,
  t,
  language,
  agent,
  departments,
  agentTasks,
  agentSubAgents,
  subtasksByTask,
  expandedTaskId,
  setExpandedTaskId,
  onChat,
  onAssignTask,
  onOpenTerminal,
}: AgentDetailTabContentProps) {
  const [personaText, setPersonaText] = useState<string | null>(null);
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  const [costSummary, setCostSummary] = useState<{ thisMonthUsd: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persona catalog state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(agent.persona_id ?? null);
  const [savingPersonaId, setSavingPersonaId] = useState(false);
  const [catalogMode, setCatalogMode] = useState<"catalog" | "raw">("catalog");

  useEffect(() => {
    if (tab !== "info") return;
    setPersonaText(null);
    setIsEditingPersona(false);
    setSelectedPersonaId(agent.persona_id ?? null);
    api.getAgentPersona(agent.id).then((text) => setPersonaText(text || null)).catch(() => setPersonaText(null));
    api.getAgentCostSummary(agent.id).then((s) => setCostSummary(s)).catch(() => setCostSummary(null));
    fetchPersonas().then((ps) => setPersonas(ps)).catch(() => setPersonas([]));
  }, [agent.id, agent.persona_id, tab]);

  function startEditPersona() {
    setEditDraft(personaText ?? "");
    setIsEditingPersona(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function cancelEditPersona() {
    setIsEditingPersona(false);
  }

  async function savePersona() {
    setSavingPersona(true);
    try {
      await api.saveAgentPersona(agent.id, editDraft);
      setPersonaText(editDraft || null);
      setIsEditingPersona(false);
    } catch {
      // keep editing on error
    } finally {
      setSavingPersona(false);
    }
  }

  async function handlePersonaIdSelect(personaId: string | null) {
    setSelectedPersonaId(personaId);
    setSavingPersonaId(true);
    try {
      await api.updateAgent(agent.id, { persona_id: personaId });
    } catch {
      // revert on error
      setSelectedPersonaId(agent.persona_id ?? null);
    } finally {
      setSavingPersonaId(false);
    }
  }

  if (tab === "info") {
    const selectedPersona = personas.find((p) => p.id === selectedPersonaId) ?? null;

    return (
      <div className="space-y-3">
        {/* ── 페르소나 섹션 ── */}
        <div className="border rounded" style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14, overflow: "hidden" }}>
          {/* 섹션 헤더 + 탭 전환 */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: "#9CA3AF" }}>
              {t({ ko: "// 페르소나", en: "// PERSONA", ja: "// ペルソナ", zh: "// 人格" })}
              {savingPersonaId && (
                <span className="ml-2 text-[9px]" style={{ color: "#3B82F6" }}>
                  {t({ ko: "저장중...", en: "saving...", ja: "保存中...", zh: "保存中..." })}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCatalogMode("catalog")}
                className="text-[9px] px-2 py-0.5 font-mono"
                style={{
                  background: catalogMode === "catalog" ? "rgba(59,130,246,0.08)" : "transparent",
                  border: `1px solid ${catalogMode === "catalog" ? "rgba(59,130,246,0.35)" : "#E5E7EB"}`,
                  color: catalogMode === "catalog" ? "#3B82F6" : "#9CA3AF",
                  borderRadius: 8,
                }}
              >
                {t({ ko: "카탈로그", en: "Catalog", ja: "カタログ", zh: "目录" })}
              </button>
              <button
                onClick={() => setCatalogMode("raw")}
                className="text-[9px] px-2 py-0.5 font-mono"
                style={{
                  background: catalogMode === "raw" ? "rgba(59,130,246,0.08)" : "transparent",
                  border: `1px solid ${catalogMode === "raw" ? "rgba(59,130,246,0.35)" : "#E5E7EB"}`,
                  color: catalogMode === "raw" ? "#3B82F6" : "#9CA3AF",
                  borderRadius: 8,
                }}
              >
                {t({ ko: "직접 편집", en: "Raw Edit", ja: "直接編集", zh: "直接编辑" })}
              </button>
            </div>
          </div>

          {catalogMode === "catalog" ? (
            <div className="p-3 flex flex-col gap-3">
              {/* PersonaCatalog */}
              {personas.length > 0 ? (
                <PersonaCatalog
                  personas={personas}
                  selectedId={selectedPersonaId}
                  onSelect={(id) => { void handlePersonaIdSelect(id); }}
                />
              ) : (
                <div className="text-[11px] text-center py-4" style={{ color: "#9CA3AF" }}>
                  {t({ ko: "페르소나 로딩중...", en: "Loading personas...", ja: "ペルソナを読み込み中...", zh: "加载人格中..." })}
                </div>
              )}
              {/* 선택된 페르소나 상세 패널 */}
              {selectedPersona && (
                <PersonaDetailPanel persona={selectedPersona} />
              )}
            </div>
          ) : (
            /* Raw text 편집 */
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
                  {t({ ko: "페르소나 텍스트 (Markdown)", en: "Persona text (Markdown)", ja: "ペルソナテキスト (Markdown)", zh: "人格文本 (Markdown)" })}
                </div>
                {!isEditingPersona && (
                  <button
                    onClick={startEditPersona}
                    className="text-[10px] px-1.5 py-0.5 font-mono transition-colors"
                    style={{ color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, background: "rgba(59,130,246,0.07)" }}
                  >
                    {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                  </button>
                )}
              </div>
              {isEditingPersona ? (
                <div className="space-y-2">
                  <textarea
                    ref={textareaRef}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={6}
                    className="w-full text-xs font-mono resize-y p-2 outline-none"
                    style={{ background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827" }}
                    placeholder={t({ ko: "페르소나를 입력하세요...", en: "Enter persona...", ja: "ペルソナを入力...", zh: "输入人格..." })}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={cancelEditPersona}
                      className="text-[10px] px-2 py-1 font-mono"
                      style={{ color: "#9CA3AF", border: "1px solid #E5E7EB", borderRadius: 8 }}
                    >
                      {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                    </button>
                    <button
                      onClick={() => { void savePersona(); }}
                      disabled={savingPersona}
                      className="text-[10px] px-2 py-1 font-mono"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: 8, color: "#3B82F6", opacity: savingPersona ? 0.6 : 1 }}
                    >
                      {savingPersona ? t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." }) : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap" style={{ color: "#6B7280" }}>
                  {personaText ?? <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>{t({ ko: "설정 없음", en: "Not set", ja: "未設定", zh: "未设置" })}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded p-3 text-center" style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14 }}>
            <div className="text-lg font-bold font-mono" style={{ color: "#3B82F6" }}>{agent.stats_tasks_done}</div>
            <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
              {t({ ko: "완료 업무", en: "Completed", ja: "完了タスク", zh: "已完成任务" })}
            </div>
          </div>
          <div className="border rounded p-3 text-center" style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14 }}>
            <div className="text-lg font-bold font-mono" style={{ color: "#3B82F6" }}>
              {agentSubAgents.filter((subAgent) => subAgent.status === "working").length}
            </div>
            <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
              {t({ ko: "서브에이전트", en: "Sub-agents", ja: "サブエージェント", zh: "子代理" })}
            </div>
          </div>
        </div>

        <div
          className="border p-3 flex items-center justify-between"
          style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14 }}
        >
          <div className="text-[10px] font-mono uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}>
            {t({ ko: "// 이번 달 비용", en: "// THIS MONTH COST", ja: "// 今月のコスト", zh: "// 本月费用" })}
          </div>
          <div
            className="text-sm font-mono font-bold px-2 py-0.5"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", color: "#3B82F6", borderRadius: 8 }}
          >
            {costSummary != null
              ? `$${costSummary.thisMonthUsd.toFixed(2)}`
              : "—"}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onChat(agent)}
            className="flex-1 py-2 rounded text-sm font-medium font-mono transition-colors"
            style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)", color: "#3B82F6", borderRadius: 10 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {t({ ko: "대화하기", en: "Chat", ja: "チャット", zh: "对话" })}
          </button>
          <button
            onClick={() => onAssignTask(agent.id)}
            className="flex-1 py-2 rounded text-sm font-medium font-mono transition-colors"
            style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)", color: "#3B82F6", borderRadius: 10 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>{" "}{t({ ko: "업무 배정", en: "Assign Task", ja: "タスク割り当て", zh: "分配任务" })}
          </button>
        </div>
        {agent.status === "working" && agent.current_task_id && onOpenTerminal && (
          <button
            onClick={() => onOpenTerminal(agent.current_task_id!)}
            className="w-full mt-2 py-2 rounded text-sm font-medium font-mono transition-colors flex items-center justify-center gap-1.5"
            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#6B7280", borderRadius: 10 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            {t({ ko: "터미널 보기", en: "View Terminal", ja: "ターミナル表示", zh: "查看终端" })}
          </button>
        )}
      </div>
    );
  }

  if (tab === "tasks") {
    return (
      <div className="space-y-2">
        {agentTasks.length === 0 ? (
          <div className="terminal-empty-state py-8">
            <p className="terminal-empty-state-cmd">$ ls tasks/ --agent={agent.id.slice(0, 8)}</p>
            <p className="terminal-empty-state-result">(empty)</p>
            <p className="terminal-empty-state-hint">{t({ ko: "배정된 업무가 없습니다", en: "No assigned tasks", ja: "割り当てられたタスクはありません", zh: "暂无已分配任务" })}</p>
          </div>
        ) : (
          agentTasks.map((taskItem) => {
            const taskSubtasks = subtasksByTask[taskItem.id] ?? [];
            const isExpanded = expandedTaskId === taskItem.id;
            const subTotal = taskItem.subtask_total ?? taskSubtasks.length;
            const subDone = taskItem.subtask_done ?? taskSubtasks.filter((subtask) => subtask.status === "done").length;
            return (
              <div key={taskItem.id} className="border rounded p-3" style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14 }}>
                <button
                  onClick={() => setExpandedTaskId(isExpanded ? null : taskItem.id)}
                  className="flex items-start gap-3 w-full text-left"
                >
                  <div
                    className="w-2 h-2 mt-1.5 shrink-0"
                    style={{
                      borderRadius: 4,
                      background: taskItem.status === "done"
                        ? "rgb(34,197,94)"
                        : taskItem.status === "in_progress"
                          ? "#3B82F6"
                          : "#E5E7EB",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: "#111827" }}>{taskItem.title}</div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: "#9CA3AF" }}>
                      {taskStatusLabel(taskItem.status, t)} · {taskTypeLabel(taskItem.task_type, t)}
                    </div>
                    {subTotal > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 overflow-hidden" style={{ borderRadius: 4, background: "#E5E7EB" }}>
                          <div
                            className="h-full transition-all"
                            style={{ width: `${Math.round((subDone / subTotal) * 100)}%`, background: "#22c55e" }}
                          />
                        </div>
                        <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: "#9CA3AF" }}>
                          {subDone}/{subTotal}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                {isExpanded && taskSubtasks.length > 0 && (
                  <div className="mt-2 ml-5 space-y-1 pl-2" style={{ borderLeft: "1px solid #E5E7EB" }}>
                    {taskSubtasks.map((subtask) => {
                      const targetDepartment = subtask.target_department_id
                        ? departments.find((department) => department.id === subtask.target_department_id)
                        : null;
                      return (
                        <div key={subtask.id} className="flex items-center gap-1.5 text-xs">
                          <span>{SUBTASK_STATUS_ICON[subtask.status] || "\u23F3"}</span>
                          <span
                            className="flex-1 truncate"
                            style={{ color: subtask.status === "done" ? "#9CA3AF" : "#6B7280", textDecoration: subtask.status === "done" ? "line-through" : "none" }}
                          >
                            {subtask.title}
                          </span>
                          {targetDepartment && (
                            <span
                              className="shrink-0 px-1 py-0.5 text-[10px] font-medium font-mono"
                              style={{ borderRadius: 8, backgroundColor: targetDepartment.color + "30", color: targetDepartment.color }}
                            >
                              {targetDepartment.icon} {localeName(language, targetDepartment)}
                            </span>
                          )}
                          {subtask.delegated_task_id && subtask.status !== "done" && (
                            <span
                              className="shrink-0"
                              style={{ color: "#3B82F6" }}
                              title={t({ ko: "위임됨", en: "Delegated", ja: "委任済み", zh: "已委派" })}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </span>
                          )}
                          {subtask.status === "blocked" && subtask.blocked_reason && (
                            <span
                              className="text-red-400 text-[10px] truncate max-w-[80px]"
                              title={subtask.blocked_reason}
                            >
                              {subtask.blocked_reason}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (tab === "performance") {
    return <AgentPerformancePanel agentId={agent.id} t={t} />;
  }

  return (
    <div className="space-y-2">
      {agentSubAgents.length === 0 ? (
        <div className="terminal-empty-state py-8">
          <p className="terminal-empty-state-cmd">$ ls sub-agents/ --status=working</p>
          <p className="terminal-empty-state-result">(empty)</p>
          <p className="terminal-empty-state-hint">{t({ ko: "병렬 처리 시 서브에이전트가 자동으로 생성됩니다", en: "Sub-agents are spawned automatically during parallel work.", ja: "並列処理時にサブエージェントが自動で生成されます。", zh: "并行处理时会自动生成子代理。" })}</p>
        </div>
      ) : (
        agentSubAgents.map((subAgent) => (
          <div
            key={subAgent.id}
            className={`border rounded p-3 flex items-center gap-3 ${subAgent.status === "working" ? "animate-alba-spawn" : ""}`}
            style={{ background: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 14 }}
          >
            <div className="w-8 h-8 flex items-center justify-center" style={{ borderRadius: 8, background: "rgba(59,130,246,0.08)", color: "#3B82F6" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="7" r="3" />
                <path d="M4 18v-1a6 6 0 0112 0v1" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate flex items-center gap-1.5" style={{ color: "#111827" }}>
                <span className="text-[10px] px-1 py-0.5 font-mono" style={{ borderRadius: 8, background: "rgba(59,130,246,0.08)", color: "#3B82F6" }}>
                  {t({ ko: "서브", en: "Sub", ja: "サブ", zh: "子任务" })}
                </span>
                {subAgent.task}
              </div>
              <div className="text-xs mt-0.5 font-mono flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                {subAgent.status === "working" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {t({ ko: "작업중...", en: "Working...", ja: "作業中...", zh: "工作中..." })}
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
                  </>
                )}
              </div>
            </div>
            {subAgent.status === "working" && (
              <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderRadius: "50%", borderColor: "#3B82F6", borderTopColor: "transparent" }} />
            )}
          </div>
        ))
      )}
    </div>
  );
}
