import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const FEATURE_DIR = join(process.cwd(), "feature");
export const GITHUB_DIR = join(FEATURE_DIR, "github");
export const AI_DIR = join(FEATURE_DIR, "ai");

export function ensureDir(d: string) {
  mkdirSync(d, { recursive: true });
}

export function saveSource(p: string, c: string) {
  try {
    writeFileSync(p, c, "utf-8");
  } catch {
    /* ignore */
  }
}
