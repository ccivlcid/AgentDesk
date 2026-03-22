import { post, request } from "./core";

export interface RuntimeRun {
  id: string;
  task_id: string;
  agent_id: string;
  project_id: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  model: string | null;
  provider: string | null;
  input_tokens: number;
  output_tokens: number;
  tool_calls_count: number;
  error_message: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
}

export async function runWithRuntime(params: {
  agentId: string;
  taskId: string;
  projectId?: string | null;
  model?: string;
  maxTurns?: number;
}): Promise<{ runId: string; status: string }> {
  return post("/api/agent-runtime/run", {
    agentId: params.agentId,
    taskId: params.taskId,
    projectId: params.projectId,
    model: params.model,
    maxTurns: params.maxTurns,
  }) as Promise<{ runId: string; status: string }>;
}

export async function stopRuntimeRun(runId: string): Promise<void> {
  await post(`/api/agent-runtime/${runId}/stop`, {});
}

export async function getRuntimeRun(runId: string): Promise<RuntimeRun> {
  return request(`/api/agent-runtime/${runId}`) as Promise<RuntimeRun>;
}

export async function getTaskRuntimeRuns(taskId: string): Promise<RuntimeRun[]> {
  return request(`/api/agent-runtime/task/${taskId}`) as Promise<RuntimeRun[]>;
}

export interface RuntimeStats {
  totals: {
    total_runs: number;
    completed: number;
    failed: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tool_calls: number;
  };
  byProvider: { provider: string; runs: number; input_tokens: number; output_tokens: number }[];
  byModel: { model: string; runs: number; input_tokens: number; output_tokens: number }[];
  daily: { day: string; runs: number; tokens: number }[];
}

export async function getRuntimeStats(): Promise<RuntimeStats> {
  const res = await request("/api/agent-runtime/stats") as { ok: boolean } & RuntimeStats;
  return res;
}
