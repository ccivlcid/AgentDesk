/**
 * LM Studio client — OpenAI-compatible API on port 1234.
 * LM Studio exposes the same /v1 interface as OpenAI.
 */

export interface LmStudioModel {
  id: string;
  object: string;
  owned_by: string;
}

export function createLmStudioClient(baseUrl: string) {
  async function ping(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function listModels(): Promise<LmStudioModel[]> {
    const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`LM Studio list models failed: ${res.status}`);
    const data = (await res.json()) as { data?: LmStudioModel[] };
    return data.data ?? [];
  }

  return { ping, listModels };
}

export type LmStudioClient = ReturnType<typeof createLmStudioClient>;
