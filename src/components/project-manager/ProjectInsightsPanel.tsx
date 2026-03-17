import { useEffect, useMemo, useState, useCallback } from "react";
import type { ProjectDecisionEventItem, ProjectReportHistoryItem, ProjectTaskHistoryItem } from "../../api";
import type { Project, ProjectObjective, ProjectGate } from "../../types";
import { getProjectCostSummary, type ProjectCostSummary } from "../../api/cost-summary";
import { objectivesApi, gatesApi } from "../../api/categories-dashboard";
import { getProjectDeliverables, updateProjectDeliverable, type ProjectDeliverableItem } from "../../api/organization-projects";
import BurndownChart from "./BurndownChart";
import type { GroupedProjectTaskCard, ProjectI18nTranslate } from "./types";
import { fmtTime } from "./utils";

// ── Project Dashboard Section (Objectives + Gates) ──────────────────────────

const OBJ_STATUS_META: Record<ProjectObjective["status"], { label_ko: string; label_en: string; color: string; bg: string }> = {
  active:    { label_ko: "진행중", label_en: "Active",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  completed: { label_ko: "완료",   label_en: "Completed", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  cancelled: { label_ko: "취소",   label_en: "Cancelled", color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
};

const GATE_STATUS_META: Record<ProjectGate["status"], { label_ko: string; label_en: string; color: string; bg: string }> = {
  pending:     { label_ko: "대기",   label_en: "Pending",     color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
  in_progress: { label_ko: "진행중", label_en: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  passed:      { label_ko: "통과",   label_en: "Passed",      color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  failed:      { label_ko: "실패",   label_en: "Failed",      color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

function fmtDueDate(ts: number | null): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(new Date(ts));
}

function ProjectDashboardSection({ t, projectId, isKo }: { t: ProjectI18nTranslate; projectId: string; isKo: boolean }) {
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [gates, setGates] = useState<ProjectGate[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline-edit state
  const [editObjId, setEditObjId] = useState<string | null>(null);
  const [editObjTitle, setEditObjTitle] = useState("");
  const [editObjStatus, setEditObjStatus] = useState<ProjectObjective["status"]>("active");
  const [editObjProgress, setEditObjProgress] = useState(0);

  const [editGateId, setEditGateId] = useState<string | null>(null);
  const [editGateTitle, setEditGateTitle] = useState("");
  const [editGateStatus, setEditGateStatus] = useState<ProjectGate["status"]>("pending");
  const [editGateCriteria, setEditGateCriteria] = useState("");

  // New item forms
  const [showNewObj, setShowNewObj] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState("");
  const [showNewGate, setShowNewGate] = useState(false);
  const [newGateTitle, setNewGateTitle] = useState("");

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [objs, gts] = await Promise.all([objectivesApi.list(projectId), gatesApi.list(projectId)]);
      setObjectives(objs);
      setGates(gts);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  // ── Objective handlers ──
  function startEditObj(obj: ProjectObjective) {
    setEditObjId(obj.id);
    setEditObjTitle(obj.title);
    setEditObjStatus(obj.status);
    setEditObjProgress(obj.progress);
  }

  async function saveObj() {
    if (!editObjId || saving) return;
    setSaving(true);
    try {
      const updated = await objectivesApi.update(projectId, editObjId, { title: editObjTitle.trim(), status: editObjStatus, progress: editObjProgress });
      setObjectives((prev) => prev.map((o) => o.id === editObjId ? updated : o));
      setEditObjId(null);
    } finally { setSaving(false); }
  }

  async function deleteObj(id: string) {
    setSaving(true);
    try {
      await objectivesApi.delete(projectId, id);
      setObjectives((prev) => prev.filter((o) => o.id !== id));
    } finally { setSaving(false); }
  }

  async function createObj() {
    if (!newObjTitle.trim() || saving) return;
    setSaving(true);
    try {
      const created = await objectivesApi.create(projectId, { title: newObjTitle.trim(), status: "active", progress: 0 });
      setObjectives((prev) => [...prev, created]);
      setNewObjTitle("");
      setShowNewObj(false);
    } finally { setSaving(false); }
  }

  // ── Gate handlers ──
  function startEditGate(gate: ProjectGate) {
    setEditGateId(gate.id);
    setEditGateTitle(gate.title);
    setEditGateStatus(gate.status);
    setEditGateCriteria(gate.criteria ?? "");
  }

  async function saveGate() {
    if (!editGateId || saving) return;
    setSaving(true);
    try {
      const updated = await gatesApi.update(projectId, editGateId, { title: editGateTitle.trim(), status: editGateStatus, criteria: editGateCriteria.trim() || null });
      setGates((prev) => prev.map((g) => g.id === editGateId ? updated : g));
      setEditGateId(null);
    } finally { setSaving(false); }
  }

  async function deleteGate(id: string) {
    setSaving(true);
    try {
      await gatesApi.delete(projectId, id);
      setGates((prev) => prev.filter((g) => g.id !== id));
    } finally { setSaving(false); }
  }

  async function createGate() {
    if (!newGateTitle.trim() || saving) return;
    setSaving(true);
    try {
      const created = await gatesApi.create(projectId, { title: newGateTitle.trim(), status: "pending" });
      setGates((prev) => [...prev, created]);
      setNewGateTitle("");
      setShowNewGate(false);
    } finally { setSaving(false); }
  }

  const inputCls = "w-full px-2 py-1 text-xs font-mono outline-none";
  const inputStyle = { borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  return (
    <div className="min-w-0 p-4 space-y-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" })}
      </h4>

      {loading ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : (
        <>
          {/* ── OBJECTIVES ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: `목표 (${objectives.length})`, en: `Objectives (${objectives.length})`, ja: `目標 (${objectives.length})`, zh: `目标 (${objectives.length})` })}
              </span>
              <button
                type="button"
                onClick={() => { setShowNewObj((v) => !v); setNewObjTitle(""); }}
                className="text-[11px] font-mono px-2 py-0.5"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
              >
                {showNewObj ? "✕" : "+ " + t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
            </div>

            {showNewObj && (
              <form onSubmit={(e) => { e.preventDefault(); void createObj(); }} className="flex gap-1 mb-2">
                <input
                  autoFocus
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  placeholder={t({ ko: "새 목표 입력...", en: "New objective...", ja: "新しい目標...", zh: "新目标..." })}
                  className={inputCls}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="submit" disabled={!newObjTitle.trim() || saving} className="px-2 py-1 text-[11px] font-mono font-bold" style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer" }}>
                  {t({ ko: "등록", en: "Add", ja: "登録", zh: "添加" })}
                </button>
              </form>
            )}

            <div className="space-y-1.5">
              {objectives.length === 0 && !showNewObj && (
                <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "목표 없음", en: "No objectives", ja: "目標なし", zh: "无目标" })}
                </p>
              )}
              {objectives.map((obj) => {
                const meta = OBJ_STATUS_META[obj.status];
                if (editObjId === obj.id) {
                  return (
                    <div key={obj.id} className="p-2 space-y-1.5" style={{ border: "1px solid var(--th-accent)", background: "var(--th-bg-elevated)" }}>
                      <input value={editObjTitle} onChange={(e) => setEditObjTitle(e.target.value)} className={inputCls} style={inputStyle} />
                      <div className="flex gap-2">
                        <select value={editObjStatus} onChange={(e) => setEditObjStatus(e.target.value as ProjectObjective["status"])} className="flex-1 px-2 py-1 text-[11px] font-mono outline-none" style={selectStyle}>
                          {(Object.keys(OBJ_STATUS_META) as ProjectObjective["status"][]).map((s) => (
                            <option key={s} value={s}>{isKo ? OBJ_STATUS_META[s].label_ko : OBJ_STATUS_META[s].label_en}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--th-text-muted)" }}>{editObjProgress}%</span>
                          <input type="range" min={0} max={100} step={5} value={editObjProgress} onChange={(e) => setEditObjProgress(Number(e.target.value))} className="flex-1" />
                        </div>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setEditObjId(null)} className="px-2 py-0.5 text-[11px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                        <button type="button" onClick={() => void saveObj()} disabled={saving} className="px-2 py-0.5 text-[11px] font-mono font-bold" style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer", borderRadius: 0 }}>
                          {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={obj.id} className="flex items-center gap-2 px-2 py-1.5 group" style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                    {/* progress bar */}
                    <div className="shrink-0" style={{ width: 32, height: 32, position: "relative" }}>
                      <svg viewBox="0 0 32 32" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="16" cy="16" r="12" fill="none" stroke="var(--th-border)" strokeWidth="3" />
                        <circle cx="16" cy="16" r="12" fill="none" stroke={meta.color} strokeWidth="3"
                          strokeDasharray={`${(obj.progress / 100) * 75.4} 75.4`} strokeLinecap="butt" />
                      </svg>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontFamily: "var(--th-font-mono)", color: meta.color }}>{obj.progress}%</span>
                    </div>
                    <span className="flex-1 min-w-0 text-[11px] font-mono truncate" style={{ color: "var(--th-text-primary)" }}>{obj.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 shrink-0" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
                      {isKo ? meta.label_ko : meta.label_en}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => startEditObj(obj)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                        {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                      </button>
                      <button type="button" onClick={() => void deleteObj(obj.id)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 0 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── GATES ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: `게이트 (${gates.length})`, en: `Gates (${gates.length})`, ja: `ゲート (${gates.length})`, zh: `关卡 (${gates.length})` })}
              </span>
              <button
                type="button"
                onClick={() => { setShowNewGate((v) => !v); setNewGateTitle(""); }}
                className="text-[11px] font-mono px-2 py-0.5"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
              >
                {showNewGate ? "✕" : "+ " + t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
            </div>

            {showNewGate && (
              <form onSubmit={(e) => { e.preventDefault(); void createGate(); }} className="flex gap-1 mb-2">
                <input
                  autoFocus
                  value={newGateTitle}
                  onChange={(e) => setNewGateTitle(e.target.value)}
                  placeholder={t({ ko: "새 게이트 입력...", en: "New gate...", ja: "新しいゲート...", zh: "新关卡..." })}
                  className={inputCls}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="submit" disabled={!newGateTitle.trim() || saving} className="px-2 py-1 text-[11px] font-mono font-bold" style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer" }}>
                  {t({ ko: "등록", en: "Add", ja: "登録", zh: "添加" })}
                </button>
              </form>
            )}

            <div className="space-y-1.5">
              {gates.length === 0 && !showNewGate && (
                <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "게이트 없음", en: "No gates", ja: "ゲートなし", zh: "无关卡" })}
                </p>
              )}
              {gates.map((gate) => {
                const meta = GATE_STATUS_META[gate.status];
                if (editGateId === gate.id) {
                  return (
                    <div key={gate.id} className="p-2 space-y-1.5" style={{ border: "1px solid var(--th-accent)", background: "var(--th-bg-elevated)" }}>
                      <input value={editGateTitle} onChange={(e) => setEditGateTitle(e.target.value)} className={inputCls} style={inputStyle} />
                      <select value={editGateStatus} onChange={(e) => setEditGateStatus(e.target.value as ProjectGate["status"])} className="w-full px-2 py-1 text-[11px] font-mono outline-none" style={selectStyle}>
                        {(Object.keys(GATE_STATUS_META) as ProjectGate["status"][]).map((s) => (
                          <option key={s} value={s}>{isKo ? GATE_STATUS_META[s].label_ko : GATE_STATUS_META[s].label_en}</option>
                        ))}
                      </select>
                      <input value={editGateCriteria} onChange={(e) => setEditGateCriteria(e.target.value)} placeholder={t({ ko: "통과 기준 (선택)", en: "Pass criteria (optional)", ja: "通過基準（任意）", zh: "通过标准（可选）" })} className={inputCls} style={inputStyle} />
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setEditGateId(null)} className="px-2 py-0.5 text-[11px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                        <button type="button" onClick={() => void saveGate()} disabled={saving} className="px-2 py-0.5 text-[11px] font-mono font-bold" style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer", borderRadius: 0 }}>
                          {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={gate.id} className="flex items-start gap-2 px-2 py-1.5 group" style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 shrink-0 mt-0.5" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
                      {isKo ? meta.label_ko : meta.label_en}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono" style={{ color: "var(--th-text-primary)" }}>{gate.title}</span>
                      {gate.criteria && (
                        <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: "var(--th-text-muted)" }}>{gate.criteria}</p>
                      )}
                      {gate.due_date && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>due {fmtDueDate(gate.due_date)}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => startEditGate(gate)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 0 }}>
                        {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                      </button>
                      <button type="button" onClick={() => void deleteGate(gate.id)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 0 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_DONE = new Set(["done", "completed", "complete"]);
const STATUS_IN_PROGRESS = new Set(["in_progress", "running", "working"]);
const STATUS_REVIEW = new Set(["review", "reviewing"]);
const STATUS_FAILED = new Set(["failed", "error", "cancelled"]);
const STATUS_PAUSED = new Set(["paused"]);

function classifyStatus(status: string): "done" | "in_progress" | "review" | "failed" | "paused" | "planned" {
  const s = status.toLowerCase();
  if (STATUS_DONE.has(s)) return "done";
  if (STATUS_IN_PROGRESS.has(s)) return "in_progress";
  if (STATUS_REVIEW.has(s)) return "review";
  if (STATUS_FAILED.has(s)) return "failed";
  if (STATUS_PAUSED.has(s)) return "paused";
  return "planned";
}

interface ProjectProgressSectionProps {
  t: ProjectI18nTranslate;
  groupedTaskCards: GroupedProjectTaskCard[];
}

function ProjectProgressSection({ t, groupedTaskCards }: ProjectProgressSectionProps) {
  const stats = useMemo(() => {
    const allTasks: ProjectTaskHistoryItem[] = [];
    for (const group of groupedTaskCards) {
      allTasks.push(group.root);
      allTasks.push(...group.children);
    }

    const counts: Record<string, number> = { done: 0, in_progress: 0, review: 0, failed: 0, paused: 0, planned: 0 };
    const agentMap: Map<string, { name: string; done: number; total: number }> = new Map();

    for (const task of allTasks) {
      const cls = classifyStatus(task.status);
      counts[cls] = (counts[cls] ?? 0) + 1;

      if (task.assigned_agent_id && (task.assigned_agent_name || task.assigned_agent_name_ko)) {
        const agentName = task.assigned_agent_name_ko || task.assigned_agent_name;
        const existing = agentMap.get(task.assigned_agent_id);
        if (!existing) {
          agentMap.set(task.assigned_agent_id, { name: agentName, done: cls === "done" ? 1 : 0, total: 1 });
        } else {
          existing.total += 1;
          if (cls === "done") existing.done += 1;
        }
      }
    }

    const deptMap: Map<string, { name: string; done: number; total: number }> = new Map();
    for (const task of allTasks) {
      const cls = classifyStatus(task.status);
      const deptId = task.department_id;
      const deptName = task.department_name_ko || task.department_name;
      if (deptId && deptName) {
        const existing = deptMap.get(deptId);
        if (!existing) {
          deptMap.set(deptId, { name: deptName, done: cls === "done" ? 1 : 0, total: 1 });
        } else {
          existing.total += 1;
          if (cls === "done") existing.done += 1;
        }
      }
    }

    const total = allTasks.length;
    const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    const topAgents = [...agentMap.values()].sort((a, b) => b.done - a.done || b.total - a.total).slice(0, 4);
    const topDepts = [...deptMap.values()].sort((a, b) => b.total - a.total || b.done - a.done).slice(0, 6);

    return { counts, total, donePct, topAgents, topDepts };
  }, [groupedTaskCards]);

  if (stats.total === 0) return null;

  const statusItems = [
    { key: "done", label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), color: "bg-emerald-500", textColor: "text-emerald-400" },
    { key: "in_progress", label: t({ ko: "진행중", en: "In Progress", ja: "進行中", zh: "进行中" }), color: "bg-[#3b82f6]", textColor: "text-[#60a5fa]" },
    { key: "review", label: t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审查" }), color: "bg-amber-400", textColor: "text-amber-400" },
    { key: "paused", label: t({ ko: "일시정지", en: "Paused", ja: "一時停止", zh: "暂停" }), color: "bg-yellow-500", textColor: "text-yellow-400" },
    { key: "planned", label: t({ ko: "예정", en: "Planned", ja: "予定", zh: "计划" }), color: "bg-[#64748b]", textColor: "text-[#94a3b8]" },
    { key: "failed", label: t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" }), color: "bg-red-500", textColor: "text-red-400" },
  ].filter((item) => (stats.counts[item.key] ?? 0) > 0);

  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "프로젝트 진행률", en: "Project Progress", ja: "プロジェクト進捗", zh: "项目进度" })}
      </h4>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>
          {stats.counts.done}/{stats.total} {t({ ko: "태스크 완료", en: "tasks done", ja: "タスク完了", zh: "任务完成" })}
        </span>
        <span className={`font-semibold font-mono ${stats.donePct >= 80 ? "text-emerald-400" : stats.donePct >= 40 ? "text-amber-400" : ""}`} style={stats.donePct < 40 ? { color: "var(--th-text-secondary)" } : undefined}>
          {stats.donePct}%
        </span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden" style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)" }}>
        <div
          className={`h-full transition-all duration-700 ${stats.donePct >= 80 ? "bg-emerald-500" : stats.donePct >= 40 ? "bg-amber-400" : "bg-[#3b82f6]"}`}
          style={{ width: `${stats.donePct}%` }}
        />
      </div>

      {/* Status breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 0, background: "var(--th-bg-elevated)" }}>
            <span className={`h-2 w-2 ${item.color}`} style={{ borderRadius: 0 }} />
            <span className={`text-[11px] font-mono font-medium ${item.textColor}`}>{stats.counts[item.key]}</span>
            <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Agent contribution */}
      {stats.topAgents.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "에이전트 기여도", en: "Agent Contribution", ja: "エージェント貢献度", zh: "代理贡献度" })}
          </p>
          <div className="space-y-1.5">
            {stats.topAgents.map((agent) => {
              const agentPct = agent.total > 0 ? Math.round((agent.done / agent.total) * 100) : 0;
              return (
                <div key={agent.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{agent.name}</span>
                  <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 0, background: "var(--th-bg-surface-hover)" }}>
                    <div
                      className="h-full bg-cyan-500/70"
                      style={{ width: `${agentPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{agent.done}/{agent.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department contribution */}
      {stats.topDepts.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "부서별 기여도", en: "Department Contribution", ja: "部署別貢献度", zh: "部门贡献度" })}
          </p>
          <div className="space-y-1.5">
            {stats.topDepts.map((dept) => {
              const deptPct = dept.total > 0 ? Math.round((dept.done / dept.total) * 100) : 0;
              return (
                <div key={dept.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{dept.name}</span>
                  <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 0, background: "var(--th-bg-surface-hover)" }}>
                    <div
                      className="h-full bg-violet-500/70"
                      style={{ width: `${deptPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{dept.done}/{dept.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProjectCostSectionProps {
  t: ProjectI18nTranslate;
  projectId: string;
}

function ProjectCostSection({ t, projectId }: ProjectCostSectionProps) {
  const [cost, setCost] = useState<ProjectCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProjectCostSummary(projectId)
      .then(setCost)
      .catch(() => setCost(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "비용 요약", en: "Cost Summary", ja: "コスト概要", zh: "成本摘要" })}
      </h4>

      {loading ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : !cost ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
      ) : (
        <div className="space-y-3">
          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              <p className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "이번 달", en: "This Month", ja: "今月", zh: "本月" })}
              </p>
              <p className="mt-0.5 text-sm font-bold font-mono text-amber-400">{fmtUsd(cost.thisMonthUsd)}</p>
            </div>
            <div className="p-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              <p className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "총 비용", en: "Total", ja: "合計", zh: "总计" })}
              </p>
              <p className="mt-0.5 text-sm font-bold font-mono" style={{ color: "var(--th-text-primary)" }}>{fmtUsd(cost.totalUsd)}</p>
            </div>
          </div>

          {/* Token stats */}
          <div className="flex gap-3 text-[11px] font-mono">
            <span style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "토큰(입력)", en: "Tokens In", ja: "入力", zh: "输入" })}:
              <span className="ml-1" style={{ color: "var(--th-text-secondary)" }}>{fmtTokens(cost.totalTokensIn)}</span>
            </span>
            <span style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "출력", en: "Out", ja: "出力", zh: "输出" })}:
              <span className="ml-1" style={{ color: "var(--th-text-secondary)" }}>{fmtTokens(cost.totalTokensOut)}</span>
            </span>
          </div>

          {/* Agent breakdown */}
          {cost.agentBreakdown.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "에이전트별 비용", en: "By Agent", ja: "エージェント別", zh: "按代理" })}
              </p>
              <div className="space-y-1">
                {cost.agentBreakdown.slice(0, 5).map((row) => (
                  <div key={row.agentId} className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="w-24 truncate" style={{ color: "var(--th-text-secondary)" }}>{row.agentName}</span>
                    <div className="flex-1 overflow-hidden" style={{ height: 5, background: "var(--th-bg-surface-hover)" }}>
                      <div
                        className="h-full bg-amber-400/60"
                        style={{ width: cost.totalUsd > 0 ? `${Math.min(100, (row.totalUsd / cost.totalUsd) * 100)}%` : "0%" }}
                      />
                    </div>
                    <span className="w-16 text-right" style={{ color: "var(--th-text-muted)" }}>
                      {fmtUsd(row.totalUsd)} <span className="text-[10px]">({row.taskCount})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pack breakdown */}
          {cost.packBreakdown.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "워크플로우별 비용", en: "By Workflow", ja: "ワークフロー別", zh: "按工作流" })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cost.packBreakdown.map((row) => (
                  <div
                    key={row.packKey}
                    className="flex items-center gap-1 px-2 py-0.5"
                    style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.packKey}</span>
                    <span className="text-[10px] font-mono text-amber-400">{fmtUsd(row.totalUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deliverable Checklist Section ───────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  document: "#60a5fa",
  spec:     "#a78bfa",
  report:   "#34d399",
  code:     "#f59e0b",
};

function DeliverableChecklistSection({ t, projectId }: { t: ProjectI18nTranslate; projectId: string }) {
  const [items, setItems] = useState<ProjectDeliverableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectDeliverables(projectId);
      setItems(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(item: ProjectDeliverableItem) {
    if (saving) return;
    setSaving(item.key);
    const next = !item.checked;
    setItems((prev) => prev.map((i) => i.key === item.key ? { ...i, checked: next, checked_at: next ? Date.now() : null } : i));
    try {
      await updateProjectDeliverable(projectId, item.key, { checked: next, label: item.label });
    } catch {
      setItems((prev) => prev.map((i) => i.key === item.key ? { ...i, checked: item.checked, checked_at: item.checked_at } : i));
    } finally { setSaving(null); }
  }

  if (!loading && items.length === 0) return null;

  const doneCount = items.filter((i) => i.checked).length;

  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "결과물 체크리스트", en: "Deliverables", ja: "成果物チェック", zh: "交付物清单" })}
        </h4>
        {!loading && items.length > 0 && (
          <span className="text-[11px] font-mono" style={{ color: doneCount === items.length ? "#4ade80" : "var(--th-text-muted)" }}>
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : (
        <>
          {/* Progress bar */}
          {items.length > 0 && (
            <div className="mb-3 h-1.5 w-full overflow-hidden" style={{ background: "var(--th-bg-surface-hover)" }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${Math.round((doneCount / items.length) * 100)}%`, background: doneCount === items.length ? "#4ade80" : "var(--th-accent)" }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            {items.map((item) => {
              const color = TYPE_COLOR[item.type] ?? "var(--th-text-muted)";
              const isSaving = saving === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={isSaving}
                  onClick={() => void toggle(item)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-left transition-colors"
                  style={{
                    border: `1px solid ${item.checked ? "rgba(74,222,128,0.3)" : "var(--th-border)"}`,
                    background: item.checked ? "rgba(74,222,128,0.05)" : "var(--th-bg-elevated)",
                    cursor: isSaving ? "wait" : "pointer",
                    borderRadius: 0,
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {/* Checkbox */}
                  <span
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 14, height: 14,
                      border: `1.5px solid ${item.checked ? "#4ade80" : "var(--th-border-accent)"}`,
                      background: item.checked ? "#4ade80" : "transparent",
                    }}
                  >
                    {item.checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="#0f1117" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>

                  <span className="flex-1 min-w-0 text-[11px] font-mono" style={{ color: item.checked ? "var(--th-text-muted)" : "var(--th-text-primary)", textDecoration: item.checked ? "line-through" : "none" }}>
                    {item.label}
                  </span>

                  <span className="shrink-0 text-[10px] font-mono px-1 py-0.5" style={{ color, border: `1px solid ${color}44`, background: `${color}11` }}>
                    {item.type}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface ProjectInsightsPanelProps {
  t: ProjectI18nTranslate;
  language: string;
  selectedProject: Project | null;
  loadingDetail: boolean;
  isCreating: boolean;
  groupedTaskCards: GroupedProjectTaskCard[];
  sortedReports: ProjectReportHistoryItem[];
  sortedDecisionEvents: ProjectDecisionEventItem[];
  getDecisionEventLabel: (eventType: ProjectDecisionEventItem["event_type"]) => string;
  handleOpenTaskDetail: (taskId: string) => Promise<void>;
}

export default function ProjectInsightsPanel({
  t,
  language,
  selectedProject,
  loadingDetail,
  isCreating,
  groupedTaskCards,
  sortedReports,
  sortedDecisionEvents,
  getDecisionEventLabel,
  handleOpenTaskDetail,
}: ProjectInsightsPanelProps) {
  const isKo = language === "ko";
  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "프로젝트 정보", en: "Project Info", ja: "プロジェクト情報", zh: "项目信息" })}
          </h4>
          {selectedProject?.github_repo && (
            <a
              href={`https://github.com/${selectedProject.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              title={selectedProject.github_repo}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono transition"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              {selectedProject.github_repo}
            </a>
          )}
        </div>
        {loadingDetail ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </p>
        ) : isCreating ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "신규 프로젝트를 입력 중입니다",
              en: "Creating a new project",
              ja: "新規プロジェクトを入力中です",
              zh: "正在输入新项目",
            })}
          </p>
        ) : !selectedProject ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "请选择项目" })}
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-xs">
            <p className="font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
              <span style={{ color: "var(--th-text-muted)" }}>ID:</span> {selectedProject.id}
            </p>
            <p className="break-all font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
              <span style={{ color: "var(--th-text-muted)" }}>Path:</span> {selectedProject.project_path}
            </p>
            <p className="break-all font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
              <span style={{ color: "var(--th-text-muted)" }}>Goal:</span> {selectedProject.core_goal}
            </p>
          </div>
        )}
      </div>

      {selectedProject && !loadingDetail && !isCreating && (
        <ProjectDashboardSection t={t} projectId={selectedProject.id} isKo={isKo} />
      )}

      {selectedProject && !loadingDetail && !isCreating && (
        <DeliverableChecklistSection t={t} projectId={selectedProject.id} />
      )}

      {selectedProject && !loadingDetail && !isCreating && groupedTaskCards.length > 0 && (
        <ProjectProgressSection t={t} groupedTaskCards={groupedTaskCards} />
      )}

      {selectedProject && !loadingDetail && !isCreating && groupedTaskCards.length > 0 && (
        <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "번다운 차트", en: "Burndown Chart", ja: "バーンダウンチャート", zh: "燃尽图" })}
          </h4>
          <BurndownChart projectId={selectedProject.id} t={t} />
        </div>
      )}

      {selectedProject && !loadingDetail && !isCreating && (
        <ProjectCostSection t={t} projectId={selectedProject.id} />
      )}

      <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "작업 이력", en: "Task History", ja: "作業履歴", zh: "任务历史" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
        ) : groupedTaskCards.length === 0 ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "연결된 작업이 없습니다", en: "No mapped tasks", ja: "紐づくタスクなし", zh: "没有映射任务" })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {groupedTaskCards.map((group) => (
              <button
                key={group.root.id}
                type="button"
                onClick={() => void handleOpenTaskDetail(group.root.id)}
                className="w-full min-w-0 overflow-hidden px-3 py-2 text-left transition"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              >
                <p className="whitespace-pre-wrap break-all text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{group.root.title}</p>
                <p className="mt-1 break-all text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {group.root.status} · {group.root.task_type} · {fmtTime(group.root.created_at)}
                </p>
                <p className="mt-1 break-all text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "담당", en: "Owner", ja: "担当", zh: "负责人" })}:{" "}
                  {group.root.assigned_agent_name_ko || group.root.assigned_agent_name || "-"}
                </p>
                <p className="mt-1 text-[11px] text-[#93c5fd]">
                  {t({ ko: "하위 작업", en: "Sub tasks", ja: "サブタスク", zh: "子任务" })}: {group.children.length}
                </p>
                {group.children.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {group.children.slice(0, 3).map((child: ProjectTaskHistoryItem) => (
                      <p key={child.id} className="whitespace-pre-wrap break-all text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                        - {child.title}
                      </p>
                    ))}
                    {group.children.length > 3 && (
                      <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>+{group.children.length - 3}</p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-right text-[11px] text-emerald-300">
                  {t({
                    ko: "카드 클릭으로 상세 보기",
                    en: "Click card for details",
                    ja: "クリックで詳細表示",
                    zh: "点击卡片查看详情",
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "보고서 이력(프로젝트 매핑)", en: "Mapped Reports", ja: "紐づくレポート", zh: "映射报告" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
        ) : sortedReports.length === 0 ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "연결된 보고서가 없습니다",
              en: "No mapped reports",
              ja: "紐づくレポートなし",
              zh: "没有映射报告",
            })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {sortedReports.map((row) => (
              <div
                key={row.id}
                className="flex min-w-0 items-center justify-between gap-2 px-3 py-2"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-all text-xs font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>{row.title}</p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{fmtTime(row.completed_at || row.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenTaskDetail(row.id)}
                  className="shrink-0 px-2 py-1 text-[11px] font-mono font-bold uppercase"
                  style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
                >
                  {t({ ko: "열람", en: "Open", ja: "表示", zh: "查看" })}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "대표 선택사항", en: "Representative Decisions", ja: "代表選択事項", zh: "代表选择事项" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
        ) : sortedDecisionEvents.length === 0 ? (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "기록된 대표 의사결정이 없습니다",
              en: "No representative decision records",
              ja: "代表意思決定の記録はありません",
              zh: "暂无代表决策记录",
            })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {sortedDecisionEvents.map((event) => {
              let selectedLabels: string[] = [];
              if (event.selected_options_json) {
                try {
                  const parsed = JSON.parse(event.selected_options_json) as Array<{ label?: unknown }>;
                  selectedLabels = Array.isArray(parsed)
                    ? parsed
                        .map((row) => (typeof row?.label === "string" ? row.label.trim() : ""))
                        .filter((label) => label.length > 0)
                    : [];
                } catch {
                  selectedLabels = [];
                }
              }

              return (
                <div
                  key={`${event.id}-${event.created_at}`}
                  className="px-3 py-2"
                  style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>
                      {getDecisionEventLabel(event.event_type)}
                    </p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{fmtTime(event.created_at)}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-all text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{event.summary}</p>
                  {selectedLabels.length > 0 && (
                    <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-[#93c5fd]">
                      {t({ ko: "선택 내용", en: "Selected Items", ja: "選択内容", zh: "已选内容" })}:{" "}
                      {selectedLabels.join(" / ")}
                    </p>
                  )}
                  {event.note && event.note.trim().length > 0 && (
                    <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-emerald-300">
                      {t({ ko: "추가 요청사항", en: "Additional Request", ja: "追加要請事項", zh: "追加请求事项" })}:{" "}
                      {event.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
