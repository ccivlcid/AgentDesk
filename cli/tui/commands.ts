import { api } from "../lib/api.js";
import type { ChatMessage } from "./App.js";
import type { Agent, Task } from "../../shared/types.js";

type AddMessage = (msg: ChatMessage) => void;

interface CommandExtras {
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  setProjectId: (id: string | null) => void;
  projectId: string | null;
  showDetails?: boolean;
  toggleDetails?: () => void;
  resetLanguage?: () => void;
  forkSession?: () => Promise<void>;
}

function sysMsg(content: string): ChatMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "system",
    content,
    timestamp: Date.now(),
  };
}

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
          api.get<{ rows: { id: string; name: string; status: string }[] }>("/api/projects"),
          api.get<{ rows: { id: string; status: string }[] }>("/api/tasks?status=in_progress"),
          api.get<{ rows: { id: string; name: string; status: string }[] }>("/api/agents"),
        ]);
        const lines = [
          `Projects: ${projects.rows?.length ?? 0}`,
          `Active tasks: ${tasks.rows?.length ?? 0}`,
          `Agents: ${agents.rows?.length ?? 0}`,
        ];
        addMessage(sysMsg(lines.join("\n")));
      } catch {
        addMessage(sysMsg("Failed to fetch status."));
      }
      return true;
    }
    case "tasks": {
      try {
        const data = await api.get<{ rows: Pick<Task, "id" | "title" | "status" | "agent_name">[] }>("/api/tasks");
        const rows = data.rows ?? [];
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
        const data = await api.get<{ rows: Pick<Agent, "id" | "name" | "role" | "status">[] }>("/api/agents");
        const rows = data.rows ?? [];
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
          const data = await api.get<{ rows: Pick<Agent, "id" | "name" | "role" | "status">[] }>("/api/agents");
          const rows = data.rows ?? [];
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
          const agentsData = await api.get<{ rows: Array<{ id: string; name: string }> }>("/api/agents");
          const agentsList = agentsData.rows ?? [];
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
          const agentsData = await api.get<{ rows: Array<{ id: string; name: string }> }>("/api/agents");
          const agentsList = agentsData.rows ?? [];
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
        addMessage(sysMsg("Agent editing via /agent edit is not yet supported. Use /open for GUI."));
        return true;
      }

      addMessage(sysMsg("Unknown subcommand. Use: /agent create, /agent list, /agent delete, /agent assign"));
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
          // Show usage
          addMessage(
            sysMsg(
              [
                "Available providers:",
                ...presetList.map((p, i) => `  ${i + 1}. ${p}`),
                "",
                "Usage: /connect <type> <api-key>",
                "Example: /connect anthropic sk-ant-api03-xxxxx",
                "         /connect openai sk-xxxxx",
                "         /connect ollama (no key needed)",
              ].join("\n"),
            ),
          );
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
          const data = await api.get<{ rows: { id: string; name: string; status: string }[] }>("/api/projects");
          const rows = data.rows ?? [];
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
          const data = await api.get<{ rows: { id: string; name: string; status: string; core_goal?: string }[] }>(
            "/api/projects",
          );
          const rows = data.rows ?? [];
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
      try {
        const agents = await api.get<{ rows: unknown[] }>("/api/agents");
        if ((agents.rows?.length ?? 0) > 0) {
          addMessage(sysMsg(`${agents.rows.length} agents already configured. Use /agents to view.`));
          return true;
        }
      } catch {
        // ignore — show setup options anyway
      }
      addMessage(
        sysMsg(
          [
            "Setup options:",
            "  Type 'quick' — Auto-create dev team (PM + Backend + Frontend + QA)",
            "  Type '/open'  — Open GUI for detailed setup",
          ].join("\n"),
        ),
      );
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
            "  /connect [type] [key]       Add LLM provider",
            "  /providers                  List providers",
            "  /models                     List models",
            "  /setup quick                Auto-create dev team",
            "",
            "Agents:",
            "  /agent create <n> <r>       Create agent",
            "  /agent list                 List agents",
            "  /agent delete <name>        Delete agent",
            "  /agent assign <n> <p> <m>   Assign model",
            "",
            "Project:",
            "  /status                     Overview",
            "  /tasks                      Task list",
            "  /projects [id]              List/switch projects",
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
        const data = await api.get<{ rows: Array<{ id: string; title: string; status: string; agent_name?: string }> }>("/api/tasks?status=review");
        const tasks = data.rows ?? [];
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
        const tasksData = await api.get<{ rows: Array<{ id: string }> }>("/api/tasks?status=review");
        const reviewTasks = tasksData.rows ?? [];
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
        const tasksData = await api.get<{ rows: Array<{ id: string }> }>("/api/tasks?status=review");
        const match = (tasksData.rows ?? []).find(t => t.id.startsWith(taskIdArg));
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
        const data = await api.get<{ ok: boolean; rows?: Array<{ id: string; content: string; category?: string }> }>("/api/agent-rules");
        const rules = data.rows ?? [];
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
        const data = await api.get<{ ok: boolean; rows?: Array<{ id: string; content: string; category?: string }> }>("/api/memory");
        const rows = data.rows ?? [];
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
        const data = await api.get<{ ok: boolean; rows?: Array<{ id: string; event: string; action: string }> }>("/api/hooks");
        const hookRows = data.rows ?? [];
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
        const data = await api.get<{ ok: boolean; total_tokens?: number; total_cost?: number; by_agent?: Array<{ agent_name: string; tokens: number; cost: number }> }>("/api/agent-usage");
        const total = data.total_tokens ?? 0;
        const cost = data.total_cost ?? 0;
        const agents = data.by_agent ?? [];
        const lines = [
          `Total: ${total >= 1000 ? Math.round(total/1000) + "k" : total} tokens  $${cost.toFixed(2)}`,
        ];
        if (agents.length > 0) {
          lines.push("", "By agent:");
          for (const a of agents) {
            lines.push(`  ${a.agent_name.padEnd(20)} ${String(a.tokens).padEnd(10)} $${a.cost.toFixed(2)}`);
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
          const data = await api.get<{ ok: boolean; trends?: Array<{ date: string; tokens: number; cost: number }> }>("/api/agent-usage/trends/daily");
          const trends = data.trends ?? [];
          if (trends.length === 0) {
            addMessage(sysMsg("No usage data yet."));
          } else {
            const lines = trends.slice(-7).map(t => `  ${t.date}  ${String(t.tokens).padEnd(10)} $${t.cost.toFixed(2)}`);
            addMessage(sysMsg(["Daily usage (last 7 days):", "  DATE        TOKENS     COST", ...lines].join("\n")));
          }
          return true;
        }
        const data = await api.get<{ ok: boolean; total_tokens?: number; total_cost?: number }>("/api/agent-usage");
        addMessage(sysMsg(`Tokens: ${data.total_tokens ?? 0}  Cost: $${(data.total_cost ?? 0).toFixed(2)}\n\nUse /usage daily for trends.`));
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
          const tasksData = await api.get<{ rows: Array<{ id: string; title: string }> }>("/api/tasks");
          const task = (tasksData.rows ?? []).find(t => t.id.startsWith(taskIdArg));
          if (!task) {
            addMessage(sysMsg(`Task not found: ${taskIdArg}`));
            return true;
          }
          const logsData = await api.get<{ rows: Array<{ id: string; content: string; created_at: number }> }>(`/api/tasks/${task.id}/logs`);
          const logRows = logsData.rows ?? [];
          if (logRows.length === 0) {
            addMessage(sysMsg(`No logs for task ${task.id.slice(0,8)}.`));
          } else {
            const lines = logRows.slice(-20).map(l => l.content);
            addMessage(sysMsg([`Logs for ${task.title}:`, ...lines].join("\n")));
          }
        } else {
          const logsData = await api.get<{ rows: Array<{ id: string; content: string; task_id?: string; created_at: number }> }>("/api/task-logs?limit=20");
          const logRows = logsData.rows ?? [];
          if (logRows.length === 0) {
            addMessage(sysMsg("No recent logs."));
          } else {
            const lines = logRows.map(l => `  ${l.task_id?.slice(0,8) ?? "?"}  ${l.content.slice(0, 80)}`);
            addMessage(sysMsg(["Recent logs (last 20):", ...lines].join("\n")));
          }
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
