import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useUiStore } from "../../store/uiStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";

const SettingsPanel = lazy(() => import("../SettingsPanel"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      loading...
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
  const { settings } = useUiStore();
  const { cliStatus } = useTaskStore();
  const { agents } = useAgentStore();

  return (
    <AppWindow
      windowType="settings"
      title="Settings"
      emoji="⚙"
      defaultWidth={820}
      defaultHeight={600}
    >
      <div style={{ height: "100%", overflow: "hidden" }}>
        <Suspense fallback={<Loading />}>
          <SettingsPanel
            settings={settings}
            cliStatus={cliStatus}
            onSave={onSaveSettings}
            onRefreshCli={onRefreshCli}
            oauthResult={oauthResult}
            onOauthResultClear={onOauthResultClear}
            managerAgents={agents}
          />
        </Suspense>
      </div>
    </AppWindow>
  );
}
