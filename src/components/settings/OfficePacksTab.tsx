import { useCallback, useEffect, useState } from "react";
import type { CustomOfficePack } from "../../types";
import { useI18n } from "../../i18n";
import * as api from "../../api";
import { getBuiltinPackList } from "../../app/office-workflow-pack";
import CustomPackFormModal from "./CustomPackFormModal";

type BuiltinPack = { key: string; label: string; summary: string; slug: string; accent: number };

export default function OfficePacksTab() {
  const { t, language } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const uiLocale = (language === "ko" || language === "ja" || language === "zh") ? language : "en";

  const [builtins] = useState<BuiltinPack[]>(() => getBuiltinPackList(uiLocale));
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const [packs, setPacks] = useState<CustomOfficePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPack, setEditPack] = useState<CustomOfficePack | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [res, settings] = await Promise.all([api.getCustomPacks(), api.getSettings()]);
      setPacks(res);
      setHiddenKeys(new Set(settings.hiddenBuiltinPackKeys ?? []));
    } catch (e) {
      console.error("Failed to load packs:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleToggleBuiltin = async (key: string) => {
    const hide = !hiddenKeys.has(key);
    setTogglingKey(key);
    try {
      await api.toggleBuiltinPackVisibility(key, hide);
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (hide) next.add(key);
        else next.delete(key);
        return next;
      });
    } catch (e) {
      console.error("Toggle failed:", e);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleSave = async () => { await loadData(); };

  const handleDelete = async (key: string) => {
    setDeleting(true);
    try {
      await api.deleteCustomPack(key);
      await loadData();
      setConfirmDeleteKey(null);
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice */}
      <div className="px-4 py-3 text-xs font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.06)", color: "var(--th-text-muted)" }}>
        {tr(
          "AI 자동 생성으로 업종에 맞는 부서 구조와 직원을 한 번에 만들 수 있습니다. Claude API 키 설정이 필요합니다.",
          "Use AI auto-generation to create department structures and staff for any industry. Requires a Claude API key.",
        )}
      </div>

      {/* Built-in packs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {tr("기본 오피스 팩", "Built-in Office Packs")}
          </h3>
          <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("숨기면 헤더 드롭다운에서 제외됩니다", "Hidden packs won't appear in the header dropdown")}
          </span>
        </div>

        <div className="space-y-1.5">
          {builtins.map((b) => {
            const isHidden = hiddenKeys.has(b.key);
            const accentHex = "#" + b.accent.toString(16).padStart(6, "0");
            return (
              <div
                key={b.key}
                className="relative flex items-center gap-3 px-4 py-2.5 pl-5"
                style={{
                  borderRadius: "2px",
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-elevated)",
                  opacity: isHidden ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {/* Color stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ borderRadius: "2px 0 0 2px", background: accentHex }} />

                <div
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold font-mono shrink-0"
                  style={{ borderRadius: "2px", background: `${accentHex}25`, color: accentHex }}
                >
                  {b.slug}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
                    {b.label}
                  </div>
                  <div className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
                    {b.summary}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={togglingKey === b.key}
                  onClick={() => void handleToggleBuiltin(b.key)}
                  className="shrink-0 px-3 py-1.5 text-xs font-mono transition-all disabled:opacity-40"
                  style={{
                    borderRadius: "2px",
                    border: isHidden
                      ? "1px solid rgba(52,211,153,0.4)"
                      : "1px solid rgba(251,191,36,0.35)",
                    background: isHidden
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(251,191,36,0.08)",
                    color: isHidden ? "rgb(52,211,153)" : "var(--th-text-muted)",
                  }}
                >
                  {togglingKey === b.key
                    ? "..."
                    : isHidden
                    ? tr("복원", "Restore")
                    : tr("숨기기", "Hide")}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom packs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {tr("커스텀 오피스 팩", "Custom Office Packs")}
          </h3>
          <button
            type="button"
            onClick={() => { setEditPack(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium font-mono transition-all shrink-0"
            style={{
              borderRadius: "2px",
              border: "1px solid rgba(251,191,36,0.5)",
              background: "rgba(251,191,36,0.15)",
              color: "var(--th-accent)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {tr("새 팩 만들기", "New Pack")}
          </button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("불러오는 중...", "Loading...")}
          </div>
        ) : packs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            style={{ borderRadius: "4px", border: "1px dashed var(--th-border)", background: "var(--th-bg-elevated)" }}
          >
            <div className="text-3xl mb-2">🏢</div>
            <p className="text-sm font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
              {tr("커스텀 팩이 없습니다", "No custom packs yet")}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--th-text-muted)" }}>
              {tr("새 팩 만들기 버튼으로 시작하세요", 'Click "New Pack" to get started')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {packs.map((pack) => (
              <div
                key={pack.key}
                className="group relative"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ borderRadius: "2px 0 0 2px", background: pack.color }} />

                <div className="flex items-center gap-4 px-4 py-3 pl-5">
                  <div
                    className="w-9 h-9 flex items-center justify-center text-xl shrink-0"
                    style={{ borderRadius: "2px", background: `${pack.color}20` }}
                  >
                    {pack.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm font-mono" style={{ color: "var(--th-text-heading)" }}>
                        {pack.name}
                      </span>
                      {pack.name_ko && pack.name_ko !== pack.name && (
                        <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                          / {pack.name_ko}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] font-mono px-1.5 py-0.5" style={{ borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>
                        {pack.key}
                      </code>
                      {pack.description && (
                        <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
                          {pack.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setEditPack(pack); setShowModal(true); }}
                      className="p-1.5 transition-all"
                      style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
                      title={tr("수정", "Edit")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteKey(pack.key)}
                      className="p-1.5 transition-all"
                      style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
                      title={tr("삭제", "Delete")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {confirmDeleteKey === pack.key && (
                  <div className="flex items-center justify-end gap-2 px-4 pb-3 -mt-1">
                    <span className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>
                      {tr("정말 삭제하시겠습니까?", "Delete this pack?")}
                    </span>
                    <button
                      onClick={() => void handleDelete(pack.key)}
                      disabled={deleting}
                      className="px-3 py-1 text-xs font-mono transition-all disabled:opacity-50"
                      style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}
                    >
                      {tr("삭제", "Delete")}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteKey(null)}
                      className="px-3 py-1 text-xs font-mono transition-colors"
                      style={{ color: "var(--th-text-muted)" }}
                    >
                      {tr("취소", "Cancel")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CustomPackFormModal
          pack={editPack}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditPack(null); }}
        />
      )}
    </div>
  );
}
