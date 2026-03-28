/**
 * agentdesk kickoff — create project and start PM orchestration
 */
import chalk from "chalk";
import { api, checkServer } from "../lib/api.js";
import { connectWs } from "../lib/ws.js";
import { badge, dim, error, serverDownMessage } from "../lib/ui.js";
import { isValidId } from "../lib/validate.js";

interface KickoffOptions {
  name?: string;
  goal?: string;
  path?: string;
  project?: string;
  directive?: string;
  yolo?: boolean;
  watch?: boolean;
}

interface Project {
  id: string;
  name: string;
}

const STAGE_LABELS: Record<string, string> = {
  meeting: "Kickoff Meeting",
  planning: "Task Planning (LLM)",
  assigning: "Agent Assignment",
  executing: "Execution",
  done: "Complete",
};

export async function kickoffCommand(opts: KickoffOptions): Promise<void> {
  if (!(await checkServer())) {
    console.log(serverDownMessage());
    process.exit(1);
  }

  let projectId = opts.project;

  // Validate project ID format if provided
  if (projectId && !isValidId(projectId)) {
    console.log(error("Invalid project ID format."));
    process.exit(1);
  }

  // If no project ID, create a new project
  if (!projectId) {
    if (!opts.name || !opts.goal) {
      console.log(error("--name and --goal are required when creating a new project."));
      console.log(dim("  Or use --project <id> to kickoff an existing project."));
      process.exit(1);
    }

    const projectPath = opts.path ?? process.cwd();
    console.log(chalk.bold("\nCreating project..."));
    console.log(`  Name: ${opts.name}`);
    console.log(`  Goal: ${opts.goal}`);
    console.log(`  Path: ${projectPath}`);

    const result = await api.post<{ id: string }>("/api/projects", {
      name: opts.name,
      core_goal: opts.goal,
      project_path: projectPath,
      assignment_mode: "auto",
    });
    projectId = result.id;
    console.log(chalk.green(`  Created: ${projectId.slice(0, 8)}`));

    // Auto-assign agents
    console.log(dim("  Auto-assigning agents..."));
    await api.post(`/api/projects/auto-assign-agents`, {
      project_id: projectId,
    });
  }

  // Start kickoff
  console.log(chalk.bold("\nStarting kickoff..."));
  const kickoffBody: Record<string, unknown> = {};
  if (opts.directive) kickoffBody.additional_directive = opts.directive;

  await api.post(`/api/projects/${projectId}/kickoff`, kickoffBody);

  // Stream progress via WebSocket
  if (opts.watch !== false) {
    console.log(dim("Streaming progress (Ctrl+C to detach)...\n"));
    streamKickoffProgress(projectId);
  } else {
    console.log(chalk.green("Kickoff started. Use `agentdesk logs -f` to monitor."));
  }
}

function streamKickoffProgress(projectId: string): void {
  const ws = connectWs({
    onEvent(event) {
      switch (event.type) {
        case "kickoff_stage": {
          const p = event.payload as { projectId?: string; stage?: string };
          if (p.projectId !== projectId) return;
          const label = STAGE_LABELS[p.stage ?? ""] ?? p.stage;
          if (p.stage === "done") {
            console.log(chalk.green(`\n  [STAGE] ${label}`));
            console.log(chalk.green.bold("\nKickoff complete."));
            ws.close();
            return;
          }
          console.log(chalk.cyan(`\n  [STAGE] ${label}`));
          break;
        }
        case "task_update": {
          const t = event.payload as {
            projectId?: string;
            project_id?: string;
            id?: string;
            title?: string;
            status?: string;
            agent_name?: string;
          };
          const tProjectId = t.projectId ?? t.project_id;
          if (tProjectId !== projectId) return;
          console.log(
            `  ${badge(t.status ?? "?")} ${t.agent_name ?? "?"} - ${t.title ?? t.id}`,
          );
          break;
        }
        case "agent_status": {
          const a = event.payload as {
            name?: string;
            status?: string;
          };
          if (a.status === "running") {
            console.log(dim(`  [AGENT] ${a.name} started`));
          }
          break;
        }
        case "cli_output": {
          const c = event.payload as { line?: string };
          if (c.line) {
            process.stdout.write(dim(`    ${c.line}\n`));
          }
          break;
        }
      }
    },
    onClose() {
      // connection closed
    },
    onError() {
      // ignore reconnect for now
    },
  });

  // Graceful shutdown
  process.once("SIGINT", () => {
    ws.close();
    process.exit(0);
  });
}
