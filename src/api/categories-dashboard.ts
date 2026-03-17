import type { Category, Persona, ProjectGate, ProjectObjective, ProjectOutput, ProjectRisk } from "../types";

const BASE = "/api";

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const data = await apiFetch<{ categories: Category[] }>(`${BASE}/categories`);
  return data.categories;
}

export async function createCategory(payload: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(`${BASE}/categories`, json("POST", payload));
}

export async function updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(`${BASE}/categories/${id}`, json("PATCH", payload));
}

export async function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/categories/${id}`, { method: "DELETE" });
}

export async function cloneCategory(id: string, name?: string): Promise<Category> {
  return apiFetch<Category>(`${BASE}/categories/${id}/clone`, json("POST", { name }));
}

export async function fetchCategoryVersions(id: string): Promise<unknown[]> {
  const data = await apiFetch<{ versions: unknown[] }>(`${BASE}/categories/${id}/versions`);
  return data.versions;
}

// ── Project Dashboard 4분면 ─────────────────────────────────────────────────

function makeQuadrantApi<T>(resource: string) {
  return {
    list: async (projectId: string): Promise<T[]> => {
      const data = await apiFetch<Record<string, T[]>>(`${BASE}/projects/${projectId}/${resource}`);
      return data[resource] ?? [];
    },
    create: (projectId: string, payload: Partial<T>): Promise<T> =>
      apiFetch<T>(`${BASE}/projects/${projectId}/${resource}`, json("POST", payload)),
    update: (projectId: string, itemId: string, payload: Partial<T>): Promise<T> =>
      apiFetch<T>(`${BASE}/projects/${projectId}/${resource}/${itemId}`, json("PATCH", payload)),
    delete: (projectId: string, itemId: string): Promise<void> =>
      apiFetch<void>(`${BASE}/projects/${projectId}/${resource}/${itemId}`, { method: "DELETE" }),
  };
}

export const objectivesApi = makeQuadrantApi<ProjectObjective>("objectives");
export const risksApi = makeQuadrantApi<ProjectRisk>("risks");
export const gatesApi = makeQuadrantApi<ProjectGate>("gates");
export const outputsApi = makeQuadrantApi<ProjectOutput>("outputs");

// ── Project Agents (팀원 직접 선택) ────────────────────────────────────────

export async function fetchProjectAgents(projectId: string): Promise<{ id: string }[]> {
  const data = await apiFetch<{ agents: { id: string }[] }>(`${BASE}/projects/${projectId}/agents`);
  return data.agents;
}

export async function addProjectAgent(projectId: string, agentId: string): Promise<void> {
  await apiFetch<void>(`${BASE}/projects/${projectId}/agents`, json("POST", { agent_id: agentId }));
}

export async function removeProjectAgent(projectId: string, agentId: string): Promise<void> {
  await apiFetch<void>(`${BASE}/projects/${projectId}/agents/${agentId}`, { method: "DELETE" });
}

// ── Output suggestions (Phase 3-6) ──────────────────────────────────────────

export async function fetchOutputSuggestions(
  type?: string,
  excludeProjectId?: string,
): Promise<Array<ProjectOutput & { project_name: string }>> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (excludeProjectId) params.set("exclude_project_id", excludeProjectId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch<{ suggestions: Array<ProjectOutput & { project_name: string }> }>(
    `${BASE}/outputs/suggestions${qs}`,
  );
  return data.suggestions;
}

// ── Personas ────────────────────────────────────────────────────────────────

export async function fetchPersonas(): Promise<Persona[]> {
  const data = await apiFetch<{ personas: Persona[] }>(`${BASE}/personas`);
  return data.personas;
}
