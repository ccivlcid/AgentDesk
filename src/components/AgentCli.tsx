import React, { useEffect, useRef, useState } from "react";
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
  kind: "input" | "output" | "error" | "info";
  text: string;
  timestamp: Date;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeWelcome(t: (msgs: any) => string): ReplEntry {
  return {
    id: "welcome",
    kind: "info",
    text: t({
      ko: "Agent CLI — 에이전트에게 직접 태스크를 보냅니다.\n:help 로 도움말, :list 로 에이전트 목록, :clear 로 화면 지우기",
      en: "Agent CLI — send tasks directly to agents.\nType :help for commands, :list for agents, :clear to reset.",
      ja: "Agent CLI — エージェントに直接タスクを送信。\n:help でコマンド一覧, :list でエージェント一覧, :clear で画面クリア",
      zh: "Agent CLI — 直接向代理发送任务。\n输入 :help 查看命令, :list 查看代理列表, :clear 清屏",
    }),
    timestamp: new Date(),
  };
}

export default function AgentCli({ agents, currentProject, initialAgentId }: Props) {
  const { t } = useI18n();
  const mono = "var(--th-font-mono)";

  // 에이전트별 세션 Map (메모리 내 유지)
  const sessionsRef = useRef<Map<string, CliSession>>(new Map());

  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    if (initialAgentId) return initialAgentId;
    return "";
  });

  const getOrCreateSession = (agentId: string): CliSession => {
    if (!sessionsRef.current.has(agentId)) {
      sessionsRef.current.set(agentId, {
        agentId,
        history: [],
        entries: [makeWelcome(t)],
        lastTaskId: null,
      });
    }
    return sessionsRef.current.get(agentId)!;
  };

  const currentSession = selectedAgentId
    ? getOrCreateSession(selectedAgentId)
    : { agentId: "", history: [], entries: [makeWelcome(t)], lastTaskId: null };

  const [entries, setEntries] = useState<ReplEntry[]>(() => currentSession.entries);
  const [history, setHistory] = useState<string[]>(() => currentSession.history);
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(() => currentSession.lastTaskId);
  const runningTaskIdRef = useRef<string | null>(runningTaskId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { send: wsSend, on } = useWebSocket();

  // ref 동기화
  useEffect(() => { runningTaskIdRef.current = runningTaskId; }, [runningTaskId]);

  // 에이전트 미선택 시 초기 에이전트 설정
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      const target: Agent | undefined =
        (initialAgentId ? agents.find((a) => a.id === initialAgentId) : undefined)
        ?? agents.find((a) => a.status === "idle")
        ?? agents[0];
      if (target) setSelectedAgentId(target.id);
    }
  }, [agents, selectedAgentId, initialAgentId]);

  // 에이전트 전환 시 세션 복원
  const switchAgent = (agentId: string) => {
    if (selectedAgentId) {
      // 현재 세션 저장
      const cur = sessionsRef.current.get(selectedAgentId);
      if (cur) {
        cur.entries = entries;
        cur.history = history;
        cur.lastTaskId = runningTaskId;
      }
    }
    const next = getOrCreateSession(agentId);
    setSelectedAgentId(agentId);
    setEntries(next.entries);
    setHistory(next.history);
    setRunningTaskId(next.lastTaskId);
    setHistoryIdx(-1);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // 실행 중인 태스크 구독
  useEffect(() => {
    if (!runningTaskId) return;
    wsSend({ type: "subscribe_task", taskId: runningTaskId });
    return () => { wsSend({ type: "unsubscribe_task", taskId: runningTaskId }); };
  }, [runningTaskId, wsSend]);

  // cli_output 수신
  useEffect(() => {
    return on("cli_output", (payload) => {
      const p = payload as { task_id?: string; data?: string; text?: string };
      if (!p.task_id || p.task_id !== runningTaskIdRef.current) return;
      const raw = p.data ?? p.text ?? "";
      const lines = raw.split("\n").filter((l) => l.trim() !== "");
      if (lines.length === 0) return;
      setEntries((prev) => [
        ...prev,
        ...lines.map((line) => ({
          id: crypto.randomUUID(),
          kind: "output" as const,
          text: line,
          timestamp: new Date(),
        })),
      ]);
    });
  }, [on]);

  // task_update 완료 감지
  useEffect(() => {
    return on("task_update", (payload) => {
      const p = payload as { id?: string; status?: string };
      if (!p.id || p.id !== runningTaskIdRef.current) return;
      if (!["done", "cancelled", "error"].includes(p.status ?? "")) return;
      setRunningTaskId(null);
      const statusLabel = (p.status ?? "").toUpperCase();
      setEntries((prev) => [
        ...prev,
        { id: crypto.randomUUID(), kind: p.status === "done" ? "info" : "error", text: `[${statusLabel}]`, timestamp: new Date() },
      ]);
    });
  }, [on]);

  const addEntry = (kind: ReplEntry["kind"], text: string) => {
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), kind, text, timestamp: new Date() }]);
  };

  const handleCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    addEntry("input", trimmed);
    setHistory((prev) => [trimmed, ...prev.slice(0, 99)]);
    setHistoryIdx(-1);

    if (trimmed === ":clear") { setEntries([]); return; }

    if (trimmed === ":reset") {
      if (selectedAgentId) sessionsRef.current.delete(selectedAgentId);
      setEntries([makeWelcome(t)]);
      setHistory([]);
      setRunningTaskId(null);
      setHistoryIdx(-1);
      return;
    }

    if (trimmed === ":list" || trimmed === ":ls") {
      const lines = agents.map((a) => `  ${a.avatar_emoji} ${a.name}  [${a.status}]  id:${a.id}`);
      addEntry("info", lines.length > 0 ? lines.join("\n") : t({ ko: "(에이전트 없음)", en: "(no agents)", ja: "(エージェントなし)", zh: "(无代理)" }));
      return;
    }

    if (trimmed === ":status") {
      const tid = runningTaskIdRef.current;
      addEntry("info", tid
        ? t({ ko: `● 실행 중 — task id: ${tid}`, en: `● running — task id: ${tid}`, ja: `● 実行中 — task id: ${tid}`, zh: `● 运行中 — task id: ${tid}` })
        : t({ ko: "○ 실행 중인 태스크 없음", en: "○ no running task", ja: "○ 実行中のタスクなし", zh: "○ 无运行中的任务" })
      );
      return;
    }

    if (trimmed === ":history") {
      addEntry("info", history.length > 0 ? history.map((h, i) => `  ${i + 1}. ${h}`).join("\n") : t({ ko: "(히스토리 없음)", en: "(no history)", ja: "(履歴なし)", zh: "(无历史)" }));
      return;
    }

    if (trimmed === ":help") {
      addEntry("info", t({
        ko: [
          "사용 가능한 명령어:",
          "  :list / :ls              — 에이전트 목록",
          "  :switch <이름|id>         — 에이전트 전환 (세션 유지)",
          "  :use <이름|id>            — (동일) 에이전트 전환",
          "  :status                  — 현재 실행 중인 태스크",
          "  :history                 — 명령어 히스토리",
          "  :inject <텍스트>          — 실행 중인 태스크에 프롬프트 주입",
          "  :clear                   — 화면 지우기",
          "  :reset                   — 세션 완전 초기화",
          "  :help                    — 이 도움말",
          "  <태스크 내용>             — 에이전트에게 태스크 생성 + 즉시 실행",
        ].join("\n"),
        en: [
          "Available commands:",
          "  :list / :ls              — show agent list",
          "  :switch <name|id>        — switch agent (session preserved)",
          "  :use <name|id>           — (same) switch agent",
          "  :status                  — show current running task",
          "  :history                 — command history",
          "  :inject <text>           — inject prompt into running task",
          "  :clear                   — clear screen",
          "  :reset                   — reset session completely",
          "  :help                    — this help",
          "  <any text>               — create & run task on selected agent",
        ].join("\n"),
        ja: [
          "利用可能なコマンド:",
          "  :list / :ls              — エージェント一覧",
          "  :switch <名前|id>         — エージェント切替（セッション維持）",
          "  :use <名前|id>            — （同上）エージェント切替",
          "  :status                  — 実行中タスクを確認",
          "  :history                 — コマンド履歴",
          "  :inject <テキスト>        — 実行中タスクにプロンプト注入",
          "  :clear                   — 画面クリア",
          "  :reset                   — セッション完全リセット",
          "  :help                    — このヘルプ",
          "  <テキスト>                — エージェントにタスク作成＆実行",
        ].join("\n"),
        zh: [
          "可用命令:",
          "  :list / :ls              — 显示代理列表",
          "  :switch <名称|id>         — 切换代理（保留会话）",
          "  :use <名称|id>            — （同上）切换代理",
          "  :status                  — 查看当前运行中的任务",
          "  :history                 — 命令历史",
          "  :inject <文本>            — 向运行中的任务注入提示",
          "  :clear                   — 清屏",
          "  :reset                   — 完全重置会话",
          "  :help                    — 本帮助",
          "  <任意文本>                — 向选中代理创建并运行任务",
        ].join("\n"),
      }));
      return;
    }

    // :switch / :use
    const switchMatch = trimmed.match(/^:(?:switch|use)\s+(.+)$/i);
    if (switchMatch) {
      const query = switchMatch[1].trim().toLowerCase();
      const found = agents.find(
        (a) => a.id.toLowerCase() === query || a.name.toLowerCase().includes(query) || (a.name_ko ?? "").toLowerCase().includes(query)
      );
      if (found) {
        switchAgent(found.id);
        addEntry("info", `→ ${found.avatar_emoji} ${found.name} (${found.status})`);
      } else {
        addEntry("error", t({ ko: `에이전트를 찾을 수 없습니다: ${query}`, en: `Agent not found: ${query}`, ja: `エージェントが見つかりません: ${query}`, zh: `未找到代理: ${query}` }));
      }
      return;
    }

    if (trimmed.startsWith(":inject ")) {
      const prompt = trimmed.slice(8).trim();
      if (!prompt) { addEntry("error", t({ ko: ":inject <텍스트> 형식으로 입력하세요", en: "Usage: :inject <text>", ja: "使用方法: :inject <テキスト>", zh: "用法: :inject <文本>" })); return; }
      const tid = runningTaskIdRef.current;
      if (!tid) { addEntry("error", t({ ko: "실행 중인 태스크가 없습니다.", en: "No running task.", ja: "実行中のタスクがありません。", zh: "没有正在运行的任务。" })); return; }
      setBusy(true);
      try {
        const res = await getTerminal(tid);
        if (!res.interrupt) { addEntry("error", t({ ko: "인터럽트 토큰을 가져올 수 없습니다.", en: "Could not get interrupt token.", ja: "割り込みトークンを取得できません。", zh: "无法获取中断令牌。" })); return; }
        await injectTaskPrompt(tid, { session_id: res.interrupt.session_id, interrupt_token: res.interrupt.control_token, prompt });
        addEntry("info", `→ ${t({ ko: "프롬프트 주입됨", en: "prompt injected", ja: "プロンプト注入済み", zh: "提示已注入" })}`);
      } catch (err) {
        addEntry("error", `✗ ${err instanceof Error ? err.message : String(err)}`);
      } finally { setBusy(false); }
      return;
    }

    if (trimmed.startsWith(":")) {
      addEntry("error", t({ ko: `알 수 없는 명령어: ${trimmed}`, en: `Unknown command: ${trimmed}`, ja: `不明なコマンド: ${trimmed}`, zh: `未知命令: ${trimmed}` }));
      return;
    }

    // 태스크 생성 + 실행
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) {
      addEntry("error", t({ ko: "에이전트가 선택되지 않았습니다. :switch <이름> 으로 선택하세요.", en: "No agent selected. Use :switch <name>.", ja: "エージェントが選択されていません。:switch <名前> で選択してください。", zh: "未选择代理。请使用 :switch <名称>。" }));
      return;
    }

    setBusy(true);
    try {
      const taskId = await createTask({ title: trimmed, assigned_agent_id: agent.id, project_id: currentProject?.id, project_path: currentProject?.project_path });
      await assignTask(taskId, agent.id);
      await runTask(taskId);
      setRunningTaskId(taskId);
      addEntry("info", t({
        ko: `▶ 태스크 실행 시작 (id: ${taskId})\n  에이전트: ${agent.avatar_emoji} ${agent.name}\n  출력이 아래에 스트리밍됩니다.`,
        en: `▶ Task started (id: ${taskId})\n  Agent: ${agent.avatar_emoji} ${agent.name}\n  Output will stream below.`,
        ja: `▶ タスク開始 (id: ${taskId})\n  エージェント: ${agent.avatar_emoji} ${agent.name}\n  出力は以下にストリーミングされます。`,
        zh: `▶ 任务已启动 (id: ${taskId})\n  代理: ${agent.avatar_emoji} ${agent.name}\n  输出将在下方实时显示。`,
      }));
    } catch (err) {
      addEntry("error", `✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? "" : (history[next] ?? ""));
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const promptLabel = selectedAgent
    ? `[${selectedAgent.avatar_emoji} ${selectedAgent.name} @ ${currentProject?.name ?? "—"}]`
    : t({ ko: "[에이전트 미선택]", en: "[no agent selected]", ja: "[エージェント未選択]", zh: "[未选择代理]" });

  const entryColor = (kind: ReplEntry["kind"]) => {
    if (kind === "input") return "var(--th-accent)";
    if (kind === "error") return "var(--th-terminal-error)";
    if (kind === "info") return "var(--th-text-muted)";
    return "var(--th-terminal-text)";
  };

  const entryPrefix = (kind: ReplEntry["kind"]) => {
    if (kind === "input") return <span style={{ color: "var(--th-accent)", marginRight: 4 }}>$</span>;
    if (kind === "output") return <span style={{ color: "var(--th-accent)", marginRight: 4 }}>✦</span>;
    if (kind === "error") return <span style={{ color: "var(--th-terminal-error)", marginRight: 4 }}>✖</span>;
    return <span style={{ color: "var(--th-text-muted)", marginRight: 4 }}>→</span>;
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--th-terminal-bg)", fontFamily: mono }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* 헤더 */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: "var(--th-bg-surface)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t({ ko: "Agent CLI", en: "Agent CLI", ja: "Agent CLI", zh: "Agent CLI" })}
        </span>
        {runningTaskId && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--th-accent)", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 10, color: "var(--th-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "실행 중", en: "live", ja: "実行中", zh: "运行中" })}
            </span>
          </div>
        )}
        {/* 에이전트 드롭다운 */}
        <select
          value={selectedAgentId}
          onChange={(e) => switchAgent(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, background: "var(--th-input-bg)", color: "var(--th-text)", border: "1px solid var(--th-input-border)", borderRadius: 0, padding: "2px 6px", cursor: "pointer" }}
        >
          {agents.length === 0 && <option value="">{t({ ko: "에이전트 없음", en: "No agents", ja: "エージェントなし", zh: "无代理" })}</option>}
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.avatar_emoji} {a.name} [{a.status}]</option>
          ))}
        </select>
        {/* ↺ 초기화 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (selectedAgentId) sessionsRef.current.delete(selectedAgentId); setEntries([makeWelcome(t)]); setHistory([]); setRunningTaskId(null); }}
          title={t({ ko: "세션 초기화", en: "Reset session", ja: "セッションリセット", zh: "重置会话" })}
          style={{ fontFamily: mono, fontSize: 11, background: "none", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", padding: "2px 6px", cursor: "pointer", borderRadius: 0 }}
        >
          ↺
        </button>
      </div>

      {/* 출력 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0, marginTop: 1 }}>{formatTime(entry.timestamp)}</span>
            <span style={{ fontSize: 11, color: entryColor(entry.kind), whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
              {entryPrefix(entry.kind)}
              {entry.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ borderTop: "1px solid var(--th-border)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "var(--th-bg-surface)" }}>
        <span style={{ fontSize: 11, color: "var(--th-terminal-prompt)", flexShrink: 0, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {busy ? `${promptLabel} ⠋` : `${promptLabel} $`}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
          placeholder={busy
            ? t({ ko: "처리 중...", en: "processing...", ja: "処理中...", zh: "处理中..." })
            : t({ ko: "태스크 입력 또는 :help", en: "enter task or :help", ja: "タスク入力 または :help", zh: "输入任务或 :help" })
          }
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 12, color: "var(--th-terminal-text)", opacity: busy ? 0.5 : 1 }}
          autoFocus
        />
        {(busy || runningTaskId) && (
          <span style={{ fontSize: 10, color: busy ? "var(--th-text-muted)" : "var(--th-accent)", flexShrink: 0 }}>●</span>
        )}
      </div>
    </div>
  );
}
