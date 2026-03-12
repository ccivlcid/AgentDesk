import type { CliProvider } from "../../types";
import type { LocalSettings, SetLocalSettings, TFunction } from "./types";

interface GeneralSettingsTabProps {
  t: TFunction;
  form: LocalSettings;
  setForm: SetLocalSettings;
  saved: boolean;
  onSave: () => void;
}

interface ToggleSettingCardProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  title?: string;
}

function ToggleSettingCard({ label, checked, onToggle, title }: ToggleSettingCardProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2"
      style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderRadius: 6 }}
    >
      <span className="text-xs font-mono" style={{ color: "var(--th-text-secondary)" }} title={title}>
        {label}
      </span>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={label}
        onClick={onToggle}
        className="flex-shrink-0 font-mono text-[11px] transition-colors"
        style={{
          borderRadius: 6,
          border: `1px solid ${checked ? "var(--th-accent)" : "var(--th-border)"}`,
          background: checked ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)",
          color: checked ? "var(--th-accent)" : "var(--th-text-muted)",
          padding: "2px 8px",
          minWidth: "3rem",
          textAlign: "center",
          cursor: "pointer",
        }}
        title={title}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
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
            {fieldLabel(t({ ko: "company name", en: "company name", ja: "company name", zh: "company name" }))}
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              style={inputStyle}
            />
          </div>

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

          <div>
            {fieldLabel(t({ ko: "동작 설정", en: "TOGGLES", ja: "動作設定", zh: "功能开关" }))}
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              <ToggleSettingCard
                label={t({ ko: "자동 배정", en: "AUTO ASSIGN", ja: "自動割当", zh: "自动分配" })}
                checked={form.autoAssign}
                onToggle={() => setForm({ ...form, autoAssign: !form.autoAssign })}
                title={t({
                  ko: "새 태스크를 에이전트에게 자동으로 배정합니다.",
                  en: "Automatically assign new tasks to agents.",
                  ja: "新しいタスクをエージェントに自動的に割り当てます。",
                  zh: "自动将新任务分配给代理。",
                })}
              />
              <ToggleSettingCard
                label={t({ ko: "자율 진행", en: "AUTONOMOUS", ja: "自律実行", zh: "自主推进" })}
                checked={form.yoloMode === true}
                onToggle={() => setForm({ ...form, yoloMode: !(form.yoloMode === true) })}
                title={t({
                  ko: "켜면 에이전트가 인간 확인 없이 의사결정을 자동으로 진행합니다.",
                  en: "When enabled, agents proceed through decision steps automatically without human confirmation.",
                  ja: "有効にすると、エージェントが人の確認なしに意思決定を自動的に進めます。",
                  zh: "启用后，代理无需人工确认即可自动推进决策步骤。",
                })}
              />
              <ToggleSettingCard
                label={t({ ko: "자동 업데이트", en: "AUTO UPDATE", ja: "自動更新", zh: "自动更新" })}
                checked={form.autoUpdateEnabled}
                onToggle={() => setForm({ ...form, autoUpdateEnabled: !form.autoUpdateEnabled })}
                title={t({
                  ko: "서버 전체 자동 업데이트 루프를 켜거나 끕니다.",
                  en: "Enable or disable auto-update loop for the whole server.",
                  ja: "サーバー全体の自動更新ループを有効/無効にします。",
                  zh: "启用或禁用整个服务器的自动更新循环。",
                })}
              />
              <ToggleSettingCard
                label={t({ ko: "OAuth 자동 전환", en: "OAUTH AUTO SWAP", ja: "OAuth 自動切替", zh: "OAuth 自动切换" })}
                checked={form.oauthAutoSwap !== false}
                onToggle={() => setForm({ ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) })}
                title={t({
                  ko: "실패/한도 시 다음 OAuth 계정으로 자동 전환",
                  en: "Auto-switch to next OAuth account on failures/limits",
                  ja: "失敗/上限時に次の OAuth アカウントへ自動切替",
                  zh: "失败/额度限制时自动切换到下一个 OAuth 账号",
                })}
              />
            </div>
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
            color: "#000",
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
