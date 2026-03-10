import { useCallback, useEffect, useRef, useState } from "react";
import type { Department } from "../../types";
import { localeName, useI18n } from "../../i18n";
import * as api from "../../api";
import { CLI_PROVIDERS, ROLE_BADGE, ROLE_LABEL, ROLES } from "./constants";
import EmojiPicker from "./EmojiPicker";
import type { FormData } from "./types";
import { PersonaCatalog } from "../agent-persona/PersonaCatalog";
import { getPersonaById } from "../../data/personas";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgentFormModal({
  isKo,
  locale,
  tr,
  form,
  setForm,
  departments,
  isEdit,
  saving,
  onSave,
  onClose,
}: {
  isKo: boolean;
  locale: string;
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
  departments: Department[];
  isEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [generatingPersona, setGeneratingPersona] = useState(false);

  const handleGeneratePersona = useCallback(async () => {
    if (!form.name.trim() || generatingPersona) return;
    setGeneratingPersona(true);
    try {
      const personality = await api.generatePersona({
        name: form.name.trim(),
        role: form.role,
        department_id: form.department_id || null,
        lang: isKo ? "ko" : "en",
      });
      if (personality) setForm({ ...form, personality });
    } catch (err) {
      console.error("Persona generation failed:", err);
    } finally {
      setGeneratingPersona(false);
    }
  }, [form, isKo, generatingPersona, setForm]);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [showPersonaCatalog, setShowPersonaCatalog] = useState(false);

  const inputCls =
    "w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-colors";
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
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "var(--th-bg-surface)",
          border: "1px solid var(--th-border)",
          borderRadius: "4px",
        }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {isEdit ? tr("직원 정보 수정", "Edit Agent") : tr("신규 직원 채용", "Hire New Agent")}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-[var(--th-bg-surface-hover)] transition-colors font-mono"
            style={{ color: "var(--th-text-muted)", borderRadius: "2px" }}
          >
            ✕
          </button>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-2 gap-5">
          {/* ── Left column: 기본 정보 ── */}
          <div className="space-y-4">
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--th-text-muted)" }}
            >
              {tr("기본 정보", "Basic Info")}
            </div>
            {/* ── 프로필 이미지 + 이름 ── */}
            <div className="flex items-center gap-3">
              {/* Avatar upload circle */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      alert(tr("이미지는 5MB 이하여야 합니다.", "Image must be under 5 MB."));
                      return;
                    }
                    const dataUrl = await fileToBase64(file);
                    setForm({ ...form, pendingAvatarDataUrl: dataUrl });
                  }}
                />
                <button
                  type="button"
                  title={tr("프로필 이미지 업로드", "Upload profile image")}
                  className="relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-amber-500/60 transition-all group"
                  style={{ background: "var(--th-bg-elevated)", border: "2px solid var(--th-input-border)" }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {form.pendingAvatarDataUrl ?? form.avatar_url ? (
                    <img
                      src={(form.pendingAvatarDataUrl ?? form.avatar_url)!}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{form.avatar_emoji || "🤖"}</span>
                  )}
                  {/* Hover overlay */}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                    {tr("변경", "Edit")}
                  </span>
                </button>
                {(form.pendingAvatarDataUrl ?? form.avatar_url) && (
                  <button
                    type="button"
                    className="text-[10px] hover:text-red-400 transition-colors"
                    style={{ color: "var(--th-text-muted)" }}
                    onClick={() => setForm({ ...form, pendingAvatarDataUrl: null, avatar_url: null })}
                  >
                    {tr("제거", "Remove")}
                  </button>
                )}
              </div>
              {/* Name input */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("영문 이름", "Name")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="DORO"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
            {/* 로캘 기반 현지 이름 필드 */}
            {locale.startsWith("ko") && (
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("한글 이름", "Korean Name")}
                </label>
                <input
                  type="text"
                  value={form.name_ko}
                  onChange={(e) => setForm({ ...form, name_ko: e.target.value })}
                  placeholder="도로롱"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            )}
            {locale.startsWith("ja") && (
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "일본어 이름", en: "Japanese Name", ja: "日本語名", zh: "日语名" })}
                </label>
                <input
                  type="text"
                  value={form.name_ja}
                  onChange={(e) => setForm({ ...form, name_ja: e.target.value })}
                  placeholder="ドロロン"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            )}
            {locale.startsWith("zh") && (
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "중국어 이름", en: "Chinese Name", ja: "中国語名", zh: "中文名" })}
                </label>
                <input
                  type="text"
                  value={form.name_zh}
                  onChange={(e) => setForm({ ...form, name_zh: e.target.value })}
                  placeholder="多罗隆"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            )}
            <div className="grid grid-cols-[72px_1fr] gap-2">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("이모지", "Emoji")}
                </label>
                <EmojiPicker
                  value={form.avatar_emoji}
                  onChange={(emoji) => setForm({ ...form, avatar_emoji: emoji })}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("소속 부서", "Department")}
                </label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className={`${inputCls} cursor-pointer`}
                  style={inputStyle}
                >
                  <option value="">{tr("— 미배정 —", "— Unassigned —")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {localeName(locale, d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Right column: 역할 설정 ── */}
          <div className="space-y-4">
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--th-text-muted)" }}
            >
              {tr("역할 설정", "Role Config")}
            </div>
            {/* 직급 */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {tr("직급", "Role")}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ROLES.map((r) => {
                  const active = form.role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-2 text-xs font-mono font-medium border transition-all ${
                        active ? ROLE_BADGE[r] : ""
                      }`}
                      style={{
                        borderRadius: "2px",
                        transition: "all 0.1s linear",
                        ...(!active ? { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" } : {}),
                      }}
                    >
                      {isKo ? ROLE_LABEL[r].ko : ROLE_LABEL[r].en}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* CLI Provider */}
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                {tr("CLI 도구", "CLI Provider")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLI_PROVIDERS.map((p) => {
                  const active = form.cli_provider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, cli_provider: p })}
                      className="px-2.5 py-1.5 text-[11px] font-mono border transition-all"
                      style={{
                        borderRadius: "2px",
                        transition: "all 0.1s linear",
                        ...(active
                          ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.35)" }
                          : { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" }),
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 성격/프롬프트 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("캐릭터 페르소나", "Character Persona")}
                </label>
                {form.name && (
                  <button
                    type="button"
                    disabled={generatingPersona || !form.name.trim()}
                    className="text-[10px] px-2 py-0.5 transition-colors hover:opacity-80 disabled:opacity-50 font-mono"
                    style={{
                      borderRadius: "2px",
                      border: "1px solid rgba(245,158,11,0.4)",
                      background: "rgba(245,158,11,0.1)",
                      color: "#f59e0b",
                    }}
                    onClick={handleGeneratePersona}
                  >
                    {generatingPersona
                      ? tr("생성 중...", "Generating...")
                      : form.personality
                        ? tr("AI 재생성", "AI Regenerate")
                        : tr("AI 자동생성", "AI Generate")}
                  </button>
                )}
              </div>
              <textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                rows={5}
                placeholder={isKo
                  ? "예: 나는 제갈량, 천하삼분지계의 전략가다. 항상 세 수 앞을 내다보고, '상중하 세 가지 전략'을 제시하는 것이 습관이다. 고사성어와 역사적 비유로 논점을 풀어내고, 은유적이지만 결론은 명쾌하다..."
                  : "e.g. I am Ada Lovelace, the world's first programmer. I approach problems by grasping the underlying structure first. I speak with Victorian formality, combining technical rigor with poetic expression..."}
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "말투, 사고방식, 입버릇, 습관 등을 구체적으로 작성하면 AI가 그 인물처럼 행동합니다.",
                  "Define speech patterns, thinking style, catchphrases, and habits for the AI to embody this character.",
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Famous Persona ── */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={() => setShowPersonaCatalog((v) => !v)}
            className="flex w-full items-center justify-between"
            style={{ borderLeft: "3px solid var(--th-accent, #f59e0b)", paddingLeft: "0.5rem", transition: "background 0.1s linear" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest font-mono" style={{ color: "var(--th-text-muted)" }}>
                {tr("유명인 페르소나", "Famous Persona")}
              </span>
              {form.persona_id && (() => {
                const p = getPersonaById(form.persona_id);
                return p ? (
                  <span className="font-mono text-[9px] font-semibold uppercase" style={{ color: p.color, border: `1px solid ${p.color}40`, borderRadius: "2px", padding: "0 4px", background: `${p.color}12` }}>
                    {p.badge}
                  </span>
                ) : null;
              })()}
            </div>
            <span className="font-mono text-[10px]" style={{ color: "var(--th-text-muted)", transform: showPersonaCatalog ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.1s linear" }}>▶</span>
          </button>
          {showPersonaCatalog && (
            <div className="mt-3">
              <PersonaCatalog
                selectedId={form.persona_id ?? ""}
                onSelect={(id) => setForm({ ...form, persona_id: id || undefined })}
              />
              <p className="mt-2 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "유명인의 사고방식과 철학이 AI 시스템 프롬프트에 주입됩니다.",
                  "The selected persona's philosophy is injected into the AI system prompt.",
                )}
              </p>
            </div>
          )}
        </div>

        {/* Actions — full width */}
        <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-mono font-medium transition-all disabled:opacity-40"
            style={{
              borderRadius: "2px",
              border: "1px solid rgba(245,158,11,0.5)",
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              transition: "background 0.1s linear",
            }}
          >
            {saving
              ? tr("처리 중...", "Saving...")
              : isEdit
                ? tr("변경사항 저장", "Save Changes")
                : tr("채용 확정", "Confirm Hire")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-mono font-medium transition-all hover:bg-[var(--th-bg-surface-hover)]"
            style={{ borderRadius: "2px", border: "1px solid var(--th-input-border)", color: "var(--th-text-secondary)" }}
          >
            {tr("취소", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
