import { lazy, Suspense, useState, useCallback, useRef, useEffect } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

const AgentRepl = lazy(() => import("../AgentRepl"));
const XTerminal = lazy(() => import("../terminal/XTerminal"));

type Tab = "terminal" | "repl";

const SPINNER = (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
    <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
    loading...
  </div>
);

function makePtyId() {
  return `pty-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ReplWindow() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  // 기본 탭: Terminal (실제 CLI)
  const [tab, setTab] = useState<Tab>("terminal");
  const [ptyExited, setPtyExited] = useState(false);

  // PTY session ID — 프로젝트 전환 시 새 세션
  const [ptySessionId, setPtySessionId] = useState(makePtyId);
  const prevProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== currentProjectId) {
      prevProjectIdRef.current = currentProjectId;
      setPtySessionId(makePtyId());
      setPtyExited(false);
    }
  }, [currentProjectId]);

  const filteredAgents =
    currentProject && projectAgentsLoaded && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents;

  const handlePtyExit = useCallback(() => setPtyExited(true), []);

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => { setTab(id); if (id === "terminal") setPtyExited(false); }}
      style={{
        padding: "3px 14px",
        fontSize: 12,
        fontFamily: "var(--th-font-mono)",
        borderRadius: 4,
        border: "none",
        cursor: "pointer",
        background: tab === id ? "var(--th-accent)" : "transparent",
        color: tab === id ? "#000" : "var(--th-text-muted)",
        fontWeight: tab === id ? 700 : 400,
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <AppWindow
      windowType="cli"
      title={t({ ko: "Agent CLI", en: "Agent CLI", ja: "Agent CLI", zh: "Agent CLI" })}
      emoji=">_"
      defaultWidth={820}
      defaultHeight={560}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 10px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-secondary)",
            flexShrink: 0,
          }}
        >
          {tabBtn("terminal", ptyExited ? "Terminal ✕" : "Terminal")}
          {tabBtn("repl", "Agent REPL")}
        </div>

        {/* Content — 두 탭 모두 항상 마운트, display로 전환 (PTY 유지) */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Terminal tab — 항상 마운트 (PTY 유지) */}
          <div style={{ display: tab === "terminal" ? "flex" : "none", height: "100%", flexDirection: "column" }}>
            <Suspense fallback={SPINNER}>
              <XTerminal
                sessionId={ptySessionId}
                cwd={currentProject?.project_path ?? undefined}
                onExit={handlePtyExit}
              />
            </Suspense>
          </div>

          {/* Agent REPL tab */}
          <div style={{ display: tab === "repl" ? "block" : "none", height: "100%" }}>
            <Suspense fallback={SPINNER}>
              <AgentRepl agents={filteredAgents} currentProject={currentProject} />
            </Suspense>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
