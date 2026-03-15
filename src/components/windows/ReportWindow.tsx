import AppWindow from "./AppWindow";
import ReportHistory from "../ReportHistory";
import { useAgentStore } from "../../store/agentStore";
import { useI18n } from "../../i18n";

export default function ReportWindow() {
  const { agents, departments } = useAgentStore();
  const { language: uiLanguage } = useI18n();

  return (
    <AppWindow
      windowType="reports"
      title="Reports"
      emoji="📊"
      defaultWidth={720}
      defaultHeight={560}
    >
      <ReportHistory
        agents={agents}
        departments={departments}
        uiLanguage={uiLanguage}
      />
    </AppWindow>
  );
}
