import { useMemo, useState, type ComponentProps, type FormEventHandler } from "react";
import type { Agent, Department, TaskType } from "../../../types";
import type { WorkflowPackConfig } from "../../../api/workflow-skills-subtasks";
import type { TaskTemplate } from "../../../api/task-templates";
import { TASK_TYPE_OPTIONS, taskTypeLabel, type FormFeedback, type TFunction } from "../constants";
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
        }
      }}
    >
      <div
        className={`my-3 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl transition-[max-width] duration-300 ease-out sm:my-0 sm:max-h-[90dvh] lg:max-h-none lg:max-w-2xl ${
          createNewProjectMode ? "lg:max-w-5xl" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">
          <h2 className="text-lg font-bold text-white">
            {t({ ko: "새 업무 만들기", en: "Create New Task", ja: "新しいタスクを作成", zh: "创建新任务" })}
          </h2>
          <div className="flex items-center gap-2">
            {/* Template dropdown */}
            {templates && templates.length > 0 && onLoadTemplate && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateMenuOpen((p) => !p)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
                  title={t({ ko: "템플릿에서 불러오기", en: "Load from template", ja: "テンプレートから読込", zh: "从模板加载" })}
                >
                  {t({ ko: "템플릿", en: "Templates", ja: "テンプレ", zh: "模板" })}
                  ({templates.length})
                </button>
                {templateMenuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-56 max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="flex items-center gap-1 border-b border-slate-700/50 last:border-0">
                        <button
                          type="button"
                          className="flex-1 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 truncate"
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
                            className="px-2 py-2 text-[10px] text-slate-500 hover:text-red-400 transition"
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
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
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
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            className={`min-h-0 flex-1 overflow-y-auto px-6 py-4 lg:overflow-visible ${createNewProjectMode ? "lg:grid lg:grid-cols-2 lg:gap-5" : ""}`}
          >
            <div className="min-w-0 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
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
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {packInputSchema && onPackMetaChange && (
                <div
                  className="space-y-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    {packConfig?.name ?? "Pack"} {t({ ko: "입력 항목", en: "Fields", ja: "入力項目", zh: "输入字段" })}
                  </p>
                  {packInputSchema.required.map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        {field.replace(/_/g, " ")} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={packMeta?.[field] ?? ""}
                        onChange={(e) => onPackMetaChange(field, e.target.value)}
                        placeholder={field.replace(/_/g, " ")}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                  {packInputSchema.optional.map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-slate-400">
                        {field.replace(/_/g, " ")}
                      </label>
                      <input
                        type="text"
                        value={packMeta?.[field] ?? ""}
                        onChange={(e) => onPackMetaChange(field, e.target.value)}
                        placeholder={`${field.replace(/_/g, " ")} (${t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})`}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    {t({ ko: "부서", en: "Department", ja: "部署", zh: "部门" })}
                  </label>
                  <select
                    value={departmentId}
                    onChange={(event) => onDepartmentChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    {t({ ko: "업무 유형", en: "Task Type", ja: "タスク種別", zh: "任务类型" })}
                  </label>
                  <select
                    value={taskType}
                    onChange={(event) => onTaskTypeChange(event.target.value as TaskType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {TASK_TYPE_OPTIONS.map((typeOption) => (
                      <option key={typeOption.value} value={typeOption.value}>
                        {taskTypeLabel(typeOption.value, t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ProjectSection {...projectSectionProps} />

              <div className={createNewProjectMode ? "lg:hidden" : ""}>
                <PrioritySection priority={priority} t={t} onPriorityChange={onPriorityChange} />
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
            </div>

            {createNewProjectMode && (
              <aside className="hidden min-w-0 lg:block lg:transition-all lg:duration-300 lg:ease-out">
                <div className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
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
            <div className="px-6 pb-3">
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  formFeedback.tone === "error"
                    ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
                    : "border-cyan-500/50 bg-cyan-500/10 text-cyan-100"
                }`}
              >
                {formFeedback.message}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-700 px-6 py-4">
            {onSaveTemplate && title.trim() && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder={t({ ko: "템플릿 이름", en: "Template name", ja: "テンプレート名", zh: "模板名称" })}
                  className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
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
                  className="rounded-lg border border-emerald-600/50 bg-emerald-600/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-600/20 disabled:opacity-40"
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
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                type="submit"
                disabled={!title.trim() || submitBusy}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitBusy
                  ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." })
                  : t({ ko: "업무 만들기", en: "Create Task", ja: "タスク作成", zh: "创建任务" })}
              </button>
            </div>
          </div>
        </form>
      </div>

      <CreateTaskModalOverlays {...overlaysProps} />
    </div>
  );
}
