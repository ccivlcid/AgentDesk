import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";

export default function AlertsWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="alerts"
      title={t({ ko: "알림", en: "Alerts", ja: "アラート", zh: "警报" })}
      emoji={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
      defaultWidth={520}
      defaultHeight={500}
    >
      <div style={{ padding: 24, color: "var(--th-text-secondary)", fontFamily: "var(--th-font-mono)", fontSize: 13 }}>
        {t({ ko: "알림이 없습니다", en: "No alerts", ja: "アラートなし", zh: "没有警报" })}
      </div>
    </AppWindow>
  );
}
