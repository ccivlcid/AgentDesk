import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../lib/api.js";

interface SidebarState {
  project: { name: string | null; path: string | null; branch: string | null };
  agents: Array<{ name: string; status: string; currentTask?: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  pipelineStage: string | null;
  tokens: number;
  cost: number;
}

export interface UseSidebarReturn extends SidebarState {
  refresh: () => Promise<void>;
  setPipelineStage: (stage: string | null) => void;
  updateFromWs: (type: string, payload: unknown) => void;
}

export function useSidebar(projectId: string | null): UseSidebarReturn {
  const [state, setState] = useState<SidebarState>({
    project: { name: null, path: null, branch: null },
    agents: [],
    tasks: [],
    pipelineStage: null,
    tokens: 0,
    cost: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const refresh = useCallback(async () => {
    try {
      const agentData = await api.get<{ rows: Array<{ name: string; status: string }> }>("/api/agents");

      let project: SidebarState["project"] = { name: null, path: null, branch: null };
      const currentProjectId = projectIdRef.current;
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
            rows: Array<{ id: string; title: string; status: string }>;
          }>(`/api/tasks?project_id=${currentProjectId}`);
          tasks = taskData.rows ?? [];
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

      setState((prev) => ({
        ...prev,
        project,
        agents: agentData.rows ?? [],
        tasks,
        tokens,
        cost,
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
