import { useEffect, useState, useCallback } from "react";
import type { Agent } from "../types";
import type { ActiveAgentInfo, CliProcessInfo } from "../api";
import type { UiLanguage } from "../i18n";
import { pickLang, localeName } from "../i18n";
import { getActiveAgents, getCliProcesses, killCliProcess, stopTask } from "../api";
import AgentAvatar from "./AgentAvatar";
import HeaderModalChrome from "./ui/HeaderModalChrome";

interface AgentStatusPanelProps {
  agents: Agent[];
  uiLanguage: UiLanguage;
  onClose: () => void;
}

function fmtElapsed(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return "-";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function displayCliProvider(provider: CliProcessInfo["provider"]): string {
  if (provider === "claude") return "Claude";
  if (provider === "codex") return "Codex";
  if (provider === "gemini") return "Gemini";
  if (provider === "node") return "Node";
  if (provider === "python") return "Python";
  return "OpenCode";
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function AgentStatusPanel({ agents, uiLanguage, onClose }: AgentStatusPanelProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);
  const [activeAgents, setActiveAgents] = useState<ActiveAgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<Set<string>>(new Set());
  const [inspectorMode, setInspectorMode] = useState<"idle_cli" | "script" | null>(null);
  const [cliProcesses, setCliProcesses] = useState<CliProcessInfo[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [killingCliPids, setKillingCliPids] = useState<Set<number>>(new Set());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    getActiveAgents()
      .then(setActiveAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshCli = useCallback(() => {
    setCliLoading(true);
    getCliProcesses()
      .then(setCliProcesses)
      .catch(console.error)
      .finally(() => setCliLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => { refresh(); setTick((n) => n + 1); }, 5000);
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  useEffect(() => {
    if (!inspectorMode) return;
    refreshCli();
    const interval = setInterval(refreshCli, 5000);
    const onVis = () => { if (!document.hidden) refreshCli(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [inspectorMode, refreshCli]);

  // suppress unused tick warning
  void tick;

  const handleKill = async (taskId: string) => {
    if (!taskId || killing.has(taskId)) return;
    setKilling((prev) => new Set(prev).add(taskId));
    try {
      await stopTask(taskId);
      setTimeout(refresh, 1000);
    } catch (e) {
      console.error("Failed to stop task:", e);
    } finally {
      setKilling((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  };

  const handleKillCliProcess = async (pid: number) => {
    if (!Number.isFinite(pid) || pid <= 0 || killingCliPids.has(pid)) return;
    setKillingCliPids((prev) => new Set(prev).add(pid));
    try {
      await killCliProcess(pid);
      setTimeout(refreshCli, 600);
      setTimeout(refresh, 800);
    } catch (e) {
      console.error("Failed to kill CLI process:", e);
    } finally {
      setKillingCliPids((prev) => { const next = new Set(prev); next.delete(pid); return next; });
    }
  };

  const visibleCliProcesses =
    inspectorMode === "script"
      ? cliProcesses.filter((proc) => proc.provider === "node" || proc.provider === "python")
      : cliProcesses.filter((proc) => proc.provider !== "node" && proc.provider !== "python");

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        className={`relative mx-4 w-full flex flex-col overflow-hidden ${inspectorMode ? "max-w-3xl" : "max-w-xl"}`}
        style={{
          borderRadius: 10,
          border: "1px solid #E5E7EB",
          background: "#FFFFFF",
          maxHeight: "85vh",
          fontFamily: "var(--th-font-mono)",
          boxShadow: "rgba(0,0,0,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <HeaderModalChrome
          title={t({ ko: "에이전트 상태", en: "Agent Status", ja: "エージェント状態", zh: "代理状态" })}
          onClose={onClose}
        />

        {/* ── 상태 요약 헤더 (ps aux --agents): 다크=터미널 배경, 라이트=패널 배경 ── */}
        <div
          className="agent-status-bar px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ ...mono, fontSize: "12px", fontWeight: 700, color: "#3B82F6", letterSpacing: "0.06em" }}>
                $ ps aux --agents
              </span>
              <span
                style={{
                  ...mono, fontSize: "10px", fontWeight: 700,
                  padding: "1px 6px",
                  border: "1px solid #BFDBFE",
                  background: "rgba(59,130,246,0.15)",
                  color: "#3B82F6",
                }}
              >
                {activeAgents.length} RUNNING
              </span>
              {!loading && (
                <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF" }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ marginRight: 4, verticalAlign: "middle", background: "#8B5CF6" }} />
                  live · 5s
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Inspector toggles */}
              {(["idle_cli", "script"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={(e) => { e.stopPropagation(); const next = inspectorMode === mode ? null : mode; setInspectorMode(next); if (next) refreshCli(); }}
                  style={{
                    ...mono, fontSize: "9px", fontWeight: 700,
                    padding: "2px 7px",
                    border: "1px solid",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    background: inspectorMode === mode ? "rgba(59,130,246,0.15)" : "transparent",
                    borderColor: inspectorMode === mode ? "#BFDBFE" : "#E5E7EB",
                    color: inspectorMode === mode ? "#3B82F6" : "#9CA3AF",
                  }}
                >
                  {mode === "idle_cli" ? "IDLE CLI" : "SCRIPT"}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); refresh(); }}
                style={{ ...mono, fontSize: "12px", color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                title="Refresh"
              >↺</button>
            </div>
          </div>

          {/* 컬럼 헤더 */}
          {!loading && activeAgents.length > 0 && (
            <div
              className="mt-2 grid gap-2"
              style={{ ...mono, fontSize: "9px", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", gridTemplateColumns: "32px 1fr 80px 60px 60px 60px" }}
            >
              <span />
              <span>AGENT / TASK</span>
              <span>PROVIDER</span>
              <span>ACTIVITY</span>
              <span>IDLE</span>
              <span />
            </div>
          )}
        </div>

        {/* ── 에이전트 목록 ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6" style={{ ...mono, fontSize: "12px", color: "#9CA3AF" }}>
              <span className="animate-pulse">▌</span>
              {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : activeAgents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p style={{ ...mono, fontSize: "11px", color: "#9CA3AF" }}>
                {t({ ko: "작업 중인 에이전트 없음", en: "No agents currently working", ja: "作業中のエージェントなし", zh: "当前没有工作中的代理" })}
              </p>
              <p style={{ ...mono, fontSize: "10px", color: "#9CA3AF", opacity: 0.5, marginTop: 4 }}>— 0 processes —</p>
            </div>
          ) : (
            activeAgents.filter((ag) => agents.some((a) => a.id === ag.id)).map((ag, idx) => {
              const fullAgent = agents.find((a) => a.id === ag.id);
              const agentName = localeName(uiLanguage, ag);
              const deptName = localeName(uiLanguage, { name: ag.dept_name, name_ko: ag.dept_name_ko });
              const isKilling = ag.task_id ? killing.has(ag.task_id) : false;
              const idleText = ag.idle_seconds !== null ? fmtElapsed(ag.idle_seconds) : "-";
              const isIdle = ag.idle_seconds !== null && ag.idle_seconds > 300;

              return (
                <div
                  key={ag.id}
                  className="grid gap-2 px-4 py-2.5 items-center group"
                  style={{
                    gridTemplateColumns: "32px 1fr 80px 60px 60px 60px",
                    borderBottom: "1px solid #E5E7EB",
                    background: idx % 2 === 0 ? "transparent" : "#FFFFFF",
                  }}
                >
                  {/* 아바타 */}
                  <div style={{ flexShrink: 0 }}>
                    <AgentAvatar agent={fullAgent} agents={agents} size={28} />
                  </div>

                  {/* 이름 + 태스크 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span style={{ ...mono, fontSize: "11px", fontWeight: 700, color: "#111827" }}>{agentName}</span>
                      <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF", padding: "0 4px", border: "1px solid #E5E7EB", background: "#FFFFFF" }}>
                        {deptName}
                      </span>
                    </div>
                    {ag.task_title && (
                      <p className="truncate" style={{ ...mono, fontSize: "10px", color: "#9CA3AF", marginTop: 2 }}>
                        ↳ {ag.task_title}
                      </p>
                    )}
                  </div>

                  {/* CLI Provider */}
                  <span style={{ ...mono, fontSize: "10px", color: "#3B82F6", opacity: 0.8 }}>
                    {ag.cli_provider ?? "-"}
                  </span>

                  {/* 마지막 응답 */}
                  <span style={{ ...mono, fontSize: "10px", color: "#9CA3AF" }}>
                    {fmtTime(ag.last_activity_at)}
                  </span>

                  {/* Idle */}
                  <span style={{ ...mono, fontSize: "10px", color: isIdle ? "#3B82F6" : "#9CA3AF" }}>
                    {ag.has_active_process ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "#8B5CF6" }} />
                        {idleText}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#3B82F6" }} />
                        {idleText}
                      </span>
                    )}
                  </span>

                  {/* Kill */}
                  {ag.task_id ? (
                    <button
                      onClick={() => handleKill(ag.task_id!)}
                      disabled={isKilling}
                      style={{
                        ...mono, fontSize: "9px", fontWeight: 700,
                        padding: "2px 6px",
                        cursor: isKilling ? "not-allowed" : "pointer",
                        border: "1px solid #FECACA",
                        letterSpacing: "0.04em",
                        opacity: isKilling ? 0.5 : 1,
                        background: "#FEF2F2",
                        color: "#DC2626",
                      }}
                    >
                      {isKilling ? "…" : "KILL"}
                    </button>
                  ) : <span />}
                </div>
              );
            })
          )}

          {/* ── CLI Inspector ── */}
          {inspectorMode && (
            <div style={{ borderTop: "2px solid #E5E7EB", background: "#FFFFFF" }}>
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ borderBottom: "1px solid #E5E7EB" }}
              >
                <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {inspectorMode === "script" ? "SCRIPT PROCESSES" : "IDLE CLI PROCESSES"}
                  {" "}
                  <span style={{ color: "#3B82F6" }}>({visibleCliProcesses.length})</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); refreshCli(); }}
                  style={{ ...mono, fontSize: "9px", color: "#9CA3AF", background: "none", border: "1px solid #E5E7EB", cursor: "pointer", padding: "1px 6px" }}
                >
                  ↺ {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
                </button>
              </div>
              {cliLoading && visibleCliProcesses.length === 0 ? (
                <div className="px-4 py-3" style={{ ...mono, fontSize: "11px", color: "#9CA3AF" }}>
                  <span className="animate-pulse">▌</span> loading…
                </div>
              ) : visibleCliProcesses.length === 0 ? (
                <div className="px-4 py-3" style={{ ...mono, fontSize: "11px", color: "#9CA3AF" }}>
                  — {t({ ko: "실행 중인 프로세스 없음", en: "No running processes", ja: "実行中プロセスなし", zh: "无运行进程" })} —
                </div>
              ) : (
                visibleCliProcesses.map((proc) => {
                  const isKillingPid = killingCliPids.has(proc.pid);
                  const agentName = uiLanguage === "ko" ? proc.agent_name_ko || proc.agent_name || "-" : proc.agent_name || "-";
                  const commandText = proc.command || proc.executable;
                  return (
                    <div
                      key={proc.pid}
                      className="flex items-start gap-3 px-4 py-2.5"
                      style={{ borderBottom: "1px solid #E5E7EB" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span style={{ ...mono, fontSize: "10px", fontWeight: 700, color: "#3B82F6" }}>
                            {displayCliProvider(proc.provider)}
                          </span>
                          <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF" }}>PID {proc.pid}</span>
                          <span
                            style={{
                              ...mono, fontSize: "9px", padding: "0 4px",
                              border: proc.is_idle ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
                              color: proc.is_idle ? "#3B82F6" : "#8B5CF6",
                              background: proc.is_idle ? "rgba(59,130,246,0.15)" : "rgba(5,150,105,0.15)",
                            }}
                          >
                            {proc.is_idle ? "IDLE" : "ACTIVE"}
                          </span>
                          <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF" }}>{agentName}</span>
                        </div>
                        <p className="truncate" style={{ ...mono, fontSize: "10px", color: "#9CA3AF" }} title={commandText}>
                          {commandText}
                        </p>
                        {proc.idle_seconds !== null && (
                          <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF", opacity: 0.6 }}>
                            idle {fmtElapsed(proc.idle_seconds)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleKillCliProcess(proc.pid)}
                        disabled={isKillingPid}
                        style={{
                          ...mono, fontSize: "9px", fontWeight: 700,
                          padding: "2px 7px", flexShrink: 0,
                          cursor: isKillingPid ? "not-allowed" : "pointer",
                          border: "1px solid #FECACA",
                          background: "#FEF2F2",
                          color: "#DC2626",
                          opacity: isKillingPid ? 0.5 : 1,
                        }}
                      >
                        {isKillingPid ? "…" : "KILL"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderTop: "1px solid #E5E7EB", background: "#FFFFFF" }}
        >
          <span style={{ ...mono, fontSize: "9px", color: "#9CA3AF", letterSpacing: "0.04em" }}>
            AUTO-REFRESH 5s · {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={onClose}
            style={{
              ...mono, fontSize: "10px", fontWeight: 700,
              padding: "2px 12px",
              border: "1px solid #E5E7EB",
              background: "#F9FAFB",
              color: "#6B7280",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {t({ ko: "닫기", en: "CLOSE", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );
}
