/**
 * LocalLlmWindow -- Dedicated window for Local AI management.
 * Integrated with REAL backend components and modern Bento design.
 */
import { useState, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { 
  Box,
  Cpu,
  Database,
  Settings as SettingsIcon,
  Activity as ActivityIcon
} from "lucide-react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";

// 실제 관리 패널들을 지연 로딩으로 가져옵니다.
const BackendsPanel = lazy(() => import("../local-llm/BackendsPanel"));
const ModelsPanel = lazy(() => import("../local-llm/ModelsPanel"));
const MetricsPanel = lazy(() => import("../local-llm/MetricsPanel"));
const AdvancedSettingsPanel = lazy(() => import("../local-llm/AdvancedSettingsPanel"));

function LoadingSpinner() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
      {t({ ko: "데이터 로드 중...", en: "Loading data...", ja: "読み込み中...", zh: "正在加载..." })}
    </div>
  );
}

export default function LocalLlmWindow() {
  const { t } = useI18n();
  const [activeTabId, setActiveTabId] = useState("overview");

  return (
    <AppWindow
      windowType="local-llm"
      title={t({ ko: "로컬 LLM 관제", en: "Local LLM Console", ja: "ローカルLLM", zh: "本地LLM" })}
      emoji={<Box size={14} />}
      defaultWidth={1080}
      defaultHeight={720}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      tabs={[
        {
          id: "overview",
          label: t({ ko: "실행 앱", en: "Runtime", ja: "実行アプリ", zh: "运行环境" }),
          content: (
            <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
              <div style={{ 
                background: "var(--th-glass-surface)", 
                backdropFilter: "var(--th-glass-blur)",
                border: "1px solid var(--th-glass-border-subtle)",
                borderRadius: 24,
                padding: "32px",
                boxShadow: "var(--th-glass-shadow-inactive)"
              }}>
                <Suspense fallback={<LoadingSpinner />}>
                  <BackendsPanel />
                </Suspense>
              </div>
            </div>
          ),
        },
        {
          id: "models",
          label: t({ ko: "AI 모델", en: "AI Models", ja: "AIモデル", zh: "AI模型" }),
          content: (
            <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
              <div style={{ 
                background: "var(--th-glass-surface)", 
                backdropFilter: "var(--th-glass-blur)",
                border: "1px solid var(--th-glass-border-subtle)",
                borderRadius: 24,
                padding: "32px",
                boxShadow: "var(--th-glass-shadow-inactive)"
              }}>
                <Suspense fallback={<LoadingSpinner />}>
                  <ModelsPanel />
                </Suspense>
              </div>
            </div>
          ),
        },
        {
          id: "monitor",
          label: t({ ko: "모니터", en: "Monitor", ja: "モニター", zh: "监控" }),
          content: (
            <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
              <Suspense fallback={<LoadingSpinner />}>
                <MetricsPanel />
              </Suspense>
            </div>
          ),
        },
        {
          id: "settings",
          label: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }),
          content: (
            <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
              <div style={{ 
                background: "var(--th-glass-surface)", 
                backdropFilter: "var(--th-glass-blur)",
                border: "1px solid var(--th-glass-border-subtle)",
                borderRadius: 24,
                padding: "32px",
                boxShadow: "var(--th-glass-shadow-inactive)"
              }}>
                <Suspense fallback={<LoadingSpinner />}>
                  <AdvancedSettingsPanel />
                </Suspense>
              </div>
            </div>
          ),
        }
      ]}
    />
  );
}
