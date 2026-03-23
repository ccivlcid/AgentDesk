import { request, post } from "./core";

export interface AppAnalysis {
  type: string;
  language: string | null;
  framework: string | null;
  install_command: string | null;
  run_command: string | null;
  default_port: number | null;
  warnings: string[];
  summary: string;
  ai_description: string | null;
}

export async function analyzeApp(projectId: string): Promise<{ ok: boolean; analysis: AppAnalysis }> {
  return post<{ ok: boolean; analysis: AppAnalysis }>(`/api/apps/${projectId}/analyze`, {});
}

export async function getAppStatus(projectId: string): Promise<{
  ok: boolean;
  status: string;
  analysis: AppAnalysis | null;
  port: number | null;
  pid: number | null;
  url: string | null;
}> {
  return request(`/api/apps/${projectId}/status`);
}

export async function updateAppPort(projectId: string, port: number): Promise<{ ok: boolean }> {
  return request(`/api/apps/${projectId}/port`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ port }),
  });
}

export async function runApp(projectId: string, port?: number): Promise<{ ok: boolean; port: number; status: string }> {
  return post<{ ok: boolean; port: number; status: string }>(`/api/apps/${projectId}/run`, { port });
}

export interface AppLogEntry { ts: number; line: string; phase: string; }

export async function getAppLogs(projectId: string, since?: number): Promise<{ ok: boolean; logs: AppLogEntry[] }> {
  const qs = since ? `?since=${since}` : "";
  return request(`/api/apps/${projectId}/logs${qs}`);
}

export async function stopApp(projectId: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/api/apps/${projectId}/stop`, {});
}

// ── Project-level Run App (TerminalTab) ────────────────────────────────────

export async function runProjectApp(projectId: string, customCommand?: string): Promise<{
  ok: boolean;
  command: string;
  pid: number;
  summary: string;
}> {
  return post(`/api/projects/${projectId}/run-app`, { custom_command: customCommand || undefined });
}

export async function stopProjectApp(projectId: string): Promise<{ ok: boolean }> {
  return post(`/api/projects/${projectId}/stop-app`, {});
}

export async function installProjectApp(projectId: string, customCommand?: string): Promise<{
  ok: boolean;
  command: string;
}> {
  return post(`/api/projects/${projectId}/install-app`, { custom_command: customCommand || undefined });
}

export interface ProjectAppStatus {
  ok: boolean;
  running: boolean;
  pid: number | null;
  logCount: number;
  recentLogs: AppLogEntry[];
}

export async function getProjectAppStatus(projectId: string): Promise<ProjectAppStatus> {
  return request(`/api/projects/${projectId}/app-status`);
}
