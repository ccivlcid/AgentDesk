import AppWindow from "./AppWindow";
import AgentManager from "../AgentManager";
import { useAgentStore } from "../../store/agentStore";

interface AgentManagerWindowProps {
  onAgentsChange: () => void;
}

export default function AgentManagerWindow({ onAgentsChange }: AgentManagerWindowProps) {
  const { agents, departments } = useAgentStore();

  return (
    <AppWindow
      windowType="agent-manager"
      title="에이전트 설정"
      emoji="👤"
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
