import type { CliProvider } from "../../types";
import type { LocalSettings, SetLocalSettings, TFunction } from "./types";

interface GeneralSettingsTabProps {
  t: TFunction;
  form: LocalSettings;
  setForm: SetLocalSettings;
  saved: boolean;
  onSave: () => void;
}


const fieldLabel = (text: string): React.ReactNode => (
  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
    // {text}
  </div>
);

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--th-font-mono)",
  borderRadius: 6,
  border: "1px solid var(--th-border)",
  background: "var(--th-bg-elevated)",
  color: "var(--th-text-primary)",
  fontSize: "12px",
  padding: "5px 8px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

export default function GeneralSettingsTab({ t, form, setForm, saved, onSave }: GeneralSettingsTabProps) {
  return (
    <>
      <div style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", borderRadius: 8, overflow: "hidden" }}>
        {/* section header */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent, #f59e0b)" }}>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--th-text-heading)" }}>
            // {t({ ko: "company info", en: "company info", ja: "company info", zh: "company info" })}
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div>
            {fieldLabel(t({ ko: "client name", en: "client name", ja: "client name", zh: "client name" }))}
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            {fieldLabel(t({ ko: "default cli provider", en: "default cli provider", ja: "default cli provider", zh: "default cli provider" }))}
            <select
              value={form.defaultProvider}
              onChange={(e) => setForm({ ...form, defaultProvider: e.target.value as CliProvider })}
              style={inputStyle}
            >
              <option value="claude">Claude Code</option>
              <option value="codex">Codex CLI</option>
              <option value="gemini">Gemini CLI</option>
              <option value="opencode">OpenCode</option>
              <option value="cursor">Cursor</option>
            </select>
          </div>

          <div>
            {fieldLabel(t({ ko: "language", en: "language", ja: "language", zh: "language" }))}
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as LocalSettings["language"] })}
              style={inputStyle}
            >
              <option value="ko">{t({ ko: "한국어", en: "Korean", ja: "韓国語", zh: "韩语" })}</option>
              <option value="en">{t({ ko: "영어", en: "English", ja: "英語", zh: "英语" })}</option>
              <option value="ja">{t({ ko: "일본어", en: "Japanese", ja: "日本語", zh: "日语" })}</option>
              <option value="zh">{t({ ko: "중국어", en: "Chinese", ja: "中国語", zh: "中文" })}</option>
            </select>
          </div>

        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-terminal-success, #22c55e)" }}>
            ✓ {t({ ko: "저장 완료", en: "saved", ja: "保存完了", zh: "已保存" })}
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: "11px",
            fontWeight: 700,
            padding: "5px 18px",
            borderRadius: 0,
            background: "var(--th-accent)",
            color: "var(--th-accent-text)",
            letterSpacing: "0.08em",
            cursor: "pointer",
            border: "none",
          }}
        >
          {t({ ko: "저장 ↵", en: "SAVE ↵", ja: "保存 ↵", zh: "保存 ↵" })}
        </button>
      </div>
    </>
  );
}
