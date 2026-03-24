import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface BackendSettings {
  name: string;
  host: string;
  port: number;
  auto_start: number;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  return res.json();
}

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--th-font-mono)",
  fontSize: 11,
  padding: "5px 8px",
  borderRadius: 0,
  border: "1px solid var(--th-input-border, var(--th-border))",
  background: "var(--th-input-bg, var(--th-bg-surface))",
  color: "var(--th-text-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

const LABEL_STYLE: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--th-text-muted)",
  display: "block",
  marginBottom: 4,
};

const DEFAULTS: Record<string, Partial<BackendSettings>> = {
  ollama:   { host: "localhost", port: 11434, auto_start: 1 },
  lmstudio: { host: "localhost", port: 1234,  auto_start: 0 },
};

const BACKEND_META: Array<{ name: string; label: string; desc: { ko: string; en: string; ja: string; zh: string }; supportsAutoStart: boolean }> = [
  {
    name: "ollama",
    label: "Ollama",
    desc: {
      ko: "경량 로컬 추론 서버. AgentDesk에서 시작/중지 가능.",
      en: "Lightweight local inference server. Can be started/stopped by AgentDesk.",
      ja: "軽量ローカル推論サーバー。AgentDesk から起動/停止できます。",
      zh: "轻量级本地推理服务器，AgentDesk 可启动/停止。",
    },
    supportsAutoStart: true,
  },
  {
    name: "lmstudio",
    label: "LM Studio",
    desc: {
      ko: "GUI 데스크탑 앱. AgentDesk에서 시작/중지 불가 — 수동 실행 필요.",
      en: "GUI desktop app. Cannot be started/stopped by AgentDesk — must be run manually.",
      ja: "GUI デスクトップアプリ。AgentDesk での起動/停止は不可 — 手動で実行してください。",
      zh: "GUI 桌面应用，AgentDesk 无法启动/停止 — 需手动运行。",
    },
    supportsAutoStart: false,
  },
];

function BackendSettingsCard({
  meta,
  settings,
  onChange,
  onSave,
  saving,
  saved,
}: {
  meta: typeof BACKEND_META[number];
  settings: BackendSettings;
  onChange: (patch: Partial<BackendSettings>) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const { t } = useI18n();

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--th-border)",
      background: "var(--th-card-bg, #181818)",
      padding: "16px",
      marginBottom: 14,
    }}>
      {/* Card header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-primary)", marginBottom: 3 }}>
          {meta.label}
        </div>
        <div style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
          {t(meta.desc)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, marginBottom: 14 }}>
        {/* Host */}
        <div>
          <label style={LABEL_STYLE}>
            {t({ ko: "호스트", en: "HOST", ja: "ホスト", zh: "主机" })}
          </label>
          <input
            type="text"
            value={settings.host}
            onChange={(e) => onChange({ host: e.target.value })}
            style={INPUT_STYLE}
            placeholder="localhost"
          />
        </div>

        {/* Port */}
        <div>
          <label style={LABEL_STYLE}>
            {t({ ko: "포트", en: "PORT", ja: "ポート", zh: "端口" })}
          </label>
          <input
            type="number"
            value={settings.port}
            onChange={(e) => onChange({ port: Number(e.target.value) })}
            style={{ ...INPUT_STYLE, width: "100%" }}
            min={1}
            max={65535}
          />
        </div>
      </div>

      {/* Auto-start (Ollama only) */}
      {meta.supportsAutoStart && (
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>
            {t({ ko: "자동 시작", en: "AUTO-START", ja: "自動起動", zh: "自动启动" })}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => onChange({ auto_start: settings.auto_start === 1 ? 0 : 1 })}
              style={{
                ...mono,
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 0,
                border: settings.auto_start === 1
                  ? "1px solid var(--th-accent)"
                  : "1px solid var(--th-border)",
                background: settings.auto_start === 1
                  ? "rgba(245,158,11,0.08)"
                  : "transparent",
                color: settings.auto_start === 1 ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
              }}
            >
              {settings.auto_start === 1
                ? t({ ko: "켜짐", en: "On", ja: "オン", zh: "开启" })
                : t({ ko: "꺼짐", en: "Off", ja: "オフ", zh: "关闭" })}
            </button>
            <span style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
              {t({ ko: "AgentDesk 시작 시 자동 실행", en: "Start automatically when AgentDesk launches", ja: "AgentDesk 起動時に自動実行", zh: "AgentDesk 启动时自动运行" })}
            </span>
          </div>
        </div>
      )}

      {/* API URL preview */}
      <div style={{
        ...mono, fontSize: 10, color: "var(--th-text-muted)",
        padding: "6px 10px",
        background: "var(--th-bg-surface, #1a1a1a)",
        border: "1px solid var(--th-border)",
        marginBottom: 14,
      }}>
        {t({ ko: "API 주소:", en: "API URL:", ja: "API URL:", zh: "API 地址:" })} http://{settings.host}:{settings.port}/v1
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.05em",
          padding: "6px 16px",
          borderRadius: 0,
          border: "1px solid var(--th-accent)",
          background: saved ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
          color: "var(--th-accent)",
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? (
          t({ ko: "저장 중...", en: "SAVING...", ja: "保存中...", zh: "保存中..." })
        ) : saved ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t({ ko: "저장됨", en: "SAVED", ja: "保存済み", zh: "已保存" })}
          </span>
        ) : (
          t({ ko: "저장", en: "SAVE", ja: "保存", zh: "保存" })
        )}
      </button>
    </div>
  );
}

export default function AdvancedSettingsPanel() {
  const { t } = useI18n();

  const [settingsMap, setSettingsMap] = useState<Record<string, BackendSettings>>({
    ollama:   { name: "ollama",   ...DEFAULTS.ollama   } as BackendSettings,
    lmstudio: { name: "lmstudio", ...DEFAULTS.lmstudio } as BackendSettings,
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved,  setSaved]  = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/api/local-llm/settings");
      if (data.ok && data.backends?.length > 0) {
        const next: Record<string, BackendSettings> = { ...settingsMap };
        for (const b of data.backends as BackendSettings[]) {
          if (next[b.name]) next[b.name] = b;
        }
        setSettingsMap(next);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleChange = (name: string, patch: Partial<BackendSettings>) => {
    setSettingsMap((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };

  const handleSave = async (name: string) => {
    setSaving((p) => ({ ...p, [name]: true }));
    try {
      const s = settingsMap[name];
      await apiFetch(`/api/local-llm/settings/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: s.host,
          port: Number(s.port),
          auto_start: s.auto_start === 1,
        }),
      });
      setSaved((p) => ({ ...p, [name]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [name]: false })), 2500);
    } finally {
      setSaving((p) => ({ ...p, [name]: false }));
    }
  };

  return (
    <div>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 14 }}>
        {t({ ko: "// 백엔드 설정", en: "// BACKEND SETTINGS", ja: "// バックエンド設定", zh: "// 后端设置" })}
      </div>

      {BACKEND_META.map((meta) => (
        <BackendSettingsCard
          key={meta.name}
          meta={meta}
          settings={settingsMap[meta.name]}
          onChange={(patch) => handleChange(meta.name, patch)}
          onSave={() => handleSave(meta.name)}
          saving={!!saving[meta.name]}
          saved={!!saved[meta.name]}
        />
      ))}

      <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 4, lineHeight: 1.8 }}>
        {t({ ko: "변경 사항은 AgentDesk 재시작 후 적용됩니다.", en: "Changes take effect on next AgentDesk restart.", ja: "変更は AgentDesk の再起動後に反映されます。", zh: "更改将在 AgentDesk 重启后生效。" })}
      </div>
    </div>
  );
}
