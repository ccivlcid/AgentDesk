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
