/**
 * Local LLM backend detection and lifecycle management.
 * Phase 1+3: Ollama (full) + LM Studio (detection only).
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import logger from "../../lib/logger.ts";
import { createOllamaClient } from "./ollama-client.ts";
import { createLmStudioClient } from "./lmstudio-client.ts";

const execAsync = promisify(exec);

export interface BackendInfo {
  name: string;
  label: string;
  installed: boolean;
  version: string | null;
  running: boolean;
  port: number;
  base_url: string;
  model_count: number;
}

const BACKENDS_META: Record<string, { label: string; port: number }> = {
  ollama:   { label: "Ollama",    port: 11434 },
  lmstudio: { label: "LM Studio", port: 1234  },
  llamacpp: { label: "llama.cpp", port: 8080  },
  jan:      { label: "Jan",       port: 1337  },
};

export async function detectOllama(): Promise<{ installed: boolean; version: string | null }> {
  try {
    const { stdout } = await execAsync("ollama --version", { timeout: 5000 });
    const match = stdout.match(/ollama version (\S+)/i) ?? stdout.match(/(\d+\.\d+\.\d+)/);
    return { installed: true, version: match?.[1] ?? "unknown" };
  } catch {
    return { installed: false, version: null };
  }
}

export async function getOllamaRunning(port = 11434): Promise<boolean> {
  const client = createOllamaClient(`http://localhost:${port}`);
  return client.ping();
}

export async function getAllBackendsStatus(port = 11434): Promise<BackendInfo[]> {
  const [ollamaDetect, lmStudioRunning] = await Promise.all([
    detectOllama(),
    createLmStudioClient("http://localhost:1234").ping(),
  ]);

  const ollamaRunning = ollamaDetect.installed ? await getOllamaRunning(port) : false;

  let ollamaModelCount = 0;
  if (ollamaRunning) {
    try {
      const models = await createOllamaClient(`http://localhost:${port}`).listModels();
      ollamaModelCount = models.length;
    } catch { /* ignore */ }
  }

  let lmStudioModelCount = 0;
  if (lmStudioRunning) {
    try {
      const models = await createLmStudioClient("http://localhost:1234").listModels();
      lmStudioModelCount = models.length;
    } catch { /* ignore */ }
  }

  const results: BackendInfo[] = [
    {
      name: "ollama",
      label: BACKENDS_META.ollama.label,
      installed: ollamaDetect.installed,
      version: ollamaDetect.version,
      running: ollamaRunning,
      port,
      base_url: `http://localhost:${port}/v1`,
      model_count: ollamaModelCount,
    },
    {
      name: "lmstudio",
      label: BACKENDS_META.lmstudio.label,
      installed: lmStudioRunning, // treat "running" as "installed" for LM Studio (GUI app)
      version: lmStudioRunning ? "detected" : null,
      running: lmStudioRunning,
      port: 1234,
      base_url: "http://localhost:1234/v1",
      model_count: lmStudioModelCount,
    },
    {
      name: "llamacpp",
      label: BACKENDS_META.llamacpp.label,
      installed: false,
      version: null,
      running: false,
      port: 8080,
      base_url: "http://localhost:8080/v1",
      model_count: 0,
    },
    {
      name: "jan",
      label: BACKENDS_META.jan.label,
      installed: false,
      version: null,
      running: false,
      port: 1337,
      base_url: "http://localhost:1337/v1",
      model_count: 0,
    },
  ];

  return results;
}

export async function startOllama(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check if already running
    if (await getOllamaRunning()) return { ok: true };
    // Spawn detached — let Ollama manage its own lifecycle
    const { spawn } = await import("node:child_process");
    const proc = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, OLLAMA_ORIGINS: "*" },
    });
    proc.unref();
    logger.info("[local-llm] ollama serve spawned");
    // Wait up to 5s for it to become ready
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await getOllamaRunning()) return { ok: true };
    }
    return { ok: false, error: "Ollama started but did not respond in time" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function stopOllama(): Promise<{ ok: boolean; error?: string }> {
  try {
    // On macOS/Linux: pkill ollama; on Windows: taskkill
    const cmd = process.platform === "win32"
      ? "taskkill /IM ollama.exe /F"
      : "pkill -f 'ollama serve'";
    await execAsync(cmd, { timeout: 5000 });
    return { ok: true };
  } catch (err) {
    // If process not found, that's fine
    const msg = String(err);
    if (msg.includes("not found") || msg.includes("No such process") || msg.includes("not running")) {
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
}
