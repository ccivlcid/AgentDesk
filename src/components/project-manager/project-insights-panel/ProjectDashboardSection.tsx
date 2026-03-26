import { useEffect, useState, useCallback } from "react";
import type { ProjectObjective, ProjectGate } from "../../../types";
import { objectivesApi, gatesApi } from "../../../api/categories-dashboard";
import type { ProjectI18nTranslate } from "../types";
import { OBJ_STATUS_META, GATE_STATUS_META } from "./constants";
import { fmtDueDate } from "./utils";

export function ProjectDashboardSection({ t, projectId, isKo }: { t: ProjectI18nTranslate; projectId: string; isKo: boolean }) {
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [gates, setGates] = useState<ProjectGate[]>([]);
  const [loading, setLoading] = useState(true);

  const [editObjId, setEditObjId] = useState<string | null>(null);
  const [editObjTitle, setEditObjTitle] = useState("");
  const [editObjStatus, setEditObjStatus] = useState<ProjectObjective["status"]>("active");
  const [editObjProgress, setEditObjProgress] = useState(0);

  const [editGateId, setEditGateId] = useState<string | null>(null);
  const [editGateTitle, setEditGateTitle] = useState("");
  const [editGateStatus, setEditGateStatus] = useState<ProjectGate["status"]>("pending");
  const [editGateCriteria, setEditGateCriteria] = useState("");

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
  const inputStyle = { borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" };
  const selectStyle = { ...inputStyle, cursor: "pointer" as const };

  return (
    <div className="min-w-0 p-4 space-y-4" style={{ border: "1px solid var(--th-border)", borderRadius: 8, background: "var(--th-bg-surface)" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" })}
      </h4>

      {loading ? (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: `목표 (${objectives.length})`, en: `Objectives (${objectives.length})`, ja: `目標 (${objectives.length})`, zh: `目标 (${objectives.length})` })}
              </span>
              <button
                type="button"
                onClick={() => { setShowNewObj((v) => !v); setNewObjTitle(""); }}
                className="text-[11px] font-mono px-2 py-0.5"
                style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
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
                <button type="submit" disabled={!newObjTitle.trim() || saving} className="px-2 py-1 text-[11px] font-mono font-bold" style={{ borderRadius: 8, background: "var(--th-accent)", color: "var(--th-bg-elevated)", border: "none", cursor: "pointer" }}>
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
                        <button type="button" onClick={() => setEditObjId(null)} className="px-2 py-0.5 text-[11px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 8 }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                        <button type="button" onClick={() => void saveObj()} disabled={saving} className="px-2 py-0.5 text-[11px] font-mono font-bold" style={{ background: "var(--th-accent)", color: "var(--th-bg-elevated)", border: "none", cursor: "pointer", borderRadius: 8 }}>
                          {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={obj.id} className="flex items-center gap-2 px-2 py-1.5 group" style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
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
                      <button type="button" onClick={() => startEditObj(obj)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 8 }}>
                        {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                      </button>
                      <button type="button" onClick={() => void deleteObj(obj.id)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 8 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: `게이트 (${gates.length})`, en: `Gates (${gates.length})`, ja: `ゲート (${gates.length})`, zh: `关卡 (${gates.length})` })}
              </span>
              <button
                type="button"
                onClick={() => { setShowNewGate((v) => !v); setNewGateTitle(""); }}
                className="text-[11px] font-mono px-2 py-0.5"
                style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
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
                <button type="submit" disabled={!newGateTitle.trim() || saving} className="px-2 py-1 text-[11px] font-mono font-bold" style={{ borderRadius: 8, background: "var(--th-accent)", color: "var(--th-bg-elevated)", border: "none", cursor: "pointer" }}>
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
                        <button type="button" onClick={() => setEditGateId(null)} className="px-2 py-0.5 text-[11px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 8 }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                        <button type="button" onClick={() => void saveGate()} disabled={saving} className="px-2 py-0.5 text-[11px] font-mono font-bold" style={{ background: "var(--th-accent)", color: "var(--th-bg-elevated)", border: "none", cursor: "pointer", borderRadius: 8 }}>
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
                      <button type="button" onClick={() => startEditGate(gate)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 8 }}>
                        {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                      </button>
                      <button type="button" onClick={() => void deleteGate(gate.id)} className="px-1.5 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 8 }}>✕</button>
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
