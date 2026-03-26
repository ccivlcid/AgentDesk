import { useEffect, useState, useCallback } from "react";
import { getProjectDeliverables, updateProjectDeliverable, type ProjectDeliverableItem } from "../../../api/organization-projects";
import type { ProjectI18nTranslate } from "../types";
import { TYPE_COLOR } from "./constants";

export function DeliverableChecklistSection({ t, projectId }: { t: ProjectI18nTranslate; projectId: string }) {
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
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
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
          {items.length > 0 && (
            <div className="mb-3 h-1.5 w-full overflow-hidden" style={{ background: "var(--th-bg-primary)" }}>
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
                  <span
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 14, height: 14,
                      border: `1.5px solid ${item.checked ? "#4ade80" : "var(--th-accent-border)"}`,
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
