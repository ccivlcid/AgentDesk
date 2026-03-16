/**
 * GPU / RAM / inference metrics collector.
 * Polls nvidia-smi every 5 seconds and broadcasts via WebSocket.
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import logger from "../../lib/logger.ts";
import { createOllamaClient } from "./ollama-client.ts";

const execAsync = promisify(exec);

export interface GpuInfo {
  name: string;
  vram_total_bytes: number;
  vram_used_bytes: number;
  vram_free_bytes: number;
  utilization_percent: number;
}

export interface RamInfo {
  total_bytes: number;
  used_bytes: number;
  utilization_percent: number;
}

export interface InferenceInfo {
  active_model: string | null;
  tokens_per_second: number | null;
  first_token_latency_ms: number | null;
}

export interface MetricsSnapshot {
  gpu: GpuInfo | null;
  ram: RamInfo;
  inference: InferenceInfo;
  collected_at: number;
}

/** Parse nvidia-smi CSV output */
async function collectGpu(): Promise<GpuInfo | null> {
  try {
    const { stdout } = await execAsync(
      "nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits",
      { timeout: 4000 },
    );
    const line = stdout.trim().split("\n")[0];
    if (!line) return null;
    const parts = line.split(",").map((s) => s.trim());
    const [name, totalMiB, usedMiB, freeMiB, utilPct] = parts;
    const MiB = 1024 * 1024;
    return {
      name: name ?? "Unknown GPU",
      vram_total_bytes: (Number(totalMiB) || 0) * MiB,
      vram_used_bytes: (Number(usedMiB) || 0) * MiB,
      vram_free_bytes: (Number(freeMiB) || 0) * MiB,
      utilization_percent: Number(utilPct) || 0,
    };
  } catch {
    // nvidia-smi not available (CPU-only or AMD)
    return null;
  }
}

function collectRam(): RamInfo {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    total_bytes: total,
    used_bytes: used,
    utilization_percent: Math.round((used / total) * 100),
  };
}

async function collectInference(ollamaPort = 11434): Promise<InferenceInfo> {
  try {
    const client = createOllamaClient(`http://localhost:${ollamaPort}`);
    const running = await client.listRunning();
    if (running.length === 0) return { active_model: null, tokens_per_second: null, first_token_latency_ms: null };
    return {
      active_model: running[0].name,
      tokens_per_second: null, // populated from inference log
      first_token_latency_ms: null,
    };
  } catch {
    return { active_model: null, tokens_per_second: null, first_token_latency_ms: null };
  }
}

export async function collectMetrics(ollamaPort = 11434): Promise<MetricsSnapshot> {
  const [gpu, ram, inference] = await Promise.all([
    collectGpu(),
    Promise.resolve(collectRam()),
    collectInference(ollamaPort),
  ]);
  return { gpu, ram, inference, collected_at: Date.now() };
}

/** Start 5-second polling loop; returns a stop function */
export function startMetricsPoller(
  broadcast: (event: string, payload: unknown) => void,
  ollamaPort = 11434,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick() {
    if (stopped) return;
    try {
      const snapshot = await collectMetrics(ollamaPort);
      broadcast("local_llm_metrics", snapshot);
    } catch (err) {
      logger.debug({ err }, "[local-llm] metrics poll error");
    }
  }

  // Initial collection after 2s delay (let Ollama settle on startup)
  setTimeout(() => {
    if (!stopped) {
      tick();
      timer = setInterval(tick, 5000);
    }
  }, 2000);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
