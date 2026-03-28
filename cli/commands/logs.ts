/**
 * agentdesk logs — stream real-time agent execution logs
 */
import chalk from "chalk";
import { api } from "../lib/api.js";
import { connectWs } from "../lib/ws.js";
import { dim } from "../lib/ui.js";
import type { Task } from "../../shared/types.js";
import type {
  WsTaskUpdatePayload,
  WsAgentStatusPayload,
  WsKickoffStagePayload,
  WsCliOutputPayload,
} from "../../shared/ws-events.js";

interface LogsOptions {
  project?: string;
  task?: string;
  follow?: boolean;
}

type TaskRow = Pick<Task, "id" | "title" | "status" | "assigned_agent_id" | "agent_name">;

const KIND_COLORS: Record<string, (s: string) => string> = {
  stdout: chalk.white,
  stderr: chalk.red,
  tool_call: chalk.cyan,
  tool_result: chalk.green,
  pm_oversight: chalk.magenta,
  system: chalk.yellow,
};

export async function logsCommand(opts: LogsOptions): Promise<void> {
  // If a specific task, subscribe to its output
  const taskIds: string[] = [];

  if (opts.task) {
    taskIds.push(opts.task);
  } else if (opts.project) {
    // Get all active tasks for this project
    const data = await api.get<{ rows: TaskRow[] }>(
      `/api/tasks?project_id=${opts.project}&status=in_progress`,
    );
    for (const t of data.rows ?? []) {
      taskIds.push(t.id);
    }
    if (taskIds.length === 0) {
      // Also subscribe to planned tasks (they may start soon)
      const planned = await api.get<{ rows: TaskRow[] }>(
        `/api/tasks?project_id=${opts.project}&status=planned`,
      );
      for (const t of planned.rows ?? []) {
        taskIds.push(t.id);
      }
    }
  }

  console.log(dim(`Streaming logs${taskIds.length ? ` (${taskIds.length} task(s))` : " (all)"}... Ctrl+C to stop\n`));

  // Agent name cache
  const agentNames = new Map<string, string>();

  const ws = connectWs({
    subscribeTaskIds: taskIds,
    onEvent(event) {
      const ts = event.ts ? new Date(event.ts).toLocaleTimeString() : "";
      const prefix = dim(ts);

      switch (event.type) {
        case "cli_output": {
          const p = event.payload as WsCliOutputPayload;
          const colorFn = KIND_COLORS[p.kind ?? "stdout"] ?? chalk.white;
          const agent = agentNames.get(p.taskId ?? "") ?? "";
          const label = agent ? chalk.bold(`[${agent}]`) : "";
          console.log(`${prefix} ${label} ${colorFn(p.line ?? "")}`);
          break;
        }
        case "task_update": {
          const p = event.payload as WsTaskUpdatePayload;
          if (p.agent_name && p.id) {
            agentNames.set(p.id, p.agent_name);
          }
          console.log(
            `${prefix} ${chalk.bold.blue("[TASK]")} ${p.title ?? p.id} -> ${chalk.bold(p.status ?? "?")}`,
          );

          // Auto-subscribe to newly started tasks
          if (p.status === "in_progress" && p.id && !taskIds.includes(p.id)) {
            taskIds.push(p.id);
            ws.send(JSON.stringify({ type: "subscribe_task", taskId: p.id }));
          }
          break;
        }
        case "agent_status": {
          const p = event.payload as WsAgentStatusPayload;
          console.log(
            `${prefix} ${chalk.bold.yellow("[AGENT]")} ${p.name} ${p.status}`,
          );
          break;
        }
        case "kickoff_stage": {
          const p = event.payload as WsKickoffStagePayload;
          console.log(
            `${prefix} ${chalk.bold.cyan("[STAGE]")} ${p.stage}`,
          );
          break;
        }
      }
    },
    onClose() {
      console.log(dim("\nConnection closed."));
    },
    onError(err) {
      console.error(chalk.red(`WebSocket error: ${err.message}`));
      ws.close();
      process.exit(1);
    },
  });

  process.on("SIGINT", () => {
    ws.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
