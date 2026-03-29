import React, { useState, useEffect, useCallback } from "react";
import { Box, useApp, useInput } from "ink";
import { ChatArea } from "./components/ChatArea.js";
import { InputBar } from "./components/InputBar.js";
import { StatusBar } from "./components/StatusBar.js";
import { Sidebar } from "./components/Sidebar.js";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
import { useSession } from "./hooks/useSession.js";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { useSidebar } from "./hooks/useSidebar.js";
import { useLeaderKey } from "./hooks/useLeaderKey.js";
import { interpret, type InterpretResult } from "./hooks/useInterpret.js";
import { handleSlashCommand } from "./commands.js";
import { api } from "../lib/api.js";
import { loadCliSettings, saveCliSettings } from "../lib/settings.js";
import { getWelcomeMessage } from "./welcome-messages.js";

export interface ChatMessage {
  id: string;
  role: "user" | "pm" | "agent" | "system";
  content: string;
  agentName?: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    status: "running" | "success" | "error";
    summary?: string;
    detail?: string;
  }>;
  fileDiffs?: Array<{
    path: string;
    action: "create" | "edit" | "delete";
    summary?: string;
    lines?: string[];
  }>;
}

export interface PendingAction {
  type: "kickoff" | "add_tasks";
  params: Record<string, unknown>;
  description: string;
}

function sysMsg(content: string): ChatMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "system",
    content,
    timestamp: Date.now(),
  };
}

export function App(): React.ReactElement {
  const session = useSession();
  const { exit } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const settings = loadCliSettings();
    if (settings.language) {
      return [sysMsg(getWelcomeMessage(settings.language, false))];
    }
    return [];
  });
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = bottom, N = N msgs from bottom
  const [mode, setMode] = useState<"plan" | "build" | "yolo">("build");
  const [showDetails, setShowDetails] = useState(false);
  const [language, setLanguage] = useState<"en" | "ko" | null>(() => {
    const settings = loadCliSettings();
    return settings.language ?? null;
  });

  const [sessionStart] = useState(Date.now());
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showHints, setShowHints] = useState(false);

  const sidebar = useSidebar(session.projectId);

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      setScrollOffset(0); // auto-scroll to bottom on new message
    },
    [],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  const forkSession = useCallback(async () => {
    const newSession = await api.post<{ id: string }>("/api/tui/sessions", { mode });
    clearMessages();
    session.setSessionId(newSession.id);
    addMessage(sysMsg(`Session forked: ${newSession.id.slice(0, 8)}`));
  }, [mode, clearMessages, addMessage, session]);

  // Update session elapsed minutes every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionMinutes(Math.floor((Date.now() - sessionStart) / 60000));
    }, 60000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  useWebSocket({
    sessionId: session.id,
    onMessage: (msg) => {
      setMessages((prev) => [...prev, msg]);
    },
    onEvent: (type, payload) => {
      sidebar.updateFromWs(type, payload);
    },
  });

  // Tab: mode toggle, PageUp/PageDown: scroll, ?: hints toggle
  useInput((input, key) => {
    if (key.tab) {
      setMode((prev) => (prev === "plan" ? "build" : "plan"));
      return;
    }
    if (key.pageUp) {
      setScrollOffset((prev) => Math.min(prev + 10, Math.max(0, messages.length - 5)));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - 10));
      return;
    }
    if (input === "?") {
      setShowHints((prev) => !prev);
    }
  });

  const handleLanguageSelected = useCallback(
    (lang: "en" | "ko") => {
      setLanguage(lang);
      saveCliSettings({ language: lang });
      const welcome = getWelcomeMessage(lang, session.needsSetup);
      setMessages([sysMsg(welcome)]);
    },
    [session.needsSetup],
  );

  const resetLanguage = useCallback(() => {
    setLanguage(null);
    saveCliSettings({});
  }, []);

  // First-time setup detection: show guide when no agents configured
  useEffect(() => {
    if (language !== null && session.needsSetup) {
      setMessages([sysMsg(getWelcomeMessage(language, true))]);
    }
  }, [session.needsSetup, language]);

  // Handle "quick" intent from setup flow
  const handleQuickSetup = useCallback(async () => {
    addMessage(sysMsg("Creating default dev team..."));
    try {
      await api.post("/api/agents/quick-setup", {});
      addMessage(sysMsg("Default dev team created. Type /agents to view."));
    } catch {
      addMessage(sysMsg("Quick setup failed. Use /open to configure via GUI."));
    }
  }, [addMessage]);

  const handleSend = async (text: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Slash command routing
    if (text.startsWith("/")) {
      await handleSlashCommand(text, addMessage, setMode, exit, {
        clearMessages,
        setSessionId: session.setSessionId,
        setProjectId: session.setProjectId,
        projectId: session.projectId,
        showDetails,
        toggleDetails: () => setShowDetails((prev) => !prev),
        resetLanguage,
        forkSession,
      });
      return;
    }

    // Setup shorthand: "quick" when needsSetup is active
    if (session.needsSetup && text.trim().toLowerCase() === "quick") {
      await handleQuickSetup();
      return;
    }

    // Natural language -- interpret intent then act
    setIsProcessing(true);
    try {
      // Build recent messages for conversation context
      const recentMsgs = messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await interpret(text, session.id ?? "", session.projectId, recentMsgs);

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
            setPendingAction(action);
          }
          break;
        }
        case "kickoff": {
          const goal = (result.params["goal"] as string | undefined) ?? text;
          try {
            const project = await api.post<{ id: string; name: string }>("/api/projects", {
              name: goal.slice(0, 60),
              core_goal: goal,
            });
            addMessage(sysMsg(`Project created: ${project.name} (${project.id.slice(0, 8)})`));
            await api.post(`/api/projects/${project.id}/kickoff`, { yolo: mode === "yolo" });
            addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
          } catch {
            addMessage(sysMsg("Failed to create/kickoff project."));
          }
          break;
        }
        case "add_tasks": {
          const directive = (result.params["directive"] as string | undefined) ?? text;
          const projectId = (result.params["project_id"] as string | undefined) ?? session.projectId;
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
          await handleSlashCommand("/status", addMessage, setMode, exit, {
            clearMessages,
            setSessionId: session.setSessionId,
            setProjectId: session.setProjectId,
            projectId: session.projectId,
          });
          break;
        case "mode_change": {
          const newMode = result.params["mode"] as "plan" | "build" | "yolo" | undefined;
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    const action = pendingAction;
    setPendingAction(null);
    if (!confirmed || !action) {
      addMessage(sysMsg("Cancelled."));
      return;
    }
    setIsProcessing(true);
    try {
      if (action.type === "kickoff") {
        const goal = (action.params["goal"] as string | undefined) ?? action.description;
        const project = await api.post<{ id: string; name: string }>("/api/projects", {
          name: goal.slice(0, 60),
          core_goal: goal,
          project_path: action.params["path"] ?? process.cwd(),
        });
        addMessage(sysMsg(`Project created: ${project.name} (${project.id.slice(0, 8)})`));
        await api.post(`/api/projects/${project.id}/kickoff`, { yolo: mode === "yolo" });
        addMessage(sysMsg("Kickoff started. Agents are mobilising..."));
      } else if (action.type === "add_tasks") {
        const projectId = (action.params["project_id"] as string | undefined) ?? session.projectId;
        if (!projectId) {
          addMessage(sysMsg("No active project."));
          return;
        }
        await api.post(`/api/projects/${projectId}/add-tasks`, {
          additional_directive: action.params["directive"] ?? action.description,
        });
        addMessage(sysMsg("Tasks added and agents assigned."));
      }
    } catch {
      addMessage(sysMsg(`Failed to execute ${action.type}.`));
    } finally {
      setIsProcessing(false);
    }
  };

  const { leaderMode } = useLeaderKey({
    onCommand: (cmd) => {
      if (cmd === "/__scroll_up") {
        setScrollOffset((prev) => Math.min(prev + 10, Math.max(0, messages.length - 10)));
        return;
      }
      if (cmd === "/__scroll_down") {
        setScrollOffset((prev) => Math.max(0, prev - 10));
        return;
      }
      void handleSend(cmd);
    },
  });

  if (language === null) {
    return <WelcomeScreen onLanguageSelected={handleLanguageSelected} />;
  }

  const activeTasks = sidebar.tasks.filter((t) => t.status === "in_progress").length;

  const PAGE = 50;
  const visibleMessages =
    scrollOffset === 0
      ? messages.slice(-PAGE)
      : messages.slice(Math.max(0, messages.length - PAGE - scrollOffset), messages.length - scrollOffset);

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          <Box flexDirection="column" flexGrow={1} overflowY="hidden">
            <ChatArea messages={visibleMessages} showDetails={showDetails} scrollOffset={scrollOffset} totalMessages={messages.length} isProcessing={isProcessing} />
          </Box>
          <InputBar onSend={handleSend} mode={mode} projectId={session.projectId} pendingAction={pendingAction} onConfirm={handleConfirm} />
        </Box>
        <Sidebar
          project={sidebar.project}
          agents={sidebar.agents}
          tasks={sidebar.tasks}
          pipelineStage={sidebar.pipelineStage}
          tokens={sidebar.tokens}
          cost={sidebar.cost}
          readyCli={sidebar.readyCli}
        />
      </Box>
      <StatusBar
        projectName={sidebar.project.name}
        sessionMinutes={sessionMinutes}
        tokens={sidebar.tokens}
        cost={sidebar.cost}
        activeTasks={activeTasks}
        totalTasks={sidebar.tasks.length}
        agentCount={sidebar.agents.length}
        mode={mode}
        leaderMode={leaderMode}
        showHints={showHints}
      />
    </Box>
  );
}
