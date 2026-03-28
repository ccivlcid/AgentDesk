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
import { interpret } from "./hooks/useInterpret.js";
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<"plan" | "build" | "yolo">("build");
  const [showDetails, setShowDetails] = useState(false);
  const [language, setLanguage] = useState<"en" | "ko" | null>(() => {
    const settings = loadCliSettings();
    return settings.language ?? null;
  });

  const [sessionStart] = useState(Date.now());
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const sidebar = useSidebar(session.projectId);

  const addMessage = useCallback(
    (msg: ChatMessage) => setMessages((prev) => [...prev, msg]),
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

  // Tab key cycles plan -> build (yolo stays until explicitly set)
  useInput((_input, key) => {
    if (key.tab) {
      setMode((prev) => (prev === "plan" ? "build" : "plan"));
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
    const result = await interpret(text, session.id ?? "", session.projectId);

    switch (result.intent) {
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
  };

  const { leaderMode } = useLeaderKey({
    onCommand: (cmd) => { void handleSend(cmd); },
  });

  if (language === null) {
    return <WelcomeScreen onLanguageSelected={handleLanguageSelected} />;
  }

  const activeTasks = sidebar.tasks.filter((t) => t.status === "in_progress").length;

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" flexGrow={1}>
          <ChatArea messages={messages} showDetails={showDetails} />
          <InputBar onSend={handleSend} mode={mode} projectId={session.projectId} />
        </Box>
        <Sidebar
          project={sidebar.project}
          agents={sidebar.agents}
          tasks={sidebar.tasks}
          pipelineStage={sidebar.pipelineStage}
          tokens={sidebar.tokens}
          cost={sidebar.cost}
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
      />
    </Box>
  );
}
