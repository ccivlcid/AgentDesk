#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
AgentDesk one-click setup (macOS/Linux)

Usage:
  bash scripts/setup.sh [--agents-path PATH] [--port PORT] [--agentdesk-config PATH] [--start]

Options:
  --agents-path PATH       Custom AGENTS.md path for pnpm setup
  --port PORT              Override PORT in .env and AGENTS template injection
  --agentdesk-config PATH   Path to agentdesk.json (default: ~/.agentdesk/agentdesk.json when present)
  --start                  Start pnpm dev:local after setup
EOF
}

expand_path() {
  local input="$1"
  case "$input" in
    "~") printf '%s\n' "${HOME}" ;;
    "~/"*) printf '%s\n' "${HOME}/${input#~/}" ;;
    *) printf '%s\n' "$input" ;;
  esac
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

AGENTS_PATH=""
PORT=""
AGENTDESK_CONFIG=""
START_AFTER_SETUP="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agents-path)
      [[ $# -ge 2 ]] || { echo "Missing value for --agents-path" >&2; exit 1; }
      AGENTS_PATH="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || { echo "Missing value for --port" >&2; exit 1; }
      PORT="$2"
      shift 2
      ;;
    --agentdesk-config)
      [[ $# -ge 2 ]] || { echo "Missing value for --agentdesk-config" >&2; exit 1; }
      AGENTDESK_CONFIG="$2"
      shift 2
      ;;
    --start)
      START_AFTER_SETUP="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f package.json || ! -f scripts/setup.mjs ]]; then
  echo "Run this script from the AgentDesk repository." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22+ is required. Install from https://nodejs.org/" >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${NODE_MAJOR}" -lt 22 ]]; then
  echo "Node.js 22+ is required. Current: $(node -v)" >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack is required (bundled with Node.js)." >&2
  exit 1
fi

corepack enable >/dev/null 2>&1 || true
if ! command -v pnpm >/dev/null 2>&1; then
  corepack prepare pnpm@latest --activate >/dev/null 2>&1
fi

echo "[AgentDesk] Installing dependencies..."
pnpm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[AgentDesk] Created .env from .env.example"
fi

if [[ -z "${AGENTDESK_CONFIG}" ]]; then
  DEFAULT_AGENTDESK_CONFIG="$(expand_path "~/.agentdesk/agentdesk.json")"
  if [[ -f "${DEFAULT_AGENTDESK_CONFIG}" ]]; then
    AGENTDESK_CONFIG="${DEFAULT_AGENTDESK_CONFIG}"
  fi
else
  AGENTDESK_CONFIG="$(expand_path "${AGENTDESK_CONFIG}")"
  if [[ ! -f "${AGENTDESK_CONFIG}" ]]; then
    echo "[AgentDesk] Warning: AgentDesk config not found at ${AGENTDESK_CONFIG}. Keeping path for later."
  fi
fi

if [[ -n "${PORT}" ]]; then
  export AGENTDESK_SETUP_PORT="${PORT}"
else
  unset AGENTDESK_SETUP_PORT || true
fi

if [[ -n "${AGENTDESK_CONFIG}" ]]; then
  export AGENTDESK_SETUP_CONFIG="${AGENTDESK_CONFIG}"
else
  unset AGENTDESK_SETUP_CONFIG || true
fi

node <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const envPath = ".env";
let content = fs.readFileSync(envPath, "utf8");

function upsert(key, value) {
  const line = `${key}=${value}`;
  const active = new RegExp(`^${key}\\s*=.*$`, "m");
  const commented = new RegExp(`^#\\s*${key}\\s*=.*$`, "m");
  if (active.test(content)) {
    content = content.replace(active, line);
    return;
  }
  if (commented.test(content)) {
    content = content.replace(commented, line);
    return;
  }
  if (!content.endsWith("\n")) content += "\n";
  content += `${line}\n`;
}

function read(key) {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

const currentSecret = read("OAUTH_ENCRYPTION_SECRET");
if (!currentSecret || currentSecret === "__CHANGE_ME__") {
  const generated = crypto.randomBytes(32).toString("hex");
  upsert("OAUTH_ENCRYPTION_SECRET", `"${generated}"`);
  console.log("[AgentDesk] Generated OAUTH_ENCRYPTION_SECRET");
}

const currentInboxSecret = read("INBOX_WEBHOOK_SECRET");
if (!currentInboxSecret || currentInboxSecret === "__CHANGE_ME__") {
  const generatedInbox = crypto.randomBytes(32).toString("hex");
  upsert("INBOX_WEBHOOK_SECRET", `"${generatedInbox}"`);
  console.log("[AgentDesk] Generated INBOX_WEBHOOK_SECRET");
}

const port = process.env.AGENTDESK_SETUP_PORT?.trim();
if (port) {
  upsert("PORT", port);
  console.log(`[AgentDesk] Set PORT=${port}`);
}

const agentdeskCfg = process.env.AGENTDESK_SETUP_CONFIG?.trim();
if (agentdeskCfg) {
  const normalized = agentdeskCfg.replace(/\\/g, "/");
  upsert("AGENTDESK_CONFIG", `"${normalized}"`);
  console.log(`[AgentDesk] Set AGENTDESK_CONFIG=${normalized}`);
}

fs.writeFileSync(envPath, content, "utf8");
NODE

unset AGENTDESK_SETUP_PORT || true
unset AGENTDESK_SETUP_CONFIG || true

PORT_TO_USE="${PORT}"
if [[ -z "${PORT_TO_USE}" ]]; then
  PORT_TO_USE="$(awk -F= '/^[[:space:]]*PORT[[:space:]]*=/{gsub(/["'"'"'[:space:]]/, "", $2); print $2; exit}' .env || true)"
fi
if [[ -z "${PORT_TO_USE}" ]]; then
  PORT_TO_USE="8790"
fi

SETUP_ARGS=(--port "${PORT_TO_USE}")
if [[ -n "${AGENTS_PATH}" ]]; then
  SETUP_ARGS+=(--agents-path "${AGENTS_PATH}")
fi

echo "[AgentDesk] Installing AGENTS.md orchestration rules..."
pnpm setup -- "${SETUP_ARGS[@]}"

echo
echo "[AgentDesk] Setup complete."
echo "Frontend: http://127.0.0.1:8800"
echo "API:      http://127.0.0.1:${PORT_TO_USE}/healthz"

if [[ "${START_AFTER_SETUP}" == "1" ]]; then
  echo "[AgentDesk] Starting development server..."
  exec pnpm dev:local
fi

echo "Run 'pnpm dev:local' to start."
