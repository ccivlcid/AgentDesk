const BASE = "";

export type HeartbeatCheckItem =
  | "stale_tasks"
  | "blocked_tasks"
  | "consecutive_failures"
  | "pending_decisions";

export interface HeartbeatConfig {
  agent_id: string;
  enabled: number;
  interval_minutes: number;
  check_items_json: string;
  agent_name: string;
  agent_name_ko: string;
  agent_avatar: string;
  created_at?: number;
  updated_at?: number;
}

export interface HeartbeatFinding {
  check: HeartbeatCheckItem;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

export interface HeartbeatLog {
  id: number;
  agent_id: string;
  project_id: string | null;
  status: "ok" | "alert" | "error";
  summary: string | null;
  findings_json: string | null;
  created_at: number;
  agent_name?: string;
  agent_name_ko?: string;
  agent_avatar?: string;
}

export interface HeartbeatLogStats {
  total: number;
  ok_count: number;
  alert_count: number;
  error_count: number;
  first_heartbeat: number | null;
  last_heartbeat: number | null;
}

export interface HeartbeatCheckItemMeta {
  id: HeartbeatCheckItem;
  label: string;
  label_ko: string;
  description: string;
}

export async function getHeartbeatConfigs(): Promise<HeartbeatConfig[]> {
  const res = await fetch(`${BASE}/api/heartbeat/configs`);
  const data = await res.json();
  return data.configs ?? [];
}

export async function getHeartbeatConfig(agentId: string): Promise<HeartbeatConfig | null> {
  const res = await fetch(`${BASE}/api/heartbeat/configs/${agentId}`);
  const data = await res.json();
  return data.config ?? null;
}

export async function updateHeartbeatConfig(
  agentId: string,
  config: {
    enabled?: boolean;
    interval_minutes?: number;
    check_items?: HeartbeatCheckItem[];
  },
): Promise<void> {
  await fetch(`${BASE}/api/heartbeat/configs/${agentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function deleteHeartbeatConfig(agentId: string): Promise<void> {
  await fetch(`${BASE}/api/heartbeat/configs/${agentId}`, { method: "DELETE" });
}

export async function getHeartbeatLogs(
  opts?: { limit?: number; status?: string },
): Promise<HeartbeatLog[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.status) params.set("status", opts.status);
  const q = params.toString();
  const res = await fetch(`${BASE}/api/heartbeat/logs${q ? `?${q}` : ""}`);
  const data = await res.json();
  return data.logs ?? [];
}

export async function deleteHeartbeatLog(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/heartbeat/logs/record/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    const data = (() => {
      try {
        return JSON.parse(text) as { error?: string };
      } catch {
        return {};
      }
    })();
    // 404 + log_not_found: 이미 삭제됨 → 성공으로 처리 (idempotent)
    if (res.status === 404 && data?.error === "log_not_found") return;
    const msg =
      res.status === 404 && !data?.error
        ? "API 경로를 찾을 수 없습니다 (404). 서버를 재시작한 뒤 다시 시도하세요."
        : data?.error ?? "delete_failed";
    throw new Error(msg);
  }
}

export async function deleteAllHeartbeatLogs(): Promise<{ deleted: number }> {
  const res = await fetch(`${BASE}/api/heartbeat/logs`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    const msg =
      res.status === 404
        ? "API 경로를 찾을 수 없습니다 (404). 서버가 실행 중인지, 프록시 설정을 확인하세요."
        : data?.error ?? "delete_failed";
    throw new Error(msg);
  }
  const data = await res.json();
  return { deleted: (data as { deleted?: number })?.deleted ?? 0 };
}

export async function getAgentHeartbeatLogs(
  agentId: string,
  limit = 50,
): Promise<{ logs: HeartbeatLog[]; stats: HeartbeatLogStats | null }> {
  const res = await fetch(`${BASE}/api/heartbeat/logs/${agentId}?limit=${limit}`);
  const data = await res.json();
  return { logs: data.logs ?? [], stats: data.stats ?? null };
}

export async function triggerHeartbeat(
  agentId: string,
): Promise<{ findings: HeartbeatFinding[]; status: "ok" | "alert" }> {
  const res = await fetch(`${BASE}/api/heartbeat/trigger/${agentId}`, { method: "POST" });
  const data = await res.json();
  return { findings: data.findings ?? [], status: data.status ?? "ok" };
}

export async function getHeartbeatCheckItems(): Promise<HeartbeatCheckItemMeta[]> {
  const res = await fetch(`${BASE}/api/heartbeat/check-items`);
  const data = await res.json();
  return data.items ?? [];
}
