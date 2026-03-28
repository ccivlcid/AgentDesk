/**
 * agentdesk add-tasks — add tasks to an existing project
 */
import chalk from "chalk";
import { api, checkServer } from "../lib/api.js";
import { error, dim, serverDownMessage } from "../lib/ui.js";
import { isValidId } from "../lib/validate.js";

interface AddTasksOptions {
  project: string;
  directive: string;
}

export async function addTasksCommand(opts: AddTasksOptions): Promise<void> {
  if (!(await checkServer())) {
    console.log(serverDownMessage());
    process.exit(1);
  }

  if (!opts.project || !opts.directive) {
    console.log(error("--project and --directive are required."));
    process.exit(1);
  }

  if (!isValidId(opts.project)) {
    console.log(error("Invalid project ID format."));
    process.exit(1);
  }

  console.log(chalk.bold("\nAdding tasks..."));
  console.log(`  Project:   ${opts.project.slice(0, 8)}`);
  console.log(`  Directive: ${opts.directive}`);
  console.log("");

  await api.post(`/api/projects/${opts.project}/add-tasks`, {
    additional_directive: opts.directive,
  });

  console.log(chalk.green("Tasks added. PM will create and assign tasks."));
  console.log(dim(`Monitor with: agentdesk logs -f --project ${opts.project.slice(0, 8)}`));
}
