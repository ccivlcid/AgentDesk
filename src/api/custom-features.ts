import type {
  CustomFeature,
  CustomFeatureConfig,
  CustomFeatureSource,
  CustomFeatureType,
} from "../types";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listCustomFeatures(): Promise<CustomFeature[]> {
  const j = await req<{ ok: boolean; features: CustomFeature[] }>("/api/custom-features");
  return j.features;
}

export async function getCustomFeature(id: string): Promise<CustomFeature> {
  const j = await req<{ ok: boolean; feature: CustomFeature }>(`/api/custom-features/${id}`);
  return j.feature;
}

export async function createCustomFeature(payload: {
  name: string;
  type: CustomFeatureType;
  source: CustomFeatureSource;
  template_id?: string;
  config: CustomFeatureConfig;
}): Promise<{ id: string }> {
  return req<{ ok: boolean; id: string }>("/api/custom-features", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomFeature(
  id: string,
  patch: { name?: string; config?: Partial<CustomFeatureConfig> },
): Promise<void> {
  await req(`/api/custom-features/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteCustomFeature(id: string): Promise<void> {
  await req(`/api/custom-features/${id}`, { method: "DELETE" });
}

export async function githubImport(payload: {
  url: string;
  name: string;
}): Promise<{ feature_id: string }> {
  return req<{ ok: boolean; feature_id: string }>("/api/custom-features/github-import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function githubRepoImport(payload: {
  url: string;
  name: string;
}): Promise<{ feature_id: string }> {
  return req<{ ok: boolean; feature_id: string }>("/api/custom-features/github-repo-import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function triggerAiGenerate(payload: {
  prompt: string;
  type: CustomFeatureType;
  name: string;
  config: CustomFeatureConfig;
}): Promise<{ feature_id: string }> {
  return req<{ ok: boolean; feature_id: string }>("/api/custom-features/ai-generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runDevServer(id: string): Promise<{ port: number }> {
  return req<{ ok: boolean; port: number }>(`/api/custom-features/${id}/run-dev`, { method: "POST" });
}

export async function stopDevServer(id: string): Promise<void> {
  await req(`/api/custom-features/${id}/stop-dev`, { method: "POST" });
}

export async function getDevStatus(id: string): Promise<{ running: boolean; port: number | null }> {
  return req<{ ok: boolean; running: boolean; port: number | null }>(`/api/custom-features/${id}/dev-status`);
}
