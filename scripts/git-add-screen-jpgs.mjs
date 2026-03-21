#!/usr/bin/env node
/**
 * Stage docs/screen/*.jpg (UTF-8 names) — Windows shell-safe.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const dir = "docs/screen";
for (const name of readdirSync(dir)) {
  if (!name.toLowerCase().endsWith(".jpg")) continue;
  const rel = join(dir, name).replace(/\\/g, "/");
  const r = spawnSync("git", ["add", "--", rel], { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
