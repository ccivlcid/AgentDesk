/**
 * Synapse — Obsidian client
 * Mode A: Local filesystem (readdir + fs.readFile)
 * Mode B: Obsidian Local REST API Plugin (http://localhost:27123)
 */

import fs from "node:fs";
import path from "node:path";

export interface ObsidianNote {
  path: string;        // relative path inside vault
  name: string;        // filename without extension
  size: number;
  modified: number;    // unix ms
}

// ─── Local Filesystem ───────────────────────────────────────────────────────

function walkVault(dir: string, base: string, results: ObsidianNote[], depth = 0): void {
  if (depth > 6) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkVault(full, base, results, depth + 1);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }
      results.push({
        path: path.relative(base, full).replace(/\\/g, "/"),
        name: entry.name.replace(/\.md$/, ""),
        size: stat.size,
        modified: stat.mtimeMs,
      });
    }
  }
}

export function validateVaultPath(vaultPath: string): { ok: boolean; noteCount: number; lastModified: number } {
  if (!vaultPath || !fs.existsSync(vaultPath)) return { ok: false, noteCount: 0, lastModified: 0 };
  const notes: ObsidianNote[] = [];
  walkVault(vaultPath, vaultPath, notes);
  const lastModified = notes.reduce((max, n) => Math.max(max, n.modified), 0);
  return { ok: true, noteCount: notes.length, lastModified };
}

export function listVaultFiles(vaultPath: string, limit = 200): ObsidianNote[] {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const notes: ObsidianNote[] = [];
  walkVault(vaultPath, vaultPath, notes);
  return notes
    .sort((a, b) => b.modified - a.modified)
    .slice(0, limit);
}

export function searchVaultFiles(vaultPath: string, query: string, limit = 50): ObsidianNote[] {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const q = query.toLowerCase();
  const notes: ObsidianNote[] = [];
  walkVault(vaultPath, vaultPath, notes);
  return notes
    .filter((n) => n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q))
    .sort((a, b) => b.modified - a.modified)
    .slice(0, limit);
}

export function readVaultFile(vaultPath: string, filePath: string): string {
  const full = path.resolve(vaultPath, filePath);
  // security: ensure resolved path stays inside vault
  if (!full.startsWith(path.resolve(vaultPath))) throw new Error("Path traversal denied");
  return fs.readFileSync(full, "utf-8");
}

export function writeVaultFile(vaultPath: string, filePath: string, content: string): void {
  const full = path.resolve(vaultPath, filePath);
  if (!full.startsWith(path.resolve(vaultPath))) throw new Error("Path traversal denied");
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
}

// ─── REST API Plugin (Mode B) ────────────────────────────────────────────────

export interface ObsidianRestApiStatus {
  ok: boolean;
  error?: string;
}

export async function pingObsidianRestApi(host: string, port: number, apiKey: string): Promise<ObsidianRestApiStatus> {
  try {
    const res = await fetch(`http://${host}:${port}/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function listFilesRestApi(
  host: string,
  port: number,
  apiKey: string,
  folder = "/",
  limit = 200,
): Promise<ObsidianNote[]> {
  const res = await fetch(`http://${host}:${port}/vault/${encodeURIComponent(folder)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Obsidian REST API error ${res.status}`);
  const data = (await res.json()) as { files: string[] };
  return data.files
    .filter((f) => f.endsWith(".md"))
    .slice(0, limit)
    .map((f) => ({
      path: f,
      name: path.basename(f, ".md"),
      size: 0,
      modified: 0,
    }));
}
