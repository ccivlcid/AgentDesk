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
  description?: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleSettingCard({ label, description, checked, onToggle }: ToggleSettingCardProps) {
  return (
    <div
      className="flex items-start justify-between gap-3 px-3 py-2.5"
      style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderRadius: 6 }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>
          {label}
        </span>
        {description && (
          <span className="text-[10px] font-mono leading-snug" style={{ color: "var(--th-text-muted)" }}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={label}
        onClick={onToggle}
        className="flex-shrink-0 font-mono text-[11px] transition-colors mt-0.5"
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
                description={t({
                  ko: "시작 시 미인증 에이전트의 CLI 프로바이더를 인증된 기본 프로바이더로 자동 교체합니다.",
                  en: "On startup, reassigns unauthenticated agents to the default authenticated CLI provider.",
                  ja: "起動時に未認証エージェントの CLI プロバイダーを認証済みのデフォルトに自動切替します。",
                  zh: "启动时将未认证代理的 CLI 提供商自动替换为已认证的默认提供商。",
                })}
                checked={form.autoAssign}
                onToggle={() => setForm({ ...form, autoAssign: !form.autoAssign })}
              />
              <ToggleSettingCard
                label={t({ ko: "자율 진행", en: "AUTONOMOUS", ja: "自律実行", zh: "自主推进" })}
                description={t({
                  ko: "에이전트가 중간 결정을 사람 확인 없이 자동으로 처리합니다.",
                  en: "Agents auto-approve decision steps without waiting for human input.",
                  ja: "エージェントが意思決定を人の確認なしに自動処理します。",
                  zh: "代理自动处理决策步骤，无需人工确认。",
                })}
                checked={form.yoloMode === true}
                onToggle={() => setForm({ ...form, yoloMode: !(form.yoloMode === true) })}
              />
              <ToggleSettingCard
                label={t({ ko: "자동 업데이트", en: "AUTO UPDATE", ja: "自動更新", zh: "自动更新" })}
                description={t({
                  ko: "AgentDesk 서버가 새 버전을 감지하면 자동으로 업데이트합니다.",
                  en: "Server automatically updates when a new version is detected.",
                  ja: "新しいバージョンを検出するとサーバーが自動更新します。",
                  zh: "检测到新版本时服务器自动更新。",
                })}
                checked={form.autoUpdateEnabled}
                onToggle={() => setForm({ ...form, autoUpdateEnabled: !form.autoUpdateEnabled })}
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
