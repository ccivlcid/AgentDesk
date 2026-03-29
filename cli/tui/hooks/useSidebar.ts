import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../lib/api.js";

interface SidebarState {
  project: { name: string | null; path: string | null; branch: string | null };
  agents: Array<{ id: string; name: string; status: string; api_model?: string | null; cli_provider?: string | null; currentTask?: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  pipelineStage: string | null;
  tokens: number;
  cost: number;
  readyCli: Set<string>; // CLI providers that are installed + authenticated
}

export interface UseSidebarReturn extends SidebarState {
  refresh: () => Promise<void>;
  setPipelineStage: (stage: string | null) => void;
  updateFromWs: (type: string, payload: unknown) => void;
  readyCli: Set<string>;
}

export function useSidebar(projectId: string | null): UseSidebarReturn {
  const [state, setState] = useState<SidebarState>({
    project: { name: null, path: null, branch: null },
    agents: [],
    tasks: [],
    pipelineStage: null,
    tokens: 0,
    cost: 0,
    readyCli: new Set(),
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const refresh = useCallback(async () => {
    try {
      const currentProjectId = projectIdRef.current;

      // Fetch all agents (with full info)
      const allAgentData = await api.get<{ agents: Array<{ id: string; name: string; status: string; api_model?: string | null; cli_provider?: string | null }> }>("/api/agents");
      let agents = allAgentData.agents ?? [];

      // If project active, filter to project-assigned agents only
      if (currentProjectId) {
        try {
          const projAgents = await api.get<{ agents: Array<{ id: string }> }>(
            `/api/projects/${currentProjectId}/agents`
          );
          const assignedIds = new Set((projAgents.agents ?? []).map((a) => a.id));
          if (assignedIds.size > 0) {
            agents = agents.filter((a) => assignedIds.has(a.id));
          }
        } catch {
          // fallback: show all agents
        }
      }

      let project: SidebarState["project"] = { name: null, path: null, branch: null };
      if (currentProjectId) {
        try {
          const p = await api.get<{ name: string; project_path: string }>(
            `/api/projects/${currentProjectId}`
          );
          project = { name: p.name, path: p.project_path, branch: null };
        } catch {
          // no project
        }
      }

      let tasks: Array<{ id: string; title: string; status: string }> = [];
      if (currentProjectId) {
        try {
          const taskData = await api.get<{
            tasks: Array<{ id: string; title: string; status: string }>;
          }>(`/api/tasks?project_id=${currentProjectId}`);
          tasks = taskData.tasks ?? [];
        } catch {
          // no tasks
        }
      }

      let tokens = 0;
      let cost = 0;
      try {
        const usage = await api.get<{ total_tokens?: number; total_cost?: number }>(
          "/api/agent-usage"
        );
        tokens = usage.total_tokens ?? 0;
        cost = usage.total_cost ?? 0;
      } catch {
        // no usage data
      }

      // CLI status — which providers are actually installed + authenticated
      let readyCli = new Set<string>();
      try {
        const cliData = await api.get<{
          providers: Record<string, { installed: boolean; authenticated: boolean }>;
        }>("/api/cli-status");
        readyCli = new Set(
          Object.entries(cliData.providers ?? {})
            .filter(([, s]) => s.installed && s.authenticated)
            .map(([name]) => name),
        );
      } catch {
        // skip
      }

      setState((prev) => ({
        ...prev,
        project,
        agents,
        tasks,
        tokens,
        cost,
        readyCli,
      }));
    } catch {
      // server down
    }
  }, []);

  useEffect(() => {
    void refresh();
    intervalRef.current = setInterval(() => void refresh(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projectId, refresh]);

  const setPipelineStage = useCallback((stage: string | null) => {
    setState((prev) => ({ ...prev, pipelineStage: stage }));
  }, []);

  const updateFromWs = useCallback(
    (type: string, payload: unknown) => {
      if (type === "kickoff_stage") {
        const p = payload as { stage?: string };
        setPipelineStage(p.stage ?? null);
      }
      if (type === "task_update" || type === "agent_status") {
        void refresh();
      }
    },
    [refresh, setPipelineStage]
  );

  return { ...state, refresh, setPipelineStage, updateFromWs };
}
