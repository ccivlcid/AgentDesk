/**
 * Blessed-based TUI entry point — replaces ink-based index.tsx + App.tsx.
 * Wires services, widgets, and key bindings into a cohesive TUI.
 */
import blessed from "neo-blessed";
import { SessionService } from "./services/SessionService.js";
import { WebSocketService } from "./services/WebSocketService.js";
import { SidebarService } from "./services/SidebarService.js";
import { InputService } from "./services/InputService.js";
import { ChatWidget } from "./widgets/ChatWidget.js";
import { InputWidget } from "./widgets/InputWidget.js";
import { SidebarWidget } from "./widgets/SidebarWidget.js";
import { StatusBarWidget } from "./widgets/StatusBarWidget.js";
import { TerminalWidget } from "./widgets/TerminalWidget.js";
import { handleSlashCommand } from "./commands.js";
import { interpret } from "./hooks/useInterpret.js";
import { loadCliSettings, saveCliSettings } from "../lib/settings.js";
import { api } from "../lib/api.js";
import { getWelcomeMessage } from "./welcome-messages.js";
import type { ChatMessage, PendingAction } from "./types.js";
import { sysMsg } from "./types.js";

// ── Layout constants ───────────────────────────────────────────
const SIDEBAR_WIDTH = 36;
const STATUSBAR_HEIGHT = 2;
const INPUT_HEIGHT = 3;

export async function startTui(): Promise<void> {
  // ── Screen ──
  const screen = blessed.screen({
    smartCSR: true,
    title: "AgentDesk",
    fullUnicode: true,
  });

  // ── State ──
  let mode: "plan" | "build" | "yolo" = "build";
  let pendingAction: PendingAction | null = null;
  let showHints = false;
  let showDetails = false;
  let terminalVisible = true;
  const sessionStart = Date.now();
  let sessionMinutes = 0;

  // ── Services ──
  const sessionSvc = new SessionService();
  const wsSvc = new WebSocketService();
  const sidebarSvc = new SidebarService();
  const inputSvc = new InputService();

  // ── Widgets ──
  const chatWidget = new ChatWidget({
    top: 0,
    left: 0,
    width: `100%-${SIDEBAR_WIDTH}`,
    height: `100%-${STATUSBAR_HEIGHT + INPUT_HEIGHT + 12}`, // reserve space for terminal
    label: " Chat ",
    border: { type: "line" },
    style: { border: { fg: "gray" } },
  });
  screen.append(chatWidget.element);

  const termWidget = await TerminalWidget.create(screen, {
    bottom: STATUSBAR_HEIGHT + INPUT_HEIGHT,
    left: 0,
    width: `100%-${SIDEBAR_WIDTH}`,
    height: 12,
  });

  const sidebarWidget = new SidebarWidget({
    top: 0,
    right: 0,
    width: SIDEBAR_WIDTH,
    height: `100%-${STATUSBAR_HEIGHT}`,
  });
  screen.append(sidebarWidget.element);

  const inputWidget = new InputWidget(screen, {
    bottom: STATUSBAR_HEIGHT,
    left: 0,
    width: `100%-${SIDEBAR_WIDTH}`,
    height: INPUT_HEIGHT,
  });

  const statusBarWidget = new StatusBarWidget({
    bottom: 0,
    left: 0,
    width: "100%",
    height: STATUSBAR_HEIGHT,
  });
  screen.append(statusBarWidget.element);

  // ── Dynamic layout update ──
  function updateLayout(): void {
    if (terminalVisible) {
      chatWidget.element.height = `100%-${STATUSBAR_HEIGHT + INPUT_HEIGHT + 14}` as unknown as number;
      termWidget.show();
    } else {
      chatWidget.element.height = `100%-${STATUSBAR_HEIGHT + INPUT_HEIGHT + 2}` as unknown as number;
      termWidget.hide();
    }
    screen.render();
  }

  // ── Helper: addMessage ──
  function addMessage(msg: ChatMessage): void {
    chatWidget.addMessage(msg);
    screen.render();
  }

  function clearMessages(): void {
    chatWidget.clear();
    screen.render();
  }

  // ── Helper: update status bar ──
  function updateStatusBar(): void {
    const activeTasks = sidebarSvc.data.tasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    statusBarWidget.update({
      projectName: sidebarSvc.data.project.name,
      sessionMinutes,
      tokens: sidebarSvc.data.tokens,
      cost: sidebarSvc.data.cost,
      activeTasks,
      totalTasks: sidebarSvc.data.tasks.length,
      agentCount: sidebarSvc.data.agents.length,
      mode,
      leaderMode: inputSvc.leaderMode,
      showHints,
    });
    screen.render();
  }

  // ── Session elapsed timer ──
  setInterval(() => {
    sessionMinutes = Math.floor((Date.now() - sessionStart) / 60000);
    updateStatusBar();
  }, 60000);

  // ── handleSend (main input handler) ──
  async function handleSend(text: string): Promise<void> {
    // Add user message
    addMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    });

    // Slash command routing
    if (text.startsWith("/")) {
      await handleSlashCommand(text, addMessage, setMode, exitApp, {
        clearMessages,
        setSessionId: (id: string) => sessionSvc.setSessionId(id),
        setProjectId: (id: string | null) => {
          sessionSvc.setProjectId(id);
          sidebarSvc.setProjectId(id);
          inputWidget.setProjectId(id);
        },
        projectId: sessionSvc.projectId,
        showDetails,
        toggleDetails: () => {
          showDetails = !showDetails;
          chatWidget.setShowDetails(showDetails);
          chatWidget.rerender();
          screen.render();
        },
        resetLanguage: () => {
          saveCliSettings({});
          showLanguageSelection();
        },
        forkSession: async () => {
          const newId = await sessionSvc.forkSession();
          clearMessages();
          wsSvc.disconnect();
          wsSvc.connect(newId);
          addMessage(sysMsg(`Session forked: ${newId.slice(0, 8)}`));
        },
      });
      return;
    }

    // Quick setup shorthand
    if (sessionSvc.needsSetup && text.trim().toLowerCase() === "quick") {
      addMessage(sysMsg("Creating default dev team..."));
      try {
        await api.post("/api/agents/quick-setup", {});
        addMessage(sysMsg("Default dev team created. Type /agents to view."));
      } catch {
        addMessage(sysMsg("Quick setup failed. Use /open to configure via GUI."));
      }
      return;
    }

    // Natural language → interpret
    chatWidget.showProcessing("PM 처리 중...");
    screen.render();
    try {
      const recent = chatWidget.messageCount > 0
        ? Array.from({ length: Math.min(12, chatWidget.messageCount) }, (_, i) => ({
            role: "user",
            content: "",
          }))
        : [];

      const result = await interpret(
        text,
        sessionSvc.id ?? "",
        sessionSvc.projectId,
        recent.length > 0 ? undefined : undefined,
      );

      switch (result.intent) {
        case "pm_chat": {
          const msg = result.params["message"] as string | undefined;
          if (msg) {
            addMessage({
              id: `pm-${Date.now()}`,
              role: "pm",
              content: msg,
              timestamp: Date.now(),
            });
          }
          const needsConfirm = result.params["needs_confirmation"] as boolean | undefined;
          const action = result.params["pending_action"] as PendingAction | undefined;
          if (needsConfirm && action) {
            pendingAction = action;
            inputWidget.showConfirmation(action.description);
            screen.render();
          }
          break;
        }
        case "kickoff": {
          const goal = (result.params["goal"] as string | undefined) ?? text;
          try {
            const project = await api.post<{ id: string; name: string }>(
              "/api/projects",
              {
                name: goal.slice(0, 60),
                core_goal: goal,
                project_path: process.cwd(),
              },
            );
            sessionSvc.setProjectId(project.id);
            sidebarSvc.setProjectId(project.id);
            inputWidget.setProjectId(project.id);
            addMessage(
              sysMsg(
                `Project created: ${project.name} (${project.id.slice(0, 8)})`,
              ),
            );
            await api.post(`/api/projects/${project.id}/kickoff`, {
              yolo: mode === "yolo",
            });
            addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
          } catch {
            addMessage(sysMsg("Failed to create/kickoff project."));
          }
          break;
        }
        case "add_tasks": {
          const directive =
            (result.params["directive"] as string | undefined) ?? text;
          const projectId =
            (result.params["project_id"] as string | undefined) ??
            sessionSvc.projectId;
          if (!projectId) {
            addMessage(sysMsg("No active project. Start with a kickoff first."));
            break;
          }
          try {
            await api.post(`/api/projects/${projectId}/add-tasks`, {
              additional_directive: directive,
            });
            addMessage(sysMsg("Tasks added and agents assigned."));
          } catch {
            addMessage(sysMsg("Failed to add tasks."));
          }
          break;
        }
        case "status_query":
          await handleSlashCommand("/status", addMessage, setMode, exitApp, {
            clearMessages,
            setSessionId: (id: string) => sessionSvc.setSessionId(id),
            setProjectId: (id: string | null) => {
              sessionSvc.setProjectId(id);
              sidebarSvc.setProjectId(id);
            },
            projectId: sessionSvc.projectId,
          });
          break;
        case "mode_change": {
          const newMode = result.params["mode"] as
            | "plan"
            | "build"
            | "yolo"
            | undefined;
          if (newMode && ["plan", "build", "yolo"].includes(newMode)) {
            setMode(newMode);
            addMessage(sysMsg(`Switched to ${newMode} mode.`));
          }
          break;
        }
        default:
          if (result.response) {
            addMessage(sysMsg(result.response));
          }
          break;
      }
    } catch {
      addMessage(sysMsg("Error processing input."));
    }
  }

  // ── handleConfirm ──
  async function handleConfirm(confirmed: boolean): Promise<void> {
    const action = pendingAction;
    pendingAction = null;
    inputWidget.clearConfirmation();

    if (!confirmed || !action) {
      addMessage(sysMsg("Cancelled."));
      return;
    }

    chatWidget.showProcessing("Processing...");
    screen.render();

    try {
      if (action.type === "kickoff") {
        const goal =
          (action.params["goal"] as string | undefined) ??
          action.description;
        const project = await api.post<{ id: string; name: string }>(
          "/api/projects",
          {
            name: goal.slice(0, 60),
            core_goal: goal,
            project_path: (action.params["path"] as string) ?? process.cwd(),
          },
        );
        sessionSvc.setProjectId(project.id);
        sidebarSvc.setProjectId(project.id);
        addMessage(
          sysMsg(
            `Project created: ${project.name} (${project.id.slice(0, 8)})`,
          ),
        );
        await api.post(`/api/projects/${project.id}/kickoff`, {
          yolo: mode === "yolo",
        });
        addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
      } else if (action.type === "add_tasks") {
        const projectId =
          (action.params["project_id"] as string | undefined) ??
          sessionSvc.projectId;
        if (!projectId) {
          addMessage(sysMsg("No active project."));
          return;
        }
        await api.post(`/api/projects/${projectId}/add-tasks`, {
          additional_directive:
            action.params["directive"] ?? action.description,
        });
        addMessage(sysMsg("Tasks added and agents assigned."));
      }
    } catch {
      addMessage(sysMsg(`Failed to execute ${action.type}.`));
    }
  }

  function setMode(newMode: "plan" | "build" | "yolo"): void {
    mode = newMode;
    sessionSvc.setMode(newMode);
    inputWidget.setMode(newMode);
    updateStatusBar();
  }

  function exitApp(): void {
    termWidget.terminate();
    wsSvc.disconnect();
    sidebarSvc.stop();
    screen.destroy();
    process.exit(0);
  }

  // ── Language selection overlay ──
  function showLanguageSelection(): void {
    const langBox = blessed.list({
      top: "center",
      left: "center",
      width: 40,
      height: 10,
      border: { type: "line" },
      style: {
        fg: "white",
        border: { fg: "cyan" },
        selected: { fg: "black", bg: "cyan" },
      },
      label: " Language / 언어 선택 ",
      items: ["  English", "  한국어"],
      keys: true,
      mouse: true,
      vi: true,
    });

    // Title
    const title = blessed.text({
      parent: langBox,
      top: 0,
      left: "center",
      content: "{cyan-fg}{bold}AgentDesk{/bold}{/cyan-fg}",
      tags: true,
    });

    langBox.on("select", (_item: unknown, index: number) => {
      const lang: "en" | "ko" = index === 0 ? "en" : "ko";
      saveCliSettings({ language: lang });
      screen.remove(langBox);
      title.destroy();

      const welcome = getWelcomeMessage(lang, sessionSvc.needsSetup);
      addMessage(sysMsg(welcome));
      inputWidget.focus();
      screen.render();
    });

    screen.append(langBox);
    langBox.focus();
    screen.render();
  }

  // ── Wire services → widgets ──

  // WebSocket messages → chat
  wsSvc.on("message", (msg: ChatMessage) => {
    addMessage(msg);
  });
  wsSvc.on("event", (type: string, payload: unknown) => {
    sidebarSvc.updateFromWs(type, payload);
  });

  // Sidebar updates → sidebar widget
  sidebarSvc.on("update", () => {
    sidebarWidget.update(sidebarSvc.data);
    updateStatusBar();
  });

  // Input service leader key → status bar
  inputSvc.on("leaderChanged", () => {
    updateStatusBar();
  });

  // Leader key commands
  inputSvc.on("command", (cmd: string) => {
    if (cmd === "/__scroll_up") {
      chatWidget.element.scroll(-10);
      screen.render();
      return;
    }
    if (cmd === "/__scroll_down") {
      chatWidget.element.scroll(10);
      screen.render();
      return;
    }
    if (cmd === "/__toggle_hints") {
      showHints = !showHints;
      updateStatusBar();
      return;
    }
    void handleSend(cmd);
  });

  // Input widget submit
  inputWidget.setOnSubmit((text: string) => {
    if (pendingAction) {
      if (text.toLowerCase() === "y") void handleConfirm(true);
      else if (text.toLowerCase() === "n") void handleConfirm(false);
      return;
    }
    inputSvc.addToHistory(text);
    void handleSend(text);
  });

  // ── Global key bindings ──

  // Ctrl+C: exit
  screen.key(["C-c"], () => exitApp());

  // Ctrl+X: leader mode
  screen.key(["C-x"], () => {
    inputSvc.activateLeader();
  });

  // Tab: cycle focus between input and terminal
  screen.key(["tab"], () => {
    if (termWidget.visible && termWidget.element.focused) {
      inputWidget.focus();
    } else if (termWidget.visible) {
      termWidget.focus();
    }
    screen.render();
  });

  // Ctrl+T: toggle terminal
  screen.key(["C-t"], () => {
    terminalVisible = !terminalVisible;
    updateLayout();
  });

  // Handle leader mode key dispatch
  screen.on("keypress", (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
    if (inputSvc.leaderMode && ch) {
      inputSvc.handleLeaderKey(ch);
      return;
    }
    // y/n for pending action (when not focused on input)
    if (pendingAction) {
      if (ch === "y" || ch === "Y") void handleConfirm(true);
      else if (ch === "n" || ch === "N") void handleConfirm(false);
    }
    // History navigation when input is focused
    if (inputWidget.element.focused) {
      if (key.name === "up" && !key.ctrl && !key.shift) {
        const prev = inputSvc.navigateUp();
        if (prev !== null) {
          inputWidget.element.setValue(prev);
          screen.render();
        }
      }
      if (key.name === "down" && !key.ctrl && !key.shift) {
        const next = inputSvc.navigateDown();
        if (next !== null) {
          inputWidget.element.setValue(next);
          screen.render();
        }
      }
    }
  });

  // ── Initialize ──

  // Check language preference
  const settings = loadCliSettings();
  if (settings.language) {
    const welcome = getWelcomeMessage(
      settings.language,
      false, // will be updated after session init
    );
    addMessage(sysMsg(welcome));
  }

  // Init session
  try {
    await sessionSvc.init();

    if (sessionSvc.id) {
      wsSvc.connect(sessionSvc.id);
    }
    sidebarSvc.start(sessionSvc.projectId);

    // Show setup prompt if needed
    if (sessionSvc.needsSetup && settings.language) {
      clearMessages();
      addMessage(
        sysMsg(getWelcomeMessage(settings.language, true)),
      );
    }
  } catch {
    addMessage(sysMsg("Failed to connect to server. Is it running on port 8790?"));
  }

  // Show language selection if not set
  if (!settings.language) {
    showLanguageSelection();
  } else {
    inputWidget.focus();
  }

  updateStatusBar();
  sidebarWidget.update(sidebarSvc.data);
  updateLayout();

  // Keep process alive
  await new Promise<void>(() => {
    // The blessed screen event loop keeps the process running
  });
}
