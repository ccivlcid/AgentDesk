import { useState, useEffect, useCallback } from "react";
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

interface Template {
  id: string;
  name: string;
  title: string;
}

interface Props {
  agents?: Agent[];
}

const CRON_PRESETS = [
  { label: "Every 30 min", labelKo: "30분마다", expr: "*/30 * * * *" },
  { label: "Hourly", labelKo: "매시간", expr: "0 * * * *" },
  { label: "Daily 9 AM", labelKo: "매일 오전 9시", expr: "0 9 * * *" },
  { label: "Daily 6 PM", labelKo: "매일 오후 6시", expr: "0 18 * * *" },
  { label: "Weekdays 9 AM", labelKo: "평일 오전 9시", expr: "0 9 * * 1-5" },
  { label: "Weekly Mon 9 AM", labelKo: "매주 월요일 9시", expr: "0 9 * * 1" },
  { label: "Monthly 1st 9 AM", labelKo: "매월 1일 9시", expr: "0 9 1 * *" },
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

export default function ScheduledTasksPanel({ agents = [] }: Props) {
  const { t, locale } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCron, setFormCron] = useState("0 9 * * *");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formAgentId, setFormAgentId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formAutoRun, setFormAutoRun] = useState(false);
  const [cronValid, setCronValid] = useState(true);
  const [cronDesc, setCronDesc] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, tplRes, projRes] = await Promise.all([
        getScheduledTasks(),
        fetch("/api/task-templates").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      setSchedules(s);
      setTemplates(tplRes.templates ?? []);
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

  // Validate cron expression on change
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
        locale === "ko"
          ? result.description_ko ?? ""
          : result.description_en ?? "",
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [formCron, locale]);

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
    refresh();
  }

  async function handleToggle(id: string) {
    await toggleScheduledTask(id);
    refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            {tr("반복 태스크 스케줄러", "Task Scheduler")}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {tr(
              "Cron 표현식으로 반복 태스크를 자동 생성합니다",
              "Automatically create tasks on a cron schedule",
            )}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? tr("취소", "Cancel") : tr("+ 스케줄 추가", "+ Add Schedule")}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">
            {editingId ? tr("스케줄 수정", "Edit Schedule") : tr("새 스케줄", "New Schedule")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{tr("이름", "Name")}</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={tr("예: 일일 코드 리뷰", "e.g. Daily Code Review")}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            {/* Cron expression */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {tr("Cron 표현식", "Cron Expression")}
              </label>
              <input
                type="text"
                value={formCron}
                onChange={(e) => setFormCron(e.target.value)}
                placeholder="0 9 * * 1-5"
                className={`w-full bg-slate-900/60 border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none ${
                  cronValid
                    ? "border-slate-600/50 focus:border-sky-500/50"
                    : "border-red-500/50"
                }`}
              />
              {cronDesc && (
                <p className="text-xs text-sky-400 mt-1">{cronDesc}</p>
              )}
            </div>

            {/* Cron presets */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">{tr("빠른 선택", "Presets")}</label>
              <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.expr}
                    onClick={() => setFormCron(p.expr)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      formCron === p.expr
                        ? "bg-sky-600/30 border-sky-500/50 text-sky-300"
                        : "bg-slate-800/40 border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500/50"
                    }`}
                  >
                    {locale === "ko" ? p.labelKo : p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {tr("템플릿 (선택)", "Template (optional)")}
              </label>
              <select
                value={formTemplateId}
                onChange={(e) => setFormTemplateId(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              >
                <option value="">{tr("-- 없음 --", "-- None --")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.title ? `(${tpl.title})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned agent */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {tr("담당 에이전트 (선택)", "Agent (optional)")}
              </label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              >
                <option value="">{tr("-- 자동 --", "-- Auto --")}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.avatar_emoji} {locale === "ko" ? a.name_ko || a.name : a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {tr("프로젝트 (선택)", "Project (optional)")}
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              >
                <option value="">{tr("-- 없음 --", "-- None --")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-run */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="autoRun"
                checked={formAutoRun}
                onChange={(e) => setFormAutoRun(e.target.checked)}
                className="rounded border-slate-600"
              />
              <label htmlFor="autoRun" className="text-sm text-slate-300">
                {tr("자동 실행", "Auto-run on creation")}
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!formName.trim() || !cronValid}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {editingId ? tr("수정", "Update") : tr("생성", "Create")}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              {tr("취소", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {schedules.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <p>{tr("등록된 스케줄이 없습니다", "No schedules yet")}</p>
          <p className="text-xs mt-1">
            {tr("위 버튼으로 반복 태스크 스케줄을 추가하세요", "Add a schedule to automate task creation")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`bg-slate-800/50 border rounded-2xl p-4 transition-colors ${
                s.enabled
                  ? "border-slate-700/50"
                  : "border-slate-700/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        s.enabled ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    <h4 className="font-semibold text-white truncate">{s.name}</h4>
                    {s.auto_run && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded">
                        {tr("자동실행", "Auto")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    <span className="font-mono text-sky-400">{s.cron_expression}</span>
                    <span>
                      {locale === "ko" ? s.cron_description_ko : s.cron_description_en}
                    </span>
                    {s.template_name && (
                      <span>
                        {tr("템플릿", "Template")}: {s.template_name}
                      </span>
                    )}
                    {s.agent_name && (
                      <span>
                        {s.agent_avatar} {s.agent_name}
                      </span>
                    )}
                    {s.project_name && (
                      <span>{s.project_name}</span>
                    )}
                  </div>

                  <div className="flex gap-x-4 mt-1.5 text-[11px] text-slate-500">
                    <span>
                      {tr("실행 횟수", "Runs")}: {s.run_count}
                    </span>
                    <span>
                      {tr("마지막 실행", "Last")}: {fmtDate(s.last_run_at)}
                    </span>
                    <span>
                      {tr("다음 실행", "Next")}:{" "}
                      {s.enabled
                        ? `${fmtDate(s.next_run_at)} (${fmtRelative(s.next_run_at)})`
                        : tr("비활성", "disabled")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggle(s.id)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      s.enabled
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25"
                        : "bg-slate-700/50 text-slate-400 border-slate-600/30 hover:text-white"
                    }`}
                  >
                    {s.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => startEdit(s)}
                    className="px-2.5 py-1 text-xs bg-slate-700/50 text-slate-400 border border-slate-600/30 rounded-md hover:text-white transition-colors"
                  >
                    {tr("수정", "Edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2.5 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
                  >
                    {tr("삭제", "Del")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cron syntax help */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-400 mb-2">
          {tr("Cron 표현식 형식", "Cron Expression Format")}
        </p>
        <pre className="font-mono leading-relaxed">
{`┌──── ${tr("분", "minute")} (0-59)
│ ┌── ${tr("시", "hour")} (0-23)
│ │ ┌ ${tr("일", "day")} (1-31)
│ │ │ ┌ ${tr("월", "month")} (1-12)
│ │ │ │ ┌ ${tr("요일", "weekday")} (0-6, 0=${tr("일요일", "Sun")})
* * * * *`}
        </pre>
        <p className="mt-2">
          {tr(
            "예: */30 * * * * (30분마다), 0 9 * * 1-5 (평일 9시)",
            "Ex: */30 * * * * (every 30min), 0 9 * * 1-5 (weekdays 9AM)",
          )}
        </p>
      </div>
    </div>
  );
}
