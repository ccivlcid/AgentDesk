import type { Agent, Task, Project, HookEntry } from "../../types";
import type { DeliverableItem } from "../../api/providers-reports-github";

export interface QuickActionRow {
  label: string;
  icon: string;
  bg: string;
  action: string;
}

export type PaletteItem =
  | { kind: "action"; label: string; icon: string; bg: string; action: string }
  | { kind: "agent"; agent: Agent }
  | { kind: "task"; task: Task }
  | { kind: "project"; project: Project }
  | { kind: "deliverable"; item: DeliverableItem }
  | { kind: "hook"; hook: HookEntry };

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  agents?: Agent[];
  tasks?: Task[];
  projects?: Project[];
  currentProject?: Project | null;
  onNavigate: (view: string) => void;
  onSelectProject?: (project: Project) => void;
  onOpenShortcutsGuide?: () => void;
}
