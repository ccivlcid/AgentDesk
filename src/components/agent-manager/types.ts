import type { Agent, Department } from "../../types";

export type Translator = (ko: string, en: string, ja?: string, zh?: string) => string;

export interface AgentManagerProps {
  agents: Agent[];
  departments: Department[];
  onAgentsChange: () => void;
  projectAgentIds?: Set<string>;
}

export interface FormData {
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  department_id: string;
  role: import("../../types").AgentRole;
  cli_provider: import("../../types").CliProvider;
  api_provider_id: string | null;
  api_model: string | null;
  avatar_emoji: string;
  avatar_url?: string | null;
  pendingAvatarDataUrl?: string | null;
  sprite_number: number | null;
  personality: string;
  persona_id?: string;
}

export interface DeptForm {
  id: string;
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  icon: string;
  color: string;
  description: string;
  prompt: string;
}
