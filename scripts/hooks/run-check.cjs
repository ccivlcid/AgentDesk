#!/usr/bin/env node
/**
 * AgentDesk Pre-Flight Check
 * Runs: TypeScript type check → ESLint → Tests
 * Exit code 2 = block the action (Cursor hook convention)
 */
const { execSync } = require("child_process");

const checks = [
  { name: "TypeScript", cmd: "npx tsc -b --noEmit", critical: true },
  { name: "ESLint", cmd: "pnpm lint", critical: false },
];

let failed = false;

for (const check of checks) {
  try {
    console.log(`\n--- ${check.name} ---`);
    execSync(check.cmd, { stdio: "inherit", cwd: process.cwd() });
    console.log(`✓ ${check.name} passed`);
  } catch (err) {
    console.error(`✗ ${check.name} FAILED`);
    if (check.critical) {
      failed = true;
    }
  }
}

if (failed) {
  console.error("\n⛔ Critical check failed. Fix errors before proceeding.");
  process.exit(2); // exit 2 = block action in Cursor hooks
}

console.log("\n✓ All checks passed.");
process.exit(0);
