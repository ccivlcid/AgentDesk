param(
  [string]$AgentsPath = "",
  [int]$Port = 0,
  [string]$AgentDeskConfig = "",
  [switch]$Start
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $rootDir

if (!(Test-Path "package.json") -or !(Test-Path "scripts/setup.mjs")) {
  throw "Run this script from the AgentDesk repository."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 22+ is required. Install from https://nodejs.org/"
}

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) {
  throw "Node.js 22+ is required. Current: $(node -v)"
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "corepack is required (bundled with Node.js)."
}

corepack enable | Out-Null
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  corepack prepare pnpm@latest --activate | Out-Null
}

Write-Host "[AgentDesk] Installing dependencies..."
pnpm install

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "[AgentDesk] Created .env from .env.example"
}

$resolvedAgentDesk = ""
if ([string]::IsNullOrWhiteSpace($AgentDeskConfig)) {
  $defaultAgentDesk = Join-Path $HOME ".agentdesk/agentdesk.json"
  if (Test-Path $defaultAgentDesk) {
    $resolvedAgentDesk = (Resolve-Path $defaultAgentDesk).Path
  }
} else {
  $candidate = $AgentDeskConfig
  if ($candidate.StartsWith("~")) {
    $candidate = $candidate.Replace("~", $HOME)
  }
  if (Test-Path $candidate) {
    $resolvedAgentDesk = (Resolve-Path $candidate).Path
  } else {
    Write-Warning "[AgentDesk] AGENTDESK config not found at $candidate. Keeping path for later."
    $resolvedAgentDesk = $candidate
  }
}

if ($Port -gt 0) {
  $env:AGENTDESK_SETUP_PORT = $Port.ToString()
} else {
  Remove-Item Env:AGENTDESK_SETUP_PORT -ErrorAction SilentlyContinue
}

if ($resolvedAgentDesk) {
  $env:AGENTDESK_SETUP_CONFIG = $resolvedAgentDesk.Replace("\", "/")
} else {
  Remove-Item Env:AGENTDESK_SETUP_CONFIG -ErrorAction SilentlyContinue
}

$envPatchScript = @'
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
'@
$envPatchPath = Join-Path $rootDir ".agentdesk-env-patch.cjs"
[System.IO.File]::WriteAllText($envPatchPath, $envPatchScript, [System.Text.UTF8Encoding]::new($false))
try {
  node $envPatchPath
} finally {
  Remove-Item $envPatchPath -Force -ErrorAction SilentlyContinue
}

Remove-Item Env:AGENTDESK_SETUP_PORT -ErrorAction SilentlyContinue
Remove-Item Env:AGENTDESK_SETUP_CONFIG -ErrorAction SilentlyContinue

$portToUse = $Port
if ($portToUse -le 0) {
  $portLine = Select-String -Path ".env" -Pattern "^\s*PORT\s*=" | Select-Object -First 1
  if ($portLine) {
    $rawPort = ($portLine.Line -split "=")[1].Trim().Trim('"').Trim("'")
    if ($rawPort -match "^\d+$") {
      $portToUse = [int]$rawPort
    }
  }
}
if ($portToUse -le 0) {
  $portToUse = 8790
}

$setupArgs = @("setup", "--", "--port", $portToUse.ToString())
if ($AgentsPath) {
  $setupArgs += @("--agents-path", $AgentsPath)
}

Write-Host "[AgentDesk] Installing AGENTS.md orchestration rules..."
& pnpm @setupArgs

Write-Host ""
Write-Host "[AgentDesk] Setup complete."
Write-Host "Frontend: http://127.0.0.1:8800"
Write-Host "API:      http://127.0.0.1:$portToUse/healthz"

if ($Start) {
  Write-Host "[AgentDesk] Starting development server..."
  pnpm dev:local
  exit $LASTEXITCODE
}

Write-Host "Run 'pnpm dev:local' to start."
