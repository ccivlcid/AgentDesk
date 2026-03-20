import type { SubTab } from "./constants";
import { HelpPanel } from "./HelpPanel";
import { NotionTab } from "./NotionTab";
import { ObsidianTab } from "./ObsidianTab";
import { NotebookLMTab } from "./NotebookLMTab";
import { FigmaTab } from "./FigmaTab";
import { RulesTab } from "./RulesTab";

export type { SubTab };

export interface SynapseSettingsTabProps {
  activeTab: SubTab;
  showHelp?: boolean;
  onHideHelp?: () => void;
}

export default function SynapseSettingsTab({ activeTab, showHelp, onHideHelp }: SynapseSettingsTabProps) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "notion"     && <NotionTab />}
        {activeTab === "obsidian"   && <ObsidianTab />}
        {activeTab === "notebooklm" && <NotebookLMTab />}
        {activeTab === "figma"      && <FigmaTab />}
        {activeTab === "rules"      && <RulesTab />}
      </div>

      {showHelp && <HelpPanel tab={activeTab} onClose={() => onHideHelp?.()} />}
    </div>
  );
}
