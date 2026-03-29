/**
 * Sidebar widget — replaces Sidebar.tsx component.
 * Displays project, agents, tasks, pipeline, cost.
 */
import blessed from "neo-blessed";
import type { SidebarData } from "../services/SidebarService.js";

const TASK_ICON: Record<string, string> = {
  done: "[v]",
  in_progress: "[>]",
  planned: "[ ]",
  failed: "[!]",
  review: "[?]",
};

const AGENT_INDICATOR: Record<string, string> = {
  working: "*",
  running: "*",
  idle: "o",
  break: "-",
  offline: "o",
};

const PIPELINE_STAGES = [
  "Meeting",
  "Planning",
  "Assigning",
  "Executing",
  "Review",
];

function formatTokens(t: number): string {
  return t >= 1000 ? `${Math.round(t / 1000)}k` : `${t}`;
}

export class SidebarWidget {
  element: blessed.Widgets.BoxElement;

  constructor(options: blessed.Widgets.BoxOptions) {
    this.element = blessed.box({
      ...options,
      tags: true,
      border: { type: "line" },
      style: {
        border: { fg: "gray" },
        ...((options.style as Record<string, unknown>) ?? {}),
      },
      scrollable: true,
      mouse: true,
      label: " Info ",
    });
  }

  update(data: SidebarData): void {
    const lines: string[] = [];

    // Project
    lines.push("{cyan-fg}{bold}Project{/bold}{/cyan-fg}");
    lines.push(`  ${data.project.name ?? "(none)"}`);
    if (data.project.path) {
      const p = data.project.path;
      lines.push(
        `  {gray-fg}${p.length > 28 ? "..." + p.slice(-25) : p}{/gray-fg}`,
      );
    }
    if (data.project.branch) {
      lines.push(`  {gray-fg}${data.project.branch}{/gray-fg}`);
    }
    lines.push("");

    // Agents
    lines.push("{yellow-fg}{bold}Agents{/bold}{/yellow-fg}");
    if (data.agents.length === 0) {
      lines.push("  {gray-fg}(none){/gray-fg}");
    } else {
      for (const a of data.agents) {
        const cliReady =
          !!a.cli_provider && data.readyCli.has(a.cli_provider);
        const hasLlm = !!a.api_model || cliReady;
        const label =
          a.api_model ?? (cliReady ? a.cli_provider : null) ?? null;
        const model = label
          ? label.length > 20
            ? label.slice(0, 19) + "~"
            : label
          : null;
        const statusColor =
          a.status === "working" || a.status === "running" ? "green" : "gray";
        const dot = AGENT_INDICATOR[a.status] ?? "o";
        const llmColor = hasLlm ? "green" : "red";
        const name =
          a.name.length > 18 ? a.name.slice(0, 17) + "~" : a.name;
        lines.push(
          `  {${statusColor}-fg}${dot}{/${statusColor}-fg} ${name} {${llmColor}-fg}*{/${llmColor}-fg}`,
        );
        if (model) {
          lines.push(`    {gray-fg}${model}{/gray-fg}`);
        }
      }
    }
    lines.push("");

    // Tasks
    lines.push("{blue-fg}{bold}Tasks{/bold}{/blue-fg}");
    if (data.tasks.length === 0) {
      lines.push("  {gray-fg}(none){/gray-fg}");
    } else {
      const shown = data.tasks.slice(0, 8);
      for (const t of shown) {
        const icon = TASK_ICON[t.status] ?? "[ ]";
        const color =
          t.status === "done"
            ? "green"
            : t.status === "in_progress"
              ? "yellow"
              : t.status === "failed"
                ? "red"
                : "gray";
        const label =
          t.title.length > 24 ? t.title.slice(0, 23) + "~" : t.title;
        lines.push(`  {${color}-fg}${icon}{/${color}-fg} ${label}`);
      }
      if (data.tasks.length > 8) {
        lines.push(`  {gray-fg}+${data.tasks.length - 8} more{/gray-fg}`);
      }
    }
    lines.push("");

    // Pipeline
    if (data.pipelineStage) {
      const currentIdx = PIPELINE_STAGES.findIndex(
        (s) => s.toLowerCase() === data.pipelineStage?.toLowerCase(),
      );
      lines.push("{magenta-fg}{bold}Pipeline{/bold}{/magenta-fg}");
      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        const stage = PIPELINE_STAGES[i];
        const isCurrent = i === currentIdx;
        const isDone = i < currentIdx;
        const prefix = isCurrent ? " >" : "  ";
        const suffix = isDone ? " v" : "";
        const color = isCurrent ? "cyan" : isDone ? "green" : "gray";
        lines.push(`{${color}-fg}${prefix}${stage}${suffix}{/${color}-fg}`);
      }
      lines.push("");
    }

    // Cost
    lines.push("{gray-fg}{bold}Cost{/bold}{/gray-fg}");
    lines.push(
      `  {gray-fg}${formatTokens(data.tokens)} tok  $${data.cost.toFixed(2)}{/gray-fg}`,
    );

    this.element.setContent(lines.join("\n"));
  }
}
