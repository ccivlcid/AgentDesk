import { useState, type ComponentProps, type FormEventHandler, type ReactNode } from "react";
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
import { ProjectSection } from "./Sections";

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
  kbSection?: ReactNode;
  figmaSection?: ReactNode;
  onSubmitWithCli?: () => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const AGENT_STATUS_DOT: Record<string, string> = {
  working: "#22c55e",
  idle:    "#475569",
  break:   "#f59e0b",
  offline: "#ef4444",
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
  kbSection,
  figmaSection,
  onSubmitWithCli,
}: CreateTaskModalViewProps) {
  void createNewProjectMode;

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const hasTemplatesOrDrafts = (templates && templates.length > 0 && onLoadTemplate) || draftsCount > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        <form onSubmit={onSubmit}>

          {/* ── 제목 ── */}
          <div style={{ padding: "28px 24px 0" }}>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t({ ko: "무엇을 해야 하나요?", en: "What needs to be done?", ja: "何をすべきですか？", zh: "需要做什么？" })}
              required
              autoFocus
              style={{
                ...mono,
                width: "100%",
                boxSizing: "border-box",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--th-text-heading)",
                padding: "0 0 12px",
                caretColor: "var(--th-accent)",
                borderBottom: `2px solid ${title ? "var(--th-accent)" : "var(--th-border)"}`,
              }}
            />
          </div>

          {/* ── 설명 ── */}
          <div style={{ padding: "14px 24px 0" }}>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t({ ko: "상세 내용... (선택)", en: "Details... (optional)", ja: "詳細... (任意)", zh: "详情... (可选)" })}
              rows={2}
              style={{
                ...mono,
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid var(--th-border)",
                borderRadius: 8,
                background: "var(--th-bg-elevated)",
                color: "var(--th-text-secondary)",
                outline: "none",
                fontSize: 12,
                padding: "10px 12px",
                resize: "none",
                lineHeight: 1.65,
              }}
            />
          </div>

          <Divider />

          {/* ── 에이전트 ── */}
          <Section>
            <Label>{t({ ko: "담당 에이전트", en: "Assign to", ja: "担当エージェント", zh: "分配给" })}</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {/* 미배정 */}
              <AgentChip
                emoji="—"
                name={t({ ko: "미배정", en: "None", ja: "未割当", zh: "未分配" })}
                statusColor="#475569"
                selected={!assignAgentId}
                onClick={() => onAssignAgentChange("")}
              />
              {filteredAgents.map((agent) => (
                <AgentChip
                  key={agent.id}
                  emoji={agent.avatar_emoji || "🤖"}
                  name={locale === "ko" ? (agent.name_ko || agent.name) : agent.name}
                  statusColor={AGENT_STATUS_DOT[agent.status] ?? "#475569"}
                  selected={assignAgentId === agent.id}
                  onClick={() => onAssignAgentChange(agent.id)}
                  isDefault={agent.id === defaultAgentId}
                />
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── 부서 ── */}
          {departments.length > 0 && (
            <>
              <Section>
                <Label>{t({ ko: "부서", en: "Department", ja: "部門", zh: "部门" })}</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  <PillBtn active={!departmentId} onClick={() => onDepartmentChange("")}>
                    {t({ ko: "전체", en: "All", ja: "全部", zh: "全部" })}
                  </PillBtn>
                  {departments.map((d) => (
                    <PillBtn key={d.id} active={departmentId === d.id} onClick={() => onDepartmentChange(d.id)}>
                      {d.icon} {locale === "ko" ? d.name_ko : d.name}
                    </PillBtn>
                  ))}
                </div>
              </Section>
              <Divider />
            </>
          )}

          {/* ── 유형 + 우선순위 ── */}
          <Section>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <Label>{t({ ko: "업무 유형", en: "Type", ja: "種別", zh: "类型" })}</Label>
                <select
                  value={taskType}
                  onChange={(e) => onTaskTypeChange(e.target.value as TaskType)}
                  style={{ ...mono, width: "100%", boxSizing: "border-box", fontSize: 11, padding: "7px 10px", borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", outline: "none" }}
                >
                  {TASK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{taskTypeLabel(opt.value, t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t({ ko: "우선순위", en: "Priority", ja: "優先度", zh: "优先级" })}</Label>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onPriorityChange(star)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        fontSize: 15,
                        borderRadius: 6,
                        border: `1px solid ${star <= priority ? "var(--th-accent-border)" : "var(--th-border)"}`,
                        background: star <= priority ? "var(--th-accent-glow)" : "var(--th-bg-elevated)",
                        color: star <= priority ? "var(--th-accent)" : "var(--th-border)",
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >★</button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Divider />

          {/* ── 프로젝트 ── */}
          <Section>
            <Label>{t({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}</Label>
            <ProjectSection {...projectSectionProps} />
          </Section>

          <Divider />

          {/* ── 핸드오프 ── */}
          <Section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: handoffEnabled ? 12 : 0 }}>
              <div>
                <div style={{ ...mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>
                  {t({ ko: "완료 후 핸드오프", en: "Handoff on complete", ja: "完了後ハンドオフ", zh: "完成后移交" })}
                </div>
                <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                  {t({ ko: "완료 시 다른 에이전트에게 자동 전달", en: "Pass to another agent when done", ja: "完了後に次のエージェントへ転送", zh: "完成后自动传递给另一个代理" })}
                </div>
              </div>
              <Toggle enabled={handoffEnabled} onChange={(v) => onHandoffEnabledChange?.(v)} />
            </div>
            {handoffEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <select
                  value={handoffAgentId}
                  onChange={(e) => onHandoffAgentIdChange?.(e.target.value)}
                  style={{ ...mono, width: "100%", boxSizing: "border-box", fontSize: 11, padding: "7px 10px", borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", outline: "none" }}
                >
                  <option value="">{t({ ko: "에이전트 선택...", en: "Select agent...", ja: "エージェントを選択...", zh: "选择智能体..." })}</option>
                  {(allAgents ?? filteredAgents).map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.avatar_emoji} {locale === "ko" ? (agent.name_ko || agent.name) : agent.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["always", "on_success", "on_fail"] as const).map((cond) => (
                    <PillBtn key={cond} active={handoffCondition === cond} onClick={() => onHandoffConditionChange?.(cond)}>
                      {cond === "always"
                        ? t({ ko: "항상", en: "Always", ja: "常に", zh: "总是" })
                        : cond === "on_success"
                          ? t({ ko: "성공시", en: "Success", ja: "成功時", zh: "成功时" })
                          : t({ ko: "실패시", en: "Fail", ja: "失敗時", zh: "失败时" })}
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Figma / KB */}
          {figmaSection}
          {kbSection}

          {/* 피드백 */}
          {formFeedback && (
            <div style={{ padding: "0 24px 4px" }}>
              <div style={{
                ...mono,
                fontSize: 11,
                padding: "9px 13px",
                borderRadius: 7,
                border: formFeedback.tone === "error" ? "1px solid var(--th-danger-border)" : "1px solid var(--th-border-accent)",
                background: formFeedback.tone === "error" ? "var(--th-danger-bg)" : "var(--th-active-bg)",
                color: formFeedback.tone === "error" ? "var(--th-danger-text)" : "var(--th-text-secondary)",
              }}>
                {formFeedback.message}
              </div>
            </div>
          )}

          <div style={{ height: 16 }} />

          {/* ── Footer ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--th-border)" }}>
            {/* 템플릿 */}
            {hasTemplatesOrDrafts && (
              <div style={{ display: "flex", gap: 5 }}>
                {templates && templates.length > 0 && onLoadTemplate && (
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTemplateMenuOpen((p) => !p); }}
                      style={{ ...mono, fontSize: 9, padding: "3px 9px", borderRadius: 5, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
                    >
                      TPL ({templates.length}) ▾
                    </button>
                    {templateMenuOpen && (
                      <div style={{ position: "absolute", left: 0, bottom: "calc(100% + 4px)", zIndex: 10, width: 200, maxHeight: 200, overflowY: "auto", borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", boxShadow: "0 -8px 24px rgba(0,0,0,0.3)" }}>
                        {templates.map((tpl) => (
                          <div key={tpl.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--th-border)" }}>
                            <button type="button" style={{ ...mono, flex: 1, padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--th-text-primary)", background: "none", border: "none", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onClick={() => { onLoadTemplate(tpl.id); setTemplateMenuOpen(false); }}>
                              {tpl.name}
                            </button>
                            {onDeleteTemplate && (
                              <button type="button" style={{ ...mono, padding: "8px", fontSize: 9, color: "var(--th-text-muted)", cursor: "pointer", background: "none", border: "none" }} onClick={() => void onDeleteTemplate(tpl.id)}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {draftsCount > 0 && (
                  <button type="button" onClick={onOpenDraftModal} style={{ ...mono, fontSize: 9, padding: "3px 9px", borderRadius: 5, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}>
                    DRAFT ({draftsCount})
                  </button>
                )}
              </div>
            )}

            {/* 템플릿 저장 */}
            {onSaveTemplate && title.trim() && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder={t({ ko: "템플릿 이름", en: "template name", ja: "テンプレ名", zh: "模板名" })}
                  style={{ ...mono, borderRadius: 5, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", fontSize: 10, padding: "4px 8px", width: "7rem", outline: "none" }}
                />
                <button
                  type="button"
                  disabled={!saveTemplateName.trim() || savingTemplate}
                  onClick={async () => {
                    setSavingTemplate(true);
                    try { await onSaveTemplate(saveTemplateName.trim()); setSaveTemplateName(""); }
                    finally { setSavingTemplate(false); }
                  }}
                  style={{ ...mono, fontSize: 10, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer" }}
                >
                  {savingTemplate ? "..." : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                </button>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={onRequestClose}
              style={{ ...mono, fontSize: 12, padding: "7px 16px", borderRadius: 7, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitBusy}
              onClick={assignAgentId && onSubmitWithCli ? (e) => { e.preventDefault(); onSubmitWithCli(); } : undefined}
              style={{
                ...mono,
                fontSize: 12,
                fontWeight: 700,
                padding: "7px 22px",
                borderRadius: 7,
                background: !title.trim() || submitBusy ? "var(--th-bg-elevated)" : "var(--th-accent)",
                color: !title.trim() || submitBusy ? "var(--th-text-muted)" : "var(--th-bg-primary)",
                border: "none",
                cursor: !title.trim() || submitBusy ? "not-allowed" : "pointer",
                boxShadow: !title.trim() || submitBusy ? "none" : "0 2px 14px rgba(245,158,11,0.3)",
                transition: "all 0.15s",
              }}
            >
              {submitBusy
                ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." })
                : "RUN CLI ▶"}
            </button>
          </div>
        </form>
      </div>

      <CreateTaskModalOverlays {...overlaysProps} />
    </div>
  );
}

// ── 에이전트 칩 (wrap grid) ───────────────────────────────────────────────────

function AgentChip({ emoji, name, statusColor, selected, onClick, isDefault }: {
  emoji: string;
  name: string;
  statusColor: string;
  selected: boolean;
  onClick: () => void;
  isDefault?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 11px 6px 8px",
        borderRadius: 20,
        border: `1.5px solid ${selected ? "var(--th-accent)" : "var(--th-border)"}`,
        background: selected ? "var(--th-accent-glow)" : "var(--th-bg-elevated)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.12s",
        boxShadow: selected ? "0 0 0 3px rgba(245,158,11,0.1)" : "none",
      }}
    >
      {/* 이모지 + 상태 점 */}
      <div style={{ position: "relative", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
        <span style={{
          position: "absolute",
          bottom: -1,
          right: -2,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: statusColor,
          border: "1.5px solid var(--th-bg-surface)",
        }} />
      </div>
      <span style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: 11,
        fontWeight: selected ? 600 : 400,
        color: selected ? "var(--th-accent)" : "var(--th-text-secondary)",
        whiteSpace: "nowrap",
        maxWidth: 90,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {name}
      </span>
      {isDefault && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--th-accent)", flexShrink: 0 }} />
      )}
    </button>
  );
}

// ── 토글 스위치 ───────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 11,
        border: "none",
        background: enabled ? "var(--th-accent)" : "var(--th-border)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: enabled ? 19 : 3,
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

// ── 공통 레이아웃 ─────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "16px 24px" }}>{children}</div>;
}

function Divider() {
  return <div style={{ height: 1, background: "var(--th-border)", margin: "0 24px" }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--th-font-mono)",
      fontSize: 10,
      fontWeight: 600,
      color: "var(--th-text-muted)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 9,
    }}>
      {children}
    </div>
  );
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: 10,
        padding: "4px 11px",
        borderRadius: 14,
        border: `1px solid ${active ? "var(--th-accent)" : "var(--th-border)"}`,
        background: active ? "var(--th-accent)" : "var(--th-bg-elevated)",
        color: active ? "var(--th-bg-primary)" : "var(--th-text-secondary)",
        cursor: "pointer",
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
