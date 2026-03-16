import { lazy, Suspense, useState } from "react";
import { useI18n } from "../../i18n";
import LlmGuideModal from "./LlmGuideModal";

const BackendsPanel = lazy(() => import("./BackendsPanel"));
const ModelsPanel = lazy(() => import("./ModelsPanel"));
const MetricsPanel = lazy(() => import("./MetricsPanel"));
const AdvancedSettingsPanel = lazy(() => import("./AdvancedSettingsPanel"));

type SubTab = "backends" | "models" | "monitor" | "settings";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 0" }}>
      {label}
    </div>
  );
}

export default function LocalLlmSettingsTab() {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>("backends");
  const [showGuide, setShowGuide] = useState(false);

  const SUBTABS: Array<{ key: SubTab; label: string; sub: string }> = [
    {
      key: "backends",
      label: t({ ko: "실행 앱",  en: "Runtime",    ja: "実行アプリ",  zh: "运行环境" }),
      sub:   t({ ko: "Ollama · LM Studio", en: "Ollama · LM Studio", ja: "Ollama · LM Studio", zh: "Ollama · LM Studio" }),
    },
    {
      key: "models",
      label: t({ ko: "AI 모델",  en: "AI Models",  ja: "AIモデル",    zh: "AI模型" }),
      sub:   t({ ko: "다운로드 · 관리", en: "Download · Manage", ja: "ダウンロード · 管理", zh: "下载 · 管理" }),
    },
    {
      key: "monitor",
      label: t({ ko: "모니터", en: "Monitor",  ja: "モニター", zh: "监控" }),
      sub:   t({ ko: "사용량 · 상태", en: "Usage · Status", ja: "使用量 · 状態", zh: "用量 · 状态" }),
    },
    {
      key: "settings",
      label: t({ ko: "설정",   en: "Settings", ja: "設定",    zh: "设置" }),
      sub:   t({ ko: "고급 옵션", en: "Advanced", ja: "詳細設定", zh: "高级选项" }),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {showGuide && <LlmGuideModal onClose={() => setShowGuide(false)} />}

      {/* Header */}
      <div style={{ ...mono, marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--th-text-muted)", marginBottom: 2 }}>
            {t({ ko: "// 로컬 LLM 관리자", en: "// LOCAL LLM MANAGER", ja: "// ローカルLLMマネージャー", zh: "// 本地LLM管理器" })}
          </div>
          <div style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
            {t({ ko: "로컬 AI 모델을 설치하고 관리합니다. API 비용 없이 추론을 실행하세요.", en: "Install and manage local AI models. Run inference without API costs.", ja: "ローカルAIモデルをインストール・管理します。APIコストなしで推論を実行できます。", zh: "安装并管理本地AI模型。无需API费用即可运行推理。" })}
          </div>
        </div>

        {/* Guide button */}
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          title={t({ ko: "설정 & 실행 가이드", en: "Setup & Run Guide" })}
          style={{
            ...mono,
            flexShrink: 0,
            marginLeft: 12,
            width: 26, height: 26,
            border: "1px solid var(--th-border)",
            borderRadius: "50%",
            background: "transparent",
            color: "var(--th-text-muted)",
            fontSize: 11, fontWeight: 700,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--th-accent)";
            (e.currentTarget as HTMLElement).style.color = "var(--th-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--th-text-muted)";
          }}
        >
          ?
        </button>
      </div>

      {/* Sub-tab bar */}
      <div style={{
        display: "flex", gap: 2,
        borderBottom: "1px solid var(--th-border)",
        marginBottom: 16,
      }}>
        {SUBTABS.map((tab) => {
          const active = subTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key)}
              style={{
                ...mono,
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                gap: 1,
                padding: "6px 14px 7px",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--th-accent)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              <span style={{
                fontSize: 10, letterSpacing: "0.06em", fontWeight: active ? 700 : 500,
                color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
              }}>
                {tab.label}
              </span>
              <span style={{
                fontSize: 9, letterSpacing: "0.03em",
                color: active ? "var(--th-accent-muted, var(--th-text-muted))" : "var(--th-text-muted)",
                opacity: active ? 0.85 : 0.65,
              }}>
                {tab.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        <Suspense fallback={<Spinner label={t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })} />}>
          {subTab === "backends" && <BackendsPanel />}
          {subTab === "models"   && <ModelsPanel />}
          {subTab === "monitor"  && <MetricsPanel />}
          {subTab === "settings" && <AdvancedSettingsPanel />}
        </Suspense>
      </div>
    </div>
  );
}
