#!/usr/bin/env node
/**
 * AgentDesk Rule 0-7 Enforcement: No console.log in server code
 * Exit code 2 = block the action.
 */
const { execSync } = require("child_process");

try {
  const files = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((f) => f.startsWith("server/") && /\.ts$/.test(f));

  if (files.length === 0) process.exit(0);

  const fs = require("fs");
  const violations = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    // Skip test files
    if (/\.test\.ts$/.test(file) || /\.spec\.ts$/.test(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.trim().startsWith("//")) return;
      if (/console\.log\s*\(/.test(line)) {
        violations.push(`  ${file}:${i + 1} → console.log found`);
      }
    });
  }

  if (violations.length > 0) {
    console.error("⛔ Rule 0-7 violation: console.log in server code\n");
    console.error(violations.join("\n"));
    console.error("\nUse pino logger instead. See server/lib/logger.ts");
    process.exit(2);
  }
} catch {
  process.exit(0);
}
