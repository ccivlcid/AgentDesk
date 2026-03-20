import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../../../i18n";
import type { Agent, Project } from "../../../types";
import {
  getScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  validateCron,
  type ScheduledTask,
  type ScheduledTaskPayload,
} from "../../../api/scheduled-tasks";
import {
  getTaskTemplates,
  createTaskTemplate,
  deleteTaskTemplate,
  type TaskTemplate,
} from "../../../api/task-templates";
import { SchedulesTab } from "./SchedulesTab";
import { TemplatesTab } from "./TemplatesTab";
import { UserGuide } from "./UserGuide";

export interface ScheduledTasksPanelProps {
  agents?: Agent[];
  currentProjectId?: string | null;
}

type TabKey = "schedules" | "templates" | "guide";

export default function ScheduledTasksPanel({ agents = [], currentProjectId }: ScheduledTasksPanelProps) {
  const { t, locale, language } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [activeTab, setActiveTab] = useState<TabKey>("schedules");
  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCronHelp, setShowCronHelp] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCron, setFormCron] = useState("0 9 * * *");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formAgentId, setFormAgentId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formAutoRun, setFormAutoRun] = useState(false);
  const [cronValid, setCronValid] = useState(true);
  const [cronDesc, setCronDesc] = useState("");

  const [showTplForm, setShowTplForm] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplTaskType, setTplTaskType] = useState("general");
  const [tplPriority, setTplPriority] = useState(3);
  const [tplWorkflowPack, setTplWorkflowPack] = useState("");
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null);

  const [guideExpanded, setGuideExpanded] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<"current" | "all">("current");

  const formRef = useRef<HTMLDivElement>(null);

  const workflowPackOptions = useMemo(() => [
    { key: "", label: t({ ko: "없음", en: "None", ja: "なし", zh: "无" }) },
    { key: "development", label: t({ ko: "개발", en: "Development", ja: "開発", zh: "开发" }) },
    { key: "novel", label: t({ ko: "소설", en: "Novel", ja: "小説", zh: "小说" }) },
    { key: "report", label: t({ ko: "리포트", en: "Report", ja: "レポート", zh: "报告" }) },
    { key: "video_preprod", label: t({ ko: "영상 기획", en: "Video Pre-prod", ja: "動画制作", zh: "视频策划" }) },
    { key: "web_research_report", label: t({ ko: "웹 리서치", en: "Web Research", ja: "Webリサーチ", zh: "网络研究" }) },
    { key: "roleplay", label: t({ ko: "롤플레이", en: "Roleplay", ja: "ロールプレイ", zh: "角色扮演" }) },
    { key: "asset_management", label: t({ ko: "에셋 관리", en: "Asset Management", ja: "アセット管理", zh: "资产管理" }) },
  ], [t]);

  const refresh = useCallback(async () => {
    try {
      const [s, tpls, projRes] = await Promise.all([
        getScheduledTasks(),
        getTaskTemplates(),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      setSchedules(s);
      setTemplates(tpls);
      setProjects(projRes.projects ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!formCron.trim()) {
      setCronValid(false);
      setCronDesc("");
      return;
    }
    const timer = setTimeout(async () => {
      const result = await validateCron(formCron.trim());
      setCronValid(result.valid);
      setCronDesc(language === "ko" ? result.description_ko ?? "" : result.description_en ?? "");
    }, 300);
    return () => clearTimeout(timer);
  }, [formCron, locale, language]);

  function resetForm() {
    setFormName("");
    setFormCron("0 9 * * *");
    setFormTemplateId("");
    setFormAgentId("");
    setFormProjectId("");
    setFormAutoRun(false);
    setEditingId(null);
  }

  function startEdit(s: ScheduledTask) {
    setFormName(s.name);
    setFormCron(s.cron_expression);
    setFormTemplateId(s.template_id ?? "");
    setFormAgentId(s.assigned_agent_id ?? "");
    setFormProjectId(s.project_id ?? "");
    setFormAutoRun(s.auto_run);
    setEditingId(s.id);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function handleSubmit() {
    if (!formName.trim() || !cronValid) return;
    const payload: ScheduledTaskPayload = {
      name: formName.trim(),
      cron_expression: formCron.trim(),
      template_id: formTemplateId || null,
      assigned_agent_id: formAgentId || null,
      project_id: formProjectId || null,
      auto_run: formAutoRun,
    };
    if (editingId) {
      await updateScheduledTask(editingId, payload);
    } else {
      await createScheduledTask(payload);
    }
    resetForm();
    setShowForm(false);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteScheduledTask(id);
    setDeletingId(null);
    refresh();
  }

  async function handleToggle(id: string) {
    await toggleScheduledTask(id);
    refresh();
  }

  function resetTplForm() {
    setTplName("");
    setTplTitle("");
    setTplDesc("");
    setTplTaskType("general");
    setTplPriority(3);
    setTplWorkflowPack("");
  }

  async function handleTplSubmit() {
    if (!tplName.trim()) return;
    await createTaskTemplate({
      name: tplName.trim(),
      title: tplTitle.trim(),
      description: tplDesc.trim(),
      department_id: null,
      task_type: tplTaskType,
      priority: tplPriority,
      workflow_pack_key: tplWorkflowPack || null,
      workflow_meta_json: null,
    });
    resetTplForm();
    setShowTplForm(false);
    refresh();
  }

  async function handleTplDelete(id: string) {
    await deleteTaskTemplate(id);
    setDeletingTplId(null);
    refresh();
  }

  const filteredSchedules = useMemo(() => {
    if (!currentProjectId || projectFilter === "all") return schedules;
    return schedules.filter((s) => s.project_id === currentProjectId);
  }, [schedules, currentProjectId, projectFilter]);

  const activeCount = filteredSchedules.filter((s) => s.enabled).length;
  const totalRuns = filteredSchedules.reduce((sum, s) => sum + s.run_count, 0);

  const TABS: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "schedules", label: "SCHEDULES", icon: "M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z", count: filteredSchedules.length },
    { key: "templates", label: "TEMPLATES", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", count: templates.length },
    { key: "guide", label: "GUIDE", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 animate-spin" style={{ borderRadius: "50%", borderColor: "var(--th-border)", borderTopColor: "var(--th-accent)" }} />
          <span className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("로딩 중...", "Loading...")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--th-font-mono)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        maxWidth: 900,
        margin: "0 auto",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          borderLeft: "3px solid var(--th-accent)",
          padding: "12px 18px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-heading)", textTransform: "uppercase" }}>
            {tr("SCHEDULED TASKS", "SCHEDULED TASKS")}
          </span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", color: "var(--th-text-muted)" }}>
            · {activeCount} {tr("active", "active")} · {filteredSchedules.length} {tr("total", "total")}
          </span>
        </div>

        {activeTab === "schedules" && (
          <button
            type="button"
            onClick={() => {
              if (showForm) { resetForm(); setShowForm(false); }
              else { resetForm(); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }
            }}
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={showForm
              ? { borderRadius: 6, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }
              : { borderRadius: 6, border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showForm ? "rotate-45" : "group-hover:rotate-90"}`}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showForm ? tr("닫기", "Close") : tr("새 스케줄", "New Schedule")}
          </button>
        )}
        {activeTab === "templates" && (
          <button
            type="button"
            onClick={() => { if (showTplForm) { resetTplForm(); setShowTplForm(false); } else { resetTplForm(); setShowTplForm(true); } }}
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={showTplForm
              ? { borderRadius: 6, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }
              : { borderRadius: 6, border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showTplForm ? "rotate-45" : "group-hover:rotate-90"}`}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showTplForm ? tr("닫기", "Close") : tr("새 템플릿", "New Template")}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", background: "var(--th-bg-primary)", padding: "20px 18px 24px" }}>
        <div className="flex items-center gap-1 p-1 mb-5" style={{ borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", overflow: "hidden" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium font-mono transition-all duration-150"
              style={activeTab === tab.key
                ? { borderRadius: 6, background: "var(--th-border-strong)", color: "var(--th-text-primary)" }
                : { borderRadius: 6, background: "transparent", color: "var(--th-text-muted)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 font-mono"
                  style={activeTab === tab.key
                    ? { borderRadius: 6, background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }
                    : { borderRadius: 6, background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "schedules" && (
          <SchedulesTab
            currentProjectId={currentProjectId}
            projectFilter={projectFilter}
            setProjectFilter={setProjectFilter}
            filteredSchedules={filteredSchedules}
            schedules={schedules}
            activeCount={activeCount}
            totalRuns={totalRuns}
            showForm={showForm}
            formRef={formRef}
            formProps={{
              formName,
              setFormName,
              formCron,
              setFormCron,
              formTemplateId,
              setFormTemplateId,
              formAgentId,
              setFormAgentId,
              formProjectId,
              setFormProjectId,
              formAutoRun,
              setFormAutoRun,
              cronValid,
              cronDesc,
              showCronHelp,
              setShowCronHelp,
              templates,
              agents,
              projects,
              editingId,
              language,
              tr,
              onSubmit: handleSubmit,
              onCancel: () => { resetForm(); setShowForm(false); },
            }}
            language={language}
            tr={tr}
            onResetForm={resetForm}
            onShowForm={setShowForm}
            onToggle={handleToggle}
            onEdit={startEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
          />
        )}

        {activeTab === "templates" && (
          <TemplatesTab
            templates={templates}
            showTplForm={showTplForm}
            tplName={tplName}
            setTplName={setTplName}
            tplTitle={tplTitle}
            setTplTitle={setTplTitle}
            tplDesc={tplDesc}
            setTplDesc={setTplDesc}
            tplWorkflowPack={tplWorkflowPack}
            setTplWorkflowPack={setTplWorkflowPack}
            tplPriority={tplPriority}
            setTplPriority={setTplPriority}
            tplTaskType={tplTaskType}
            setTplTaskType={setTplTaskType}
            workflowPackOptions={workflowPackOptions}
            language={language}
            tr={tr}
            onTplSubmit={handleTplSubmit}
            onResetTplForm={resetTplForm}
            onShowTplForm={setShowTplForm}
            onTplDelete={handleTplDelete}
            deletingTplId={deletingTplId}
            setDeletingTplId={setDeletingTplId}
          />
        )}

        {activeTab === "guide" && (
          <UserGuide tr={tr} language={language} guideExpanded={guideExpanded} setGuideExpanded={setGuideExpanded} />
        )}
      </div>
    </div>
  );
}
