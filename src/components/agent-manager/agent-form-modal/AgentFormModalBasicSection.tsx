import { useRef } from "react";
import type { Department } from "../../../types";
import { localeName, useI18n } from "../../../i18n";
import { ROLE_BADGE, ROLE_LABEL, ROLES } from "../constants";
import EmojiPicker from "../EmojiPicker";
import type { FormData } from "../types";
import { Input, useToast } from "../../ui";
import { agentFormSectionLabelStyle, agentFormSelectStyle } from "./sectionStyles";
import { fileToBase64 } from "./fileToBase64";

export function AgentFormModalBasicSection({
  tr,
  locale,
  form,
  setForm,
  departments,
}: {
  tr: (ko: string, en: string) => string;
  locale: string;
  form: FormData;
  setForm: (f: FormData) => void;
  departments: Department[];
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isKo = locale.startsWith("ko");

  return (
    <div>
      <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={agentFormSectionLabelStyle}>BASIC INFO</span>
      </div>

      <div className="flex items-start gap-4 mb-4">
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
            style={{
              background: "var(--th-bg-elevated)",
              border: "2px solid var(--th-input-border)",
              borderRadius: 8,
            }}
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

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
              {tr("영문 이름", "Name")} <span style={{ color: "var(--th-danger-text)" }}>*</span>
            </label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DORO" />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
              {tr("이모지", "Emoji")}
            </label>
            <EmojiPicker value={form.avatar_emoji} onChange={(emoji) => setForm({ ...form, avatar_emoji: emoji })} />
          </div>
        </div>
      </div>

      {locale.startsWith("ko") && (
        <div className="mb-3">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {tr("한글 이름", "Korean Name")}
          </label>
          <Input
            value={form.name_ko}
            onChange={(e) => setForm({ ...form, name_ko: e.target.value })}
            placeholder="도로롱"
          />
        </div>
      )}
      {locale.startsWith("ja") && (
        <div className="mb-3">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "일본어 이름", en: "Japanese Name", ja: "日本語名", zh: "日语名" })}
          </label>
          <Input
            value={form.name_ja}
            onChange={(e) => setForm({ ...form, name_ja: e.target.value })}
            placeholder="ドロロン"
          />
        </div>
      )}
      {locale.startsWith("zh") && (
        <div className="mb-3">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "중국어 이름", en: "Chinese Name", ja: "中国語名", zh: "中文名" })}
          </label>
          <Input
            value={form.name_zh}
            onChange={(e) => setForm({ ...form, name_zh: e.target.value })}
            placeholder="多罗隆"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {tr("소속 부서", "Department")}
          </label>
          <select
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            className="w-full px-3 py-2 border text-sm outline-none transition-colors"
            style={agentFormSelectStyle}
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
                  type="button"
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
  );
}
