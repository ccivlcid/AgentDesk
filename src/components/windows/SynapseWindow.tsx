import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import SynapseSettingsTab from "../synapse/SynapseSettingsTab";

function SynapseIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={14} height={14}>
      <circle cx="4" cy="9" r="2" />
      <circle cx="14" cy="4" r="2" />
      <circle cx="14" cy="14" r="2" />
      <line x1="6" y1="8.3" x2="12" y2="5" />
      <line x1="6" y1="9.7" x2="12" y2="13" />
    </svg>
  );
}

export default function SynapseWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="synapse"
      title={t({ ko: "Synapse — 지식 베이스", en: "Synapse — Knowledge Base", ja: "シナプス", zh: "知识库" })}
      emoji={<SynapseIcon />}
      defaultWidth={700}
      defaultHeight={580}
    >
      <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", padding: "14px 18px 0" }}>
        <SynapseSettingsTab />
      </div>
    </AppWindow>
  );
}
