const BASE = "";

export interface AgentUsageSummary {
  agent_id: string;
  agent_name: string;
  agent_name_ko: string;
  avatar_emoji: string;
  provider: string;
  run_count: number;
  total_duration_ms: number;
  total_log_bytes: number;
  success_count: number;
  failure_count: number;
}

export interface AgentUsageLog {
  id: number;
  agent_id: string;
  task_id: string | null;
  task_title?: string;
  provider: string;
  started_at: number;
  ended_at: number;
  exit_code: number | null;
  log_bytes: number;
  created_at: number;
}

export interface AgentUsageDaily {
  day_epoch: number;
  run_count: number;
  total_duration_ms: number;
  total_log_bytes: number;
}

export async function getAgentUsageSummary(sinceMs?: number): Promise<AgentUsageSummary[]> {
  const params = sinceMs ? `?since=${sinceMs}` : "";
  const res = await fetch(`${BASE}/api/agent-usage${params}`);
  const data = await res.json();
  return data.usage ?? [];
}

export async function getAgentUsageDetail(
  agentId: string,
  limit = 50,
): Promise<{ logs: AgentUsageLog[]; daily: AgentUsageDaily[] }> {
  const res = await fetch(`${BASE}/api/agent-usage/${agentId}?limit=${limit}`);
  const data = await res.json();
  return { logs: data.logs ?? [], daily: data.daily ?? [] };
}
