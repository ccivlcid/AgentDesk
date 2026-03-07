import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../../i18n";
import type { Agent, Project } from "../../types";
import {
  getScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  validateCron,
  type ScheduledTask,
  type ScheduledTaskPayload,
} from "../../api/scheduled-tasks";
import {
  getTaskTemplates,
  createTaskTemplate,
  deleteTaskTemplate,
  type TaskTemplate,
} from "../../api/task-templates";
import { listOfficePackOptions } from "../../app/office-workflow-pack";

interface Props {
  agents?: Agent[];
}

type TabKey = "schedules" | "templates" | "guide";

const CRON_PRESETS = [
  { label: "Every 30 min", labelKo: "30분마다", expr: "*/30 * * * *", icon: "M12 6v6l3 3" },
  { label: "Hourly", labelKo: "매시간", expr: "0 * * * *", icon: "M12 6v6l4 2" },
  { label: "Daily 9 AM", labelKo: "매일 오전 9시", expr: "0 9 * * *", icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" },
  { label: "Daily 6 PM", labelKo: "매일 오후 6시", expr: "0 18 * * *", icon: "M12 3a6 6 0 009 9 9 9 0 01-9-9z" },
  { label: "Weekdays 9 AM", labelKo: "평일 오전 9시", expr: "0 9 * * 1-5", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Weekly Mon 9 AM", labelKo: "매주 월요일 9시", expr: "0 9 * * 1", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { label: "Monthly 1st 9 AM", labelKo: "매월 1일 9시", expr: "0 9 1 * *", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: "Critical", labelKo: "긴급" },
  { value: 2, label: "High", labelKo: "높음" },
  { value: 3, label: "Normal", labelKo: "보통" },
  { value: 4, label: "Low", labelKo: "낮음" },
  { value: 5, label: "Lowest", labelKo: "최저" },
];

function fmtDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function fmtRelative(ts: number | null): string {
  if (!ts) return "-";
  const diff = ts - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60_000) return "< 1m";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

function getNextRunUrgency(ts: number | null): "imminent" | "soon" | "normal" | "disabled" {
  if (!ts) return "disabled";
  const diff = ts - Date.now();
  if (diff < 0) return "imminent";
  if (diff < 3_600_000) return "imminent";
  if (diff < 86_400_000) return "soon";
  return "normal";
}

/* ─────────────────────────────────────────────────────── */

export default function ScheduledTasksPanel({ agents = [] }: Props) {
  const { t, locale, language } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [activeTab, setActiveTab] = useState<TabKey>("schedules");

  // ── Schedule state ──
  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCronHelp, setShowCronHelp] = useState(false);

  // Schedule form
  const [formName, setFormName] = useState("");
  const [formCron, setFormCron] = useState("0 9 * * *");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formAgentId, setFormAgentId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formAutoRun, setFormAutoRun] = useState(false);
  const [cronValid, setCronValid] = useState(true);
  const [cronDesc, setCronDesc] = useState("");

  // ── Template state ──
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplTaskType, setTplTaskType] = useState("general");
  const [tplPriority, setTplPriority] = useState(3);
  const [tplWorkflowPack, setTplWorkflowPack] = useState("");
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null);

  // ── Guide state ──
  const [guideExpanded, setGuideExpanded] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const workflowPackOptions = useMemo(() => {
    const uiLang = (locale === "ko" || locale === "en" || locale === "ja" || locale === "zh" ? locale : "en") as "ko" | "en" | "ja" | "zh";
    return [
      { key: "", label: t({ ko: "없음", en: "None", ja: "なし", zh: "无" }) },
      ...listOfficePackOptions(uiLang).map((o) => ({ key: o.key, label: o.label })),
    ];
  }, [locale, t]);

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
      setCronDesc(
        language === "ko" ? result.description_ko ?? "" : result.description_en ?? "",
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [formCron, locale]);

  // ── Schedule helpers ──
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

  // ── Template helpers ──
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

  const activeCount = schedules.filter((s) => s.enabled).length;
  const totalRuns = schedules.reduce((sum, s) => sum + s.run_count, 0);

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

  /* ──────── Tab definitions ──────── */
  const TABS: { key: TabKey; label: string; icon: string; count?: number }[] = [
    {
      key: "schedules",
      label: tr("스케줄", "Schedules"),
      icon: "M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      count: schedules.length,
    },
    {
      key: "templates",
      label: tr("템플릿", "Templates"),
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      count: templates.length,
    },
    {
      key: "guide",
      label: tr("사용 가이드", "User Guide"),
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-accent)" }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono tracking-tight" style={{ color: "var(--th-text-heading)" }}>
              {tr("반복 태스크 스케줄러", "Task Scheduler")}
            </h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
              {tr("Cron 기반 자동 태스크 생성 및 관리", "Cron-based automatic task creation")}
            </p>
          </div>
        </div>

        {/* Add button — context-sensitive per tab */}
        {activeTab === "schedules" && (
          <button
            onClick={() => {
              if (showForm) { resetForm(); setShowForm(false); }
              else { resetForm(); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }
            }}
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={showForm
              ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }
              : { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showForm ? "rotate-45" : "group-hover:rotate-90"}`}
            >
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showForm ? tr("닫기", "Close") : tr("새 스케줄", "New Schedule")}
          </button>
        )}
        {activeTab === "templates" && (
          <button
            onClick={() => { if (showTplForm) { resetTplForm(); setShowTplForm(false); } else { resetTplForm(); setShowTplForm(true); } }}
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={showTplForm
              ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }
              : { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showTplForm ? "rotate-45" : "group-hover:rotate-90"}`}
            >
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showTplForm ? tr("닫기", "Close") : tr("새 템플릿", "New Template")}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium font-mono transition-all duration-150"
            style={activeTab === tab.key
              ? { borderRadius: "2px", background: "var(--th-border-strong)", color: "var(--th-text-primary)" }
              : { borderRadius: "2px", background: "transparent", color: "var(--th-text-muted)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 font-mono"
                style={activeTab === tab.key
                  ? { borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }
                  : { borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════ SCHEDULES TAB ═══════════════════ */}
      {activeTab === "schedules" && (
        <div className="space-y-5">
          {/* Stats bar */}
          {schedules.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="px-4 py-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("전체", "Total")}</div>
                <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "var(--th-text-heading)" }}>{schedules.length}</div>
              </div>
              <div className="px-4 py-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("활성", "Active")}</div>
                <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "rgb(52,211,153)" }}>{activeCount}</div>
              </div>
              <div className="px-4 py-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("총 실행", "Total Runs")}</div>
                <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "var(--th-accent)" }}>{totalRuns}</div>
              </div>
            </div>
          )}

          {/* Create / Edit Form */}
          {showForm && (
            <div ref={formRef} className="relative overflow-hidden" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
              <div className="h-0.5" style={{ background: "var(--th-accent)" }} />
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: "var(--th-text-heading)" }}>
                    <span className="w-1.5 h-1.5" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />
                    {editingId ? tr("스케줄 수정", "Edit Schedule") : tr("새 스케줄 생성", "Create New Schedule")}
                  </h3>
                  {cronDesc && (
                    <span className="text-xs font-mono px-2.5 py-1" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>{cronDesc}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("스케줄 이름", "Schedule Name")}</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                      placeholder={tr("예: 일일 코드 리뷰", "e.g. Daily Code Review")}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
                  </div>

                  {/* Cron */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("Cron 표현식", "Cron Expression")}</label>
                      <button onClick={() => setShowCronHelp(!showCronHelp)} className="text-[10px] font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
                        {tr("도움말", "Help")} ?
                      </button>
                    </div>
                    <div className="relative">
                      <input type="text" value={formCron} onChange={(e) => setFormCron(e.target.value)} placeholder="0 9 * * 1-5"
                        className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                        style={{ borderRadius: "2px", border: cronValid ? "1px solid var(--th-border)" : "1px solid rgba(244,63,94,0.5)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {cronValid ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgb(52,211,153)" }}><polyline points="20 6 9 17 4 12" /></svg>
                        ) : formCron.trim() ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgb(248,113,113)" }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("빠른 선택", "Quick Presets")}</label>
                    <div className="flex flex-wrap gap-2">
                      {CRON_PRESETS.map((p) => (
                        <button key={p.expr} onClick={() => setFormCron(p.expr)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-150"
                          style={formCron === p.expr
                            ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                            : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d={p.icon} /></svg>
                          {language === "ko" ? p.labelKo : p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cron help */}
                  {showCronHelp && (
                    <div className="md:col-span-2 p-4 text-xs font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)", color: "var(--th-text-muted)" }}>
                      <pre className="font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
{`  ┌──── ${tr("분", "min")} (0-59)
  │ ┌── ${tr("시", "hour")} (0-23)
  │ │ ┌─ ${tr("일", "day")} (1-31)
  │ │ │ ┌ ${tr("월", "month")} (1-12)
  │ │ │ │ ┌ ${tr("요일", "wday")} (0-6)
  * * * * *`}
                      </pre>
                      <p className="mt-2" style={{ color: "var(--th-text-muted)" }}>
                        {tr("예: */30 * * * * (30분마다) | 0 9 * * 1-5 (평일 9시)", "Ex: */30 * * * * (every 30m) | 0 9 * * 1-5 (weekdays 9AM)")}
                      </p>
                    </div>
                  )}

                  {/* Template select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {tr("태스크 템플릿", "Task Template")}
                      <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
                    </label>
                    <select value={formTemplateId} onChange={(e) => setFormTemplateId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      <option value="">{tr("-- 선택 안 함 --", "-- None --")}</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}{tpl.title ? ` - ${tpl.title}` : ""}</option>
                      ))}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {tr("템플릿 탭에서 먼저 템플릿을 등록하세요", "Create a template in the Templates tab first")}
                      </p>
                    )}
                  </div>

                  {/* Agent */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {tr("담당 에이전트", "Assigned Agent")}
                      <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
                    </label>
                    <select value={formAgentId} onChange={(e) => setFormAgentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      <option value="">{tr("-- 자동 배정 --", "-- Auto Assign --")}</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.avatar_emoji} {language === "ko" ? a.name_ko || a.name : a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {tr("프로젝트", "Project")}
                      <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
                    </label>
                    <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      <option value="">{tr("-- 선택 안 함 --", "-- None --")}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Auto-run */}
                  <div className="flex items-center gap-3 pt-3">
                    <button type="button" role="switch" aria-checked={formAutoRun} onClick={() => setFormAutoRun(!formAutoRun)}
                      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200"
                      style={{ borderRadius: "999px", background: formAutoRun ? "var(--th-accent)" : "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform shadow-lg ring-0 transition-transform duration-200 ${formAutoRun ? "translate-x-5" : "translate-x-0"}`}
                        style={{ borderRadius: "50%", background: "#fff" }} />
                    </button>
                    <span className="text-sm font-mono" style={{ color: "var(--th-text-secondary)" }}>{tr("생성 시 자동 실행", "Auto-run on creation")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--th-border)" }}>
                  <button onClick={handleSubmit} disabled={!formName.trim() || !cronValid}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono transition-all duration-200"
                    style={!formName.trim() || !cronValid
                      ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                      : { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.2)", color: "rgb(167,243,208)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {editingId ? tr("변경 저장", "Save Changes") : tr("스케줄 생성", "Create Schedule")}
                  </button>
                  <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2.5 text-sm font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
                    {tr("취소", "Cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule list */}
          {schedules.length === 0 && !showForm ? (
            <EmptyState
              icon="M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              title={tr("등록된 스케줄이 없습니다", "No schedules yet")}
              description={tr("반복 태스크 스케줄을 추가하여 업무를 자동화하세요", "Add a schedule to automate recurring task creation")}
              actionLabel={tr("첫 스케줄 추가", "Add First Schedule")}
              onAction={() => { resetForm(); setShowForm(true); }}
            />
          ) : schedules.length > 0 && (
            <div className="space-y-2.5">
              {schedules.map((s) => {
                const urgency = s.enabled ? getNextRunUrgency(s.next_run_at) : "disabled";
                return (
                  <div key={s.id}
                    className="group relative transition-all duration-200"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", opacity: s.enabled ? 1 : 0.5 }}>
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 transition-colors" style={{ background: s.enabled ? "rgba(52,211,153,0.6)" : "var(--th-border)" }} />

                    <div className="flex items-center gap-4 px-5 py-3.5">
                      <button onClick={() => handleToggle(s.id)} className="shrink-0" title={s.enabled ? "ON" : "OFF"}>
                        <div className="relative w-9 h-5 transition-colors duration-200" style={{ borderRadius: "999px", background: s.enabled ? "rgba(52,211,153,0.8)" : "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
                          <div className={`absolute top-0.5 w-4 h-4 shadow-sm transition-transform duration-200 ${s.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
                            style={{ borderRadius: "50%", background: "#fff" }} />
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-semibold text-sm font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{s.name}</h4>
                          <code className="text-[11px] px-2 py-0.5 font-mono shrink-0" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.08)", color: "var(--th-accent)" }}>{s.cron_expression}</code>
                          {s.auto_run && (
                            <span className="text-[10px] px-1.5 py-0.5 font-mono shrink-0" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>{tr("자동실행", "Auto")}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                          <span style={{ color: "var(--th-text-secondary)" }}>{language === "ko" ? s.cron_description_ko : s.cron_description_en}</span>
                          {s.template_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.template_name}</span></>)}
                          {s.agent_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.agent_avatar} {s.agent_name}</span></>)}
                          {s.project_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.project_name}</span></>)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{tr("다음 실행", "Next")}</div>
                          <div className="text-xs font-medium font-mono mt-0.5" style={{ color: urgency === "imminent" ? "var(--th-accent)" : urgency === "soon" ? "rgb(110,231,183)" : urgency === "disabled" ? "var(--th-text-muted)" : "var(--th-text-secondary)" }}>
                            {s.enabled ? fmtRelative(s.next_run_at) : tr("비활성", "OFF")}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{tr("실행", "Runs")}</div>
                          <div className="text-xs font-medium font-mono mt-0.5" style={{ color: "var(--th-text-secondary)" }}>{s.run_count}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button onClick={() => startEdit(s)} className="p-1.5 transition-all" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }} title={tr("수정", "Edit")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeletingId(s.id)} className="p-1.5 transition-all" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }} title={tr("삭제", "Delete")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {deletingId === s.id && (
                      <div className="flex items-center justify-end gap-2 px-5 pb-3 -mt-1">
                        <span className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this schedule?")}</span>
                        <button onClick={() => handleDelete(s.id)} className="px-3 py-1 text-xs font-mono transition-all" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>{tr("삭제", "Delete")}</button>
                        <button onClick={() => setDeletingId(null)} className="px-3 py-1 text-xs font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>{tr("취소", "Cancel")}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TEMPLATES TAB ═══════════════════ */}
      {activeTab === "templates" && (
        <div className="space-y-5">
          {/* Template form */}
          {showTplForm && (
            <div className="relative overflow-hidden" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
              <div className="h-0.5" style={{ background: "var(--th-accent)" }} />
              <div className="p-6 space-y-5">
                <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: "var(--th-text-heading)" }}>
                  <span className="w-1.5 h-1.5" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />
                  {tr("새 태스크 템플릿", "New Task Template")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("템플릿 이름", "Template Name")} *</label>
                    <input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)}
                      placeholder={tr("예: 일일 코드 리뷰", "e.g. Daily Code Review")}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("태스크 제목", "Task Title")}</label>
                    <input type="text" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)}
                      placeholder={tr("생성될 태스크의 제목", "Title for created tasks")}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("설명", "Description")}</label>
                    <textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={2}
                      placeholder={tr("태스크에 대한 상세 설명...", "Detailed task description...")}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all resize-none"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("워크플로우 팩", "Workflow Pack")}</label>
                    <select value={tplWorkflowPack} onChange={(e) => setTplWorkflowPack(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      {workflowPackOptions.map((o) => (
                        <option key={o.key || "_none"} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("우선순위", "Priority")}</label>
                    <select value={tplPriority} onChange={(e) => setTplPriority(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{language === "ko" ? o.labelKo : o.label} (P{o.value})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("태스크 유형", "Task Type")}</label>
                    <select value={tplTaskType} onChange={(e) => setTplTaskType(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
                      <option value="general">{tr("일반", "General")}</option>
                      <option value="development">{tr("개발", "Development")}</option>
                      <option value="design">{tr("디자인", "Design")}</option>
                      <option value="analysis">{tr("분석", "Analysis")}</option>
                      <option value="documentation">{tr("문서", "Documentation")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--th-border)" }}>
                  <button onClick={handleTplSubmit} disabled={!tplName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono transition-all duration-200"
                    style={!tplName.trim()
                      ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                      : { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.2)", color: "rgb(167,243,208)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {tr("템플릿 생성", "Create Template")}
                  </button>
                  <button onClick={() => { resetTplForm(); setShowTplForm(false); }} className="px-4 py-2.5 text-sm font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
                    {tr("취소", "Cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template list */}
          {templates.length === 0 && !showTplForm ? (
            <EmptyState
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              title={tr("등록된 템플릿이 없습니다", "No templates yet")}
              description={tr("태스크 템플릿을 만들어 스케줄에 연결하세요", "Create task templates to link with schedules")}
              actionLabel={tr("첫 템플릿 추가", "Add First Template")}
              onAction={() => { resetTplForm(); setShowTplForm(true); }}
            />
          ) : templates.length > 0 && (
            <div className="space-y-2.5">
              {templates.map((tpl) => {
                const packOption = workflowPackOptions.find((o) => o.key === tpl.workflow_pack_key);
                const prioOption = PRIORITY_OPTIONS.find((o) => o.value === tpl.priority);
                return (
                  <div key={tpl.id} className="group relative transition-all duration-200" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                    <div className="absolute left-0 top-3 bottom-3 w-0.5" style={{ borderRadius: "1px", background: "var(--th-accent)", opacity: 0.5 }} />
                    <div className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-accent)" }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-semibold text-sm font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{tpl.name}</h4>
                          {tpl.title && <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-muted)" }}>- {tpl.title}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {packOption && packOption.key && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
                              {packOption.label}
                            </span>
                          )}
                          {prioOption && (
                            <span style={{ color: "var(--th-text-secondary)" }}>P{tpl.priority} {language === "ko" ? prioOption.labelKo : prioOption.label}</span>
                          )}
                          <span style={{ color: "var(--th-text-muted)" }}>{tpl.task_type}</span>
                          {tpl.description && (
                            <><span style={{ color: "var(--th-border)" }}>|</span><span className="truncate max-w-[200px]">{tpl.description}</span></>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button onClick={() => setDeletingTplId(tpl.id)} className="p-1.5 transition-all" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }} title={tr("삭제", "Delete")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {deletingTplId === tpl.id && (
                      <div className="flex items-center justify-end gap-2 px-5 pb-3 -mt-1">
                        <span className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this template?")}</span>
                        <button onClick={() => handleTplDelete(tpl.id)} className="px-3 py-1 text-xs font-mono transition-all" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>{tr("삭제", "Delete")}</button>
                        <button onClick={() => setDeletingTplId(null)} className="px-3 py-1 text-xs font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>{tr("취소", "Cancel")}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ GUIDE TAB ═══════════════════ */}
      {activeTab === "guide" && (
        <UserGuide tr={tr} language={language} guideExpanded={guideExpanded} setGuideExpanded={setGuideExpanded} />
      )}
    </div>
  );
}

/* ═══════════════════ Sub-components ═══════════════════ */

function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: string; title: string; description: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 flex items-center justify-center mb-4" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-text-muted)" }}>
          <path d={icon} />
        </svg>
      </div>
      <p className="text-sm font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>{title}</p>
      <p className="text-xs font-mono mt-1.5 max-w-[280px]" style={{ color: "var(--th-text-muted)" }}>{description}</p>
      <button onClick={onAction}
        className="mt-5 flex items-center gap-2 px-4 py-2 text-sm font-mono transition-all"
        style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {actionLabel}
      </button>
    </div>
  );
}

function UserGuide({ tr, language, guideExpanded, setGuideExpanded }: {
  tr: (ko: string, en: string) => string;
  language: string;
  guideExpanded: string | null;
  setGuideExpanded: (id: string | null) => void;
}) {
  const sections = [
    {
      id: "overview",
      title: tr("스케줄러 개요", "Scheduler Overview"),
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      content: language === "ko" ? [
        "태스크 스케줄러는 Cron 표현식을 기반으로 지정된 시간에 자동으로 태스크를 생성하는 기능입니다.",
        "스케줄, 템플릿, 에이전트, 프로젝트를 조합하여 반복 업무를 완전 자동화할 수 있습니다.",
        "스케줄은 ON/OFF 토글로 활성화 상태를 제어할 수 있으며, 비활성 스케줄은 태스크를 생성하지 않습니다.",
      ] : [
        "The Task Scheduler automatically creates tasks at specified times based on Cron expressions.",
        "Combine schedules, templates, agents, and projects to fully automate recurring work.",
        "Schedules can be toggled ON/OFF. Disabled schedules will not create tasks.",
      ],
    },
    {
      id: "schedule-create",
      title: tr("스케줄 등록 방법", "How to Create a Schedule"),
      icon: "M12 6v6l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      content: language === "ko" ? [
        '1. "스케줄" 탭에서 [새 스케줄] 버튼을 클릭합니다.',
        "2. 스케줄 이름을 입력합니다 (예: 일일 코드 리뷰).",
        "3. Cron 표현식을 직접 입력하거나 빠른 선택 프리셋을 클릭합니다.",
        "4. 필요에 따라 템플릿, 에이전트, 프로젝트를 선택합니다.",
        '5. "자동 실행" 토글을 켜면 태스크 생성과 동시에 에이전트가 바로 작업을 시작합니다.',
        "6. [스케줄 생성] 버튼을 클릭하면 완료됩니다.",
      ] : [
        '1. In the "Schedules" tab, click the [New Schedule] button.',
        "2. Enter a schedule name (e.g., Daily Code Review).",
        "3. Type a Cron expression directly or click a quick preset.",
        "4. Optionally select a template, agent, and project.",
        '5. Enable "Auto-run" to have the agent start working immediately when a task is created.',
        "6. Click [Create Schedule] to finish.",
      ],
    },
    {
      id: "templates",
      title: tr("템플릿 활용 가이드", "Template Usage Guide"),
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      content: language === "ko" ? [
        "템플릿은 반복 생성되는 태스크의 기본 속성(제목, 설명, 우선순위, 워크플로우 팩 등)을 미리 정의합니다.",
        '1. "템플릿" 탭에서 [새 템플릿] 버튼을 클릭합니다.',
        "2. 템플릿 이름(필수)과 태스크 제목, 설명을 입력합니다.",
        "3. 워크플로우 팩을 선택하면 해당 팩의 워크플로우에 따라 태스크가 실행됩니다.",
        "4. 우선순위와 태스크 유형을 설정합니다.",
        "5. 생성 후 스케줄 등록 시 템플릿을 선택하면, 해당 스케줄로 생성되는 모든 태스크에 템플릿 설정이 적용됩니다.",
      ] : [
        "Templates pre-define default properties (title, description, priority, workflow pack, etc.) for recurring tasks.",
        '1. In the "Templates" tab, click the [New Template] button.',
        "2. Enter a template name (required), task title, and description.",
        "3. Select a workflow pack to have tasks follow that pack's workflow.",
        "4. Set priority and task type.",
        "5. When creating a schedule, select the template to apply its settings to all generated tasks.",
      ],
    },
    {
      id: "cron",
      title: tr("Cron 표현식 가이드", "Cron Expression Guide"),
      icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
      content: language === "ko" ? [
        "Cron 표현식은 5개 필드로 구성됩니다: 분 시 일 월 요일",
        "",
        "  * : 모든 값     */N : N 간격마다",
        "  N : 특정 값     N-M : 범위",
        "  N,M : 여러 값",
        "",
        "자주 사용하는 예시:",
        "  */30 * * * *    → 30분마다",
        "  0 * * * *       → 매시간 정각",
        "  0 9 * * *       → 매일 오전 9시",
        "  0 9 * * 1-5     → 평일 오전 9시",
        "  0 9 * * 1       → 매주 월요일 오전 9시",
        "  0 9 1 * *       → 매월 1일 오전 9시",
        "  0 9,18 * * *    → 매일 오전 9시, 오후 6시",
        "",
        "요일: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토",
      ] : [
        "Cron expressions consist of 5 fields: minute hour day month weekday",
        "",
        "  * : any value     */N : every N",
        "  N : specific       N-M : range",
        "  N,M : multiple values",
        "",
        "Common examples:",
        "  */30 * * * *    → every 30 minutes",
        "  0 * * * *       → every hour on the hour",
        "  0 9 * * *       → daily at 9 AM",
        "  0 9 * * 1-5     → weekdays at 9 AM",
        "  0 9 * * 1       → every Monday at 9 AM",
        "  0 9 1 * *       → 1st of every month at 9 AM",
        "  0 9,18 * * *    → daily at 9 AM and 6 PM",
        "",
        "Weekday: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat",
      ],
    },
    {
      id: "workflow",
      title: tr("워크플로우 팩 설명", "Workflow Pack Guide"),
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      content: language === "ko" ? [
        "워크플로우 팩은 태스크 실행 시 에이전트가 따르는 작업 흐름을 정의합니다:",
        "",
        "  Development  — 코드 개발, 테스트, PR 생성 등 소프트웨어 개발 워크플로우",
        "  Novel        — 소설/창작 글쓰기 워크플로우",
        "  Report       — 보고서 작성 워크플로우",
        "  Video Pre-prod — Remotion 기반 영상 기획/렌더링",
        "  Web Research — 웹 리서치 및 보고서 작성",
        "  Roleplay     — 롤플레이/시뮬레이션",
        "  Asset Mgmt   — 자산/리소스 관리",
        "",
        "템플릿에 워크플로우 팩을 지정하면, 스케줄로 생성된 태스크가 해당 워크플로우에 따라 자동 실행됩니다.",
      ] : [
        "Workflow packs define the execution flow agents follow when running tasks:",
        "",
        "  Development  — Software dev: coding, testing, PR creation",
        "  Novel        — Creative/fiction writing workflow",
        "  Report       — Report generation workflow",
        "  Video Pre-prod — Remotion-based video planning & rendering",
        "  Web Research — Web research and report writing",
        "  Roleplay     — Roleplay/simulation scenarios",
        "  Asset Mgmt   — Asset/resource management",
        "",
        "Assigning a workflow pack to a template means all tasks generated by the schedule will follow that workflow automatically.",
      ],
    },
    {
      id: "tips",
      title: tr("활용 팁", "Tips & Best Practices"),
      icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      content: language === "ko" ? [
        "1. 템플릿 먼저 만들기: 스케줄에 템플릿을 연결하면 매번 동일한 설정의 태스크가 자동 생성됩니다.",
        "2. 자동 실행 주의: 자동 실행을 켜면 태스크 생성 즉시 에이전트가 작업을 시작합니다. 검토가 필요한 작업은 끄세요.",
        "3. 에이전트 지정: 특정 에이전트를 지정하면 해당 에이전트가 항상 작업합니다. 미지정 시 시스템이 자동 배정합니다.",
        "4. 프로젝트 연결: 프로젝트를 선택하면 해당 프로젝트의 컨텍스트(코드베이스, 설정 등)에서 태스크가 실행됩니다.",
        "5. 비활성화 활용: 일시적으로 스케줄을 멈추려면 삭제 대신 OFF로 전환하세요.",
        "6. Cron 검증: 입력한 Cron 표현식은 실시간으로 검증되며, 유효할 때 초록색 체크가 표시됩니다.",
      ] : [
        "1. Create templates first: Link them to schedules for consistent task generation.",
        "2. Auto-run caution: When enabled, agents start working immediately on task creation. Disable for tasks needing review.",
        "3. Agent assignment: Assign a specific agent for consistency, or leave on Auto for system-assigned agents.",
        "4. Project linking: Selecting a project runs the task within that project's context (codebase, settings, etc.).",
        "5. Use disable instead of delete: Toggle OFF to temporarily pause a schedule without losing it.",
        "6. Cron validation: Expressions are validated in real-time. A green check means it's valid.",
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {/* Guide header */}
      <div className="p-5" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 flex items-center justify-center" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-accent)" }}>
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {tr("스케줄러 사용 가이드", "Scheduler User Guide")}
            </h3>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
              {tr("아래 항목을 클릭하여 상세 내용을 확인하세요", "Click each section below for details")}
            </p>
          </div>
        </div>
      </div>

      {/* Accordion sections */}
      {sections.map((sec) => (
        <div key={sec.id} className="overflow-hidden transition-all duration-200" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          <button
            onClick={() => setGuideExpanded(guideExpanded === sec.id ? null : sec.id)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--th-bg-surface-hover)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--th-text-muted)" }}>
              <path d={sec.icon} />
            </svg>
            <span className="text-sm font-medium font-mono flex-1" style={{ color: "var(--th-text-heading)" }}>{sec.title}</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${guideExpanded === sec.id ? "rotate-180" : ""}`}
              style={{ color: "var(--th-text-muted)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {guideExpanded === sec.id && (
            <div className="px-5 pb-4 pt-0">
              <div className="pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--th-border)" }}>
                {sec.content.map((line, i) => (
                  line === "" ? (
                    <div key={i} className="h-2" />
                  ) : line.startsWith("  ") ? (
                    <pre key={i} className="text-xs font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{line}</pre>
                  ) : (
                    <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{line}</p>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
