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
      emoji={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>}
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
