import type { UiLanguage } from "../../../i18n";
import type { HeartbeatConfig, HeartbeatLog, HeartbeatCheckItem } from "../../../api/heartbeat";
import type { ToastVariant } from "../../ui/Toast";

export interface SimpleAgent {
  id: string;
  name: string;
  name_ko?: string;
  avatar_emoji?: string;
}

export interface HeartbeatPanelProps {
  language: UiLanguage;
  agents?: SimpleAgent[];
  standalone?: boolean;
  projectAgentIds?: Set<string>;
}

export interface EditFormState {
  enabled: boolean;
  interval_minutes: number;
  check_items: HeartbeatCheckItem[];
}

export interface HeartbeatBodyProps {
  isKo: boolean;
  mono: React.CSSProperties;
  standalone: boolean;
  filterProjectOnly: boolean;
  setFilterProjectOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  projectAgentIds: Set<string> | undefined;
  visibleConfigs: HeartbeatConfig[];
  visibleLogs: HeartbeatLog[];
  alertLogs: HeartbeatLog[];
  okCount: number;
  activeCount: number;
  agentsWithoutConfig: SimpleAgent[];
  addAgentId: string;
  setAddAgentId: (v: string) => void;
  addSelectKey: string;
  adding: boolean;
  setAdding: (v: boolean) => void;
  setConfigs: React.Dispatch<React.SetStateAction<HeartbeatConfig[]>>;
  agents: SimpleAgent[];
  visibleAgents: SimpleAgent[];
  editingAgent: string | null;
  setEditingAgent: (v: string | null) => void;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  saving: boolean;
  triggering: string | null;
  removingAgentId: string | null;
  setRemovingAgentId: (v: string | null) => void;
  expandedLogId: number | null;
  setExpandedLogId: (v: number | null | ((prev: number | null) => number | null)) => void;
  deletingLogId: number | null;
  setDeletingLogId: (v: number | null) => void;
  deletingAllLogs: boolean;
  setDeletingAllLogs: (v: boolean) => void;
  guideExpanded: boolean;
  setGuideExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  configs: HeartbeatConfig[];
  refresh: () => void;
  handleEdit: (config: HeartbeatConfig) => void;
  handleSave: () => Promise<void>;
  handleTrigger: (agentId: string) => Promise<void>;
  toggleCheckItem: (item: HeartbeatCheckItem) => void;
  confirm: (options: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant?: "default" | "warning" | "info" | "danger";
  }) => Promise<boolean>;
  showToast: (message: string, variant?: ToastVariant) => void;
}
