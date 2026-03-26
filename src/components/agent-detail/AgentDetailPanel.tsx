import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "../../store/uiStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useI18n } from "../../i18n";
import { useTheme } from "../../ThemeContext";
import AgentDetailHeader from "./AgentDetailHeader";
import AgentDetailCurrentTask from "./AgentDetailCurrentTask";
import AgentDetailSections from "./AgentDetailSections";
import AgentChatTab from "./AgentChatTab";
import AgentTimeline from "./AgentTimeline";
import AgentLogsTab from "./AgentLogsTab";

export interface AgentDetailData {
  skills: Array<{ id: string; name: string; description?: string }>;
  rules: Array<{ id: string; title: string; scope: string; enabled: boolean }>;
  memories: Array<{ id: string; title: string; created_at?: number }>;
  recentTasks: Array<{ id: string; title: string; status: string; completed_at?: number }>;
  cost: { thisMonthUsd: number; thisMonthTokens: number; totalTokens: number } | null;
}

type TabKey = "overview" | "tasks" | "chat" | "timeline" | "logs";

const TABS: { key: TabKey; ko: string; en: string; ja: string; zh: string }[] = [
  { key: "overview", ko: "개요",    en: "Overview",  ja: "概要",         zh: "概览"   },
  { key: "tasks",    ko: "업무",    en: "Tasks",     ja: "タスク",       zh: "任务"   },
  { key: "chat",     ko: "채팅",    en: "Chat",      ja: "チャット",     zh: "聊天"   },
  { key: "timeline", ko: "타임라인", en: "Timeline",  ja: "タイムライン", zh: "时间线" },
  { key: "logs",     ko: "로그",    en: "Logs",      ja: "ログ",         zh: "日志"   },
];

export default function AgentDetailPanel() {
  const { selectedAgentId, setSelectedAgentId, openCli } = useUiStore();
  const { agents, departments } = useAgentStore();
  const { tasks, setTaskPanel } = useTaskStore();
  const { t } = useI18n();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [data, setData] = useState<AgentDetailData>({
    skills: [], rules: [], memories: [], recentTasks: [], cost: null,
  });
  const [loading, setLoading] = useState(false);

  const agent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const department = agent?.department_id ? departments.find((d) => d.id === agent.department_id) ?? null : null;
  const currentTask = agent?.current_task_id ? tasks.find((tk) => tk.id === agent.current_task_id) ?? null : null;
  const agentTasks = agent ? tasks.filter((tk) => tk.assigned_agent_id === agent.id) : [];

  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedAgentId || selectedAgentId === prevIdRef.current) return;
    prevIdRef.current = selectedAgentId;
    setActiveTab("overview");
    setLoading(true);
    setData({ skills: [], rules: [], memories: [], recentTasks: [], cost: null });

    const providerParam = agent?.cli_provider ? `&provider=${encodeURIComponent(agent.cli_provider)}` : "";
    Promise.allSettled([
      fetch(`/api/skills/available?limit=10${providerParam}`).then((r) => r.json()),
      fetch(`/api/agent-rules?scope_type=agent&scope_id=${selectedAgentId}&limit=5`).then((r) => r.json()),
      fetch(`/api/memory?scope_type=agent&scope_id=${selectedAgentId}&limit=5`).then((r) => r.json()),
      fetch(`/api/tasks?agent_id=${selectedAgentId}&limit=3`).then((r) => r.json()),
      fetch(`/api/agents/${selectedAgentId}/cost-summary`).then((r) => r.json()),
    ]).then(([skills, rules, memories, recentTasks, cost]) => {
      const rawRules = rules.status === "fulfilled"
        ? (Array.isArray(rules.value) ? rules.value : (rules.value?.rules ?? []))
        : [];
      const rawCost = cost.status === "fulfilled" && cost.value?.ok ? cost.value : null;
      setData({
        skills:      skills.status === "fulfilled"
          ? (Array.isArray(skills.value) ? skills.value : (skills.value?.skills ?? []))
          : [],
        rules:       rawRules.map((r: Record<string, unknown>) => ({
          id:      r.id as string,
          title:   (r.title as string) ?? "",
          scope:   (r.scope_type as string) ?? "",
          enabled: !!r.enabled,
        })),
        memories:    memories.status === "fulfilled"
          ? (Array.isArray(memories.value) ? memories.value : (memories.value?.memories ?? []))
          : [],
        recentTasks: recentTasks.status === "fulfilled"
          ? (Array.isArray(recentTasks.value) ? recentTasks.value : (recentTasks.value?.tasks ?? []))
          : [],
        cost: rawCost
          ? { thisMonthUsd: rawCost.thisMonthUsd ?? 0, thisMonthTokens: rawCost.thisMonthTokens ?? 0, totalTokens: rawCost.totalTokens ?? 0 }
          : null,
      });
    }).finally(() => setLoading(false));
  }, [selectedAgentId, agent?.cli_provider]);

  useEffect(() => {
    if (!selectedAgentId) prevIdRef.current = null;
  }, [selectedAgentId]);

  const close = () => setSelectedAgentId(null);

  const openTerminal = () => {
    if (currentTask) {
      setTaskPanel({ taskId: currentTask.id, tab: "terminal" });
      close();
    }
  };

  // ── 테마 토큰 ──────────────────────────────────────────────────────────
  const tk = {
    bg:           "var(--th-bg-elevated)",
    border:       "var(--th-border)",
    headerBg:     "var(--th-bg-surface)",
    headerBorder: "var(--th-border)",
    shadow:       "0 24px 80px rgba(0,0,0,0.10), 0 4px 16px var(--th-hover-overlay), 0 0 0 0.5px rgba(0,0,0,0.04)",
    backdrop:     "blur(40px) saturate(200%)",
    overlayBg:    "rgba(0,0,0,0.25)",
    overlayBlur:  "blur(4px)",
    titleText:    "var(--th-text-muted)",
    tabActive:    "var(--th-text-primary)",
    tabInactive:  "var(--th-text-muted)",
    tabBorder:    "var(--th-border)",
    dot0:         "#ff5f57",
    dot1:         "#febc2e",
    dot2:         "#28c840",
    escBg:        "var(--th-bg-primary)",
    escBorder:    "var(--th-border)",
    escColor:     "var(--th-text-muted)",
    escHoverBg:   "var(--th-border)",
    escHoverColor:"var(--th-text-primary)",
    logBg:        "rgba(48,209,88,0.08)",
    logBorder:    "rgba(48,209,88,0.2)",
    taskBg:       "var(--th-bg-surface)",
    taskBorder:   "var(--th-border)",
    taskText:     "var(--th-text-secondary)",
    taskMuted:    "var(--th-text-muted)",
  };

  const mono = "var(--th-font-mono, monospace)";

  const STATUS_COLOR: Record<string, string> = {
    done: "#30d158",
    in_progress: "var(--th-accent)",
    pending: tk.taskMuted,
    failed: "#ff453a",
    cancelled: tk.taskMuted,
  };

  return createPortal(
    <AnimatePresence>
      {selectedAgentId && (
        <div
          key="agent-detail-root"
          data-no-ctx="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 백드롭 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={close}
            style={{
              position: "absolute",
              inset: 0,
              background: tk.overlayBg,
              backdropFilter: tk.overlayBlur,
              WebkitBackdropFilter: tk.overlayBlur,
            }}
          />

          {/* 카드 */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: "relative",
              zIndex: 1,
              width: 640,
              maxHeight: "calc(100dvh - 80px)",
              display: "flex",
              flexDirection: "column",
              background: tk.bg,
              backdropFilter: tk.backdrop,
              WebkitBackdropFilter: tk.backdrop,
              border: `1px solid ${tk.border}`,
              borderRadius: 16,
              boxShadow: tk.shadow,
              overflow: "hidden",
            }}
          >
            {/* 타이틀바 */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 14px",
              borderBottom: `1px solid ${tk.headerBorder}`,
              flexShrink: 0,
              background: tk.headerBg,
            }}>
              {/* 신호등 */}
              <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
                {([tk.dot0, tk.dot1, tk.dot2] as const).map((c, i) => (
                  <div
                    key={i}
                    onClick={i === 0 ? close : undefined}
                    style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: c,
                      cursor: i === 0 ? "pointer" : "default",
                      boxShadow: `0 0 0 0.5px rgba(0,0,0,0.3)`,
                    }}
                  />
                ))}
              </div>

              <span style={{
                flex: 1,
                fontFamily: mono,
                fontSize: 11,
                color: tk.titleText,
                letterSpacing: "0.06em",
                userSelect: "none",
              }}>
                {agent
                  ? `${agent.avatar_emoji ?? "🤖"} ${agent.name_ko || agent.name}`
                  : t({ ko: "에이전트 상세", en: "Agent Detail", ja: "エージェント詳細", zh: "代理详情" })}
              </span>

              {/* CLI 버튼 */}
              {agent && (
                <button
                  type="button"
                  onClick={() => { openCli(agent.id); close(); }}
                  title={t({ ko: "Agent CLI 열기", en: "Open Agent CLI", ja: "Agent CLI を開く", zh: "打开 Agent CLI" })}
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    background: "rgba(50,173,230,0.10)",
                    border: "1px solid rgba(50,173,230,0.25)",
                    borderRadius: 5,
                    color: "#32ade6",
                    padding: "2px 8px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(50,173,230,0.22)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(50,173,230,0.10)"; }}
                >
                  &gt;_
                </button>
              )}

              {/* 로그 버튼 — 실행 중 태스크가 있을 때만 */}
              {currentTask && (
                <button
                  type="button"
                  onClick={openTerminal}
                  title={t({ ko: "실시간 로그 보기", en: "View live log", ja: "ライブログ", zh: "查看日志" })}
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    background: tk.logBg,
                    border: `1px solid ${tk.logBorder}`,
                    borderRadius: 5,
                    color: "#30d158",
                    padding: "2px 8px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(48,209,88,0.22)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = tk.logBg; }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  {t({ ko: "로그", en: "log", ja: "ログ", zh: "日志" })}
                </button>
              )}

              <button
                type="button"
                onClick={close}
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  background: tk.escBg,
                  border: `1px solid ${tk.escBorder}`,
                  borderRadius: 5,
                  color: tk.escColor,
                  padding: "2px 8px",
                  cursor: "pointer",
                  lineHeight: "16px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = tk.escHoverBg;
                  (e.currentTarget as HTMLButtonElement).style.color = tk.escHoverColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = tk.escBg;
                  (e.currentTarget as HTMLButtonElement).style.color = tk.escColor;
                }}
              >
                esc
              </button>
            </div>

            {/* 탭 바 */}
            <div style={{
              display: "flex",
              borderBottom: `1px solid ${tk.tabBorder}`,
              background: tk.headerBg,
              flexShrink: 0,
              padding: "0 14px",
            }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: activeTab === tab.key ? 700 : 400,
                    letterSpacing: "0.07em",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${activeTab === tab.key ? "var(--th-accent)" : "transparent"}`,
                    color: activeTab === tab.key ? "var(--th-accent)" : tk.tabInactive,
                    cursor: "pointer",
                    transition: "color 0.12s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t({ ko: tab.ko, en: tab.en, ja: tab.ja, zh: tab.zh })}
                </button>
              ))}
            </div>

            {/* 본문 */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {!agent ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: 160,
                  fontFamily: mono,
                  fontSize: 11,
                  color: "var(--th-text-muted)",
                }}>
                  {t({ ko: "에이전트를 선택하세요", en: "Select an agent", ja: "エージェントを選択", zh: "选择代理" })}
                </div>
              ) : activeTab === "overview" ? (
                <>
                  <AgentDetailHeader agent={agent} department={department} isLight={isLight} />
                  <AgentDetailCurrentTask task={currentTask} onOpenTerminal={openTerminal} isLight={isLight} />
                  <AgentDetailSections data={data} loading={loading} isLight={isLight} />
                </>
              ) : activeTab === "tasks" ? (
                <div style={{ padding: "12px 16px" }}>
                  {agentTasks.length === 0 ? (
                    <div style={{ fontFamily: mono, fontSize: 11, color: tk.taskMuted, textAlign: "center", paddingTop: 40 }}>
                      {t({ ko: "할당된 업무 없음", en: "No tasks assigned", ja: "タスクなし", zh: "无任务" })}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {agentTasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            background: tk.taskBg,
                            border: `1px solid ${tk.taskBorder}`,
                            borderRadius: 8,
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setTaskPanel({ taskId: task.id, tab: "terminal" });
                            close();
                          }}
                        >
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                            background: STATUS_COLOR[task.status] ?? tk.taskMuted,
                          }} />
                          <span style={{ fontFamily: mono, fontSize: 11, color: tk.taskText, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {task.title}
                          </span>
                          <span style={{ fontFamily: mono, fontSize: 9, color: tk.taskMuted, flexShrink: 0, letterSpacing: "0.06em" }}>
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "chat" ? (
                <AgentChatTab agent={agent} />
              ) : activeTab === "timeline" ? (
                <div style={{ padding: "4px 0" }}>
                  <AgentTimeline agentId={agent.id} t={t} />
                </div>
              ) : activeTab === "logs" ? (
                <AgentLogsTab
                  agentId={agent.id}
                  taskId={currentTask?.id ?? null}
                  t={t}
                  isLight={isLight}
                />
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
