import { create } from "zustand";
import type { Department, Agent, SubAgent, CompanyStats } from "../types";

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

interface StreamingMessage {
  message_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  content: string;
}

interface AgentStore {
  departments: Department[];
  agents: Agent[];
  libraryAgents: Agent[];
  subAgents: SubAgent[];
  stats: CompanyStats | null;
  selectedAgent: Agent | null;
  chatAgent: Agent | null;
  showChat: boolean;
  unreadAgentIds: Set<string>;
  streamingMessage: StreamingMessage | null;

  setDepartments: (a: SA<Department[]>) => void;
  setAgents: (a: SA<Agent[]>) => void;
  setLibraryAgents: (a: SA<Agent[]>) => void;
  setSubAgents: (a: SA<SubAgent[]>) => void;
  setStats: (a: SA<CompanyStats | null>) => void;
  setSelectedAgent: (a: SA<Agent | null>) => void;
  setChatAgent: (a: SA<Agent | null>) => void;
  setShowChat: (a: SA<boolean>) => void;
  setUnreadAgentIds: (a: SA<Set<string>>) => void;
  setStreamingMessage: (a: SA<StreamingMessage | null>) => void;
}

export const useAgentStore = create<AgentStore>()((set, get) => ({
  departments: [],
  agents: [],
  libraryAgents: [],
  subAgents: [],
  stats: null,
  selectedAgent: null,
  chatAgent: null,
  showChat: false,
  unreadAgentIds: new Set(),
  streamingMessage: null,

  setDepartments: (a) => set((s) => ({ departments: apply(s.departments, a) })),
  setAgents: (a) => set((s) => ({ agents: apply(s.agents, a) })),
  setLibraryAgents: (a) => set((s) => ({ libraryAgents: apply(s.libraryAgents, a) })),
  setSubAgents: (a) => set((s) => ({ subAgents: apply(s.subAgents, a) })),
  setStats: (a) => set((s) => ({ stats: apply(s.stats, a) })),
  setSelectedAgent: (a) => set((s) => ({ selectedAgent: apply(s.selectedAgent, a) })),
  setChatAgent: (a) => set((s) => ({ chatAgent: apply(s.chatAgent, a) })),
  setShowChat: (a) => set((s) => ({ showChat: apply(s.showChat, a) })),
  setUnreadAgentIds: (a) => set((s) => ({ unreadAgentIds: apply(s.unreadAgentIds, a) })),
  setStreamingMessage: (a) => set((s) => ({ streamingMessage: apply(s.streamingMessage, a) })),
}));
