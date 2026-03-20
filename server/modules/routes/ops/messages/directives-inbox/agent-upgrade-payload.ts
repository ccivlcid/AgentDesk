import os from "node:os";
import path from "node:path";

export function buildAgentUpgradeRequiredPayload() {
  const repoRoot = process.cwd();
  const installerPaths = {
    mac_linux: path.join(repoRoot, "scripts", "setup.sh"),
    windows_powershell: path.join(repoRoot, "scripts", "setup.ps1"),
    agents_template: path.join(repoRoot, "templates", "AGENTS-agentdesk.md"),
  };
  const agentsTargetPath = path.join(os.homedir(), ".agentdesk", "workspace", "AGENTS.md");
  const installCommands = {
    mac_linux: "bash scripts/setup.sh",
    windows_powershell: "powershell -ExecutionPolicy Bypass -File .\\scripts\\setup.ps1",
    agents_only: "pnpm setup -- --agents-path ~/.agentdesk/workspace/AGENTS.md",
  };
  const absoluteInstallCommands = {
    mac_linux: `bash "${installerPaths.mac_linux}"`,
    windows_powershell: `powershell -ExecutionPolicy Bypass -File "${installerPaths.windows_powershell}"`,
    agents_only: `pnpm setup -- --agents-path "${agentsTargetPath}"`,
  };
  const recommendedInstallCommand =
    process.platform === "win32" ? absoluteInstallCommands.windows_powershell : absoluteInstallCommands.mac_linux;

  return {
    error: "agent_upgrade_required",
    reason: "install_first",
    message: `AgentDesk AGENTS is outdated (HTTP 428). Install path: ${installerPaths.mac_linux} (or ${installerPaths.windows_powershell}). Target AGENTS path: ${agentsTargetPath}. Should I install it now?`,
    message_ko: `AgentDesk AGENTS가 구버전입니다(HTTP 428). 설치 경로: ${installerPaths.mac_linux} (또는 ${installerPaths.windows_powershell}), 대상 AGENTS: ${agentsTargetPath}. 지금 제가 직접 설치해드릴까요?`,
    required_agent_rules_version: 2,
    required_action: "install_latest_agents_rules",
    installer_files: ["scripts/setup.sh", "scripts/setup.ps1", "templates/AGENTS-agentdesk.md"],
    installer_absolute_paths: installerPaths,
    agents_target_path: agentsTargetPath,
    install_commands: installCommands,
    install_commands_absolute: absoluteInstallCommands,
    recommended_install_command: recommendedInstallCommand,
    user_prompt: {
      ko: `AgentDesk AGENTS 규칙이 구버전입니다. 설치 파일: ${installerPaths.mac_linux} / ${installerPaths.windows_powershell}, 대상 AGENTS: ${agentsTargetPath}. 지금 제가 직접 설치해드릴까요? (예/아니오)`,
      en: `AgentDesk AGENTS rules are outdated. Installer files: ${installerPaths.mac_linux} / ${installerPaths.windows_powershell}, target AGENTS: ${agentsTargetPath}. Should I install it now? (yes/no)`,
    },
    next_step_ko: "사용자가 동의하면 설치 스크립트를 실행한 뒤 같은 directive를 1회 재시도하세요.",
    next_step_en: "If the user agrees, run installer script and retry the same directive once.",
  };
}
