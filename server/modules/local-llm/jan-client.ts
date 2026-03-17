/**
 * Jan client — OpenAI-compatible API, default port 1337.
 * Jan is a desktop GUI app. When "Local API Server" is enabled in Jan settings,
 * it exposes an OpenAI-compatible /v1 interface on port 1337.
 */

export interface JanModel {
  id: string;
  object: string;
  owned_by?: string;
}

export function createJanClient(baseUrl: string) {
  async function ping(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function listModels(): Promise<JanModel[]> {
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: JanModel[] };
      return data.data ?? [];
    } catch {
      return [];
    }
  }

  return { ping, listModels };
}

export type JanClient = ReturnType<typeof createJanClient>;
