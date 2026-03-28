import { build } from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

await build({
  entryPoints: ["cli/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist-cli/index.js",
  banner: { js: "#!/usr/bin/env node" },
  external: [
    // Node builtins
    "node:*",
    // Heavy native modules that shouldn't be bundled
    "node-pty",
    "better-sqlite3",
    // ink needs React runtime
    "react",
    "ink",
    "ink-text-input",
    "ws",
    "chalk",
  ],
  define: {
    "process.env.AGENTDESK_VERSION": JSON.stringify(pkg.version),
  },
});

console.log("CLI built to dist-cli/index.js");
