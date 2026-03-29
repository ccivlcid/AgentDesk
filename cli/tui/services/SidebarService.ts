/**
 * Sidebar data polling + WS-driven updates — replaces useSidebar hook.
 */
import { EventEmitter } from "events";
import { api } from "../../lib/api.js";

export interface SidebarData {
  project: { name: string | null; path: string | null; branch: string | null };
  agents: Array<{
    id: string;
    name: string;
    status: string;
    api_model?: string | null;
    cli_provider?: string | null;
    currentTask?: string;
  }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  pipelineStage: string | null;
  tokens: number;
  cost: number;
  readyCli: Set<string>;
}

const EMPTY_DATA: SidebarData = {
  project: { name: null, path: null, branch: null },
  agents: [],
  tasks: [],
  pipelineStage: null,
  tokens: 0,
  cost: 0,
  readyCli: new Set(),
};

export class SidebarService extends EventEmitter {
  data: SidebarData = { ...EMPTY_DATA, readyCli: new Set() };
  private interval: ReturnType<typeof setInterval> | null = null;
  private projectId: string | null = null;

  start(projectId: string | null): void {
    this.projectId = projectId;
    void this.refresh();
    this.interval = setInterval(() => void this.refresh(), 30_000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  setProjectId(projectId: string | null): void {
    this.projectId = projectId;
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const pid = this.projectId;

      // Agents
      const allAgentData = await api.get<{
        agents: Array<{
          id: string;
          name: string;
          status: string;
          api_model?: string | null;
          cli_provider?: string | null;
        }>;
      }>("/api/agents");
      let agents = allAgentData.agents ?? [];

      if (pid) {
        try {
          const projAgents = await api.get<{
            agents: Array<{ id: string }>;
          }>(`/api/projects/${pid}/agents`);
          const assignedIds = new Set(
            (projAgents.agents ?? []).map((a) => a.id),
          );
          if (assignedIds.size > 0) {
            agents = agents.filter((a) => assignedIds.has(a.id));
          }
        } catch {
          /* fallback: show all */
        }
      }

      // Project
      let project: SidebarData["project"] = {
        name: null,
        path: null,
        branch: null,
      };
      if (pid) {
        try {
          const p = await api.get<{ name: string; project_path: string }>(
            `/api/projects/${pid}`,
          );
          project = { name: p.name, path: p.project_path, branch: null };
        } catch {
          /* no project */
        }
      }

      // Tasks
      let tasks: Array<{ id: string; title: string; status: string }> = [];
      if (pid) {
        try {
          const taskData = await api.get<{
            tasks: Array<{ id: string; title: string; status: string }>;
          }>(`/api/tasks?project_id=${pid}`);
          tasks = taskData.tasks ?? [];
        } catch {
          /* no tasks */
        }
      }

      // Usage
      let tokens = 0;
      let cost = 0;
      try {
        const usage = await api.get<{
          total_tokens?: number;
          total_cost?: number;
        }>("/api/agent-usage");
        tokens = usage.total_tokens ?? 0;
        cost = usage.total_cost ?? 0;
      } catch {
        /* no usage */
      }

      // CLI status
      let readyCli = new Set<string>();
      try {
        const cliData = await api.get<{
          providers: Record<
            string,
            { installed: boolean; authenticated: boolean }
          >;
        }>("/api/cli-status");
        readyCli = new Set(
          Object.entries(cliData.providers ?? {})
            .filter(([, s]) => s.installed && s.authenticated)
            .map(([name]) => name),
        );
      } catch {
        /* skip */
      }

      this.data = { project, agents, tasks, tokens, cost, readyCli, pipelineStage: this.data.pipelineStage };
      this.emit("update", this.data);
    } catch {
      /* server down */
    }
  }

  /** Handle WebSocket events to update sidebar state */
  updateFromWs(type: string, payload: unknown): void {
    if (type === "kickoff_stage") {
      const p = payload as { stage?: string };
      this.data = { ...this.data, pipelineStage: p.stage ?? null };
      this.emit("update", this.data);
    }
    if (type === "task_update" || type === "agent_status") {
      void this.refresh();
    }
  }
}
