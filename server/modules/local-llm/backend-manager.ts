/**
 * Local LLM backend detection and lifecycle management.
 * Phase 1+3+5: Ollama (full) + LM Studio + llama.cpp + Jan (detection only).
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import logger from "../../lib/logger.ts";
import { createOllamaClient } from "./ollama-client.ts";
import { createLmStudioClient } from "./lmstudio-client.ts";
import { createLlamaCppClient } from "./llamacpp-client.ts";
import { createJanClient } from "./jan-client.ts";

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

export async function detectLlamaCpp(): Promise<{ installed: boolean; version: string | null }> {
  try {
    const { stdout } = await execAsync("llama-server --version", { timeout: 4000 });
    const match = stdout.match(/version[: ]+(\S+)/i) ?? stdout.match(/(\d+\.\d+[\.\d]*)/);
    return { installed: true, version: match?.[1] ?? "detected" };
  } catch { /* not in PATH */ }
  // Fallback: llama-cli (older builds)
  try {
    await execAsync("llama-cli --version", { timeout: 4000 });
    return { installed: true, version: "detected" };
  } catch {
    return { installed: false, version: null };
  }
}

export async function detectJan(): Promise<{ installed: boolean }> {
  // Jan is a GUI app — check common install directories
  const { existsSync } = await import("node:fs");
  const candidates: string[] = [];
  if (process.platform === "win32") {
    const localAppData = process.env["LOCALAPPDATA"] ?? "";
    const appData = process.env["APPDATA"] ?? "";
    candidates.push(
      `${localAppData}\\Programs\\Jan\\Jan.exe`,
      `${localAppData}\\Jan\\Jan.exe`,
      `${appData}\\Jan\\Jan.exe`,
      "C:\\Program Files\\Jan\\Jan.exe",
    );
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Jan.app", `${process.env["HOME"] ?? ""}/Applications/Jan.app`);
  } else {
    candidates.push("/usr/bin/jan", "/usr/local/bin/jan", `${process.env["HOME"] ?? ""}/.local/bin/jan`);
  }
  const found = candidates.some((p) => p && existsSync(p));
  return { installed: found };
}

export async function getAllBackendsStatus(port = 11434): Promise<BackendInfo[]> {
  // Phase 1: all detection in parallel (HTTP pings + binary/path checks)
  const [ollamaDetect, lmStudioRunning, llamaCppRunning, janRunning, llamaCppDetect, janDetect] =
    await Promise.all([
      detectOllama(),
      createLmStudioClient("http://localhost:1234").ping(),
      createLlamaCppClient("http://localhost:8080").ping(),
      createJanClient("http://localhost:1337").ping(),
      detectLlamaCpp(),
      detectJan(),
    ]);

  const ollamaRunning = ollamaDetect.installed ? await getOllamaRunning(port) : false;

  // Phase 2: model counts (only for running backends)
  const [ollamaModels, lmStudioModels, llamaCppModels, janModels] = await Promise.all([
    ollamaRunning
      ? createOllamaClient(`http://localhost:${port}`).listModels().catch(() => [])
      : Promise.resolve([]),
    lmStudioRunning
      ? createLmStudioClient("http://localhost:1234").listModels().catch(() => [])
      : Promise.resolve([]),
    llamaCppRunning
      ? createLlamaCppClient("http://localhost:8080").listModels().catch(() => [])
      : Promise.resolve([]),
    janRunning
      ? createJanClient("http://localhost:1337").listModels().catch(() => [])
      : Promise.resolve([]),
  ]);

  const results: BackendInfo[] = [
    {
      name: "ollama",
      label: BACKENDS_META.ollama.label,
      installed: ollamaDetect.installed,
      version: ollamaDetect.version,
      running: ollamaRunning,
      port,
      base_url: `http://localhost:${port}/v1`,
      model_count: ollamaModels.length,
    },
    {
      name: "lmstudio",
      label: BACKENDS_META.lmstudio.label,
      installed: lmStudioRunning, // treat "running" as "installed" for GUI apps
      version: lmStudioRunning ? "detected" : null,
      running: lmStudioRunning,
      port: 1234,
      base_url: "http://localhost:1234/v1",
      model_count: lmStudioModels.length,
    },
    {
      name: "llamacpp",
      label: BACKENDS_META.llamacpp.label,
      installed: llamaCppDetect.installed || llamaCppRunning,
      version: llamaCppDetect.version ?? (llamaCppRunning ? "detected" : null),
      running: llamaCppRunning,
      port: 8080,
      base_url: "http://localhost:8080/v1",
      model_count: llamaCppModels.length,
    },
    {
      name: "jan",
      label: BACKENDS_META.jan.label,
      installed: janDetect.installed || janRunning,
      version: janRunning ? "detected" : null,
      running: janRunning,
      port: 1337,
      base_url: "http://localhost:1337/v1",
      model_count: janModels.length,
    },
  ];

  return results;
}

export async function startOllama(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check if already running
    if (await getOllamaRunning()) return { ok: true };
    // Check if Ollama is installed before attempting spawn
    const { installed } = await detectOllama();
    if (!installed) {
      return { ok: false, error: "ollama not installed" };
    }
    // Spawn detached — let Ollama manage its own lifecycle
    const { spawn } = await import("node:child_process");
    const proc = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, OLLAMA_ORIGINS: "*" },
    });
    // Prevent ENOENT / other spawn errors from becoming uncaughtException
    proc.on("error", (err) => {
      logger.warn({ err }, "[local-llm] ollama spawn error");
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
