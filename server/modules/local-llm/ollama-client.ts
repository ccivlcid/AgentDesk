/**
 * Ollama REST API wrapper
 * Talks to http://localhost:11434 (or custom host:port)
 */

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export interface OllamaRunningModel {
  name: string;
  size: number;
  size_vram: number;
  expires_at: string;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export function createOllamaClient(baseUrl: string) {
  async function ping(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Ollama list models failed: ${res.status}`);
    const data = (await res.json()) as { models?: OllamaModel[] };
    return data.models ?? [];
  }

  async function listRunning(): Promise<OllamaRunningModel[]> {
    try {
      const res = await fetch(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: OllamaRunningModel[] };
      return data.models ?? [];
    } catch {
      return [];
    }
  }

  async function* pullModel(name: string): AsyncGenerator<PullProgress> {
    const res = await fetch(`${baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
    });
    if (!res.ok) throw new Error(`Ollama pull failed: ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as PullProgress;
        } catch { /* skip malformed line */ }
      }
    }
  }

  async function deleteModel(name: string): Promise<void> {
    const res = await fetch(`${baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Ollama delete failed: ${res.status}`);
  }

  return { ping, listModels, listRunning, pullModel, deleteModel };
}

export type OllamaClient = ReturnType<typeof createOllamaClient>;
