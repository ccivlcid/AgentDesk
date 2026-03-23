import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  FileText, 
  Search, 
  Settings, 
  Activity, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2,
  BrainCircuit,
  Hash,
  RefreshCw,
  Cpu,
  ChevronDown,
  Zap
} from "lucide-react";
import { useUiStore } from "../store/uiStore";
import { useI18n } from "../i18n";
import type { Agent, Project } from "../types";
import {
  createTask,
  runTask,
  assignTask,
  injectTaskPrompt,
} from "../api/organization-projects";
import { getTerminal } from "../api/messaging-runtime-oauth";
import { useWebSocket } from "../hooks/useWebSocket";

interface ReplEntry {
  id: string;
  kind: "input" | "output" | "error" | "info" | "tool" | "thought";
  text: string;
  timestamp: Date;
  toolName?: string;
}

interface CliSession {
  agentId: string;
  history: string[];
  entries: ReplEntry[];
  lastTaskId: string | null;
}

interface Props {
  agents: Agent[];
  currentProject?: Project | null;
  initialAgentId?: string | null;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function makeWelcome(t: any): ReplEntry {
  return {
    id: "welcome",
    kind: "info",
    text: t({
      ko: "지능형 명령 스트림 활성화됨. 에이전트에게 직접 지시를 내리세요.",
      en: "Intelligent Command Stream active. Direct control enabled.",
      ja: "コマンドストリーム起動。エージェントへの直接指示が可能です。",
      zh: "智能指令流已激活。直接控制已启用。",
    }),
    timestamp: new Date(),
  };
}

export default function AgentCli({ agents, currentProject, initialAgentId }: Props) {
  const { t } = useI18n();
  const mono = "var(--th-font-mono)";
  const { settings } = useUiStore();
  
  // 자유 모드 여부 판단 (프로젝트 설정 또는 전역 설정)
  const isYoloMode = settings.yoloMode === true;

  const sessionsRef = useRef<Map<string, CliSession>>(new Map());
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => initialAgentId || "");
  const [entries, setEntries] = useState<ReplEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const runningTaskIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { send: wsSend, on } = useWebSocket();

  useEffect(() => { runningTaskIdRef.current = runningTaskId; }, [runningTaskId]);

  const getOrCreateSession = (agentId: string): CliSession => {
    if (!sessionsRef.current.has(agentId)) {
      sessionsRef.current.set(agentId, { agentId, history: [], entries: [makeWelcome(t)], lastTaskId: null });
    }
    return sessionsRef.current.get(agentId)!;
  };

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      const target = agents.find(a => a.id === initialAgentId) || agents[0];
      setSelectedAgentId(target.id);
    }
  }, [agents, initialAgentId, selectedAgentId]);

  useEffect(() => {
    const session = getOrCreateSession(selectedAgentId);
    setEntries(session.entries);
    setHistory(session.history);
    setRunningTaskId(session.lastTaskId);
  }, [selectedAgentId]);

  const switchAgent = (agentId: string) => {
    const cur = sessionsRef.current.get(selectedAgentId);
    if (cur) { cur.entries = entries; cur.history = history; cur.lastTaskId = runningTaskId; }
    setSelectedAgentId(agentId);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entries]);

  useEffect(() => {
    if (!runningTaskId) return;
    wsSend({ type: "subscribe_task", taskId: runningTaskId });
    return () => { wsSend({ type: "unsubscribe_task", taskId: runningTaskId }); };
  }, [runningTaskId, wsSend]);

  useEffect(() => {
    return on("cli_output", (payload) => {
      const p = payload as { task_id?: string; data?: string; text?: string };
      if (!p.task_id || p.task_id !== runningTaskIdRef.current) return;
      const raw = p.data ?? p.text ?? "";
      if (!raw.trim()) return;

      const lines = raw.split("\n");
      const newEntries = lines.map(line => {
        const trimmed = line.trim();
        let kind: ReplEntry["kind"] = "output";
        let toolName: string | undefined;
        if (trimmed.match(/list_files|read_file|write_file|run_command|search|grep/)) {
          kind = "tool";
          toolName = trimmed.match(/list_files|read_file|write_file|run_command|search|grep/)?.[0];
        } else if (trimmed.startsWith("> ") || trimmed.startsWith("$ ")) kind = "input";
        else if (trimmed.includes("Thinking...") || trimmed.includes("Thought:")) kind = "thought";

        return { id: crypto.randomUUID(), kind, text: line, timestamp: new Date(), toolName };
      });
      setEntries(prev => [...prev, ...newEntries]);
    });
  }, [on]);

  const handleCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setEntries(prev => [...prev, { id: crypto.randomUUID(), kind: "input", text: trimmed, timestamp: new Date() }]);
    setHistory(prev => [trimmed, ...prev.slice(0, 99)]);
    
    if (trimmed === ":clear") { setEntries([]); return; }
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;

    setBusy(true);
    try {
      const taskId = await createTask({ title: trimmed, assigned_agent_id: agent.id, project_id: currentProject?.id });
      await assignTask(taskId, agent.id);
      await runTask(taskId);
      setRunningTaskId(taskId);
    } catch (err) {
      setEntries(prev => [...prev, { id: crypto.randomUUID(), kind: "error", text: String(err), timestamp: new Date() }]);
    } finally { setBusy(false); }
  };

  const entryColor = (kind: ReplEntry["kind"]) => {
    switch(kind) {
      case "input": return "var(--th-accent)";
      case "error": return "#F43F5E";
      case "tool": return "#06B6D4";
      case "thought": return "var(--th-text-muted)";
      case "info": return "var(--th-text-secondary)";
      default: return "var(--th-text-primary)";
    }
  };

  const entryPrefix = (entry: ReplEntry) => {
    const s = { size: 12, className: "mt-1 shrink-0" };
    switch(entry.kind) {
      case "input": return <Hash {...s} color="var(--th-accent)" />;
      case "tool": return <Settings {...s} color="#06B6D4" />;
      case "thought": return <BrainCircuit {...s} color="var(--th-text-muted)" />;
      case "error": return <AlertCircle {...s} color="#F43F5E" />;
      case "info": return <Activity {...s} color="var(--th-text-secondary)" />;
      default: return <Activity {...s} color="var(--th-accent)" opacity={0.5} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "transparent", fontFamily: "var(--th-font-body)" }}>
      {/* ── Enhanced Header ── */}
      <div style={{ 
        padding: "16px 24px", display: "flex", alignItems: "center", gap: 16,
        borderBottom: "1px solid var(--th-glass-border-subtle)", background: "rgba(255,255,255,0.015)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 8, background: "rgba(59, 130, 246, 0.1)", borderRadius: 10 }}>
            <Terminal size={16} className="text-blue-400" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-heading)", letterSpacing: "-0.01em" }}>Command Stream</div>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Real-time Intelligence</div>
          </div>
        </div>

        {/* Live Pulse */}
        {runningTaskId && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", 
            background: "rgba(16, 185, 129, 0.1)", borderRadius: 100, border: "1px solid rgba(16, 185, 129, 0.2)"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} className="animate-pulse" />
            <span style={{ fontSize: 9, fontWeight: 800, color: "#10B981" }}>LIVE</span>
          </div>
        )}

        {/* Agent Selector */}
        <div style={{ marginLeft: "auto", position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, color: "var(--th-text-muted)", fontWeight: 600 }}>Switch Agent:</div>
          <div style={{ position: "relative" }}>
            <select
              value={selectedAgentId}
              onChange={(e) => switchAgent(e.target.value)}
              style={{
                appearance: "none", background: "var(--th-glass-surface)", border: "1px solid var(--th-glass-border-strong)",
                borderRadius: 8, padding: "4px 32px 4px 12px", fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)",
                cursor: "pointer", outline: "none"
              }}
            >
              {agents.map(a => <option key={a.id} value={a.id}>{a.avatar_emoji} {a.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
          </div>
          <button 
            onClick={() => { if (selectedAgentId) sessionsRef.current.delete(selectedAgentId); setEntries([makeWelcome(t)]); }}
            style={{ padding: 6, background: "none", border: "1px solid var(--th-glass-border-strong)", borderRadius: 8, color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Feed Area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", position: "relative" }} className="pm-shelf-scroll">
        {/* Free Task Mode (YOLO) Guide Panel */}
        <AnimatePresence>
          {isYoloMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.5)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 15px 45px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                backdropFilter: "blur(30px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ padding: 10, background: "#F59E0B", borderRadius: 12, color: "black", boxShadow: "0 0 15px rgba(245,158,11,0.4)" }}>
                  <Zap size={20} strokeWidth={3} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    {t({ ko: "자유 업무 모드 활성화됨", en: "Free Task Mode Active", ja: "自由業務モード有効", zh: "自由任务模式已激活" })}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.95)", marginTop: 4, fontWeight: 600, lineHeight: 1.5 }}>
                    {t({ 
                      ko: "에이전트가 승인 절차 없이 독자적으로 자유 업무를 수행합니다. 실시간 흐름을 모니터링하세요.", 
                      en: "Agent is performing free tasks independently without approval. Monitor the stream closely.",
                      ja: "エージェントが承認なしで自由業務を実行中です。リアルタイムで監視してください。",
                      zh: "代理正在独立执行自由任务，无需批准。请密切关注实时流。"
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "0.08em", background: "#F59E0B", padding: "4px 12px", borderRadius: 8 }}>
                  {t({ ko: "실시간 감시 활성", en: "LIVE SURVEILLANCE", ja: "リアルタイム監視", zh: "实时监控" })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const isTool = entry.kind === "tool";
            const isThought = entry.kind === "thought";
            return (
              <motion.div 
                key={entry.id} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ 
                  display: "flex", gap: 14, marginBottom: 12,
                  padding: isTool ? "12px 16px" : "0",
                  background: isTool ? "rgba(6, 182, 212, 0.03)" : "transparent",
                  border: isTool ? "1px solid rgba(6, 182, 212, 0.1)" : "none",
                  borderRadius: 14,
                }}
              >
                <span style={{ fontSize: 9, color: "var(--th-text-muted)", opacity: 0.5, marginTop: 4, width: 45, flexShrink: 0, fontFamily: mono }}>
                  {formatTime(entry.timestamp)}
                </span>
                <div style={{ display: "flex", gap: 10, flex: 1 }}>
                  {entryPrefix(entry)}
                  <span style={{ 
                    fontSize: 12, color: entryColor(entry.kind), lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontStyle: isThought ? "italic" : "normal", fontWeight: isTool ? 600 : 400
                  }}>
                    {entry.text}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Command Bar ── */}
      <div style={{ 
        padding: "20px 24px 24px", background: "rgba(0,0,0,0.1)", borderTop: "1px solid var(--th-glass-border-subtle)"
      }}>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 12, 
          background: "var(--th-glass-surface-active)", border: "1px solid var(--th-glass-border-strong)",
          borderRadius: 16, padding: "0 16px", height: 48, boxShadow: "var(--th-glass-highlight)"
        }}>
          <Terminal size={18} className="text-blue-400 opacity-70" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleCommand(input); setInput(""); } }}
            placeholder={busy ? "Processing..." : "Give a command to your agent..."}
            style={{ 
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--th-text-primary)", fontSize: 14, fontFamily: "var(--th-font-body)"
            }}
            disabled={busy}
            autoFocus
          />
          {busy && <RefreshCw size={16} className="animate-spin text-blue-400" />}
        </div>
      </div>
    </div>
  );
}
