import { useState, useEffect, useRef, useCallback } from "react";
import type { Task, Agent } from "../../types";
import {
  getProjectTeamBoard,
  updateProject,
  type TeamBoardEntry,
} from "../../api/organization-projects";
import { kickoffProject } from "../../api/project-kickoff";
import { useProjectStore, type PendingClarification } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

interface RoomModalProps {
  tasks: Task[];
  agents: Agent[];
  projectId?: string;
  pmAgentId?: string | null;
  onClose: () => void;
}

export default function RoomModal({ tasks, agents, projectId, pmAgentId, onClose }: RoomModalProps) {
  const [boardEntries, setBoardEntries] = useState<TeamBoardEntry[]>([]);
  const [directiveText, setDirectiveText] = useState("");
  const [directiveBusy, setDirectiveBusy] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const addToast = useUiStore((s) => s.addToast);

  const pendingClarification = useProjectStore((s) => s.pendingClarification) as PendingClarification | null;
  const clarificationBusy = useProjectStore((s) => s.clarificationBusy);

  const taskSig = tasks.map((t) => `${t.id}:${t.status}`).join(",");

  // Fetch board
  useEffect(() => {
    if (!projectId) return;
    getProjectTeamBoard(projectId)
      .then((res) => setBoardEntries(res.entries ?? []))
      .catch(() => {});
  }, [projectId, taskSig]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [boardEntries]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Directive
  const handleDirective = useCallback(async () => {
    if (!projectId || !directiveText.trim()) return;
    setDirectiveBusy(true);
    try {
      await updateProject(projectId, { directive: directiveText.trim() });
      setDirectiveText("");
    } catch { addToast({ type: "error", title: "Failed to send directive" }); }
    setDirectiveBusy(false);
  }, [projectId, directiveText, addToast]);

  // Clarification
  const handleClarification = useCallback(async () => {
    if (!projectId || !pendingClarification || !answerText.trim()) return;
    useProjectStore.getState().setClarificationBusy(true);
    try {
      await kickoffProject(projectId, answerText.trim(), undefined, pendingClarification.clarificationId);
      useProjectStore.getState().setPendingClarification(null);
      setAnswerText("");
    } catch { addToast({ type: "error", title: "Failed to answer" }); }
    useProjectStore.getState().setClarificationBusy(false);
  }, [projectId, pendingClarification, answerText, addToast]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "85%", maxWidth: 640, height: "70%", maxHeight: 500,
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          fontFamily: mono,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: "1px solid var(--th-border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ROOM
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--th-text-muted)", padding: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat feed */}
        <div
          ref={scrollRef}
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}
        >
          {boardEntries.map((entry, i) => {
            const isPm = entry.sender.toLowerCase() === "pm" || entry.sender === pmAgentId;
            return (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 11 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                  background: isPm ? "rgba(99,102,241,0.12)" : "rgba(59,130,246,0.12)",
                  color: isPm ? "#6366f1" : "#3b82f6",
                  flexShrink: 0, alignSelf: "flex-start", marginTop: 2,
                }}>
                  {entry.sender.slice(0, 6).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  {entry.subject && (
                    <div style={{ fontSize: 9, color: "var(--th-text-muted)", fontWeight: 700, marginBottom: 2 }}>
                      {entry.subject}
                    </div>
                  )}
                  <div style={{ color: "var(--th-text-secondary)", lineHeight: 1.5 }}>
                    {entry.body}
                  </div>
                </div>
                <span style={{ color: "var(--th-text-muted)", fontSize: 9, flexShrink: 0, alignSelf: "flex-start" }}>
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
                </span>
              </div>
            );
          })}

          {/* Clarification */}
          {pendingClarification && pendingClarification.projectId === projectId && (
            <div style={{
              margin: "12px 0", padding: 14, borderRadius: 10,
              background: "var(--th-accent-glow)", border: "1px solid var(--th-accent-border)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--th-accent)", marginBottom: 8, letterSpacing: "0.05em" }}>
                PM CLARIFICATION
              </div>
              <div style={{ fontSize: 12, color: "var(--th-text-primary)", marginBottom: 10, lineHeight: 1.5 }}>
                {pendingClarification.question}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleClarification(); }}
                  placeholder="답변 입력..."
                  disabled={clarificationBusy}
                  style={{
                    flex: 1, fontFamily: mono, fontSize: 11, padding: "6px 10px",
                    background: "var(--th-bg-surface)", color: "var(--th-text-primary)",
                    border: "1px solid var(--th-border)", borderRadius: 6, outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleClarification()}
                  disabled={clarificationBusy || !answerText.trim()}
                  style={{
                    fontFamily: mono, fontSize: 10, fontWeight: 700, padding: "6px 14px",
                    background: "var(--th-accent)", color: "var(--th-bg-primary)",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    opacity: clarificationBusy || !answerText.trim() ? 0.5 : 1,
                  }}
                >
                  {clarificationBusy ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}

          {boardEntries.length === 0 && !pendingClarification && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--th-text-muted)", fontSize: 11 }}>
              아직 회의 내용이 없습니다.
            </div>
          )}
        </div>

        {/* Directive input */}
        <div style={{
          display: "flex", gap: 8, padding: "10px 20px",
          borderTop: "1px solid var(--th-border)", flexShrink: 0,
        }}>
          <input
            type="text"
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleDirective(); }}
            placeholder="PM에게 지시..."
            disabled={directiveBusy}
            style={{
              flex: 1, fontFamily: mono, fontSize: 11, padding: "8px 12px",
              background: "var(--th-bg-surface)", color: "var(--th-text-primary)",
              border: "1px solid var(--th-border)", borderRadius: 6, outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => void handleDirective()}
            disabled={directiveBusy || !directiveText.trim()}
            style={{
              fontFamily: mono, fontSize: 10, fontWeight: 700, padding: "8px 16px",
              background: "var(--th-accent)", color: "var(--th-bg-primary)",
              border: "none", borderRadius: 6, cursor: "pointer",
              opacity: directiveBusy || !directiveText.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
