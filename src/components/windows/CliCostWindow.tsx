import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import CliCostWidget from "../desktop/widgets/CliCostWidget";

export default function CliCostWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="cli-usage"
      title={t({ ko: "CLI 비용", en: "CLI Cost", ja: "CLIコスト", zh: "CLI成本" })}
      emoji="💰"
      defaultWidth={520}
      defaultHeight={460}
    >
      <CliCostWidget />
    </AppWindow>
  );
}
