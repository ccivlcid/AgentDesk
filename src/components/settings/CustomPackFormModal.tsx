import { useEffect, useRef, useState } from "react";
import type { CliProvider, CustomOfficePack, Department, Agent } from "../../types";
import * as api from "../../api";
import { CLI_INFO } from "./constants";

const PACK_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#06b6d4", "#3b82f6", "#64748b", "#14b8a6",
];

const PACK_ICONS = ["🏢", "🎮", "🎬", "🎵", "🏥", "🏦", "🛒", "🚀", "🔬", "📰", "🍽️", "✈️", "🎓", "⚖️", "🏗️", "🌿"];

interface Props {
  pack?: CustomOfficePack | null;
  onSave: (pack: CustomOfficePack) => void;
  onClose: () => void;
}

export default function CustomPackFormModal({ pack, onSave, onClose }: Props) {
  const isEdit = !!pack;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(pack?.name ?? "");
  const [nameKo, setNameKo] = useState(pack?.name_ko ?? "");
  const [icon, setIcon] = useState(pack?.icon ?? "🏢");
  const [color, setColor] = useState(pack?.color ?? "#6366f1");
  const [description, setDescription] = useState(pack?.description ?? "");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genPreview, setGenPreview] = useState<{ departments: Department[]; agents: Agent[] } | null>(null);

  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!showIconPicker) return;
    const handler = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showIconPicker]);

  const handleAiGenerate = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGenPreview(null);
    try {
      const result = await api.aiGeneratePackProfile({
        name: name.trim(),
        name_ko: nameKo.trim() || name.trim(),
        description: description.trim(),
      });
      setGenPreview(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      let providerLabel = "Claude Code";
      try {
        const settings = await api.getSettings();
        const provider = (settings.defaultProvider as CliProvider) ?? "claude";
        providerLabel = CLI_INFO[provider]?.label ?? provider;
      } catch {
        /* keep default */
      }
      setGenError(
        msg.includes("no_api_key") || msg.includes("API key")
          ? `${providerLabel} 설정이 필요합니다. API 설정 탭에서 먼저 추가해주세요.`
          : `생성 실패: ${msg}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let saved: CustomOfficePack;
      const payload = {
        name: name.trim(),
        name_ko: nameKo.trim() || name.trim(),
        icon,
        color,
        description: description.trim(),
      };

      if (isEdit && pack) {
        saved = await api.updateCustomPack(pack.key, payload);
      } else {
        saved = await api.createCustomPack(payload);
      }

      // If AI generated a profile, save it to officePackProfiles via settings
      if (genPreview && !isEdit) {
        const currentSettings = await api.getSettings();
        const currentProfiles = currentSettings.officePackProfiles ?? {};
        await api.saveSettingsPatch({
          officePackProfiles: {
            ...currentProfiles,
            [saved.key]: {
              departments: genPreview.departments,
              agents: genPreview.agents,
              updated_at: Date.now(),
            },
          },
        });
      }

      onSave(saved);
      onClose();
    } catch (e: unknown) {
      console.error("Pack save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const focusRing = "focus:outline-none focus:ring-1 focus:ring-[var(--th-accent)] focus:ring-offset-0";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col"
        style={{ borderRadius: "6px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
      >
        {/* Header with color accent */}
        <div className="relative" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}>
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h3 className="text-sm font-bold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {isEdit ? "오피스 팩 수정" : "새 오피스 팩 만들기"}
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center transition-all hover:bg-[var(--th-bg-elevated)]"
              style={{ color: "var(--th-text-muted)", borderRadius: "4px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Live preview card */}
          <div className="mx-5 mb-4 flex items-center gap-3 px-3.5 py-2.5" style={{ borderRadius: "4px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}>
            <div
              className="w-10 h-10 flex items-center justify-center text-xl shrink-0"
              style={{ borderRadius: "4px", background: `${color}20`, boxShadow: `inset 0 0 0 1px ${color}30` }}
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold font-mono truncate" style={{ color: name.trim() ? "var(--th-text-heading)" : "var(--th-text-muted)" }}>
                {name.trim() || "팩 이름"}
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
                {nameKo.trim() || description.trim() || "미리보기"}
              </div>
            </div>
            <div className="w-2 h-8 shrink-0" style={{ borderRadius: "2px", background: color }} />
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-1 space-y-4">
          {/* Icon + Color row */}
          <div className="flex items-start gap-4">
            {/* Icon picker button */}
            <div className="relative" ref={iconPickerRef}>
              <label className="block text-[11px] mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>아이콘</label>
              <button
                type="button"
                onClick={() => setShowIconPicker((v) => !v)}
                className="w-12 h-12 flex items-center justify-center text-2xl transition-all hover:scale-105"
                style={{
                  borderRadius: "4px",
                  background: `${color}15`,
                  border: `1.5px solid ${color}50`,
                  boxShadow: showIconPicker ? `0 0 0 2px ${color}30` : "none",
                }}
              >
                {icon}
              </button>
              {showIconPicker && (
                <div
                  className="absolute top-full left-0 mt-1.5 z-10 p-2 shadow-xl grid grid-cols-4 gap-1"
                  style={{
                    borderRadius: "6px",
                    border: "1px solid var(--th-border)",
                    background: "var(--th-bg-surface)",
                    width: 176,
                  }}
                >
                  {PACK_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                      className="w-10 h-10 flex items-center justify-center text-lg transition-all hover:scale-110"
                      style={{
                        borderRadius: "4px",
                        background: icon === ic ? `${color}25` : "transparent",
                        outline: icon === ic ? `2px solid ${color}` : "none",
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color picker */}
            <div className="flex-1">
              <label className="block text-[11px] mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>테마 색상</label>
              <div className="flex flex-wrap gap-1.5">
                {PACK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 transition-all hover:scale-110 flex items-center justify-center"
                    style={{
                      borderRadius: "50%",
                      background: c,
                      outline: color === c ? `2.5px solid ${c}` : "2px solid transparent",
                      outlineOffset: color === c ? "3px" : "0px",
                      boxShadow: color === c ? `0 0 8px ${c}40` : "none",
                    }}
                  >
                    {color === c && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                영문 이름 <span style={{ color: "rgb(248,113,113)" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Game Studio"
                className={`w-full px-3 py-2 border text-sm font-mono ${focusRing}`}
                style={{ borderRadius: "4px", background: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>한국어 이름</label>
              <input
                type="text"
                value={nameKo}
                onChange={(e) => setNameKo(e.target.value)}
                placeholder="게임 스튜디오"
                className={`w-full px-3 py-2 border text-sm font-mono ${focusRing}`}
                style={{ borderRadius: "4px", background: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="이 오피스 팩의 업종/주제를 설명해주세요..."
              className={`w-full px-3 py-2 border text-sm font-mono resize-none ${focusRing}`}
              style={{ borderRadius: "4px", background: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* AI Generate section (create mode only) */}
          {!isEdit && (
            <div
              className="p-4 space-y-3"
              style={{
                borderRadius: "4px",
                border: "1px solid rgba(251,191,36,0.2)",
                background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-5 h-5 flex items-center justify-center shrink-0"
                  style={{ borderRadius: "4px", background: "rgba(251,191,36,0.15)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold font-mono" style={{ color: "var(--th-accent)" }}>AI 자동 생성</div>
              </div>

              <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                팩 이름과 설명을 기반으로 부서·직원 구조를 자동 생성합니다
              </div>

              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={generating || !name.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium font-mono transition-all disabled:opacity-40"
                style={{
                  borderRadius: "4px",
                  border: "1px solid rgba(251,191,36,0.4)",
                  background: "rgba(251,191,36,0.1)",
                  color: "var(--th-accent)",
                }}
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    AI 구조 생성 중...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    부서·직원 자동 생성
                  </>
                )}
              </button>

              {genError && (
                <div className="text-[11px] font-mono px-3 py-2.5" style={{ borderRadius: "4px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: "rgb(253,164,175)" }}>
                  {genError}
                </div>
              )}

              {genPreview && (
                <div
                  className="space-y-2.5 p-3"
                  style={{ borderRadius: "4px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(52,211,153)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div className="text-[11px] font-mono font-medium" style={{ color: "rgb(52,211,153)" }}>
                      생성 완료 — 저장 시 적용됩니다
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5" style={{ color: "var(--th-accent)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      부서 {genPreview.departments.length}개
                    </span>
                    <span className="flex items-center gap-1.5" style={{ color: "rgb(52,211,153)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      직원 {genPreview.agents.length}명
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {genPreview.departments.slice(0, 6).map((d) => (
                      <span
                        key={(d as { id?: string }).id ?? d.name}
                        className="text-[10px] px-2 py-0.5 font-mono"
                        style={{ borderRadius: "3px", border: `1px solid ${(d as { color?: string }).color ?? "#6366f1"}40`, background: `${(d as { color?: string }).color ?? "#6366f1"}15`, color: (d as { color?: string }).color ?? "var(--th-text-secondary)" }}
                      >
                        {(d as { icon?: string }).icon} {d.name}
                      </span>
                    ))}
                    {genPreview.departments.length > 6 && (
                      <span className="text-[10px] px-2 py-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                        +{genPreview.departments.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions — fixed */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium font-mono transition-all hover:opacity-80"
            style={{ borderRadius: "4px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
          >
            취소
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2.5 text-sm font-medium font-mono transition-all disabled:opacity-40 hover:brightness-110"
            style={{ borderRadius: "4px", background: color, color: "#fff", boxShadow: `0 2px 8px ${color}30` }}
          >
            {saving ? "저장 중..." : isEdit ? "변경사항 저장" : "팩 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
