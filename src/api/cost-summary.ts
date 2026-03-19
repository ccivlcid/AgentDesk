const BASE = "";

export interface AgentCostSummary {
  thisMonthUsd: number;
  totalTokens: number;
  thisMonthTokens: number;
}

export interface GlobalCostSummary {
  thisMonthUsd: number;
  totalTokens: number;
  agentBreakdown: Array<{ agentId: string; name: string; thisMonthUsd: number }>;
}

export async function getAgentCostSummary(agentId: string): Promise<AgentCostSummary> {
  const res = await fetch(`${BASE}/api/agents/${agentId}/cost-summary`);
  const data = await res.json();
  return {
    thisMonthUsd: data.thisMonthUsd ?? 0,
    totalTokens: data.totalTokens ?? 0,
    thisMonthTokens: data.thisMonthTokens ?? 0,
  };
}

export async function getGlobalCostSummary(): Promise<GlobalCostSummary> {
  const res = await fetch(`${BASE}/api/cost-summary`);
  const data = await res.json();
  return {
    thisMonthUsd: data.thisMonthUsd ?? 0,
    totalTokens: data.totalTokens ?? 0,
    agentBreakdown: data.agentBreakdown ?? [],
  };
}

export interface ProjectCostSummary {
  projectId: string;
  totalUsd: number;
  totalTokens: number;
  totalTokensIn: number;
  totalTokensOut: number;
  thisMonthUsd: number;
  thisMonthTokens: number;
  agentBreakdown: Array<{ agentId: string; agentName: string; totalUsd: number; totalTokens: number; taskCount: number }>;
  packBreakdown: Array<{ packKey: string; totalUsd: number; taskCount: number }>;
}

export async function getProjectCostSummary(projectId: string): Promise<ProjectCostSummary> {
  const res = await fetch(`/api/projects/${projectId}/cost-summary`);
  if (!res.ok) throw new Error(`Failed to fetch project cost summary: ${res.status}`);
  const data = await res.json();
  return {
    projectId: data.projectId ?? projectId,
    totalUsd: data.totalUsd ?? 0,
    totalTokens: data.totalTokens ?? 0,
    totalTokensIn: data.totalTokensIn ?? 0,
    totalTokensOut: data.totalTokensOut ?? 0,
    thisMonthUsd: data.thisMonthUsd ?? 0,
    thisMonthTokens: data.thisMonthTokens ?? 0,
    agentBreakdown: data.agentBreakdown ?? [],
    packBreakdown: data.packBreakdown ?? [],
  };
}
