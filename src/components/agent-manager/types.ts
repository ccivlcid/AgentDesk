import type { Agent, AgentRole, CliProvider, Department } from "../../types";
import type { KbSourceRef } from "../../api/synapse";

export type Translator = (ko: string, en: string, ja?: string, zh?: string) => string;

export interface AgentManagerProps {
  agents: Agent[];
  departments: Department[];
  onAgentsChange: () => void;
  projectAgentIds?: Set<string>;
  /** 값이 바뀔 때마다 채용(신규 생성) 모달을 즉시 엽니다 */
  createTrigger?: number;
}

export interface FormData {
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  department_id: string;
  role: AgentRole;
  cli_provider: CliProvider;
  api_provider_id: string | null;
  api_model: string | null;
  avatar_emoji: string;
  avatar_url?: string | null;
  pendingAvatarDataUrl?: string | null;
  sprite_number: number | null;
  personality: string;
  persona_id?: string;
  kb_default_sources?: KbSourceRef[];
  enable_planning_phase?: number;
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
