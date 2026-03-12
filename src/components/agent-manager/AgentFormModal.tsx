import { useCallback, useRef, useState } from "react";
import type { Department } from "../../types";
import { localeName, useI18n } from "../../i18n";
import * as api from "../../api";
import { CLI_PROVIDERS, ROLE_BADGE, ROLE_LABEL, ROLES } from "./constants";
import EmojiPicker from "./EmojiPicker";
import type { FormData } from "./types";
import { PersonaCatalog } from "../agent-persona/PersonaCatalog";
import { getPersonaById } from "../../data/personas";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, useToast } from "../ui";

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
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [showPersonaCatalog, setShowPersonaCatalog] = useState(false);

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

  const selectStyle: React.CSSProperties = {
    background: "var(--th-input-bg)",
    borderColor: "var(--th-input-border)",
    color: "var(--th-text-primary)",
    borderRadius: 6,
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--th-font-mono)",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--th-text-muted)",
  };

  return (
    <Modal open onClose={onClose} width="lg">
      <ModalHeader onClose={onClose}>
        {isEdit ? tr("직원 정보 수정", "Edit Agent") : tr("신규 직원 채용", "Hire New Agent")}
      </ModalHeader>

      <ModalBody>
        <div className="space-y-5">
          {/* ── 기본 정보 ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabel}>BASIC INFO</span>
            </div>

            {/* Avatar + 이름 */}
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
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
                      showToast(tr("이미지는 5MB 이하여야 합니다.", "Image must be under 5 MB."), "warning");
                      return;
                    }
                    const dataUrl = await fileToBase64(file);
                    setForm({ ...form, pendingAvatarDataUrl: dataUrl });
                  }}
                />
                <button
                  type="button"
                  title={tr("프로필 이미지 업로드", "Upload profile image")}
                  className="relative w-14 h-14 overflow-hidden flex items-center justify-center transition-all group"
                  style={{ background: "var(--th-bg-elevated)", border: "2px solid var(--th-input-border)", borderRadius: 8 }}
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
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                    {tr("변경", "Edit")}
                  </span>
                </button>
                {(form.pendingAvatarDataUrl ?? form.avatar_url) && (
                  <button
                    type="button"
                    className="text-[10px] transition-colors"
                    style={{ color: "var(--th-text-muted)" }}
                    onClick={() => setForm({ ...form, pendingAvatarDataUrl: null, avatar_url: null })}
                  >
                    {tr("제거", "Remove")}
                  </button>
                )}
              </div>

              {/* 이름 + 이모지 */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                    {tr("영문 이름", "Name")} <span style={{ color: "var(--th-danger-text)" }}>*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="DORO"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                    {tr("이모지", "Emoji")}
                  </label>
                  <EmojiPicker value={form.avatar_emoji} onChange={(emoji) => setForm({ ...form, avatar_emoji: emoji })} />
                </div>
              </div>
            </div>

            {/* 로캘 기반 현지 이름 */}
            {locale.startsWith("ko") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("한글 이름", "Korean Name")}
                </label>
                <Input value={form.name_ko} onChange={(e) => setForm({ ...form, name_ko: e.target.value })} placeholder="도로롱" />
              </div>
            )}
            {locale.startsWith("ja") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "일본어 이름", en: "Japanese Name", ja: "日本語名", zh: "日语名" })}
                </label>
                <Input value={form.name_ja} onChange={(e) => setForm({ ...form, name_ja: e.target.value })} placeholder="ドロロン" />
              </div>
            )}
            {locale.startsWith("zh") && (
              <div className="mb-3">
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {t({ ko: "중국어 이름", en: "Chinese Name", ja: "中国語名", zh: "中文名" })}
                </label>
                <Input value={form.name_zh} onChange={(e) => setForm({ ...form, name_zh: e.target.value })} placeholder="多罗隆" />
              </div>
            )}

            {/* 소속 부서 + 직급 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("소속 부서", "Department")}
                </label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 border text-sm outline-none transition-colors"
                  style={selectStyle}
                >
                  <option value="">{tr("— 미배정 —", "— Unassigned —")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {localeName(locale, d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("직급", "Role")}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {ROLES.map((r) => {
                    const active = form.role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setForm({ ...form, role: r })}
                        className={`py-1.5 text-xs font-mono font-medium border transition-all ${active ? ROLE_BADGE[r] : ""}`}
                        style={{
                          borderRadius: 6,
                          ...(!active ? { borderColor: "var(--th-input-border)", color: "var(--th-text-muted)" } : {}),
                        }}
                      >
                        {isKo ? ROLE_LABEL[r].ko : ROLE_LABEL[r].en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── 고급 설정 ── */}
          <div>
            <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span style={sectionLabel}>ADVANCED</span>
            </div>

            {/* CLI Provider */}
            <div className="mb-4">
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
                        borderRadius: 6,
                        ...(active
                          ? { background: "var(--th-accent-glow)", color: "var(--th-accent)", borderColor: "var(--th-border-accent)" }
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
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("캐릭터 페르소나", "Character Persona")}
                </label>
                {form.name && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={generatingPersona || !form.name.trim()}
                    onClick={handleGeneratePersona}
                    style={{ borderColor: "var(--th-border-accent)", background: "var(--th-accent-glow)", color: "var(--th-accent)" }}
                  >
                    {generatingPersona
                      ? tr("생성 중...", "Generating...")
                      : form.personality
                        ? tr("AI 재생성", "AI Regenerate")
                        : tr("AI 자동생성", "AI Generate")}
                  </Button>
                )}
              </div>
              <Textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                rows={4}
                placeholder={isKo
                  ? "예: 나는 제갈량, 천하삼분지계의 전략가다. 항상 세 수 앞을 내다보고, '상중하 세 가지 전략'을 제시하는 것이 습관이다. 고사성어와 역사적 비유로 논점을 풀어내고, 은유적이지만 결론은 명쾌하다..."
                  : "e.g. I am Ada Lovelace, the world's first programmer. I approach problems by grasping the underlying structure first. I speak with Victorian formality, combining technical rigor with poetic expression..."}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "말투, 사고방식, 입버릇, 습관 등을 구체적으로 작성하면 AI가 그 인물처럼 행동합니다.",
                  "Define speech patterns, thinking style, catchphrases, and habits for the AI to embody this character.",
                )}
              </p>
            </div>

            {/* Famous Persona */}
            <div style={{ borderTop: "1px solid var(--th-border)" }}>
              <button
                type="button"
                onClick={() => setShowPersonaCatalog((v) => !v)}
                className="flex w-full items-center justify-between py-2"
                style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.5rem" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {tr("유명인 페르소나", "Famous Persona")}
                  </span>
                  {form.persona_id && (() => {
                    const p = getPersonaById(form.persona_id);
                    return p ? (
                      <span className="font-mono text-[9px] font-semibold uppercase" style={{ color: p.color, border: `1px solid ${p.color}40`, borderRadius: 6, padding: "0 4px", background: `${p.color}12` }}>
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
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {tr("취소", "Cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="flex-1"
        >
          {saving
            ? tr("처리 중...", "Saving...")
            : isEdit
              ? tr("변경사항 저장", "Save Changes")
              : tr("채용 확정", "Confirm Hire")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
