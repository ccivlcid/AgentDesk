import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../i18n";

interface Schedule {
  id: string;
  template_id: string;
  template_name: string;
  cron_expr: string;
  enabled: number;
  last_run_at: number | null;
  next_run_at: number | null;
  created_at: number;
}

interface Props {
  templateId: string;
  workflowName: string;
  onClose: () => void;
}

const mono = "var(--th-font-mono)";

const PRESETS = [
  { label: "Every 5 min",  cron: "*/5 * * * *" },
  { label: "Every hour",   cron: "0 * * * *" },
  { label: "Daily 9am",    cron: "0 9 * * *" },
  { label: "Daily midnight", cron: "0 0 * * *" },
  { label: "Mon 9am",      cron: "0 9 * * 1" },
  { label: "Weekdays 9am", cron: "0 9 * * 1-5" },
];

function fmtTime(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export default function WbScheduleModal({ templateId, workflowName, onClose }: Props) {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCron, setNewCron] = useState("0 9 * * *");
  const [cronError, setCronError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/workflow-schedules?template_id=${encodeURIComponent(templateId)}`)
      .then((r) => r.json() as Promise<{ schedules?: Schedule[] }>)
      .then((d) => { setSchedules(d.schedules ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = useCallback(async () => {
    setCronError("");
    setAdding(true);
    try {
      const res = await fetch("/api/workflow-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, cron_expr: newCron }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setCronError(data.error ?? "Failed");
      } else {
        setNewCron("0 9 * * *");
        load();
      }
    } finally {
      setAdding(false);
    }
  }, [templateId, newCron, load]);

  const handleToggle = useCallback(async (s: Schedule) => {
    await fetch(`/api/workflow-schedules/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    load();
  }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/workflow-schedules/${id}`, { method: "DELETE" });
    load();
  }, [load]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--th-modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
        borderRadius: 10, width: 540, maxWidth: "92vw", maxHeight: "82vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
              ⏰ {t({ ko: "스케줄 관리", en: "Schedule Manager", ja: "スケジュール管理", zh: "调度管理" })}
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>{workflowName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Add new schedule */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              {t({ ko: "새 스케줄 추가", en: "Add Schedule", ja: "スケジュール追加", zh: "添加调度" })}
            </div>

            {/* Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.cron}
                  onClick={() => { setNewCron(p.cron); setCronError(""); }}
                  style={{
                    fontFamily: mono, fontSize: 10, padding: "3px 9px",
                    background: newCron === p.cron ? "var(--th-accent)" : "var(--th-bg-elevated)",
                    border: `1px solid ${newCron === p.cron ? "var(--th-accent)" : "var(--th-border)"}`,
                    borderRadius: 4, cursor: "pointer", color: newCron === p.cron ? "#fff" : "var(--th-text)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Cron input */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={newCron}
                onChange={(e) => { setNewCron(e.target.value); setCronError(""); }}
                placeholder="*/5 * * * *"
                style={{ flex: 1, fontFamily: mono, fontSize: 12, padding: "7px 10px", background: "var(--th-bg-elevated)", border: `1px solid ${cronError ? "#ef4444" : "var(--th-border)"}`, borderRadius: 5, color: "var(--th-text)", outline: "none" }}
              />
              <button
                onClick={() => { void handleAdd(); }}
                disabled={adding || !newCron.trim()}
                style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, padding: "7px 16px", background: adding ? "var(--th-border)" : "var(--th-accent)", border: "none", borderRadius: 5, cursor: adding ? "not-allowed" : "pointer", color: "#fff", whiteSpace: "nowrap" }}
              >
                + {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
            </div>
            {cronError && (
              <div style={{ fontFamily: mono, fontSize: 10, color: "#ef4444", marginTop: 4 }}>{cronError}</div>
            )}
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 5 }}>
              {t({ ko: "형식: 분 시 일 월 요일 (0=일요일)", en: "Format: min hour day month weekday (0=Sun)", ja: "形式: 分 時 日 月 曜日 (0=日)", zh: "格式: 分 时 日 月 周 (0=周日)" })}
            </div>
          </div>

          {/* Schedule list */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              {t({ ko: "등록된 스케줄", en: "Schedules", ja: "登録済みスケジュール", zh: "已添加调度" })} ({schedules.length})
            </div>

            {loading ? (
              <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "16px 0" }}>Loading…</div>
            ) : schedules.length === 0 ? (
              <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "16px 0" }}>
                {t({ ko: "등록된 스케줄이 없습니다", en: "No schedules yet", ja: "スケジュールなし", zh: "暂无调度" })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: "var(--th-bg-elevated)",
                      border: `1px solid ${s.enabled ? "var(--th-border)" : "var(--th-border-muted, var(--th-border))"}`,
                      borderRadius: 6, opacity: s.enabled ? 1 : 0.55,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code style={{ fontFamily: mono, fontSize: 12, color: "var(--th-accent)", fontWeight: 600 }}>{s.cron_expr}</code>
                        <span style={{ fontFamily: mono, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: s.enabled ? "#10b98122" : "var(--th-bg-panel)", color: s.enabled ? "#10b981" : "var(--th-text-muted)", border: `1px solid ${s.enabled ? "#10b98144" : "var(--th-border)"}` }}>
                          {s.enabled ? t({ ko: "활성", en: "ON", ja: "有効", zh: "启用" }) : t({ ko: "비활성", en: "OFF", ja: "無効", zh: "禁用" })}
                        </span>
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 3 }}>
                        {t({ ko: "다음 실행", en: "Next", ja: "次回", zh: "下次" })}: {fmtTime(s.next_run_at)}
                        {s.last_run_at && (
                          <span style={{ marginLeft: 12 }}>
                            {t({ ko: "마지막", en: "Last", ja: "最終", zh: "上次" })}: {fmtTime(s.last_run_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => { void handleToggle(s); }}
                      title={s.enabled ? t({ ko: "비활성화", en: "Disable", ja: "無効化", zh: "禁用" }) : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
                      style={{ fontFamily: mono, fontSize: 10, padding: "4px 10px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, cursor: "pointer", color: "var(--th-text-muted)" }}
                    >
                      {s.enabled ? "⏸" : "▶"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => { void handleDelete(s.id); }}
                      title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                      style={{ fontFamily: mono, fontSize: 13, padding: "4px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 18px", borderTop: "1px solid var(--th-border)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, padding: "6px 18px", background: "var(--th-accent)", border: "none", borderRadius: 5, cursor: "pointer", color: "#fff" }}>
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );
}
