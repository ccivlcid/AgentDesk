import { useEffect, useRef, useState } from "react";
import type { CustomOfficePack, Department, Agent } from "../../types";
import * as api from "../../api";

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

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genPreview, setGenPreview] = useState<{ departments: Department[]; agents: Agent[] } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
      setGenError(msg.includes("no_api_key") || msg.includes("API key")
        ? "Claude API 키가 설정되지 않았습니다. API 설정 탭에서 먼저 추가해주세요."
        : `생성 실패: ${msg}`);
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

  const inputStyle = {
    background: "var(--th-input-bg)",
    borderColor: "var(--th-input-border)",
    color: "var(--th-text-primary)",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-lg shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ borderRadius: "4px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
      >
        {/* Header stripe */}
        <div className="h-1" style={{ background: color }} />

        <div className="p-6 space-y-5">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {isEdit ? "오피스 팩 수정" : "새 오피스 팩 만들기"}
            </h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: "var(--th-text-muted)" }}>✕</button>
          </div>

          {/* Icon + Name row */}
          <div className="flex items-start gap-3">
            {/* Icon picker */}
            <div>
              <label className="block text-xs mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>아이콘</label>
              <div className="grid grid-cols-4 gap-1 p-2" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", width: 96 }}>
                {PACK_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className="w-9 h-9 flex items-center justify-center text-lg transition-all hover:opacity-80"
                    style={{
                      borderRadius: "2px",
                      background: icon === ic ? `${color}30` : "transparent",
                      outline: icon === ic ? `2px solid ${color}` : "none",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                  영문 이름 <span style={{ color: "rgb(248,113,113)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Game Studio"
                  className="w-full px-3 py-2 border text-sm font-mono focus:outline-none"
                  style={{ borderRadius: "2px", ...inputStyle }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>한국어 이름</label>
                <input
                  type="text"
                  value={nameKo}
                  onChange={(e) => setNameKo(e.target.value)}
                  placeholder="게임 스튜디오"
                  className="w-full px-3 py-2 border text-sm font-mono focus:outline-none"
                  style={{ borderRadius: "2px", ...inputStyle }}
                />
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>테마 색상</label>
            <div className="flex flex-wrap gap-2">
              {PACK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 transition-all hover:scale-110"
                  style={{
                    borderRadius: "50%",
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "2px solid transparent",
                    outlineOffset: "3px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs mb-1.5 font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="이 오피스 팩의 업종/주제를 설명해주세요..."
              className="w-full px-3 py-2 border text-sm font-mono focus:outline-none resize-none"
              style={{ borderRadius: "2px", ...inputStyle }}
            />
          </div>

          {/* AI Generate section (create mode only) */}
          {!isEdit && (
            <div className="p-4 space-y-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>AI 자동 생성</div>
                  <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
                    팩 이름과 설명을 기반으로 부서·직원 구조를 자동 생성합니다
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={generating || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium font-mono transition-all disabled:opacity-40 shrink-0"
                  style={{
                    borderRadius: "2px",
                    border: "1px solid rgba(251,191,36,0.5)",
                    background: "rgba(251,191,36,0.15)",
                    color: "var(--th-accent)",
                  }}
                >
                  {generating ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                      </svg>
                      AI 자동 생성
                    </>
                  )}
                </button>
              </div>

              {genError && (
                <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: "2px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "rgb(253,164,175)" }}>
                  {genError}
                </div>
              )}

              {genPreview && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                    생성 완료 — 저장 시 적용됩니다
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
                        style={{ borderRadius: "2px", border: `1px solid ${(d as { color?: string }).color ?? "#6366f1"}40`, background: `${(d as { color?: string }).color ?? "#6366f1"}15`, color: (d as { color?: string }).color ?? "var(--th-text-secondary)" }}
                      >
                        {(d as { icon?: string }).icon} {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--th-border)" }}>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium font-mono transition-all disabled:opacity-40"
              style={{ borderRadius: "2px", background: color, color: "#fff" }}
            >
              {saving ? "저장 중..." : isEdit ? "변경사항 저장" : "팩 만들기"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium font-mono transition-all hover:opacity-80"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
