/**
 * llama.cpp server client — OpenAI-compatible API, default port 8080.
 * llama.cpp exposes /health (native) and /v1/models (OpenAI compat).
 */

export interface LlamaCppModel {
  id: string;
  object: string;
}

export interface LlamaCppHealth {
  status: "ok" | "loading model" | "no model loaded" | string;
  slots_idle?: number;
  slots_processing?: number;
}

export function createLlamaCppClient(baseUrl: string) {
  async function ping(): Promise<boolean> {
    // Primary: /health (native llama.cpp endpoint)
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = (await res.json()) as LlamaCppHealth;
        return (
          data.status === "ok" ||
          data.status === "loading model" ||
          data.status === "no model loaded"
        );
      }
    } catch { /* ignore */ }
    // Fallback: OpenAI-compat /v1/models
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function listModels(): Promise<LlamaCppModel[]> {
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: LlamaCppModel[] };
      return data.data ?? [];
    } catch {
      return [];
    }
  }

  async function getHealth(): Promise<LlamaCppHealth | null> {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return (await res.json()) as LlamaCppHealth;
    } catch {
      return null;
    }
  }

  return { ping, listModels, getHealth };
}

export type LlamaCppClient = ReturnType<typeof createLlamaCppClient>;
