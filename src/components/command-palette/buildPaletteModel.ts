import type { Agent, Task, Project, HookEntry } from "../../types";
import type { DeliverableItem } from "../../api/providers-reports-github";
import type { PaletteItem, QuickActionRow, WfTemplate } from "./types";

export interface PaletteModel {
  q: string;
  recentActions: QuickActionRow[];
  filteredActions: QuickActionRow[];
  filteredAgents: Agent[];
  filteredTasks: Task[];
  filteredProjects: Project[];
  filteredDeliverables: DeliverableItem[];
  filteredHooks: HookEntry[];
  filteredWorkflows: WfTemplate[];
  items: PaletteItem[];
}

export function buildPaletteModel(
  query: string,
  quickActions: QuickActionRow[],
  history: string[],
  agents: Agent[],
  tasks: Task[],
  projects: Project[],
  currentProject: Project | null | undefined,
  deliverables: DeliverableItem[],
  hooks: HookEntry[],
  workflows: WfTemplate[],
): PaletteModel {
  const q = query.toLowerCase().trim();

  const recentActions = !q
    ? history
        .map((h) => quickActions.find((a) => a.action === h))
        .filter((a): a is QuickActionRow => Boolean(a))
        .slice(0, 3)
    : [];

  const filteredActions = q
    ? quickActions.filter((a) => a.label.toLowerCase().includes(q) || a.action.includes(q))
    : quickActions;

  const filteredAgents = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q))
    : agents.slice(0, 5);

  const filteredTasks = q
    ? tasks.filter((t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q)).slice(0, 8)
    : tasks.filter((t) => t.status === "in_progress").slice(0, 5);

  const filteredProjects = q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.project_path?.toLowerCase().includes(q)).slice(0, 5)
    : projects.filter((p) => p.id !== currentProject?.id).slice(0, 4);

  const filteredDeliverables = q
    ? deliverables.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.agent_name?.toLowerCase().includes(q) ||
        d.project_name?.toLowerCase().includes(q),
      ).slice(0, 5)
    : [];

  const filteredHooks = q
    ? hooks.filter((h) =>
        h.title.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.command.toLowerCase().includes(q),
      ).slice(0, 5)
    : [];

  const filteredWorkflows = q
    ? workflows.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 4)
    : workflows.slice(0, 3);

  const items: PaletteItem[] = [
    ...recentActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredActions.map((a) => ({ kind: "action" as const, ...a })),
    ...filteredProjects.map((p) => ({ kind: "project" as const, project: p })),
    ...filteredAgents.map((a) => ({ kind: "agent" as const, agent: a })),
    ...filteredTasks.map((t) => ({ kind: "task" as const, task: t })),
    ...filteredDeliverables.map((d) => ({ kind: "deliverable" as const, item: d })),
    ...filteredHooks.map((h) => ({ kind: "hook" as const, hook: h })),
    ...filteredWorkflows.map((w) => ({ kind: "workflow" as const, wf: w })),
  ];

  return {
    q,
    recentActions,
    filteredActions,
    filteredAgents,
    filteredTasks,
    filteredProjects,
    filteredDeliverables,
    filteredHooks,
    filteredWorkflows,
    items,
  };
}
