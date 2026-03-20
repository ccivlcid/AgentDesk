import type { Agent, Department, SubAgent, SubTask, Task } from "../../types";

export type AgentDetailTabKey =
  | "info"
  | "tasks"
  | "alba"
  | "performance"
  | "chat"
  | "timeline";

export interface AgentDetailModalProps {
  agent: Agent;
  agents: Agent[];
  department: Department | undefined;
  departments: Department[];
  tasks: Task[];
  subAgents: SubAgent[];
  subtasks: SubTask[];
  onClose: () => void;
  onChat: (agent: Agent) => void;
  onAssignTask: (agentId: string) => void;
  onOpenTerminal?: (taskId: string) => void;
  onAgentUpdated?: () => void;
}

export type AgentDetailProps = AgentDetailModalProps;
