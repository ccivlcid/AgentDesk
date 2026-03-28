/**
 * agentdesk agents — list registered agents
 */
import { api } from "../lib/api.js";
import { header, table, badge, dim } from "../lib/ui.js";
import type { Agent } from "../../shared/types.js";

// API response extends Agent with server-joined fields
type AgentRow = Pick<Agent, "id" | "name" | "role" | "cli_provider" | "status"> & {
  department_name?: string;
};

export async function agentsCommand(): Promise<void> {
  const data = (await api.get("/api/agents")) as { rows: AgentRow[] };
  const agents = data.rows ?? [];

  if (agents.length === 0) {
    console.log(dim("No agents registered."));
    return;
  }

  console.log(header("Agents"));

  const roleLabel = (r: string) => {
    if (r === "team_leader") return "PM";
    if (r === "senior") return "Senior";
    if (r === "junior") return "Junior";
    return r;
  };

  const rows = agents.map((a) => [
    a.name,
    roleLabel(a.role),
    a.department_name ?? "-",
    a.cli_provider ?? "api",
    a.status ? badge(a.status) : dim("idle"),
  ]);

  console.log(table(["NAME", "ROLE", "SPECIALTY", "PROVIDER", "STATUS"], rows));
}
