#!/usr/bin/env node
/**
 * verify-docs-sync.mjs — Detect documentation drift across the repo.
 *
 * Checks (12 total):
 *  1. Migration ID
 *  2. API version
 *  3. CLI providers
 *  4. WSEventType union
 *  5. Keyboard shortcuts (g-key map)
 *  6. Task status values
 *  7. Task execution state values
 *  8. Agent role values
 *  9. Task type values
 * 10. Workflow pack keys
 * 11. Messenger channels
 * 12. Window types (core subset)
 *
 * Usage: node scripts/verify-docs-sync.mjs
 * Exit code: 0 = all synced, 1 = drift detected
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
let driftCount = 0;
let passCount = 0;

function read(rel) {
  try { return readFileSync(join(ROOT, rel), "utf8"); } catch { return ""; }
}

/** Extract union values from a TypeScript type like: type Foo = "a" | "b" | "c"; */
function extractUnion(content, typeName) {
  // Match single-line: type Foo = "a" | "b" | "c";
  // or multi-line:     type Foo =\n  | "a"\n  | "b";
  const re = new RegExp(`type\\s+${typeName}\\s*=\\s*([\\s\\S]*?);`);
  const m = content.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([\w-]+)"/g)].map((x) => x[1]);
}

/** Extract const array values: const FOO = ["a","b"] as const; */
function extractConstArray(content, varName) {
  const re = new RegExp(`${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const m = content.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([\w-]+)"/g)].map((x) => x[1]);
}

/** Check that all `expected` values appear in `docContent`. Returns missing list. */
function findMissing(expected, docContent) {
  return expected.filter((v) => !docContent.includes(v));
}

function reportCheck(label, sourceDesc, expected, docsToCheck) {
  console.log(`\n── ${label} ──`);
  console.log(`   Code (${sourceDesc}): ${expected.length} values`);
  for (const rel of docsToCheck) {
    const content = read(rel);
    if (!content) continue;
    const missing = findMissing(expected, content);
    if (missing.length === 0) {
      console.log(`   ✓ ${rel}`);
      passCount++;
    } else {
      console.log(`   ✗ ${rel}  →  missing: ${missing.join(", ")}`);
      driftCount++;
    }
  }
}

// ─── 1. Migration ID ────────────────────────────────────────────────────────

function checkMigrationId() {
  const dir = "server/modules/bootstrap/schema/versioned-migrations";
  const fullDir = join(ROOT, dir);
  let lastId = "";
  try {
    for (const f of readdirSync(fullDir).filter((n) => n.endsWith(".ts"))) {
      const content = readFileSync(join(fullDir, f), "utf8");
      for (const m of content.matchAll(/id:\s*"(2026-[^"]+)"/g)) {
        if (m[1] > lastId) lastId = m[1];
      }
    }
  } catch { /* ignore */ }
  if (!lastId) { console.log("⚠  Could not read migration IDs from code"); return; }

  console.log(`\n── Migration ID ──`);
  console.log(`   Code (source of truth): ${lastId}`);

  const docsToCheck = [
    "CLAUDE.md",
    "docs/progress.md",
    "docs/GLOSSARY.md",
  ];
  for (const rel of docsToCheck) {
    const content = read(rel);
    if (!content) continue;
    const refs = [...content.matchAll(/2026-\d{2}-\d{2}-\d{3}-[\w-]+/g)].map((m) => m[0]);
    if (refs.length === 0) continue;
    const maxRef = refs.sort().at(-1);
    if (maxRef === lastId) {
      console.log(`   ✓ ${rel}`);
      passCount++;
    } else {
      console.log(`   ✗ ${rel}  →  has "${maxRef}"  (stale)`);
      driftCount++;
    }
  }
}

// ─── 2. API Version ─────────────────────────────────────────────────────────

function checkApiVersion() {
  const apiMd = read("docs/specs/api.md");
  const verMatch = apiMd.match(/v(\d+\.\d+\.\d+)/);
  if (!verMatch) return;
  const apiVer = verMatch[1];
  console.log(`\n── API Version ──`);
  console.log(`   api.md (source of truth): v${apiVer}`);

  for (const rel of ["CLAUDE.md", "docs/README.md"]) {
    const content = read(rel);
    if (!content) continue;
    const refs = [...content.matchAll(/v(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
    const apiRefs = refs.filter((v) => v.startsWith(apiVer.split(".")[0]));
    if (apiRefs.length === 0) continue;
    if (apiRefs.includes(apiVer)) {
      console.log(`   ✓ ${rel}`);
      passCount++;
    } else {
      console.log(`   ✗ ${rel}  →  has "v${apiRefs[0]}"  (stale)`);
      driftCount++;
    }
  }
}

// ─── 3. CLI Providers ───────────────────────────────────────────────────────

function checkCliProviders() {
  const types = read("src/types/index.ts");
  const providers = extractUnion(types, "CliProvider").sort();
  if (providers.length === 0) return;

  reportCheck("CLI Providers", "src/types/index.ts", providers, [
    "docs/GLOSSARY.md",
    "docs/architecture/AGENT-CONFIGURATION-AND-EXECUTION.md",
  ]);
}

// ─── 4. WSEventType ─────────────────────────────────────────────────────────

function checkWSEventTypes() {
  const types = read("src/types/index.ts");
  const events = extractUnion(types, "WSEventType").sort();
  if (events.length === 0) return;

  reportCheck("WSEventType", "src/types/index.ts", events, [
    "docs/specs/websocket-protocol.md",
  ]);
}

// ─── 5. Keyboard Shortcuts (g-key map) ──────────────────────────────────────

function checkKeyboardShortcuts() {
  const content = read("src/components/desktop/useDesktopKeyboard.ts");
  // Extract: w: () => toggleWindow("workflow"), ...
  const gKeyMap = [...content.matchAll(/(\w):\s*\(\)\s*=>\s*(?:toggleWindow\("([\w-]+)"\)|openCli\(\))/g)];
  if (gKeyMap.length === 0) return;

  const shortcuts = gKeyMap.map((m) => `g ${m[1]}`);

  console.log(`\n── Keyboard Shortcuts (g-key) ──`);
  console.log(`   Code (useDesktopKeyboard.ts): ${shortcuts.join(", ")}`);

  for (const rel of ["CLAUDE.md", "docs/GLOSSARY.md"]) {
    const doc = read(rel);
    if (!doc) continue;
    const missing = shortcuts.filter((s) => !doc.includes(s));
    if (missing.length === 0) {
      console.log(`   ✓ ${rel}`);
      passCount++;
    } else {
      console.log(`   ✗ ${rel}  →  missing: ${missing.join(", ")}`);
      driftCount++;
    }
  }
}

// ─── 6. Task Status ─────────────────────────────────────────────────────────

function checkTaskStatuses() {
  const types = read("src/types/index.ts");
  const statuses = extractUnion(types, "TaskStatus");
  if (statuses.length === 0) return;

  reportCheck("TaskStatus", "src/types/index.ts", statuses, [
    "docs/GLOSSARY.md",
  ]);
}

// ─── 7. Task Execution State ────────────────────────────────────────────────

function checkExecutionStates() {
  const types = read("src/types/index.ts");
  const states = extractUnion(types, "TaskExecutionState");
  if (states.length === 0) return;

  reportCheck("TaskExecutionState", "src/types/index.ts", states, [
    "docs/GLOSSARY.md",
  ]);
}

// ─── 8. Agent Roles ─────────────────────────────────────────────────────────

function checkAgentRoles() {
  const types = read("src/types/index.ts");
  const roles = extractUnion(types, "AgentRole");
  if (roles.length === 0) return;

  reportCheck("AgentRole", "src/types/index.ts", roles, [
    "docs/GLOSSARY.md",
    "CLAUDE.md",
  ]);
}

// ─── 9. Task Type ───────────────────────────────────────────────────────────

function checkTaskTypes() {
  const types = read("src/types/index.ts");
  const taskTypes = extractUnion(types, "TaskType");
  if (taskTypes.length === 0) return;

  reportCheck("TaskType", "src/types/index.ts", taskTypes, [
    "docs/GLOSSARY.md",
  ]);
}

// ─── 10. Workflow Pack Keys ─────────────────────────────────────────────────

function checkWorkflowPackKeys() {
  const types = read("src/types/index.ts");
  const keys = extractConstArray(types, "WORKFLOW_PACK_KEYS");
  if (keys.length === 0) return;

  reportCheck("WorkflowPackKey", "src/types/index.ts", keys, [
    "docs/GLOSSARY.md",
  ]);
}

// ─── 11. Messenger Channels ────────────────────────────────────────────────

function checkMessengerChannels() {
  const types = read("src/types/index.ts");
  const channels = extractConstArray(types, "MESSENGER_CHANNELS");
  if (channels.length === 0) return;

  reportCheck("Messenger Channels", "src/types/index.ts", channels, [
    "docs/GLOSSARY.md",
    "docs/specs/api.md",
  ]);
}

// ─── 12. Window Types (core subset documented in GLOSSARY) ──────────────────

function checkWindowTypes() {
  const appTypes = read("src/app/types.ts");
  const windowTypes = extractUnion(appTypes, "WindowType");
  if (windowTypes.length === 0) return;

  // Only check core window types that GLOSSARY explicitly lists in its Window Types table
  const coreTypes = [
    "workflow", "library", "settings", "chat", "agent-manager", "cli",
    "tasks", "reports", "image-studio", "synapse", "local-llm", "repo-store",
    "app-runner", "dashboard", "decision-inbox", "pm-activity", "folder",
  ];
  const actualCore = coreTypes.filter((t) => windowTypes.includes(t));

  reportCheck("WindowType (core)", "src/app/types.ts", actualCore, [
    "docs/GLOSSARY.md",
  ]);
}

// ─── Run All ────────────────────────────────────────────────────────────────

console.log("=== AgentDesk Documentation Sync Check ===");
console.log(`   ${new Date().toISOString().slice(0, 10)}`);

checkMigrationId();
checkApiVersion();
checkCliProviders();
checkWSEventTypes();
checkKeyboardShortcuts();
checkTaskStatuses();
checkExecutionStates();
checkAgentRoles();
checkTaskTypes();
checkWorkflowPackKeys();
checkMessengerChannels();
checkWindowTypes();

console.log(`\n${"=".repeat(50)}`);
console.log(`   ✓ ${passCount} passed   ✗ ${driftCount} drifted`);
if (driftCount === 0) {
  console.log("   All checks passed — no drift detected.");
  process.exit(0);
} else {
  console.log(`   ${driftCount} drift(s) found. Update the stale docs.`);
  process.exit(1);
}
