import AppWindow from "./AppWindow";
import AgentManager from "../AgentManager";
import { useAgentStore } from "../../store/agentStore";
import { useI18n } from "../../i18n";

interface AgentManagerWindowProps {
  onAgentsChange: () => void;
}

export default function AgentManagerWindow({ onAgentsChange }: AgentManagerWindowProps) {
  const { agents, departments } = useAgentStore();
  const { t } = useI18n();

  return (
    <AppWindow
      windowType="agent-manager"
      title={t({ ko: "에이전트 설정", en: "Agent Manager", ja: "エージェント設定", zh: "代理管理" })}
      emoji="◉"
      defaultWidth={860}
      defaultHeight={600}
    >
      <div style={{ height: "100%", overflow: "auto" }}>
        <AgentManager
          agents={agents}
          departments={departments}
          onAgentsChange={onAgentsChange}
        />
      </div>
    </AppWindow>
  );
}
