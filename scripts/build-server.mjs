#!/usr/bin/env node

/**
 * Bundle the AgentDesk server into a single ESM file for packaging (e.g. Electron).
 * Output: dist-server/agentdesk-server.cjs
 *
 * Usage: node scripts/build-server.mjs
 *        pnpm run build:server
 */

import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "dist-server");
const outFile = path.join(outDir, "agentdesk-server.cjs");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

await esbuild.build({
  entryPoints: [path.join(rootDir, "server", "index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outfile: outFile,
  sourcemap: true,
  external: ["sharp"],
  // CJS so deps can require('node:...'). sharp has native .node; keep it in node_modules. Set AGENTDESK_SERVER_DIR when packaged.
}).then(() => {
  console.log("[build-server] OK:", outFile);
}).catch((err) => {
  console.error("[build-server] Failed:", err);
  process.exit(1);
});
