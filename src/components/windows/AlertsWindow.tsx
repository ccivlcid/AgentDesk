import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import AlertsWidget from "../desktop/widgets/AlertsWidget";

export default function AlertsWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="alerts"
      title={t({ ko: "알림", en: "Alerts", ja: "アラート", zh: "警报" })}
      emoji="🔔"
      defaultWidth={520}
      defaultHeight={500}
    >
      <AlertsWidget />
    </AppWindow>
  );
}
