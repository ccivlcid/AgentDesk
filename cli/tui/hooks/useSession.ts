import { useState, useEffect, useCallback } from "react";
import { api, checkServer } from "../../lib/api.js";

interface SessionState {
  id: string | null;
  projectId: string | null;
  projectName: string | null;
  mode: "plan" | "build" | "yolo";
  agentCount: number;
  needsSetup: boolean;
  setProjectId: (id: string | null) => void;
  setSessionId: (id: string) => void;
}

export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, "setProjectId" | "setSessionId">>({
    id: null,
    projectId: null,
    projectName: null,
    mode: "build",
    agentCount: 0,
    needsSetup: false,
  });

  useEffect(() => {
    (async () => {
      const serverUp = await checkServer();
      if (!serverUp) return;

      // Create session
      const session = await api.post<{ id: string }>("/api/tui/sessions", { mode: "build" });

      // Get agent count
      const agents = await api.get<{ rows: unknown[] }>("/api/agents");
      const agentCount = agents.rows?.length ?? 0;

      setState((prev) => ({
        ...prev,
        id: session.id,
        agentCount,
        needsSetup: agentCount === 0,
      }));
    })();
  }, []);

  const setProjectId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, projectId: id }));
  }, []);

  const setSessionId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, id }));
  }, []);

  return { ...state, setProjectId, setSessionId };
}
