#!/usr/bin/env tsx
/**
 * AgentDesk CLI — control your AI agent team from the terminal
 */

// ── TUI mode (no args) ─────────────────────────────────────────
if (process.argv.length <= 2) {
  const { startTui } = await import("./tui/index-blessed.js");
  await startTui();
}

import { Command } from "commander";
import chalk from "chalk";
import { checkServer } from "./lib/api.js";
import { serverDownMessage } from "./lib/ui.js";

const program = new Command();

program
  .name("agentdesk")
  .description("AgentDesk — multi-LLM orchestrator CLI")
  .version("2.0.1");

// ── kickoff ────────────────────────────────────────────────────

program
  .command("kickoff")
  .description("Create a project and start PM orchestration")
  .option("-n, --name <name>", "Project name")
  .option("-g, --goal <goal>", "Project goal")
  .option("-p, --path <path>", "Project directory (defaults to cwd)")
  .option("--project <id>", "Kickoff existing project by ID")
  .option("-d, --directive <text>", "Additional directive for PM")
  .option("--yolo", "YOLO mode — PM auto-decides everything")
  .option("--no-watch", "Don't stream progress after kickoff")
  .action(async (opts) => {
    const { kickoffCommand } = await import("./commands/kickoff.js");
    await kickoffCommand(opts);
  });

// ── status ─────────────────────────────────────────────────────

program
  .command("status")
  .description("Show server, project, and task overview")
  .action(async () => {
    if (!(await checkServer())) {
      console.log(serverDownMessage());
      process.exit(1);
    }
    const { statusCommand } = await import("./commands/status.js");
    await statusCommand();
  });

// ── tasks ──────────────────────────────────────────────────────

program
  .command("tasks")
  .description("List tasks")
  .option("--project <id>", "Filter by project ID")
  .option("--status <status>", "Filter by status (planned, in_progress, done, failed)")
  .option("--agent <id>", "Filter by agent ID")
  .action(async (opts) => {
    if (!(await checkServer())) {
      console.log(serverDownMessage());
      process.exit(1);
    }
    const { tasksCommand } = await import("./commands/tasks.js");
    await tasksCommand(opts);
  });

// ── agents ─────────────────────────────────────────────────────

program
  .command("agents")
  .description("List registered agents")
  .action(async () => {
    if (!(await checkServer())) {
      console.log(serverDownMessage());
      process.exit(1);
    }
    const { agentsCommand } = await import("./commands/agents.js");
    await agentsCommand();
  });

// ── logs ───────────────────────────────────────────────────────

program
  .command("logs")
  .description("Stream real-time execution logs")
  .option("--project <id>", "Filter by project ID")
  .option("--task <id>", "Filter by task ID")
  .option("-f, --follow", "Follow mode (default: true)", true)
  .action(async (opts) => {
    if (!(await checkServer())) {
      console.log(serverDownMessage());
      process.exit(1);
    }
    const { logsCommand } = await import("./commands/logs.js");
    await logsCommand(opts);
  });

// ── add-tasks ──────────────────────────────────────────────────

program
  .command("add-tasks")
  .description("Add tasks to an existing project")
  .requiredOption("--project <id>", "Project ID")
  .requiredOption("-d, --directive <text>", "What to add")
  .action(async (opts) => {
    const { addTasksCommand } = await import("./commands/add-tasks.js");
    await addTasksCommand(opts);
  });

// ── open ───────────────────────────────────────────────────────

program
  .command("open")
  .description("Open AgentDesk GUI in browser")
  .action(async () => {
    const port = process.env.AGENTDESK_WEB_PORT ?? 8800;
    const url = `http://localhost:${port}`;

    if (!(await checkServer())) {
      console.log(serverDownMessage());
      process.exit(1);
    }

    console.log(chalk.bold(`Opening ${url} ...`));

    // Cross-platform open
    const { exec } = await import("child_process");
    const cmd =
      process.platform === "win32"
        ? `start ${url}`
        : process.platform === "darwin"
          ? `open ${url}`
          : `xdg-open ${url}`;
    exec(cmd);
  });

// ── banner ─────────────────────────────────────────────────────

program.addHelpText(
  "beforeAll",
  `
${chalk.bold.cyan("AgentDesk")} ${chalk.dim("v2.0.1")} — Multi-LLM Orchestrator CLI
`,
);

program.parse();
