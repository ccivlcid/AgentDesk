import { api } from "../lib/api.js";
import type { ChatMessage, AddMessage, CommandExtras } from "./types.js";
import { sysMsg } from "./types.js";
import type { Agent, Task } from "../../shared/types.js";

export async function handleSlashCommand(
  input: string,
  addMessage: AddMessage,
  setMode: (mode: "plan" | "build" | "yolo") => void,
  exit: () => void,
  extras: CommandExtras = {
    clearMessages: () => undefined,
    setSessionId: () => undefined,
    setProjectId: () => undefined,
    projectId: null,
  },
): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return false;

  const [cmd, ...args] = trimmed.slice(1).split(/\s+/);

  switch (cmd) {
    case "status": {
      try {
        const [projects, tasks, agents] = await Promise.all([
          api.get<{ projects: { id: string; name: string; status: string }[] }>("/api/projects"),
          api.get<{ tasks: { id: string; status: string }[] }>("/api/tasks?status=in_progress"),
          api.get<{ agents: { id: string; name: string; status: string }[] }>("/api/agents"),
        ]);
        const lines = [
          `Projects: ${projects.projects?.length ?? 0}`,
          `Active tasks: ${tasks.tasks?.length ?? 0}`,
          `Agents: ${agents.agents?.length ?? 0}`,
        ];
        addMessage(sysMsg(lines.join("\n")));
      } catch {
        addMessage(sysMsg("Failed to fetch status."));
      }
      return true;
    }
    case "tasks": {
      try {
        const data = await api.get<{ tasks: Pick<Task, "id" | "title" | "status" | "agent_name">[] }>("/api/tasks");
        const rows = data.tasks ?? [];
        if (rows.length === 0) {
          addMessage(sysMsg("No tasks."));
        } else {
          const lines = rows.map(
            (t) =>
              `${t.id.slice(0, 8)}  ${(t.status ?? "?").padEnd(12)}  ${(t.agent_name ?? "-").padEnd(16)}  ${t.title}`,
          );
          addMessage(sysMsg(["ID        STATUS        AGENT             TITLE", ...lines].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch tasks."));
      }
      return true;
    }
    case "agents": {
      try {
        const data = await api.get<{ agents: Pick<Agent, "id" | "name" | "role" | "status">[] }>("/api/agents");
        const rows = data.agents ?? [];
        if (rows.length === 0) {
          addMessage(sysMsg("No agents registered."));
        } else {
          const roleLabel = (r: string) =>
            r === "team_leader" ? "PM" : r === "senior" ? "Senior" : r === "junior" ? "Junior" : r;
          const lines = rows.map(
            (a) => `${a.name.padEnd(20)}  ${roleLabel(a.role).padEnd(8)}  ${a.status ?? "idle"}`,
          );
          addMessage(sysMsg(["NAME                  ROLE      STATUS", ...lines].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch agents."));
      }
      return true;
    }
    case "agent": {
      const subCmd = args[0]?.toLowerCase();

      if (!subCmd || subCmd === "list") {
        try {
          const data = await api.get<{ agents: Pick<Agent, "id" | "name" | "role" | "status">[] }>("/api/agents");
          const rows = data.agents ?? [];
          if (rows.length === 0) {
            addMessage(sysMsg("No agents registered."));
          } else {
            const roleLabel = (r: string) =>
              r === "team_leader" ? "PM" : r === "senior" ? "Senior" : r === "junior" ? "Junior" : r;
            const lines = rows.map(
              (a) => `${a.id.slice(0, 8)}  ${a.name.padEnd(20)}  ${roleLabel(a.role).padEnd(8)}  ${a.status ?? "idle"}`,
            );
            addMessage(sysMsg(["ID        NAME                  ROLE      STATUS", ...lines].join("\n")));
          }
        } catch {
          addMessage(sysMsg("Failed to fetch agents."));
        }
        return true;
      }

      if (subCmd === "create") {
        // Parse quoted names: /agent create "Backend Senior" senior
        const remainingArgs = args.slice(1);
        let name: string | undefined;
        let roleAndRest: string[];

        // Join and re-split respecting quoted strings
        const full = remainingArgs.join(" ").trim();
        const quotedMatch = full.match(/^"([^"]+)"\s*(.*)/);
        if (quotedMatch) {
          name = quotedMatch[1];
          roleAndRest = quotedMatch[2].trim().split(/\s+/).filter(Boolean);
        } else {
          name = remainingArgs[0];
          roleAndRest = remainingArgs.slice(1);
        }

        const role = roleAndRest[0];

        if (!name || !role) {
          addMessage(
            sysMsg(
              [
                "Usage: /agent create <name> <role> [provider] [model]",
                "Roles: senior, junior, team_leader",
                "",
                "Examples:",
                '  /agent create "Backend Senior" senior',
                "  /agent create PM team_leader",
                "  /agent create QA junior",
              ].join("\n"),
            ),
          );
          return true;
        }

        const validRoles = ["senior", "junior", "team_leader"];
        if (!validRoles.includes(role)) {
          addMessage(sysMsg(`Invalid role: ${role}. Use: ${validRoles.join(", ")}`));
          return true;
        }

        const deptMapping: Record<string, string> = { team_leader: "planning", senior: "dev", junior: "qa" };
        const providerType = roleAndRest[1] ?? "claude";

        try {
          const result = await api.post<{ ok: boolean; id: string }>("/api/agents", {
            name,
            role,
            department_id: deptMapping[role] ?? "dev",
            cli_provider: providerType,
          });
          addMessage(sysMsg(`Agent "${name}" created (id: ${result.id?.slice(0, 8)}, role: ${role}, provider: ${providerType}).`));
        } catch {
          addMessage(sysMsg(`Failed to create agent "${name}".`));
        }
        return true;
      }

      if (subCmd === "delete") {
        const nameOrId = args[1];
        if (!nameOrId) {
          addMessage(sysMsg("Usage: /agent delete <name-or-id>"));
          return true;
        }
        try {
          const agentsData = await api.get<{ agents: Array<{ id: string; name: string }> }>("/api/agents");
          const agentsList = agentsData.agents ?? [];
          const agent = agentsList.find(
            (a) => a.id.startsWith(nameOrId) || a.name.toLowerCase() === nameOrId.toLowerCase(),
          );
          if (!agent) {
            addMessage(sysMsg(`Agent not found: ${nameOrId}`));
            return true;
          }
          await api.del(`/api/agents/${agent.id}`);
          addMessage(sysMsg(`Agent "${agent.name}" deleted.`));
        } catch {
          addMessage(sysMsg(`Failed to delete agent: ${nameOrId}`));
        }
        return true;
      }

      if (subCmd === "assign") {
        // /agent assign <name-or-id> <provider-id> <model>
        const nameOrId = args[1];
        const providerId = args[2];
        const modelName = args.slice(3).join(" ");

        if (!nameOrId || !providerId || !modelName) {
          addMessage(sysMsg("Usage: /agent assign <agent-name-or-id> <provider-id> <model>"));
          return true;
        }

        try {
          const agentsData = await api.get<{ agents: Array<{ id: string; name: string }> }>("/api/agents");
          const agentsList = agentsData.agents ?? [];
          const agent = agentsList.find(
            (a) => a.id.startsWith(nameOrId) || a.name.toLowerCase() === nameOrId.toLowerCase(),
          );
          if (!agent) {
            addMessage(sysMsg(`Agent not found: ${nameOrId}`));
            return true;
          }
          await api.patch(`/api/agents/${agent.id}`, {
            cli_provider: "api",
            api_provider_id: providerId,
            api_model: modelName,
          });
          addMessage(sysMsg(`Agent "${agent.name}" assigned to model ${modelName} (provider: ${providerId}).`));
        } catch {
          addMessage(sysMsg(`Failed to assign agent: ${nameOrId}`));
        }
        return true;
      }

      if (subCmd === "edit") {
        // /agent edit <name-or-id> <field> <value>
        const nameOrId = args[1];
        const field = args[2]?.toLowerCase();
        const value = args.slice(3).join(" ");

        if (!nameOrId || !field || !value) {
          addMessage(sysMsg([
            "Usage: /agent edit <name-or-id> <field> <value>",
            "",
            "Fields:",
            "  name     <new name>",
            "  model    <model id>       e.g. claude-opus-4-6",
            "  provider <provider id>    e.g. claude",
            "  role     <role>           senior | junior | team_leader",
            "  system   <system prompt>",
            "",
            "Examples:",
            "  /agent edit Alice model claude-opus-4-6",
            '  /agent edit "Backend Dev" name "Backend Senior"',
            "  /agent edit pm role team_leader",
          ].join("\n")));
          return true;
        }

        const FIELD_MAP: Record<string, string> = {
          name: "name",
          model: "api_model",
          provider: "api_provider_id",
          role: "role",
          system: "system_prompt",
        };

        const patchKey = FIELD_MAP[field];
        if (!patchKey) {
          addMessage(sysMsg(`Unknown field: ${field}. Use: name, model, provider, role, system`));
          return true;
        }

        try {
          const agentsData = await api.get<{ agents: Array<{ id: string; name: string }> }>("/api/agents");
          const agentsList = agentsData.agents ?? [];
          const agent = agentsList.find(
            (a) => a.id.startsWith(nameOrId) || a.name.toLowerCase() === nameOrId.toLowerCase(),
          );
          if (!agent) {
            addMessage(sysMsg(`Agent not found: ${nameOrId}`));
            return true;
          }
          await api.patch(`/api/agents/${agent.id}`, { [patchKey]: value });
          addMessage(sysMsg(`Agent "${agent.name}" updated: ${field} = ${value}`));
        } catch {
          addMessage(sysMsg(`Failed to edit agent: ${nameOrId}`));
        }
        return true;
      }

      if (subCmd === "show") {
        // /agent show <name-or-id>
        const nameOrId = args[1];
        if (!nameOrId) {
          addMessage(sysMsg("Usage: /agent show <name-or-id>"));
          return true;
        }
        try {
          const agentsData = await api.get<{ agents: Array<{ id: string; name: string; role: string; status: string; api_model?: string | null; cli_provider?: string | null; system_prompt?: string | null }> }>("/api/agents");
          const agentsList = agentsData.agents ?? [];
          const agent = agentsList.find(
            (a) => a.id.startsWith(nameOrId) || a.name.toLowerCase() === nameOrId.toLowerCase(),
          );
          if (!agent) {
            addMessage(sysMsg(`Agent not found: ${nameOrId}`));
            return true;
          }
          const roleLabel = (r: string) => r === "team_leader" ? "PM" : r === "senior" ? "Senior" : r === "junior" ? "Junior" : r;
          addMessage(sysMsg([
            `Agent: ${agent.name}`,
            `  ID:       ${agent.id.slice(0, 8)}`,
            `  Role:     ${roleLabel(agent.role)}`,
            `  Status:   ${agent.status}`,
            `  Provider: ${agent.cli_provider ?? "(none)"}`,
            `  Model:    ${agent.api_model ?? "(none)"}`,
            agent.system_prompt ? `  System:   ${agent.system_prompt.slice(0, 60)}${agent.system_prompt.length > 60 ? "..." : ""}` : "",
          ].filter(Boolean).join("\n")));
        } catch {
          addMessage(sysMsg(`Failed to fetch agent: ${nameOrId}`));
        }
        return true;
      }

      addMessage(sysMsg("Unknown subcommand. Use: /agent list, /agent create, /agent edit, /agent show, /agent delete, /agent assign"));
      return true;
    }
    case "connect": {
      try {
        // /connect test <provider-id>
        if (args[0] === "test" && args[1]) {
          const providerId = args[1];
          const providers = await api.get<{
            ok: boolean;
            providers: Array<{ id: string; name: string }>;
          }>("/api/api-providers");
          const provider = (providers.providers ?? []).find((p) => p.id.startsWith(providerId));
          if (!provider) {
            addMessage(sysMsg(`Provider not found: ${providerId}`));
            return true;
          }
          const test = await api.post<{ ok: boolean; model_count?: number; error?: string }>(
            `/api/api-providers/${provider.id}/test`,
          );
          if (test.ok) {
            addMessage(sysMsg(`Provider "${provider.name}" test passed. ${test.model_count ?? 0} models.`));
          } else {
            addMessage(sysMsg(`Provider "${provider.name}" test failed: ${test.error ?? "unknown"}`));
          }
          return true;
        }

        // Fetch presets for both cases
        const presetsData = await api.get<{
          ok: boolean;
          presets: Record<string, { base_url: string }>;
        }>("/api/api-providers/presets");
        const presetMap = presetsData.presets ?? {};
        const presetList = Object.keys(presetMap);

        if (args.length === 0) {
          // Show CLI tools (auto-detected) + API providers
          const lines: string[] = ["LLM 연결 현황:", ""];

          // 1. CLI tools (locally installed)
          try {
            const cliData = await api.get<{
              providers: Record<string, { installed: boolean; authenticated: boolean; version?: string }>;
            }>("/api/cli-status");
            const cliProviders = cliData.providers ?? {};
            const cliEntries = Object.entries(cliProviders).filter(([, s]) => s.installed);
            if (cliEntries.length > 0) {
              lines.push("CLI 도구 (로컬 설치됨):");
              for (const [name, status] of cliEntries) {
                const auth = status.authenticated ? "[AUTH OK]" : "[AUTH REQ]";
                const ver = status.version ? ` v${status.version}` : "";
                lines.push(`  ${status.authenticated ? "●" : "○"} ${name}${ver}  ${auth}`);
              }
              lines.push("");
              lines.push("  → 에이전트에 CLI 프로바이더 지정:");
              lines.push("    /agent edit PM provider claude");
              lines.push("    /agent edit \"Backend Senior\" provider cursor");
              lines.push("");
            } else {
              lines.push("CLI 도구: 설치된 도구 없음");
              lines.push("  (Claude Code, Cursor 등을 먼저 설치하거나 API key 방식 사용)");
              lines.push("");
            }
          } catch {
            // skip cli status
          }

          // 2. API providers
          lines.push("API 프로바이더 추가:");
          lines.push(...presetList.map((p) => `  /connect ${p} <api-key>`));
          lines.push("  /connect ollama  (no key needed)");
          addMessage(sysMsg(lines.join("\n")));
          return true;
        }

        // /connect detect — auto-assign CLI providers to agents
        if (args[0] === "detect") {
          addMessage(sysMsg("CLI 도구 감지 중..."));
          try {
            const cliData = await api.get<{
              providers: Record<string, { installed: boolean; authenticated: boolean }>;
            }>("/api/cli-status?refresh=1");
            const ready = Object.entries(cliData.providers ?? {})
              .filter(([, s]) => s.installed && s.authenticated)
              .map(([name]) => name);

            if (ready.length === 0) {
              addMessage(sysMsg("인증된 CLI 도구가 없습니다. Claude Code나 Cursor에 먼저 로그인하세요."));
              return true;
            }

            const agentsData = await api.get<{ agents: Array<{ id: string; name: string; cli_provider?: string | null }> }>("/api/agents");
            const agentsList = agentsData.agents ?? [];
            const defaultProvider = ready[0];
            let updated = 0;
            for (const agent of agentsList) {
              await api.patch(`/api/agents/${agent.id}`, { cli_provider: defaultProvider });
              updated++;
            }
            addMessage(sysMsg([
              `감지된 CLI 도구: ${ready.join(", ")}`,
              `${updated}개 에이전트에 "${defaultProvider}" 프로바이더 지정 완료.`,
              "",
              "사이드바 에이전트 목록이 초록색으로 변경됩니다.",
              "",
              "특정 에이전트에 다른 도구 지정:",
              `/agent edit <name> provider ${ready.join("|")}`,
            ].join("\n")));
          } catch {
            addMessage(sysMsg("CLI 감지 실패."));
          }
          return true;
        }

        // /connect <type> [api-key]
        const providerType = args[0].toLowerCase();
        const apiKey = args.slice(1).join(" ");

        const preset = presetMap[providerType];
        if (!preset) {
          addMessage(sysMsg(`Unknown provider type: ${providerType}. Available: ${presetList.join(", ")}`));
          return true;
        }

        const name = providerType.charAt(0).toUpperCase() + providerType.slice(1);
        const result = await api.post<{ ok: boolean; id: string }>("/api/api-providers", {
          name,
          type: providerType,
          base_url: preset.base_url,
          api_key: apiKey,
        });

        if (apiKey || providerType === "ollama") {
          const test = await api.post<{ ok: boolean; model_count?: number; models?: string[]; error?: string }>(
            `/api/api-providers/${result.id}/test`,
          );
          if (test.ok) {
            addMessage(
              sysMsg(`Provider "${name}" connected. ${test.model_count ?? 0} models available.`),
            );
          } else {
            addMessage(
              sysMsg(`Provider "${name}" added but test failed: ${test.error ?? "unknown error"}`),
            );
          }
        } else {
          addMessage(
            sysMsg(
              `Provider "${name}" added. Use /connect test ${result.id.slice(0, 8)} to verify.`,
            ),
          );
        }
      } catch {
        addMessage(sysMsg("Failed to connect provider."));
      }
      return true;
    }
    case "providers": {
      try {
        const data = await api.get<{
          ok: boolean;
          providers: Array<{ id: string; name: string; type: string; enabled: boolean; models_cache?: string[] }>;
        }>("/api/api-providers");
        const providers = data.providers ?? [];
        if (providers.length === 0) {
          addMessage(sysMsg("No providers configured. Use /connect to add one."));
        } else {
          const lines = providers.map(
            (p) =>
              `  ${p.id.slice(0, 8)}  ${p.type.padEnd(12)}  ${p.name.padEnd(16)}  ${(p.models_cache?.length ?? 0)} models  ${p.enabled ? "active" : "disabled"}`,
          );
          addMessage(
            sysMsg(
              ["Providers:", "  ID        TYPE          NAME              MODELS  STATUS", ...lines].join("\n"),
            ),
          );
        }
      } catch {
        addMessage(sysMsg("Failed to fetch providers."));
      }
      return true;
    }
    case "models": {
      try {
        const data = await api.get<{
          ok: boolean;
          providers: Array<{ id: string; name: string; type: string; models_cache?: string[] }>;
        }>("/api/api-providers");
        const providers = data.providers ?? [];
        if (providers.length === 0) {
          addMessage(sysMsg("No providers. Use /connect first."));
        } else {
          const lines: string[] = ["Models:"];
          for (const p of providers) {
            if (p.models_cache && p.models_cache.length > 0) {
              lines.push(`  ${p.name} (${p.type}):`);
              for (const m of p.models_cache.slice(0, 10)) {
                lines.push(`    ${m}`);
              }
              if (p.models_cache.length > 10) {
                lines.push(`    +${p.models_cache.length - 10} more`);
              }
            }
          }
          if (lines.length === 1) {
            lines.push("  No models cached. Use /connect test <id> to refresh.");
          }
          addMessage(sysMsg(lines.join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch models."));
      }
      return true;
    }
    case "projects": {
      if (args.length > 0) {
        // Switch to project by ID (or ID prefix)
        const projectIdArg = args[0];
        try {
          const data = await api.get<{ projects: { id: string; name: string; status: string }[] }>("/api/projects");
          const rows = data.projects ?? [];
          const match = rows.find((p) => p.id === projectIdArg || p.id.startsWith(projectIdArg));
          if (!match) {
            addMessage(sysMsg(`No project found matching: ${projectIdArg}`));
          } else {
            extras.setProjectId(match.id);
            addMessage(sysMsg(`Switched to project: ${match.name} (${match.id.slice(0, 8)})`));
          }
        } catch {
          addMessage(sysMsg("Failed to fetch projects."));
        }
      } else {
        // List projects
        try {
          const data = await api.get<{ projects: { id: string; name: string; status: string; core_goal?: string }[] }>(
            "/api/projects",
          );
          const rows = data.projects ?? [];
          if (rows.length === 0) {
            addMessage(sysMsg("No projects."));
          } else {
            const lines = rows.map((p) => `${p.id.slice(0, 8)}  ${(p.status ?? "?").padEnd(10)}  ${p.name}`);
            addMessage(sysMsg(["ID        STATUS      NAME", ...lines].join("\n")));
          }
        } catch {
          addMessage(sysMsg("Failed to fetch projects."));
        }
      }
      return true;
    }
    case "import": {
      // Import current directory (or specified path) as a project
      const dirArg = args[0];
      try {
        const { execSync } = await import("child_process");
        const cwd = dirArg ?? process.cwd();

        // Detect git remote for github_repo
        let githubRepo: string | null = null;
        try {
          const remote = execSync("git remote get-url origin", { cwd, encoding: "utf8" }).trim();
          const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
          if (m) githubRepo = m[1];
        } catch {
          // not a git repo or no remote
        }

        // Detect git branch
        let branch: string | null = null;
        try {
          branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf8" }).trim();
        } catch {
          // ignore
        }

        // Check if a project already exists with this path
        const data = await api.get<{ projects: Array<{ id: string; name: string; project_path: string }> }>("/api/projects");
        const existing = (data.projects ?? []).find((p) => p.project_path === cwd);
        if (existing) {
          extras.setProjectId(existing.id);
          addMessage(sysMsg(`Switched to existing project: ${existing.name} (${existing.id.slice(0, 8)})${branch ? ` [${branch}]` : ""}`));
          return true;
        }

        // Create new project from this directory
        const dirName = cwd.split(/[\\/]/).filter(Boolean).pop() ?? "project";
        const goal = args.slice(1).join(" ") || `Work on ${dirName}`;
        const created = await api.post<{ id: string; name: string }>("/api/projects", {
          name: dirName,
          project_path: cwd,
          core_goal: goal,
          github_repo: githubRepo,
        });
        extras.setProjectId(created.id);
        addMessage(sysMsg([
          `Project imported: ${created.name} (${created.id.slice(0, 8)})`,
          `  Path: ${cwd}`,
          githubRepo ? `  GitHub: ${githubRepo}` : "",
          branch ? `  Branch: ${branch}` : "",
          "",
          "Run /kickoff to start PM orchestration.",
        ].filter(Boolean).join("\n")));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addMessage(sysMsg(`Failed to import project: ${msg}`));
      }
      return true;
    }
    case "kickoff": {
      // /kickoff [goal...] — create project (if needed) + start kickoff
      const projectId = extras.projectId;
      const goalText = args.join(" ") || null;

      if (projectId) {
        // Active project exists — kickoff directly
        try {
          await api.post(`/api/projects/${projectId}/kickoff`, { yolo: false });
          addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          addMessage(sysMsg(`Kickoff failed: ${msg}`));
        }
      } else if (goalText) {
        // No active project — create one from goal text
        try {
          const project = await api.post<{ id: string; name: string }>("/api/projects", {
            name: goalText.slice(0, 60),
            core_goal: goalText,
            project_path: process.cwd(),
          });
          extras.setProjectId(project.id);
          addMessage(sysMsg(`Project created: ${project.name} (${project.id.slice(0, 8)})`));
          await api.post(`/api/projects/${project.id}/kickoff`, { yolo: false });
          addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
        } catch {
          addMessage(sysMsg("Failed to create/kickoff project."));
        }
      } else {
        addMessage(sysMsg("Usage: /kickoff <goal>\n  Or set a project first with /import, then /kickoff"));
      }
      return true;
    }
    case "new": {
      try {
        const session = await api.post<{ id: string }>("/api/tui/sessions", { mode: "build" });
        extras.clearMessages();
        extras.setSessionId(session.id);
        addMessage(sysMsg("New session created."));
      } catch {
        addMessage(sysMsg("Failed to create new session."));
      }
      return true;
    }
    case "setup": {
      if (args[0] === "quick") {
        // Create default dev team directly via API
        addMessage(sysMsg("기본 dev 팀 생성 중..."));
        const defaultAgents = [
          { name: "PM", role: "team_leader", department_id: "planning" },
          { name: "Backend Senior", role: "senior", department_id: "dev" },
          { name: "Frontend Senior", role: "senior", department_id: "dev" },
          { name: "QA", role: "junior", department_id: "qa" },
        ];
        let created = 0;
        let skipped = 0;
        for (const agent of defaultAgents) {
          try {
            await api.post("/api/agents", agent);
            created++;
          } catch {
            skipped++;
          }
        }
        addMessage(sysMsg([
          `완료: ${created}개 에이전트 생성${skipped > 0 ? `, ${skipped}개 스킵` : ""}.`,
          "",
          "다음 단계: /connect anthropic <api-key> 로 LLM 연결",
          "모델 지정: /agent edit PM model claude-opus-4-6",
        ].join("\n")));
        return true;
      }

      // Show setup guide
      let agentCount = 0;
      let hasModel = false;
      try {
        const data = await api.get<{ agents: Array<{ api_model?: string | null }> }>("/api/agents");
        agentCount = data.agents?.length ?? 0;
        hasModel = (data.agents ?? []).some((a) => !!a.api_model);
      } catch {
        // ignore
      }

      const lines = ["Setup 가이드:", ""];
      if (agentCount === 0) {
        lines.push("  [1/3] 에이전트 생성");
        lines.push("        /setup quick  — PM + Backend + Frontend + QA 자동 생성");
        lines.push('        /agent create "Backend Sr" senior  — 수동 생성');
        lines.push("");
      } else {
        lines.push(`  [v] 에이전트 ${agentCount}개 등록됨`);
        lines.push("");
      }
      lines.push("  [2/3] LLM 프로바이더 연결");
      lines.push("        /connect detect              — 설치된 CLI 도구 자동 감지 (Claude Code, Cursor)");
      lines.push("        /connect anthropic sk-ant-xxxxx  — API key 방식");
      lines.push("        /connect openai sk-xxxxx");
      lines.push("        /connect ollama");
      lines.push("");
      if (!hasModel && agentCount > 0) {
        lines.push("  [3/3] 에이전트에 모델 지정");
        lines.push("        /agent edit PM model claude-opus-4-6");
        lines.push("        /agent edit \"Backend Senior\" model claude-sonnet-4-6");
      } else if (hasModel) {
        lines.push("  [v] 모델 연결됨 — /kickoff 으로 프로젝트 시작");
      } else {
        lines.push("  [3/3] 에이전트에 모델 지정");
        lines.push("        /agent edit <name> model <model-id>");
      }
      lines.push("");
      lines.push("  GUI 설정: /open");
      addMessage(sysMsg(lines.join("\n")));
      return true;
    }
    case "plan":
      setMode("plan");
      addMessage(sysMsg("Switched to Plan mode."));
      return true;
    case "build":
      setMode("build");
      addMessage(sysMsg("Switched to Build mode."));
      return true;
    case "yolo":
      setMode("yolo");
      addMessage(sysMsg("Switched to YOLO mode. PM auto-decides everything."));
      return true;
    case "open": {
      const port = process.env["AGENTDESK_WEB_PORT"] ?? 8800;
      const url = `http://localhost:${port}`;
      addMessage(sysMsg(`Opening ${url} ...`));
      const { exec } = await import("child_process");
      const openCmd =
        process.platform === "win32"
          ? `start ${url}`
          : process.platform === "darwin"
            ? `open ${url}`
            : `xdg-open ${url}`;
      exec(openCmd);
      return true;
    }
    case "help":
      addMessage(
        sysMsg(
          [
            "Available commands:",
            "",
            "Setup:",
            "  /connect                    Show CLI tools + API providers",
            "  /connect detect             Auto-detect & assign CLI tools to agents",
            "  /connect <type> <key>       Add API provider (anthropic/openai/ollama)",
            "  /providers                  List API providers",
            "  /models                     List models",
            "  /setup quick                Auto-create dev team",
            "",
            "Agents:",
            "  /agent create <n> <r>       Create agent",
            "  /agent list                 List agents",
            "  /agent show <name>          Show agent details",
            "  /agent edit <n> <f> <v>     Edit field (name/model/provider/role/system)",
            "  /agent delete <name>        Delete agent",
            "  /agent assign <n> <p> <m>   Assign model",
            "",
            "Project:",
            "  /status                     Overview",
            "  /tasks                      Task list",
            "  /projects [id]              List/switch projects",
            "  /import [path] [goal]        Import current dir (or path) as project",
            "  /logs [task-id]             Recent logs",
            "",
            "PM Decisions:",
            "  /inbox                      Pending reviews",
            "  /approve [id]               Approve task",
            "  /revise <id> <feedback>     Request revision",
            "",
            "Library:",
            "  /skills [add|delete]        Manage skills",
            "  /rules [add|delete]         Manage rules",
            "  /memory [add|delete]        Manage memory",
            "  /hooks [add|delete]         Manage hooks",
            "",
            "Monitoring:",
            "  /cost                       Cost breakdown",
            "  /usage [daily]              Token usage",
            "",
            "Session:",
            "  /new                        New session",
            "  /sessions                   List sessions",
            "  /fork                       Fork session",
            "  /resume <id>                Resume session",
            "",
            "System:",
            "  /plan /build /yolo          Switch mode",
            "  /details                    Toggle details",
            "  /lang                       Change language",
            "  /open                       Open GUI",
            "  /help                       This help",
            "  /quit                       Exit",
            "",
            "Leader keys (Ctrl+X then):  s=status  t=tasks  a=agents",
            "  n=new  f=fork  d=details  p=providers  m=models  c=cost  q=quit  h=help",
          ].join("\n"),
        ),
      );
      return true;
    case "lang": {
      const reset = extras.resetLanguage;
      if (reset) {
        reset();
      }
      return true;
    }
    case "details": {
      const toggle = extras.toggleDetails;
      if (toggle) {
        toggle();
        const nextState = extras.showDetails ? "hidden" : "shown";
        addMessage(sysMsg(`Tool details ${nextState}.`));
      }
      return true;
    }
    case "inbox": {
      try {
        const data = await api.get<{ tasks: Array<{ id: string; title: string; status: string; agent_name?: string }> }>("/api/tasks?status=review");
        const tasks = data.tasks ?? [];
        if (tasks.length === 0) {
          addMessage(sysMsg("No pending decisions."));
        } else {
          const lines = tasks.map(t => `  ${t.id.slice(0,8)}  ${(t.agent_name ?? "-").padEnd(14)}  ${t.title}`);
          addMessage(sysMsg(["Pending reviews:", "  ID        AGENT           TITLE", ...lines, "", "Use /approve <id> or /revise <id> <feedback>"].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch review tasks."));
      }
      return true;
    }
    case "approve": {
      try {
        let taskId = args[0];
        const tasksData = await api.get<{ tasks: Array<{ id: string }> }>("/api/tasks?status=review");
        const reviewTasks = tasksData.tasks ?? [];
        if (!taskId) {
          const first = reviewTasks[0];
          if (!first) {
            addMessage(sysMsg("No tasks awaiting review."));
            return true;
          }
          taskId = first.id;
        } else {
          const match = reviewTasks.find(t => t.id.startsWith(taskId!));
          if (!match) {
            addMessage(sysMsg(`No review task found: ${taskId}`));
            return true;
          }
          taskId = match.id;
        }
        await api.patch(`/api/tasks/${taskId}`, { status: "done" });
        addMessage(sysMsg(`Task ${taskId.slice(0,8)} approved.`));
      } catch {
        addMessage(sysMsg("Failed to approve task."));
      }
      return true;
    }
    case "revise": {
      try {
        const taskIdArg = args[0];
        const feedback = args.slice(1).join(" ");
        if (!taskIdArg) {
          addMessage(sysMsg("Usage: /revise <task-id> <feedback>"));
          return true;
        }
        const tasksData = await api.get<{ tasks: Array<{ id: string }> }>("/api/tasks?status=review");
        const match = (tasksData.tasks ?? []).find(t => t.id.startsWith(taskIdArg));
        if (!match) {
          addMessage(sysMsg(`No review task found: ${taskIdArg}`));
          return true;
        }
        await api.patch(`/api/tasks/${match.id}`, { status: "planned" });
        if (feedback) {
          await api.post(`/api/tasks/${match.id}/inject`, { message: feedback });
        }
        addMessage(sysMsg(`Task ${match.id.slice(0,8)} sent back for revision.${feedback ? ` Feedback: ${feedback}` : ""}`));
      } catch {
        addMessage(sysMsg("Failed to revise task."));
      }
      return true;
    }
    case "skills": {
      try {
        if (args[0] === "add" && args[1]) {
          const name = args[1];
          const content = args.slice(2).join(" ") || "Custom skill";
          await api.post("/api/skills/custom", { name, content });
          addMessage(sysMsg(`Skill "${name}" added.`));
          return true;
        }
        if (args[0] === "delete" && args[1]) {
          await api.del(`/api/skills/custom/${encodeURIComponent(args[1])}`);
          addMessage(sysMsg(`Skill "${args[1]}" deleted.`));
          return true;
        }
        const data = await api.get<{ ok: boolean; skills?: Array<{ name: string; description?: string }> }>("/api/skills/custom");
        const skills = data.skills ?? [];
        if (skills.length === 0) {
          addMessage(sysMsg("No custom skills. Use /skills add <name> <content>"));
        } else {
          const lines = skills.map(s => `  ${s.name.padEnd(20)} ${s.description ?? ""}`);
          addMessage(sysMsg(["Skills:", ...lines].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch skills."));
      }
      return true;
    }
    case "rules": {
      try {
        if (args[0] === "add" && args[1]) {
          const content = args.slice(1).join(" ");
          await api.post("/api/agent-rules", { content, category: "general" });
          addMessage(sysMsg("Rule added."));
          return true;
        }
        if (args[0] === "delete" && args[1]) {
          await api.del(`/api/agent-rules/${args[1]}`);
          addMessage(sysMsg("Rule deleted."));
          return true;
        }
        const data = await api.get<Array<{ id: string; content: string; category?: string }>>("/api/agent-rules");
        const rules = Array.isArray(data) ? data : [];
        if (rules.length === 0) {
          addMessage(sysMsg("No rules. Use /rules add <content>"));
        } else {
          const lines = rules.slice(0, 15).map(r => `  ${r.id.slice(0,8)}  [${r.category ?? "general"}] ${r.content.slice(0, 50)}`);
          addMessage(sysMsg(["Rules:", ...lines, rules.length > 15 ? `  +${rules.length - 15} more` : ""].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch rules."));
      }
      return true;
    }
    case "memory": {
      try {
        if (args[0] === "add" && args[1]) {
          const content = args.slice(1).join(" ");
          await api.post("/api/memory", { content, category: "knowledge" });
          addMessage(sysMsg("Memory added."));
          return true;
        }
        if (args[0] === "delete" && args[1]) {
          await api.del(`/api/memory/${args[1]}`);
          addMessage(sysMsg("Memory deleted."));
          return true;
        }
        const data = await api.get<Array<{ id: string; content: string; category?: string }>>("/api/memory");
        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
          addMessage(sysMsg("No memory entries. Use /memory add <content>"));
        } else {
          const lines = rows.slice(0, 15).map(r => `  ${r.id.slice(0,8)}  [${r.category ?? "?"}] ${r.content.slice(0, 50)}`);
          addMessage(sysMsg(["Memory:", ...lines, rows.length > 15 ? `  +${rows.length - 15} more` : ""].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch memory."));
      }
      return true;
    }
    case "hooks": {
      try {
        if (args[0] === "add" && args[1] && args[2]) {
          const event = args[1];
          const action = args.slice(2).join(" ");
          await api.post("/api/hooks", { event, action });
          addMessage(sysMsg(`Hook added: ${event} -> ${action}`));
          return true;
        }
        if (args[0] === "delete" && args[1]) {
          await api.del(`/api/hooks/${args[1]}`);
          addMessage(sysMsg("Hook deleted."));
          return true;
        }
        const data = await api.get<Array<{ id: string; event: string; action: string }>>("/api/hooks");
        const hookRows = Array.isArray(data) ? data : [];
        if (hookRows.length === 0) {
          addMessage(sysMsg("No hooks. Use /hooks add <event> <action>"));
        } else {
          const lines = hookRows.map(r => `  ${r.id.slice(0,8)}  ${r.event.padEnd(16)} ${r.action.slice(0, 40)}`);
          addMessage(sysMsg(["Hooks:", ...lines].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch hooks."));
      }
      return true;
    }
    case "cost": {
      try {
        const data = await api.get<{ ok: boolean; usage?: Array<{ agent_name?: string; run_count?: number; total_duration_ms?: number; success_count?: number; failure_count?: number }> }>("/api/agent-usage");
        const usageRows = data.usage ?? [];
        const totalRuns = usageRows.reduce((s, u) => s + (u.run_count ?? 0), 0);
        const totalMs = usageRows.reduce((s, u) => s + (u.total_duration_ms ?? 0), 0);
        const totalSec = Math.round(totalMs / 1000);
        const lines = [
          `Total runs: ${totalRuns}  Total duration: ${totalSec}s`,
        ];
        if (usageRows.length > 0) {
          lines.push("", "By agent:");
          for (const u of usageRows) {
            const dur = Math.round((u.total_duration_ms ?? 0) / 1000);
            lines.push(`  ${(u.agent_name ?? "-").padEnd(20)} ${String(u.run_count ?? 0).padEnd(6)} runs  ${dur}s`);
          }
        }
        addMessage(sysMsg(lines.join("\n")));
      } catch {
        addMessage(sysMsg("Failed to fetch cost data."));
      }
      return true;
    }
    case "usage": {
      try {
        if (args[0] === "daily") {
          const data = await api.get<{ ok: boolean; daily?: Array<{ day_epoch: number; provider?: string; run_count?: number; total_duration_ms?: number }> }>("/api/agent-usage/trends/daily");
          const daily = data.daily ?? [];
          if (daily.length === 0) {
            addMessage(sysMsg("No usage data yet."));
          } else {
            const lines = daily.slice(-7).map(d => {
              const date = new Date(d.day_epoch * 86400000).toISOString().slice(0, 10);
              const dur = Math.round((d.total_duration_ms ?? 0) / 1000);
              return `  ${date}  ${String(d.run_count ?? 0).padEnd(6)} runs  ${dur}s`;
            });
            addMessage(sysMsg(["Daily usage (last 7 days):", "  DATE        RUNS   DURATION", ...lines].join("\n")));
          }
          return true;
        }
        const data = await api.get<{ ok: boolean; usage?: Array<{ run_count?: number; total_duration_ms?: number }> }>("/api/agent-usage");
        const usageRows = data.usage ?? [];
        const totalRuns = usageRows.reduce((s, u) => s + (u.run_count ?? 0), 0);
        const totalSec = Math.round(usageRows.reduce((s, u) => s + (u.total_duration_ms ?? 0), 0) / 1000);
        addMessage(sysMsg(`Runs: ${totalRuns}  Duration: ${totalSec}s\n\nUse /usage daily for trends.`));
      } catch {
        addMessage(sysMsg("Failed to fetch usage data."));
      }
      return true;
    }
    case "sessions": {
      try {
        const data = await api.get<{ ok: boolean; rows: Array<{ id: string; mode: string; created_at: number; updated_at: number; project_id?: string }> }>("/api/tui/sessions");
        const sessions = data.rows ?? [];
        if (sessions.length === 0) {
          addMessage(sysMsg("No sessions."));
        } else {
          const lines = sessions.slice(0, 10).map(s => {
            const age = Math.floor((Date.now() - s.created_at) / 60000);
            const timeStr = age >= 60 ? `${Math.floor(age/60)}h${age%60}m` : `${age}m`;
            return `  ${s.id.slice(0,8)}  ${s.mode.padEnd(6)}  ${timeStr} ago`;
          });
          addMessage(sysMsg(["Sessions:", ...lines].join("\n")));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch sessions."));
      }
      return true;
    }
    case "fork": {
      if (extras.forkSession) {
        try {
          await extras.forkSession();
        } catch {
          addMessage(sysMsg("Failed to fork session."));
        }
      } else {
        addMessage(sysMsg("Session fork not available."));
      }
      return true;
    }
    case "resume": {
      const sessionId = args[0];
      if (!sessionId) {
        addMessage(sysMsg("Usage: /resume <session-id>"));
        return true;
      }
      try {
        const data = await api.get<{ ok: boolean; rows: Array<{ role: string; content: string; agent_name?: string; created_at: number }> }>(
          `/api/tui/sessions/${sessionId}/messages`
        );
        extras.clearMessages();
        extras.setSessionId(sessionId);
        const msgs = (data.rows ?? []).map((m, i) => ({
          id: `resume-${i}`,
          role: m.role as "user" | "pm" | "agent" | "system",
          content: m.content,
          agentName: m.agent_name,
          timestamp: m.created_at,
        }));
        for (const msg of msgs) addMessage(msg);
        addMessage(sysMsg("Session resumed."));
      } catch {
        addMessage(sysMsg(`Failed to resume session: ${sessionId}`));
      }
      return true;
    }
    case "logs": {
      try {
        const taskIdArg = args[0];
        if (taskIdArg) {
          const tasksData = await api.get<{ tasks: Array<{ id: string; title: string }> }>("/api/tasks");
          const task = (tasksData.tasks ?? []).find(t => t.id.startsWith(taskIdArg));
          if (!task) {
            addMessage(sysMsg(`Task not found: ${taskIdArg}`));
            return true;
          }
          const taskData = await api.get<{ task: { id: string; title: string }; logs: Array<{ id: string; content: string; created_at: number }> }>(`/api/tasks/${task.id}`);
          const logRows = taskData.logs ?? [];
          if (logRows.length === 0) {
            addMessage(sysMsg(`No logs for task ${task.id.slice(0,8)}.`));
          } else {
            const lines = logRows.slice(-20).map(l => l.content);
            addMessage(sysMsg([`Logs for ${task.title}:`, ...lines].join("\n")));
          }
        } else {
          addMessage(sysMsg("Usage: /logs <task-id>"));
        }
      } catch {
        addMessage(sysMsg("Failed to fetch logs."));
      }
      return true;
    }
    case "quit":
    case "q":
    case "exit":
      exit();
      return true;
    default:
      addMessage(sysMsg(`Unknown command: /${cmd}. Type /help for available commands.`));
      return true;
  }
}
