import type { CliProvider } from "../../types";
import type { LocalSettings, SetLocalSettings, TFunction } from "./types";
import FormField from "../ui/FormField";
import { Input } from "../ui/Input";
import Button from "../ui/Button";

interface GeneralSettingsTabProps {
  t: TFunction;
  form: LocalSettings;
  setForm: SetLocalSettings;
  saved: boolean;
  onSave: () => void;
}

const mono = "var(--th-font-mono)";

export default function GeneralSettingsTab({ t, form, setForm, saved, onSave }: GeneralSettingsTabProps) {
  const lightInputStyle: React.CSSProperties = { 
    borderRadius: 14, 
    padding: "12px 16px", 
    background: "#F9FAFB", 
    border: "1px solid #E5E7EB",
    color: "#111827",
    fontSize: "13px",
    transition: "all 0.2s"
  };

  return (
    <div className="space-y-12">
      <section>
        {/* section header */}
        <div className="flex items-center gap-3 mb-8">
          <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151" }}>
            {t({ ko: "시스템 기본 설정", en: "General System Configuration", ja: "基本システム設定", zh: "基本系统设置" })}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2">
            <FormField
              label={t({ ko: "클라이언트 이름", en: "client name", ja: "client name", zh: "client name" })}
              hint={t({
                ko: "애플리케이션 전체에서 사용될 클라이언트 식별 이름입니다.",
                en: "Global display name for this client instance.",
                ja: "このクライアントインスタンスのグローバル表示名です。",
                zh: "此客户端实例的全局显示名称。",
              })}
            >
              <Input
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="AgentDesk"
                style={lightInputStyle}
              />
            </FormField>
          </div>

          <FormField
            label={t({ ko: "기본 CLI 제공자", en: "default cli provider", ja: "default cli provider", zh: "default cli provider" })}
          >
            <select
              value={form.defaultProvider}
              onChange={(e) => setForm({ ...form, defaultProvider: e.target.value as CliProvider })}
              style={lightInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              <option value="claude">Claude Code</option>
              <option value="codex">Codex CLI</option>
              <option value="gemini">Gemini CLI</option>
              <option value="opencode">OpenCode</option>
              <option value="cursor">Cursor</option>
            </select>
          </FormField>

          <FormField
            label={t({ ko: "표시 언어", en: "language", ja: "language", zh: "language" })}
          >
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as LocalSettings["language"] })}
              style={lightInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              <option value="ko">{t({ ko: "한국어", en: "Korean", ja: "韓国語", zh: "韩语" })}</option>
              <option value="en">{t({ ko: "영어", en: "English", ja: "英語", zh: "英语" })}</option>
              <option value="ja">{t({ ko: "일본어", en: "Japanese", ja: "日本語", zh: "日语" })}</option>
              <option value="zh">{t({ ko: "중국어", en: "Chinese", ja: "中国語", zh: "中文" })}</option>
            </select>
          </FormField>
        </div>
      </section>

      <div className="flex items-center justify-end gap-6 pt-8 border-t border-gray-100">
        {saved && (
          <div className="flex items-center gap-2 text-[#059669]">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontFamily: mono, fontSize: "12px", fontWeight: 800, letterSpacing: "0.05em" }}>
              {t({ ko: "변경사항 저장됨", en: "CHANGES SAVED", ja: "変更を保存しました", zh: "更改已保存" })}
            </span>
          </div>
        )}
        <Button 
          variant="primary" 
          onClick={onSave} 
          style={{ 
            minWidth: "160px", 
            padding: "12px 24px", 
            borderRadius: 16, 
            fontSize: "12px",
            fontWeight: 800,
            background: "#3B82F6",
            color: "#FFFFFF",
            boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)"
          }}
        >
          {t({ ko: "설정 업데이트 ↵", en: "UPDATE SETTINGS ↵", ja: "設定を更新 ↵", zh: "更新设置 ↵" })}
        </Button>
      </div>
    </div>
  );
}
