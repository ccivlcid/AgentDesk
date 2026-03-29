/**
 * Status bar widget — replaces StatusBar.tsx component.
 * Single-line display at the bottom of the screen.
 */
import blessed from "neo-blessed";

export interface StatusBarData {
  projectName: string | null;
  sessionMinutes: number;
  tokens: number;
  cost: number;
  activeTasks: number;
  totalTasks: number;
  agentCount: number;
  mode: "plan" | "build" | "yolo";
  leaderMode?: boolean;
  showHints?: boolean;
}

function formatTokens(t: number): string {
  return t >= 1000 ? `${Math.round(t / 1000)}k` : `${t}`;
}

export class StatusBarWidget {
  element: blessed.Widgets.BoxElement;

  constructor(options: blessed.Widgets.BoxOptions) {
    this.element = blessed.box({
      ...options,
      tags: true,
      style: {
        fg: "white",
        bg: "black",
        ...((options.style as Record<string, unknown>) ?? {}),
      },
    });
  }

  update(data: StatusBarData): void {
    const modeColor =
      data.mode === "plan" ? "blue" : data.mode === "yolo" ? "red" : "green";
    const timeStr =
      data.sessionMinutes >= 60
        ? `${Math.floor(data.sessionMinutes / 60)}h${data.sessionMinutes % 60}m`
        : `${data.sessionMinutes}m`;
    const modeCap =
      data.mode.charAt(0).toUpperCase() + data.mode.slice(1);

    let line = `{cyan-fg}{bold}[AgentDesk]{/bold}{/cyan-fg}`;
    line += ` | ${data.projectName ?? "no project"}`;
    line += ` | ${timeStr}`;
    line += ` | ${formatTokens(data.tokens)} tok`;
    line += ` | $${data.cost.toFixed(2)}`;
    line += ` | T:${data.activeTasks}/${data.totalTasks}`;
    line += ` | A:${data.agentCount}`;
    line += ` | {${modeColor}-fg}{bold}${modeCap}{/bold}{/${modeColor}-fg}`;

    if (data.leaderMode) {
      line += `\n{yellow-fg}{bold}[Ctrl+X ...] waiting for key{/bold}{/yellow-fg}`;
    } else if (data.showHints) {
      line += `\n{gray-fg}Tab: terminal  Ctrl+T: toggle term  Ctrl+X: leader  Ctrl+X ?: hints{/gray-fg}`;
    }

    this.element.setContent(line);
  }
}
