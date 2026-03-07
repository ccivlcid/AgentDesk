import { useEffect, useState, useCallback } from "react";
import type { Agent } from "../types";
import type { ActiveAgentInfo, CliProcessInfo } from "../api";
import type { UiLanguage } from "../i18n";
import { pickLang, localeName } from "../i18n";
import { getActiveAgents, getCliProcesses, killCliProcess, stopTask } from "../api";
import AgentAvatar from "./AgentAvatar";

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

export default function AgentStatusPanel({ agents, uiLanguage, onClose }: AgentStatusPanelProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);
  const [activeAgents, setActiveAgents] = useState<ActiveAgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<Set<string>>(new Set());
  const [inspectorMode, setInspectorMode] = useState<"idle_cli" | "script" | null>(null);
  const [cliProcesses, setCliProcesses] = useState<CliProcessInfo[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [killingCliPids, setKillingCliPids] = useState<Set<number>>(new Set());

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
    let interval: ReturnType<typeof setInterval>;
    function start() {
      interval = setInterval(refresh, 5000);
    }
    function onVis() {
      clearInterval(interval);
      if (!document.hidden) {
        refresh();
        start();
      }
    }
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    if (!inspectorMode) return;
    refreshCli();
    let interval: ReturnType<typeof setInterval>;
    function start() {
      interval = setInterval(refreshCli, 5000);
    }
    function onVis() {
      clearInterval(interval);
      if (!document.hidden) {
        refreshCli();
        start();
      }
    }
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [inspectorMode, refreshCli]);

  const handleKill = async (taskId: string) => {
    if (!taskId || killing.has(taskId)) return;
    setKilling((prev) => new Set(prev).add(taskId));
    try {
      await stopTask(taskId);
      // 잠시 후 새로고침
      setTimeout(refresh, 1000);
    } catch (e) {
      console.error("Failed to stop task:", e);
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
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
      setKillingCliPids((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  };

  const visibleCliProcesses =
    inspectorMode === "script"
      ? cliProcesses.filter((proc) => proc.provider === "node" || proc.provider === "python")
      : cliProcesses.filter((proc) => proc.provider !== "node" && proc.provider !== "python");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={`relative mx-4 w-full shadow-2xl ${inspectorMode ? "max-w-3xl" : "max-w-lg"}`}
        style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#x1F6E0;</span>
            <h2 className="text-lg font-bold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {t({ ko: "활성 에이전트", en: "Active Agents", ja: "アクティブエージェント", zh: "活跃代理" })}
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
              {activeAgents.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextMode = inspectorMode === "script" ? null : "script";
                setInspectorMode(nextMode);
                if (nextMode) refreshCli();
              }}
              className="flex h-8 items-center gap-1 px-2 text-[11px] font-medium font-mono whitespace-nowrap transition"
              style={inspectorMode === "script"
                ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }}
              title={t({ ko: "Script 조회", en: "Script Inspector", ja: "Script確認", zh: "Script查看" })}
            >
              <span>{t({ ko: "Script조회", en: "Script", ja: "Script", zh: "Script" })}</span>
              <span aria-hidden>&#x2699;</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextMode = inspectorMode === "idle_cli" ? null : "idle_cli";
                setInspectorMode(nextMode);
                if (nextMode) refreshCli();
              }}
              className="flex h-8 items-center gap-1 px-2 text-[11px] font-medium font-mono whitespace-nowrap transition"
              style={inspectorMode === "idle_cli"
                ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }}
              title={t({ ko: "유휴 CLI 조회", en: "Idle CLI Inspector", ja: "アイドルCLI確認", zh: "闲置CLI查看" })}
            >
              <span>{t({ ko: "유휴CLI조회", en: "Idle CLI", ja: "アイドルCLI", zh: "闲置CLI" })}</span>
              <span aria-hidden>&#x1F5A5;</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="flex h-8 w-8 items-center justify-center transition"
              style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "transparent" }}
              title={t({ ko: "새로고침", en: "Refresh", ja: "リフレッシュ", zh: "刷新" })}
            >
              &#x21BB;
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center transition"
              style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "transparent" }}
            >
              &#x2715;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {inspectorMode && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-secondary)" }}>
                  {inspectorMode === "script"
                    ? t({
                        ko: "실행 중인 Script",
                        en: "Running Script Processes",
                        ja: "実行中Script",
                        zh: "运行中的Script",
                      })
                    : t({
                        ko: "실행 중인 유휴CLI",
                        en: "Running Idle CLI Processes",
                        ja: "実行中アイドルCLI",
                        zh: "运行中的闲置CLI",
                      })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>
                    {visibleCliProcesses.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshCli();
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
                  >
                    {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
                  </button>
                </div>
              </div>
              {cliLoading && visibleCliProcesses.length === 0 ? (
                <div className="py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {inspectorMode === "script"
                    ? t({
                        ko: "Script 목록 불러오는 중...",
                        en: "Loading script list...",
                        ja: "Script一覧を読み込み中...",
                        zh: "正在加载Script列表...",
                      })
                    : t({
                        ko: "유휴 CLI 목록 불러오는 중...",
                        en: "Loading idle CLI list...",
                        ja: "アイドルCLI一覧を読み込み中...",
                        zh: "正在加载闲置CLI列表...",
                      })}
                </div>
              ) : visibleCliProcesses.length === 0 ? (
                <div className="py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {inspectorMode === "script"
                    ? t({
                        ko: "실행 중인 Script가 없습니다",
                        en: "No running script process",
                        ja: "実行中Scriptなし",
                        zh: "没有运行中的Script进程",
                      })
                    : t({
                        ko: "실행 중인 유휴 CLI가 없습니다",
                        en: "No running idle CLI",
                        ja: "実行中アイドルCLIなし",
                        zh: "没有运行中的闲置CLI",
                      })}
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
                  {visibleCliProcesses.map((proc) => {
                    const isKilling = killingCliPids.has(proc.pid);
                    const agentName =
                      uiLanguage === "ko" ? proc.agent_name_ko || proc.agent_name || "-" : proc.agent_name || "-";
                    const commandText = proc.command || proc.executable;
                    const displayTitle = proc.task_title && proc.task_title !== commandText ? proc.task_title : null;
                    return (
                      <div key={proc.pid} className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="px-1.5 py-0.5 font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}>
                                {displayCliProvider(proc.provider)}
                              </span>
                              <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>PID {proc.pid}</span>
                              {proc.is_idle ? (
                                <span className="px-1.5 py-0.5 font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
                                  {t({ ko: "유휴", en: "Idle", ja: "アイドル", zh: "空闲" })}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.1)", color: "rgb(110,231,183)" }}>
                                  {t({ ko: "활성", en: "Active", ja: "稼働中", zh: "활跃" })}
                                </span>
                              )}
                            </div>
                            {displayTitle ? (
                              <p className="mt-1 text-[11px] font-mono break-all" style={{ color: "var(--th-text-secondary)" }}>{displayTitle}</p>
                            ) : null}
                            <p
                              className="mt-1 overflow-x-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-all"
                              style={{ color: "var(--th-text-muted)" }}
                              title={commandText}
                            >
                              {commandText}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                              <span>
                                {t({ ko: "담당", en: "Agent", ja: "担当", zh: "代理" })}: {agentName}
                              </span>
                              <span>
                                {t({ ko: "작업", en: "Task", ja: "タスク", zh: "任务" })}: {proc.task_status || "-"}
                              </span>
                              <span>Idle: {fmtElapsed(proc.idle_seconds)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleKillCliProcess(proc.pid)}
                            disabled={isKilling}
                            className="flex-shrink-0 px-2 py-1 text-[11px] font-medium font-mono transition"
                            style={isKilling
                              ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", cursor: "not-allowed" }
                              : { borderRadius: "2px", border: "1px solid rgba(244,63,94,0.4)", background: "rgba(244,63,94,0.15)", color: "rgb(253,164,175)" }}
                          >
                            {isKilling
                              ? t({ ko: "중지 중...", en: "Killing...", ja: "停止中...", zh: "停止中..." })
                              : t({ ko: "Kill", en: "Kill", ja: "Kill", zh: "Kill" })}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
              </div>
            </div>
          ) : activeAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="mb-2 text-3xl opacity-40">&#x1F634;</span>
              <p className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "현재 작업 중인 에이전트가 없습니다",
                  en: "No agents currently working",
                  ja: "現在作業中のエージェントなし",
                  zh: "当前没有工作中的代理",
                })}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
              {activeAgents.map((ag) => {
                const fullAgent = agents.find((a) => a.id === ag.id);
                const agentName = localeName(uiLanguage, ag);
                const deptName = localeName(uiLanguage, { name: ag.dept_name, name_ko: ag.dept_name_ko });
                const isKilling = ag.task_id ? killing.has(ag.task_id) : false;
                const idleText = ag.idle_seconds !== null ? fmtElapsed(ag.idle_seconds) : "-";
                const isIdle = ag.idle_seconds !== null && ag.idle_seconds > 300; // 5분 이상 idle

                return (
                  <div key={ag.id} className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <AgentAvatar agent={fullAgent} agents={agents} size={40} rounded="xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-mono" style={{ color: "var(--th-text-heading)" }}>{agentName}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
                            {deptName}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>
                            {ag.cli_provider}
                          </span>
                        </div>
                        {ag.task_title && <p className="mt-0.5 truncate text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{ag.task_title}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {ag.has_active_process ? (
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                              {t({ ko: "프로세스 활성", en: "Process active", ja: "プロセス実行中", zh: "进程活跃" })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {t({ ko: "프로세스 없음", en: "No process", ja: "プロセスなし", zh: "无进程" })}
                            </span>
                          )}
                          <span>
                            {t({ ko: "마지막 응답", en: "Last activity", ja: "最終応答", zh: "最后响应" })}:{" "}
                            {fmtTime(ag.last_activity_at)}
                          </span>
                          <span className={isIdle ? "text-amber-400" : ""}>Idle: {idleText}</span>
                        </div>
                      </div>
                      {ag.task_id && (
                        <button
                          onClick={() => handleKill(ag.task_id!)}
                          disabled={isKilling}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium font-mono transition"
                          style={isKilling
                            ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", cursor: "not-allowed" }
                            : { borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}
                        >
                          {isKilling
                            ? t({ ko: "중지 중...", en: "Stopping...", ja: "停止中...", zh: "停止中..." })
                            : t({ ko: "강제 중지", en: "Kill", ja: "強制停止", zh: "强制停止" })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3" style={{ borderTop: "1px solid var(--th-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "5초마다 자동 갱신",
                en: "Auto-refresh every 5s",
                ja: "5秒ごとに自動更新",
                zh: "每5秒自动刷新",
              })}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium font-mono transition"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-elevated)" }}
            >
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
