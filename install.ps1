param(
  [string]$AgentsPath = "",
  [int]$Port = 0,
  [string]$AgentDeskConfig = "",
  [switch]$Start
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $scriptDir "scripts/setup.ps1"

$forward = @()
if ($AgentsPath) { $forward += @("-AgentsPath", $AgentsPath) }
if ($Port -gt 0) { $forward += @("-Port", $Port) }
if ($AgentDeskConfig) { $forward += @("-AgentDeskConfig", $AgentDeskConfig) }
if ($Start) { $forward += "-Start" }

& $target @forward
exit $LASTEXITCODE
