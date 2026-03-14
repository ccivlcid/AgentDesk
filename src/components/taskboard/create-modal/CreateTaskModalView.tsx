import { useState, type ComponentProps, type FormEventHandler } from "react";
import type { Agent, Department, TaskType } from "../../../types";
import type { WorkflowPackConfig } from "../../../api/workflow-skills-subtasks";
import type { TaskTemplate } from "../../../api/task-templates";
import {
  TASK_TYPE_OPTIONS,
  taskTypeLabel,
  type FormFeedback,
  type TFunction,
} from "../constants";
import CreateTaskModalOverlays from "./Overlays";
import type { CreateTaskModalOverlaysProps } from "./overlay-types";
import { AssigneeSection, ProjectSection } from "./Sections";
import HeaderModalChrome from "../../ui/HeaderModalChrome";

interface CreateTaskModalViewProps {
  t: TFunction;
  locale: string;
  createNewProjectMode: boolean;
  draftsCount: number;
  defaultAgentId?: string;
  title: string;
  description: string;
  departmentId: string;
  taskType: TaskType;
  priority: number;
  assignAgentId: string;
  submitBusy: boolean;
  formFeedback: FormFeedback | null;
  departments: Department[];
  filteredAgents: Agent[];
  allAgents?: Agent[];
  projectSectionProps: ComponentProps<typeof ProjectSection>;
  overlaysProps: CreateTaskModalOverlaysProps;
  onOpenDraftModal: () => void;
  onRequestClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onTaskTypeChange: (value: TaskType) => void;
  onPriorityChange: (value: number) => void;
  onAssignAgentChange: (value: string) => void;
  packConfig?: WorkflowPackConfig | null;
  packMeta?: Record<string, string>;
  onPackMetaChange?: (key: string, value: string) => void;
  templates?: TaskTemplate[];
  onLoadTemplate?: (templateId: string) => void;
  onSaveTemplate?: (name: string) => Promise<void>;
  onDeleteTemplate?: (templateId: string) => Promise<void>;
  handoffEnabled?: boolean;
  handoffAgentId?: string;
  handoffCondition?: "always" | "on_success" | "on_fail";
  onHandoffEnabledChange?: (enabled: boolean) => void;
  onHandoffAgentIdChange?: (agentId: string) => void;
  onHandoffConditionChange?: (condition: "always" | "on_success" | "on_fail") => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
const inputBase: React.CSSProperties = {
  ...mono,
  borderRadius: 0,
  border: "1px solid var(--th-border)",
  background: "var(--th-bg-elevated)",
  color: "var(--th-text-primary)",
  outline: "none",
  fontSize: "12px",
  padding: "5px 8px",
  width: "100%",
  boxSizing: "border-box",
};

export default function CreateTaskModalView({
  t,
  locale,
  createNewProjectMode,
  draftsCount,
  defaultAgentId,
  title,
  description,
  departmentId,
  taskType,
  priority,
  assignAgentId,
  submitBusy,
  formFeedback,
  departments,
  filteredAgents,
  allAgents,
  projectSectionProps,
  overlaysProps,
  onOpenDraftModal,
  onRequestClose,
  onSubmit,
  onTitleChange,
  onDescriptionChange,
  onDepartmentChange,
  onTaskTypeChange,
  onPriorityChange,
  onAssignAgentChange,
  templates,
  onLoadTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  handoffEnabled = false,
  handoffAgentId = "",
  handoffCondition = "on_success",
  onHandoffEnabledChange,
  onHandoffAgentIdChange,
  onHandoffConditionChange,
}: CreateTaskModalViewProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  void createNewProjectMode;

  const headerTitle = t({ ko: "새 업무", en: "New Task", ja: "新規タスク", zh: "新建任务" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:items-center"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onRequestClose(); }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden"
        style={{
          borderRadius: 10,
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          maxHeight: "calc(100dvh - 2rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <HeaderModalChrome
          title={headerTitle}
          rightSlot={
            <div className="flex items-center gap-1.5">
              {templates && templates.length > 0 && onLoadTemplate && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTemplateMenuOpen((p) => !p); }}
                    style={{ ...mono, fontSize: "9px", padding: "2px 7px", borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)", cursor: "pointer" }}
                  >
                    TPL ({templates.length})
                  </button>
                  {templateMenuOpen && (
                    <div
                      className="absolute right-0 top-full z-10 mt-1 w-52 max-h-52 overflow-y-auto"
                      style={{ borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
                    >
                      {templates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center last:border-0" style={{ borderBottom: "1px solid var(--th-border)" }}>
                          <button
                            type="button"
                            className="flex-1 px-3 py-1.5 text-left truncate hover:opacity-80 transition"
                            style={{ ...mono, fontSize: "10px", color: "var(--th-text-primary)" }}
                            onClick={() => { onLoadTemplate(tpl.id); setTemplateMenuOpen(false); }}
                          >
                            {tpl.name}
                          </button>
                          {onDeleteTemplate && (
                            <button
                              type="button"
                              style={{ ...mono, padding: "6px 8px", fontSize: "9px", color: "var(--th-text-muted)", cursor: "pointer" }}
                              onClick={() => void onDeleteTemplate(tpl.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {draftsCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenDraftModal}
                  style={{ ...mono, fontSize: "9px", padding: "2px 7px", borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)", cursor: "pointer" }}
                >
                  DRAFT ({draftsCount})
                </button>
              )}
            </div>
          }
          onClose={onRequestClose}
        />

        {/* ── Body (스크롤 가능) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <form onSubmit={onSubmit}>
            <div className="px-4 py-4 space-y-3">

              {/* 제목 — 터미널 프롬프트 스타일 */}
              <div className="flex items-center gap-2" style={{ borderBottom: "1px solid var(--th-border)", paddingBottom: "6px" }}>
                <span style={{ ...mono, fontSize: "13px", color: "var(--th-accent)", flexShrink: 0, fontWeight: 700 }}>$</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder={t({ ko: "업무 제목을 입력하세요...", en: "enter task title...", ja: "タイトルを入力...", zh: "输入任务标题..." })}
                  required
                  autoFocus
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    ...mono,
                    fontSize: "14px",
                    color: "var(--th-text-heading)",
                    padding: "2px 0",
                    caretColor: "var(--th-accent)",
                  }}
                />
              </div>

              {/* 설명 */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder={t({ ko: "설명 (선택)", en: "description (optional)", ja: "説明（任意）", zh: "说明（可选）" })}
                  rows={2}
                  style={{ ...inputBase, resize: "none" }}
                />
              </div>

              {/* 부서 필 */}
              {departments.length > 0 && (
                <div>
                  <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                    DEPT
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => onDepartmentChange("")}
                      style={{
                        ...mono, fontSize: "10px", padding: "3px 8px", borderRadius: 0,
                        background: !departmentId ? "var(--th-accent)" : "var(--th-bg-elevated)",
                        color: !departmentId ? "#000" : "var(--th-text-muted)",
                        border: `1px solid ${!departmentId ? "var(--th-accent)" : "var(--th-border)"}`,
                        cursor: "pointer",
                      }}
                    >
                      ALL
                    </button>
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onDepartmentChange(d.id)}
                        style={{
                          ...mono, fontSize: "10px", padding: "3px 8px", borderRadius: 0,
                          background: departmentId === d.id ? "var(--th-accent)" : "var(--th-bg-elevated)",
                          color: departmentId === d.id ? "#000" : "var(--th-text-muted)",
                          border: `1px solid ${departmentId === d.id ? "var(--th-accent)" : "var(--th-border)"}`,
                          cursor: "pointer",
                        }}
                      >
                        {d.icon} {locale === "ko" ? d.name_ko : d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 타입 + 우선순위 가로 배치 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                    TYPE
                  </div>
                  <select
                    value={taskType}
                    onChange={(e) => onTaskTypeChange(e.target.value as TaskType)}
                    style={{ ...inputBase }}
                  >
                    {TASK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {taskTypeLabel(opt.value, t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                    PRIORITY
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => onPriorityChange(star)}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          fontSize: "11px",
                          borderRadius: 0,
                          background: star <= priority ? "rgba(245,158,11,0.85)" : "var(--th-bg-elevated)",
                          color: star <= priority ? "#000" : "var(--th-text-muted)",
                          border: `1px solid ${star <= priority ? "rgba(245,158,11,0.6)" : "var(--th-border)"}`,
                          cursor: "pointer",
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 담당 에이전트 */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
                  <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    AGENT
                  </div>
                  {/* 에이전트가 미리 지정된 경우 변경 링크 */}
                  {defaultAgentId && assignAgentId === defaultAgentId && (
                    <button
                      type="button"
                      onClick={() => onAssignAgentChange("")}
                      style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", cursor: "pointer", textDecoration: "underline" }}
                    >
                      {t({ ko: "변경", en: "change", ja: "変更", zh: "更改" })}
                    </button>
                  )}
                </div>

                {/* 미리 지정된 에이전트 — 배지로 표시 */}
                {defaultAgentId && assignAgentId === defaultAgentId ? (() => {
                  const agent = filteredAgents.find((a) => a.id === defaultAgentId);
                  if (!agent) return <AssigneeSection agents={filteredAgents} departments={departments} departmentId={departmentId} assignAgentId={assignAgentId} t={t} onAssignAgentChange={onAssignAgentChange} />;
                  return (
                    <div
                      style={{
                        ...mono,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "7px 10px",
                        border: "1px solid var(--th-accent)",
                        background: "rgba(245,158,11,0.06)",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ fontSize: "16px", lineHeight: 1 }}>{agent.avatar_emoji || "🤖"}</span>
                      <span style={{ fontWeight: 600, color: "var(--th-accent)" }}>{agent.name_ko || agent.name}</span>
                      <span style={{
                        fontSize: "8px",
                        padding: "1px 4px",
                        border: "1px solid rgba(245,158,11,0.35)",
                        background: "rgba(245,158,11,0.08)",
                        color: "#f59e0b",
                      }}>
                        {({ claude: "Claude Code", codex: "Codex CLI", gemini: "Gemini CLI", opencode: "OpenCode", copilot: "Copilot", antigravity: "Antigravity", cursor: "Cursor", ollama: "Ollama" } as Record<string, string>)[agent.cli_provider] ?? agent.cli_provider}
                      </span>
                      <span style={{ fontSize: "9px", color: "#22c55e", marginLeft: "auto" }}>✓ {t({ ko: "배정됨", en: "assigned", ja: "割り当て済み", zh: "已分配" })}</span>
                    </div>
                  );
                })() : (
                  <AssigneeSection
                    agents={filteredAgents}
                    departments={departments}
                    departmentId={departmentId}
                    assignAgentId={assignAgentId}
                    t={t}
                    onAssignAgentChange={onAssignAgentChange}
                  />
                )}
              </div>

              {/* 프로젝트 */}
              <div>
                <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                  PROJECT
                </div>
                <ProjectSection {...projectSectionProps} />
              </div>

              {/* 완료 후 핸드오프 */}
              <div style={{ borderTop: "1px solid var(--th-border)", paddingTop: "12px" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: handoffEnabled ? "8px" : 0 }}>
                  <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {t({ ko: "완료 후 핸드오프", en: "HANDOFF ON COMPLETE", ja: "完了後ハンドオフ", zh: "完成后移交" })}
                  </div>
                  <button
                    type="button"
                    onClick={() => onHandoffEnabledChange?.(!handoffEnabled)}
                    style={{
                      ...mono,
                      fontSize: "9px",
                      padding: "2px 8px",
                      borderRadius: 0,
                      border: `1px solid ${handoffEnabled ? "var(--th-accent)" : "var(--th-border)"}`,
                      background: handoffEnabled ? "var(--th-accent)" : "var(--th-bg-elevated)",
                      color: handoffEnabled ? "#000" : "var(--th-text-muted)",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {handoffEnabled
                      ? t({ ko: "ON", en: "ON", ja: "ON", zh: "ON" })
                      : t({ ko: "OFF", en: "OFF", ja: "OFF", zh: "OFF" })}
                  </button>
                </div>
                {handoffEnabled && (
                  <div className="space-y-2">
                    <div>
                      <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
                        {t({ ko: "핸드오프 에이전트", en: "HANDOFF AGENT", ja: "ハンドオフエージェント", zh: "移交智能体" })}
                      </div>
                      <select
                        value={handoffAgentId}
                        onChange={(e) => onHandoffAgentIdChange?.(e.target.value)}
                        style={{ ...inputBase }}
                      >
                        <option value="">
                          {t({ ko: "에이전트 선택...", en: "Select agent...", ja: "エージェントを選択...", zh: "选择智能体..." })}
                        </option>
                        {(allAgents ?? filteredAgents).map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.avatar_emoji} {locale === "ko" ? (agent.name_ko || agent.name) : agent.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
                        {t({ ko: "핸드오프 조건", en: "HANDOFF CONDITION", ja: "ハンドオフ条件", zh: "移交条件" })}
                      </div>
                      <div className="flex gap-0.5">
                        {(["always", "on_success", "on_fail"] as const).map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => onHandoffConditionChange?.(cond)}
                            style={{
                              flex: 1,
                              ...mono,
                              fontSize: "9px",
                              padding: "4px 0",
                              borderRadius: 0,
                              border: `1px solid ${handoffCondition === cond ? "var(--th-accent)" : "var(--th-border)"}`,
                              background: handoffCondition === cond ? "var(--th-accent)" : "var(--th-bg-elevated)",
                              color: handoffCondition === cond ? "#000" : "var(--th-text-muted)",
                              cursor: "pointer",
                              textTransform: "uppercase",
                            }}
                          >
                            {cond === "always"
                              ? t({ ko: "항상", en: "ALWAYS", ja: "常に", zh: "总是" })
                              : cond === "on_success"
                                ? t({ ko: "성공시", en: "ON SUCCESS", ja: "成功時", zh: "成功时" })
                                : t({ ko: "실패시", en: "ON FAIL", ja: "失敗時", zh: "失败时" })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* 피드백 메시지 */}
            {formFeedback && (
              <div className="px-4 pb-3">
                <div
                  style={{
                    ...mono,
                    fontSize: "11px",
                    padding: "6px 10px",
                    borderRadius: 0,
                    border: formFeedback.tone === "error" ? "1px solid rgba(244,63,94,0.5)" : "1px solid rgba(6,182,212,0.4)",
                    background: formFeedback.tone === "error" ? "rgba(244,63,94,0.08)" : "rgba(6,182,212,0.08)",
                    color: formFeedback.tone === "error" ? "#fb7185" : "#7dd3fc",
                  }}
                >
                  {formFeedback.message}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div
              className="flex flex-wrap items-center gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderTop: "1px solid var(--th-border)" }}
            >
              {/* 템플릿 저장 */}
              {onSaveTemplate && title.trim() && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    placeholder={t({ ko: "템플릿 이름", en: "template name", ja: "テンプレ名", zh: "模板名" })}
                    style={{ ...mono, borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", fontSize: "10px", padding: "3px 6px", width: "8rem", outline: "none" }}
                  />
                  <button
                    type="button"
                    disabled={!saveTemplateName.trim() || savingTemplate}
                    onClick={async () => {
                      setSavingTemplate(true);
                      try {
                        await onSaveTemplate(saveTemplateName.trim());
                        setSaveTemplateName("");
                      } finally {
                        setSavingTemplate(false);
                      }
                    }}
                    style={{ ...mono, fontSize: "10px", padding: "3px 8px", borderRadius: 0, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer" }}
                  >
                    {savingTemplate ? "..." : "SAVE"}
                  </button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRequestClose}
                  style={{ ...mono, fontSize: "11px", padding: "5px 12px", borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
                >
                  {t({ ko: "취소", en: "CANCEL", ja: "キャンセル", zh: "取消" })}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || submitBusy}
                  style={{ ...mono, fontSize: "11px", fontWeight: 700, padding: "5px 16px", borderRadius: 0, background: "var(--th-accent)", color: "#000", cursor: "pointer", opacity: !title.trim() || submitBusy ? 0.4 : 1 }}
                >
                  {submitBusy
                    ? t({ ko: "생성 중...", en: "CREATING...", ja: "作成中...", zh: "创建中..." })
                    : t({ ko: "업무 만들기 ↵", en: "CREATE ↵", ja: "作成 ↵", zh: "创建 ↵" })}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CreateTaskModalOverlays {...overlaysProps} />
    </div>
  );
}
