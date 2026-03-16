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
  agentName?: string;
  timestamp: Date;
}

interface Props {
  agents: Agent[];
  currentProject?: Project | null;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AgentRepl({ agents, currentProject }: Props) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ReplEntry[]>([
    {
      id: "welcome",
      kind: "info",
      text: t({
        ko: "AgentDesk REPL — 에이전트에게 직접 태스크를 보냅니다.\n:help 로 도움말, :list 로 에이전트 목록, :clear 로 화면 지우기",
        en: "AgentDesk REPL — send tasks directly to agents.\nType :help for commands, :list for agents, :clear to reset.",
        ja: "AgentDesk REPL — エージェントに直接タスクを送信。\n:help でコマンド一覧, :list でエージェント一覧, :clear で画面クリア",
        zh: "AgentDesk REPL — 直接向代理发送任务。\n输入 :help 查看命令, :list 查看代理列表, :clear 清屏",
      }),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const runningTaskIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { send: wsSend, on } = useWebSocket();
  const mono = "var(--th-font-mono)";

  // ref를 state와 동기화
  useEffect(() => {
    runningTaskIdRef.current = runningTaskId;
  }, [runningTaskId]);

  // 에이전트 미선택 시 첫 번째 idle 에이전트로 기본 설정
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      const idle = agents.find((a) => a.status === "idle") ?? agents[0];
      setSelectedAgentId(idle.id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // 실행 중인 태스크의 cli_output 구독/해제
  useEffect(() => {
    if (!runningTaskId) return;
    wsSend({ type: "subscribe_task", taskId: runningTaskId });
    return () => {
      wsSend({ type: "unsubscribe_task", taskId: runningTaskId });
    };
  }, [runningTaskId, wsSend]);

  // cli_output 실시간 수신
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

  // task_update: 태스크 완료/취소/오류 감지
  useEffect(() => {
    return on("task_update", (payload) => {
      const p = payload as { id?: string; status?: string };
      if (!p.id || p.id !== runningTaskIdRef.current) return;
      const terminal = ["done", "cancelled", "error"];
      if (!terminal.includes(p.status ?? "")) return;
      setRunningTaskId(null);
      const statusLabel = (p.status ?? "").toUpperCase();
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: p.status === "done" ? "info" : "error",
          text: `[${statusLabel}]`,
          timestamp: new Date(),
        },
      ]);
    });
  }, [on]);

  const addEntry = (kind: ReplEntry["kind"], text: string, agentName?: string) => {
    setEntries((prev: ReplEntry[]) => [
      ...prev,
      { id: crypto.randomUUID(), kind, text, agentName, timestamp: new Date() },
    ]);
  };

  const handleCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    addEntry("input", trimmed);
    setHistory((prev: string[]) => [trimmed, ...prev.slice(0, 99)]);
    setHistoryIdx(-1);

    // 내장 명령어
    if (trimmed === ":clear") {
      setEntries([]);
      return;
    }
    if (trimmed === ":list" || trimmed === ":ls") {
      const lines = agents.map(
        (a) => `  ${a.avatar_emoji} ${a.name}  [${a.status}]  id:${a.id}`
      );
      addEntry("info", lines.length > 0 ? lines.join("\n") : t({ ko: "(에이전트 없음)", en: "(no agents)", ja: "(エージェントなし)", zh: "(无代理)" }));
      return;
    }
    if (trimmed === ":status") {
      const tid = runningTaskIdRef.current;
      if (tid) {
        addEntry("info", t({ ko: `● 실행 중 — task id: ${tid}`, en: `● running — task id: ${tid}`, ja: `● 実行中 — task id: ${tid}`, zh: `● 运行中 — task id: ${tid}` }));
      } else {
        addEntry("info", t({ ko: "○ 실행 중인 태스크 없음", en: "○ no running task", ja: "○ 実行中のタスクなし", zh: "○ 无运行中的任务" }));
      }
      return;
    }
    if (trimmed === ":help") {
      addEntry(
        "info",
        t({
          ko: [
            "사용 가능한 명령어:",
            "  :list / :ls              — 에이전트 목록 보기",
            "  :use <이름|id>            — 대상 에이전트 변경",
            "  :status                  — 현재 실행 중인 태스크 확인",
            "  :inject <텍스트>          — 실행 중인 태스크에 프롬프트 주입",
            "  :clear                   — 화면 지우기",
            "  :help                    — 이 도움말",
            "  <태스크 내용>             — 선택된 에이전트에게 태스크 생성 + 즉시 실행",
          ].join("\n"),
          en: [
            "Available commands:",
            "  :list / :ls              — show agent list",
            "  :use <name|id>           — change target agent",
            "  :status                  — show current running task",
            "  :inject <text>           — inject prompt into running task",
            "  :clear                   — clear screen",
            "  :help                    — this help",
            "  <any text>               — create & run task on selected agent",
          ].join("\n"),
          ja: [
            "利用可能なコマンド:",
            "  :list / :ls              — エージェント一覧",
            "  :use <名前|id>            — 対象エージェントを変更",
            "  :status                  — 実行中タスクを確認",
            "  :inject <テキスト>        — 実行中タスクにプロンプトを注入",
            "  :clear                   — 画面をクリア",
            "  :help                    — このヘルプ",
            "  <テキスト>                — 選択中エージェントにタスク作成＆実行",
          ].join("\n"),
          zh: [
            "可用命令:",
            "  :list / :ls              — 显示代理列表",
            "  :use <名称|id>            — 切换目标代理",
            "  :status                  — 查看当前运行中的任务",
            "  :inject <文本>            — 向运行中的任务注入提示",
            "  :clear                   — 清屏",
            "  :help                    — 本帮助",
            "  <任意文本>                — 向选中代理创建并运行任务",
          ].join("\n"),
        })
      );
      return;
    }
    if (trimmed.startsWith(":use ")) {
      const query = trimmed.slice(5).trim().toLowerCase();
      const found = agents.find(
        (a) =>
          a.id.toLowerCase() === query ||
          a.name.toLowerCase().includes(query) ||
          (a.name_ko ?? "").toLowerCase().includes(query)
      );
      if (found) {
        setSelectedAgentId(found.id);
        addEntry("info", `→ ${found.avatar_emoji} ${found.name} (${found.status})`);
      } else {
        addEntry("error", t({ ko: `에이전트를 찾을 수 없습니다: ${query}`, en: `Agent not found: ${query}`, ja: `エージェントが見つかりません: ${query}`, zh: `未找到代理: ${query}` }));
      }
      return;
    }
    if (trimmed.startsWith(":inject ")) {
      const prompt = trimmed.slice(8).trim();
      if (!prompt) {
        addEntry("error", t({ ko: ":inject <텍스트> 형식으로 입력하세요", en: "Usage: :inject <text>", ja: "使用方法: :inject <テキスト>", zh: "用法: :inject <文本>" }));
        return;
      }
      const tid = runningTaskIdRef.current;
      if (!tid) {
        addEntry("error", t({ ko: "실행 중인 태스크가 없습니다. 먼저 태스크를 실행하세요.", en: "No running task. Run a task first.", ja: "実行中のタスクがありません。まずタスクを実行してください。", zh: "没有正在运行的任务。请先运行任务。" }));
        return;
      }
      setBusy(true);
      try {
        const res = await getTerminal(tid);
        if (!res.interrupt) {
          addEntry("error", t({ ko: "인터럽트 토큰을 가져올 수 없습니다. 태스크가 실행 중인지 확인하세요.", en: "Could not get interrupt token. Check if the task is running.", ja: "割り込みトークンを取得できません。タスクが実行中か確認してください。", zh: "无法获取中断令牌。请检查任务是否正在运行。" }));
          return;
        }
        await injectTaskPrompt(tid, {
          session_id: res.interrupt.session_id,
          interrupt_token: res.interrupt.control_token,
          prompt,
        });
        addEntry("info", `→ ${t({ ko: "프롬프트 주입됨", en: "prompt injected", ja: "プロンプト注入済み", zh: "提示已注入" })}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addEntry("error", `✗ ${msg}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (trimmed.startsWith(":")) {
      addEntry("error", t({ ko: `알 수 없는 명령어: ${trimmed}`, en: `Unknown command: ${trimmed}`, ja: `不明なコマンド: ${trimmed}`, zh: `未知命令: ${trimmed}` }));
      return;
    }

    // 태스크 생성 + 실행
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) {
      addEntry("error", t({ ko: "에이전트가 선택되지 않았습니다. :use <이름> 으로 선택하세요.", en: "No agent selected. Use :use <name>.", ja: "エージェントが選択されていません。:use <名前> で選択してください。", zh: "未选择代理。请使用 :use <名称>。" }));
      return;
    }

    setBusy(true);
    try {
      const taskId = await createTask({
        title: trimmed,
        assigned_agent_id: agent.id,
        project_id: currentProject?.id,
        project_path: currentProject?.project_path,
      });
      await assignTask(taskId, agent.id);
      await runTask(taskId);
      setRunningTaskId(taskId);
      addEntry(
        "info",
        t({
          ko: `▶ 태스크 실행 시작 (id: ${taskId})\n  에이전트: ${agent.avatar_emoji} ${agent.name}\n  출력이 아래에 스트리밍됩니다.`,
          en: `▶ Task started (id: ${taskId})\n  Agent: ${agent.avatar_emoji} ${agent.name}\n  Output will stream below.`,
          ja: `▶ タスク開始 (id: ${taskId})\n  エージェント: ${agent.avatar_emoji} ${agent.name}\n  出力は以下にストリーミングされます。`,
          zh: `▶ 任务已启动 (id: ${taskId})\n  代理: ${agent.avatar_emoji} ${agent.name}\n  输出将在下方实时显示。`,
        }),
        agent.name
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addEntry("error", `✗ ${msg}`);
    } finally {
      setBusy(false);
    }
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
  const prompt = selectedAgent
    ? `${selectedAgent.avatar_emoji} ${selectedAgent.name}`
    : t({ ko: "(에이전트 선택)", en: "(select agent)", ja: "(エージェント選択)", zh: "(选择代理)" });

  const entryColor = (kind: ReplEntry["kind"]) => {
    if (kind === "input") return "var(--th-accent)";
    if (kind === "error") return "var(--th-terminal-error)";
    if (kind === "info") return "var(--th-text-muted)";
    return "var(--th-terminal-text)";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--th-terminal-bg)",
        fontFamily: mono,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--th-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          background: "var(--th-bg-surface)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t({ ko: "에이전트 REPL", en: "Agent REPL", ja: "エージェント REPL", zh: "代理 REPL" })}
        </span>
        {/* 실행 중 표시 */}
        {runningTaskId && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--th-accent)",
              animation: "pulse 1.5s infinite",
            }} />
            <span style={{ fontSize: 10, color: "var(--th-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "실행 중", en: "live", ja: "実行中", zh: "运行中" })}
            </span>
          </div>
        )}
        {/* 에이전트 선택 드롭다운 */}
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 11,
            background: "var(--th-input-bg)",
            color: "var(--th-text)",
            border: "1px solid var(--th-input-border)",
            borderRadius: 0,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          {agents.length === 0 && (
            <option value="">{t({ ko: "에이전트 없음", en: "No agents", ja: "エージェントなし", zh: "无代理" })}</option>
          )}
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.avatar_emoji} {a.name} [{a.status}]
            </option>
          ))}
        </select>
      </div>

      {/* Output area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0, marginTop: 1 }}>
                {formatTime(entry.timestamp)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: entryColor(entry.kind),
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                }}
              >
                {entry.kind === "input" && <span style={{ color: "var(--th-terminal-prompt)", marginRight: 4 }}>$</span>}
                {entry.text}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid var(--th-border)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          background: "var(--th-bg-surface)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--th-terminal-prompt)", flexShrink: 0, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prompt} $
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
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: mono,
            fontSize: 12,
            color: "var(--th-terminal-text)",
            opacity: busy ? 0.5 : 1,
          }}
          autoFocus
        />
        {busy && (
          <span style={{ fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0 }}>
            ●
          </span>
        )}
        {runningTaskId && !busy && (
          <span style={{ fontSize: 10, color: "var(--th-accent)", flexShrink: 0 }}>
            ●
          </span>
        )}
      </div>
    </div>
  );
}
