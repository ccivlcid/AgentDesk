import { lazy, Suspense, useEffect } from "react";
import AppWindow from "./AppWindow";
import { useUiStore } from "../../store/uiStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import * as api from "../../api";
import { useI18n } from "../../i18n";

const SettingsPanel = lazy(() => import("../SettingsPanel"));

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );
}

interface SettingsWindowProps {
  onSaveSettings: (settings: import("../../types").CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  oauthResult: import("../../app/types").OAuthCallbackResult | null;
  onOauthResultClear: () => void;
}

export default function SettingsWindow({
  onSaveSettings,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
}: SettingsWindowProps) {
  const { settings, settingsInitialTab } = useUiStore();
  const { cliStatus, setCliStatus } = useTaskStore();
  const { agents } = useAgentStore();
  const { t } = useI18n();

  useEffect(() => {
    if (!cliStatus) {
      api.getCliStatus(true).then(setCliStatus).catch(console.error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppWindow
      windowType="settings"
      title={t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" })}
      emoji="⚙"
      defaultWidth={820}
      defaultHeight={600}
    >
      <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Suspense fallback={<Loading />}>
          <SettingsPanel
            settings={settings}
            cliStatus={cliStatus}
            onSave={onSaveSettings}
            onRefreshCli={onRefreshCli}
            oauthResult={oauthResult}
            onOauthResultClear={onOauthResultClear}
            managerAgents={agents}
            initialTab={settingsInitialTab}
          />
        </Suspense>
      </div>
    </AppWindow>
  );
}
