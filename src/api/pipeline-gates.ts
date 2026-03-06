import { request, post, del } from "./core";

export interface PipelineGate {
  id: number;
  workflow_pack_key: string;
  gate_key: string;
  gate_label: string;
  gate_label_ko: string;
  gate_order: number;
  gate_type: "auto" | "manual";
  check_expression: string | null;
  sla_minutes: number | null;
  enabled: number;
}

export interface TaskGateResult {
  gate_id: number;
  gate_key: string;
  gate_label: string;
  gate_label_ko: string;
  gate_order: number;
  gate_type: "auto" | "manual";
  sla_minutes: number | null;
  status: "pending" | "passed" | "failed" | "skipped";
  evaluated_at: number | null;
  evaluated_by: string | null;
  note: string | null;
}

export interface TaskGatesResponse {
  ok: boolean;
  task_id: string;
  workflow_pack_key: string;
  gates: TaskGateResult[];
  summary: { total: number; passed: boolean; failed: boolean };
}

export async function getPipelineGates(packKey?: string): Promise<PipelineGate[]> {
  const params = new URLSearchParams();
  if (packKey) params.set("workflow_pack_key", packKey);
  const q = params.toString();
  const j = await request<{ ok: boolean; gates: PipelineGate[] }>(
    `/api/pipeline-gates${q ? `?${q}` : ""}`,
  );
  return j.gates;
}

export async function getTaskGates(taskId: string): Promise<TaskGatesResponse> {
  return request<TaskGatesResponse>(`/api/tasks/${taskId}/gates`);
}

export async function evaluateTaskGate(
  taskId: string,
  gateId: number,
  data: { status: "passed" | "failed" | "skipped"; note?: string },
): Promise<void> {
  await post(`/api/tasks/${taskId}/gates/${gateId}/evaluate`, data);
}

export async function createPipelineGate(data: {
  workflow_pack_key: string;
  gate_key: string;
  gate_label: string;
  gate_label_ko?: string;
  gate_order?: number;
  gate_type?: "auto" | "manual";
  check_expression?: string;
  sla_minutes?: number;
}): Promise<void> {
  await post("/api/pipeline-gates", data);
}

export async function deletePipelineGate(id: number): Promise<void> {
  await del(`/api/pipeline-gates/${id}`);
}
