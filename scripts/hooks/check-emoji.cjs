#!/usr/bin/env node
/**
 * AgentDesk Rule 0-1 Enforcement: No emoji in TSX/JSX files
 * Scans staged .tsx files for emoji/unicode symbols used as UI icons.
 * Exit code 2 = block the action.
 */
const { execSync } = require("child_process");

const FORBIDDEN = /[✓✕✗▶▾▴▸↓↑←→⚠💡ℹ🤖−＋○◎⇠⇢⤢↖↗↙↘·]/g;

try {
  const files = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((f) => /\.tsx?$/.test(f));

  if (files.length === 0) process.exit(0);

  const fs = require("fs");
  const violations = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Skip comments
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
      // Skip i18n translation objects
      if (/\bt\s*\(\s*\{/.test(line)) return;
      const match = line.match(FORBIDDEN);
      if (match) {
        violations.push(`  ${file}:${i + 1} → ${match.join(", ")}`);
      }
    });
  }

  if (violations.length > 0) {
    console.error("⛔ Rule 0-1 violation: Emoji/unicode symbols in TSX/JSX\n");
    console.error(violations.join("\n"));
    console.error("\nReplace with inline SVG. See .agents/rules/coding-rules.md");
    process.exit(2);
  }
} catch {
  // If git not available, skip
  process.exit(0);
}
