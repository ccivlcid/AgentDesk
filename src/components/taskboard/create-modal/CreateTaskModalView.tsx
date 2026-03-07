import { useMemo, useState, type ComponentProps, type FormEventHandler } from "react";
import type { Agent, Department, TaskType } from "../../../types";
import type { WorkflowPackConfig } from "../../../api/workflow-skills-subtasks";
import type { TaskTemplate } from "../../../api/task-templates";
import { normalizeLanguage, pickLang } from "../../../i18n";
import {
  PACK_DISPLAY_NAMES,
  PACK_FIELD_LABELS,
  TASK_TYPE_OPTIONS,
  taskTypeLabel,
  type FormFeedback,
  type TFunction,
} from "../constants";
import CreateTaskModalOverlays from "./Overlays";
import type { CreateTaskModalOverlaysProps } from "./overlay-types";
import { AssigneeSection, PrioritySection, ProjectSection } from "./Sections";

interface CreateTaskModalViewProps {
  t: TFunction;
  locale: string;
  createNewProjectMode: boolean;
  draftsCount: number;
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
}

export default function CreateTaskModalView({
  t,
  locale,
  createNewProjectMode,
  draftsCount,
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
  packConfig,
  packMeta,
  onPackMetaChange,
  templates,
  onLoadTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}: CreateTaskModalViewProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const packInputSchema = useMemo(() => {
    if (!packConfig?.input_schema) return null;
    const schema = packConfig.input_schema as { required?: string[]; optional?: string[] };
    const required = Array.isArray(schema.required) ? schema.required : [];
    const optional = Array.isArray(schema.optional) ? schema.optional : [];
    if (required.length === 0 && optional.length === 0) return null;
    return { required, optional };
  }, [packConfig]);

  const lang = useMemo(() => normalizeLanguage(locale), [locale]);
  const packFieldLabel = (fieldKey: string) =>
    PACK_FIELD_LABELS[fieldKey] ? pickLang(lang, PACK_FIELD_LABELS[fieldKey]) : fieldKey.replace(/_/g, " ");
  const packSectionTitle =
    packConfig?.key && PACK_DISPLAY_NAMES[packConfig.key]
      ? pickLang(lang, PACK_DISPLAY_NAMES[packConfig.key])
      : packConfig?.name ?? "Pack";

  const modalMaxH = "min(85dvh, calc(100dvh - 1rem))";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-2 sm:items-center sm:p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
        }
      }}
    >
      <div
        className={`my-2 flex w-full max-w-lg flex-col transition-[max-width] duration-300 ease-out sm:my-0 lg:max-w-2xl ${
          createNewProjectMode ? "lg:max-w-5xl" : ""
        }`}
        style={{ height: `calc(${modalMaxH})`, maxHeight: `calc(${modalMaxH})`, background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: "4px" }}
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4" style={{ borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent, #f59e0b)" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "새 업무 만들기", en: "Create New Task", ja: "新しいタスクを作成", zh: "创建新任务" })}
          </h2>
          <div className="flex items-center gap-2">
            {/* Template dropdown */}
            {templates && templates.length > 0 && onLoadTemplate && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateMenuOpen((p) => !p)}
                  className="border px-2.5 py-1.5 text-xs font-mono transition hover:opacity-80"
                  style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)", borderRadius: "2px" }}
                  title={t({ ko: "템플릿에서 불러오기", en: "Load from template", ja: "テンプレートから読込", zh: "从模板加载" })}
                >
                  {t({ ko: "템플릿", en: "Templates", ja: "テンプレ", zh: "模板" })}
                  ({templates.length})
                </button>
                {templateMenuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-56 max-h-56 overflow-y-auto border" style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", borderRadius: "2px" }}>
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="flex items-center gap-1 last:border-0" style={{ borderBottom: "1px solid var(--th-border)" }}>
                        <button
                          type="button"
                          className="flex-1 px-3 py-2 text-left text-xs truncate hover:opacity-80 transition"
                          style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                          onClick={() => {
                            onLoadTemplate(tpl.id);
                            setTemplateMenuOpen(false);
                          }}
                        >
                          {tpl.name}
                        </button>
                        {onDeleteTemplate && (
                          <button
                            type="button"
                            className="px-2 py-2 text-[10px] font-mono transition hover:text-red-400"
                            style={{ color: "var(--th-text-muted)" }}
                            onClick={() => void onDeleteTemplate(tpl.id)}
                            title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
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
            <button
              type="button"
              onClick={onOpenDraftModal}
              className="border px-2.5 py-1.5 text-xs font-mono transition hover:opacity-80"
              style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-primary)", borderRadius: "2px" }}
              title={t({
                ko: "임시 저장 항목 열기",
                en: "Open temporary drafts",
                ja: "一時保存を開く",
                zh: "打开临时草稿",
              })}
            >
              {`[${t({ ko: "임시", en: "Temp", ja: "一時", zh: "临时" })}(${draftsCount})]`}
            </button>
            <button
              onClick={onRequestClose}
              className="w-7 h-7 flex items-center justify-center font-mono text-xs transition hover:opacity-80"
              style={{ border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-surface)", borderRadius: "2px" }}
              title={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col">
          <div
            className={`px-4 py-3 sm:px-6 sm:py-4 ${createNewProjectMode ? "lg:grid lg:grid-cols-2 lg:gap-5" : ""}`}
          >
            <div className="min-w-0 space-y-4 sm:space-y-5">
              {/* 1. 기본 정보 */}
              <section className="space-y-2 sm:space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
                  {t({ ko: "기본 정보", en: "Basic Info", ja: "基本情報", zh: "基本信息" })}
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                    {t({ ko: "제목", en: "Title", ja: "タイトル", zh: "标题" })} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder={t({
                      ko: "업무 제목을 입력하세요",
                      en: "Enter a task title",
                      ja: "タスクのタイトルを入力してください",
                      zh: "请输入任务标题",
                    })}
                    required
                    className="w-full border outline-none transition"
                    style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                    {t({ ko: "설명", en: "Description", ja: "説明", zh: "说明" })}
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder={t({
                      ko: "업무에 대한 상세 설명을 입력하세요",
                      en: "Enter a detailed description",
                      ja: "タスクの詳細説明を入力してください",
                      zh: "请输入任务详细说明",
                    })}
                    rows={2}
                    className="w-full resize-none border outline-none transition"
                    style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                  />
                </div>
              </section>

              {/* 2. 오피스 팩 입력 항목 (팩별 커스텀 필드) */}
              {packInputSchema && onPackMetaChange && (
                <section className="space-y-2 p-3 sm:space-y-3 sm:p-4" style={{ border: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent, #f59e0b)", borderRadius: "2px", background: "var(--th-bg-primary)" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#f59e0b", fontFamily: "var(--th-font-mono)" }}>
                    {packSectionTitle} {t({ ko: "입력 항목", en: "Input Fields", ja: "入力項目", zh: "输入字段" })}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {packInputSchema.required.map((field) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                          {packFieldLabel(field)} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={packMeta?.[field] ?? ""}
                          onChange={(e) => onPackMetaChange(field, e.target.value)}
                          placeholder={packFieldLabel(field)}
                          className="w-full border outline-none transition"
                          style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                        />
                      </div>
                    ))}
                    {packInputSchema.optional.map((field) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {packFieldLabel(field)} ({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})
                        </label>
                        <input
                          type="text"
                          value={packMeta?.[field] ?? ""}
                          onChange={(e) => onPackMetaChange(field, e.target.value)}
                          placeholder={packFieldLabel(field)}
                          className="w-full border outline-none transition"
                          style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. 배정 및 옵션 */}
              <section className="space-y-2 sm:space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
                  {t({ ko: "배정 및 옵션", en: "Assignment & Options", ja: "割当・オプション", zh: "分配与选项" })}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                      {t({ ko: "부서", en: "Department", ja: "部署", zh: "部门" })}
                    </label>
                    <select
                      value={departmentId}
                      onChange={(event) => onDepartmentChange(event.target.value)}
                      className="w-full border outline-none transition"
                      style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                    >
                      <option value="">
                        {t({ ko: "-- 전체 --", en: "-- All --", ja: "-- 全体 --", zh: "-- 全部 --" })}
                      </option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.icon} {locale === "ko" ? department.name_ko : department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                      {t({ ko: "업무 유형", en: "Task Type", ja: "タスク種別", zh: "任务类型" })}
                    </label>
                    <select
                      value={taskType}
                      onChange={(event) => onTaskTypeChange(event.target.value as TaskType)}
                      className="w-full border outline-none transition"
                      style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
                    >
                      {TASK_TYPE_OPTIONS.map((typeOption) => (
                        <option key={typeOption.value} value={typeOption.value}>
                          {taskTypeLabel(typeOption.value, t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={createNewProjectMode ? "lg:hidden" : ""}>
                  <AssigneeSection
                    agents={filteredAgents}
                    departments={departments}
                    departmentId={departmentId}
                    assignAgentId={assignAgentId}
                    t={t}
                    onAssignAgentChange={onAssignAgentChange}
                  />
                </div>

                <ProjectSection {...projectSectionProps} />

                <div className={createNewProjectMode ? "lg:hidden" : ""}>
                  <PrioritySection priority={priority} t={t} onPriorityChange={onPriorityChange} />
                </div>
              </section>
            </div>

            {createNewProjectMode && (
              <aside className="hidden min-w-0 lg:block lg:transition-all lg:duration-300 lg:ease-out">
                <div className="space-y-4 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
                    {t({ ko: "우선순위 · 담당", en: "Priority & Assignee", ja: "優先度・担当", zh: "优先级与负责人" })}
                  </h3>
                  <PrioritySection priority={priority} t={t} onPriorityChange={onPriorityChange} />
                  <AssigneeSection
                    agents={filteredAgents}
                    departments={departments}
                    departmentId={departmentId}
                    assignAgentId={assignAgentId}
                    t={t}
                    onAssignAgentChange={onAssignAgentChange}
                  />
                </div>
              </aside>
            )}
          </div>

          {formFeedback && (
            <div className="shrink-0 px-4 pb-2 sm:px-6 sm:pb-3">
              <div
                className={`border px-3 py-2 text-xs font-mono ${
                  formFeedback.tone === "error"
                    ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
                    : "border-cyan-500/50 bg-cyan-500/10 text-cyan-100"
                }`}
                style={{ borderRadius: "2px" }}
              >
                {formFeedback.message}
              </div>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4" style={{ borderTop: "1px solid var(--th-border)" }}>
            {onSaveTemplate && title.trim() && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder={t({ ko: "템플릿 이름", en: "Template name", ja: "テンプレート名", zh: "模板名称" })}
                  className="w-32 border outline-none"
                  style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
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
                  className="border px-2.5 py-1.5 text-xs font-mono transition hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", color: "#22c55e", borderRadius: "2px" }}
                >
                  {savingTemplate
                    ? "..."
                    : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                </button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={onRequestClose}
                className="border px-4 py-2 text-xs font-mono transition hover:opacity-80"
                style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)", borderRadius: "2px" }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                type="submit"
                disabled={!title.trim() || submitBusy}
                className="px-5 py-2 text-xs font-bold font-mono uppercase tracking-wider transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "var(--th-accent, #f59e0b)", color: "#000", borderRadius: "2px", border: "none" }}
              >
                {submitBusy
                  ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." })
                  : t({ ko: "업무 만들기", en: "Create Task", ja: "タスク作成", zh: "创建任务" })}
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
