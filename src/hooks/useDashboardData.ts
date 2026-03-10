import { useState, useEffect } from "react";
import type { ProjectObjective, ProjectRisk, ProjectGate, ProjectOutput } from "../types";
import { objectivesApi, risksApi, gatesApi, outputsApi } from "../api/categories-dashboard";

interface DashboardDataState {
  objectives: ProjectObjective[];
  risks: ProjectRisk[];
  gates: ProjectGate[];
  outputs: ProjectOutput[];
  loading: boolean;
}

interface DashboardDataResult extends DashboardDataState {
  setObjectives: (v: ProjectObjective[]) => void;
  setRisks: (v: ProjectRisk[]) => void;
  setGates: (v: ProjectGate[]) => void;
  setOutputs: (v: ProjectOutput[]) => void;
  reload: () => void;
}

export function useDashboardData(projectId: string | null): DashboardDataResult {
  const [state, setState] = useState<DashboardDataState>({
    objectives: [],
    risks: [],
    gates: [],
    outputs: [],
    loading: false,
  });

  const load = () => {
    if (!projectId) return;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([
      objectivesApi.list(projectId),
      risksApi.list(projectId),
      gatesApi.list(projectId),
      outputsApi.list(projectId),
    ])
      .then(([objectives, risks, gates, outputs]) => {
        setState({ objectives, risks, gates, outputs, loading: false });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return {
    ...state,
    setObjectives: (v) => setState((s) => ({ ...s, objectives: v })),
    setRisks: (v) => setState((s) => ({ ...s, risks: v })),
    setGates: (v) => setState((s) => ({ ...s, gates: v })),
    setOutputs: (v) => setState((s) => ({ ...s, outputs: v })),
    reload: load,
  };
}
