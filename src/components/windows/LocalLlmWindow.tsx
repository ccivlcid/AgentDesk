import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import LocalLlmWidget from "../desktop/widgets/LocalLlmWidget";

export default function LocalLlmWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="local-llm"
      title={t({ ko: "로컬 LLM", en: "Local LLM", ja: "ローカルLLM", zh: "本地LLM" })}
      emoji="🧠"
      defaultWidth={580}
      defaultHeight={500}
    >
      <LocalLlmWidget />
    </AppWindow>
  );
}
