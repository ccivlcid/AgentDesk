import { useRef } from "react";
import type { Department } from "../../../types";
import { localeName, useI18n } from "../../../i18n";
import { ROLE_BADGE, ROLE_LABEL, ROLES } from "../constants";
import EmojiPicker from "../EmojiPicker";
import type { FormData } from "../types";
import { Input, useToast } from "../../ui";
import { agentFormSectionLabelStyle, agentFormSelectStyle } from "./sectionStyles";
import { fileToBase64 } from "./fileToBase64";

/** SVG icons for each role */
const ROLE_ICON: Record<string, (active: boolean) => React.ReactNode> = {
  team_leader: (active) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "var(--th-accent)" : "currentColor" }}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  senior: (active) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "currentColor" : "currentColor" }}>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  ),
  junior: (active) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "currentColor" : "currentColor" }}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

const ROLE_DESC: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  team_leader: {
    ko: "태스크 배정 및 리뷰",
    en: "Assigns & reviews tasks",
    ja: "タスク割り当てとレビュー",
    zh: "分配和审查任务",
  },
  senior: {
    ko: "독립적 작업 수행",
    en: "Works independently",
    ja: "独立して作業",
    zh: "独立工作",
  },
  junior: {
    ko: "지시에 따라 작업",
    en: "Works under guidance",
    ja: "指示に従い作業",
    zh: "在指导下工作",
  },
};

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

  return (
    <div>
      {/* ── ROLE SELECTOR (prominent, at top) ── */}
      <div className="mb-4">
        <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <span style={agentFormSectionLabelStyle}>
            {t({ ko: "역할 선택", en: "ROLE", ja: "役割", zh: "角色" })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => {
            const active = form.role === r;
            const isPm = r === "team_leader";
            return (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-mono font-medium border transition-all ${active ? ROLE_BADGE[r] : ""}`}
                style={{
                  borderRadius: 6,
                  ...(!active ? { borderColor: "var(--th-border)", color: "var(--th-text-muted)" } : {}),
                  ...(isPm && active ? { boxShadow: "0 0 0 1px var(--th-accent), 0 0 8px var(--th-amber-glow)" } : {}),
                }}
              >
                {ROLE_ICON[r](active)}
                <span>{t({ ko: ROLE_LABEL[r].ko, en: ROLE_LABEL[r].en, ja: ROLE_LABEL[r].ja, zh: ROLE_LABEL[r].zh })}</span>
                <span
                  className="text-[9px] font-normal"
                  style={{ color: active ? undefined : "var(--th-text-muted)", opacity: 0.75 }}
                >
                  {t({ ko: ROLE_DESC[r].ko, en: ROLE_DESC[r].en, ja: ROLE_DESC[r].ja, zh: ROLE_DESC[r].zh })}
                </span>
              </button>
            );
          })}
        </div>

        {/* PM banner */}
        {form.role === "team_leader" && (
          <div
            className="flex items-start gap-2 mt-3 px-3 py-2"
            style={{
              background: "var(--th-accent-bg)",
              border: "1px solid var(--th-accent-border-subtle)",
              borderRadius: 6,
              borderLeft: "3px solid var(--th-accent)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--th-accent)", flexShrink: 0, marginTop: 2 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span
              className="text-[10px] font-mono"
              style={{ color: "var(--th-text-secondary)", lineHeight: 1.5 }}
            >
              {t({
                ko: "PM 에이전트는 태스크를 배정하고 리뷰합니다. 직접 코딩하지 않습니다.",
                en: "PM agents assign and review tasks. They do not code directly.",
                ja: "PMエージェントはタスクを割り当てレビューします。直接コーディングしません。",
                zh: "PM代理分配和审查任务。不直接编码。",
              })}
            </span>
          </div>
        )}
      </div>

      {/* ── BASIC INFO ── */}
      <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={agentFormSectionLabelStyle}>
          {t({ ko: "기본 정보", en: "BASIC INFO", ja: "基本情報", zh: "基本信息" })}
        </span>
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
                showToast(t({ ko: "이미지는 5MB 이하여야 합니다.", en: "Image must be under 5 MB.", ja: "画像は5MB以下にしてください。", zh: "图片必须小于5MB。" }), "warning");
                return;
              }
              const dataUrl = await fileToBase64(file);
              setForm({ ...form, pendingAvatarDataUrl: dataUrl });
            }}
          />
          <button
            type="button"
            title={t({ ko: "프로필 이미지 업로드", en: "Upload profile image", ja: "プロフィール画像アップロード", zh: "上传头像" })}
            className="relative w-14 h-14 overflow-hidden flex items-center justify-center transition-all group"
            style={{
              background: "var(--th-bg-elevated)",
              border: "2px solid var(--th-border)",
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
              <span className="text-2xl">{form.avatar_emoji || "\u{1F916}"}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
              {t({ ko: "변경", en: "Edit", ja: "変更", zh: "更改" })}
            </span>
          </button>
          {(form.pendingAvatarDataUrl ?? form.avatar_url) && (
            <button
              type="button"
              className="text-[10px] transition-colors"
              style={{ color: "var(--th-text-muted)" }}
              onClick={() => setForm({ ...form, pendingAvatarDataUrl: null, avatar_url: null })}
            >
              {t({ ko: "제거", en: "Remove", ja: "削除", zh: "移除" })}
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
              {t({ ko: "이름", en: "Name", ja: "名前", zh: "名称" })} <span style={{ color: "var(--th-danger-text)" }}>*</span>
            </label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DORO" />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
              {t({ ko: "이모지", en: "Emoji", ja: "絵文字", zh: "表情符号" })}
            </label>
            <EmojiPicker value={form.avatar_emoji} onChange={(emoji) => setForm({ ...form, avatar_emoji: emoji })} />
          </div>
        </div>
      </div>


      <div className="mb-3">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--th-text-secondary)" }}>
          {t({ ko: "전문 분야", en: "Specialty", ja: "専門分野", zh: "专业领域" })}
        </label>
        <select
          value={form.department_id}
          onChange={(e) => setForm({ ...form, department_id: e.target.value })}
          className="w-full px-3 py-2 border text-sm outline-none transition-colors"
          style={agentFormSelectStyle}
        >
          <option value="">{t({ ko: "-- 미배정 --", en: "-- Unassigned --", ja: "-- 未配属 --", zh: "-- 未分配 --" })}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon} {localeName(locale, d)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
