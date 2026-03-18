import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import FlowGraphWidget from "../desktop/widgets/FlowGraphWidget";

export default function FlowGraphWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="flow-graph"
      title={t({ ko: "에이전트 그래프", en: "Agent Graph", ja: "エージェントグラフ", zh: "代理图" })}
      emoji="🕸️"
      defaultWidth={900}
      defaultHeight={620}
    >
      <FlowGraphWidget />
    </AppWindow>
  );
}
