import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Agent, Project } from "../types";
import {
  createTask,
  runTask,
  assignTask,
} from "../api/organization-projects";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mono = "var(--th-font-mono)";

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
      addEntry("info", lines.length > 0 ? lines.join("\n") : "(에이전트 없음)");
      return;
    }
    if (trimmed === ":help") {
      addEntry(
        "info",
        t({
          ko: [
            "사용 가능한 명령어:",
            "  :list / :ls         — 에이전트 목록 보기",
            "  :use <이름|id>       — 대상 에이전트 변경",
            "  :clear              — 화면 지우기",
            "  :help               — 이 도움말",
            "  <태스크 내용>        — 선택된 에이전트에게 태스크 생성 + 즉시 실행",
          ].join("\n"),
          en: [
            "Available commands:",
            "  :list / :ls         — show agent list",
            "  :use <name|id>      — change target agent",
            "  :clear              — clear screen",
            "  :help               — this help",
            "  <any text>          — create & run task on selected agent",
          ].join("\n"),
          ja: [
            "利用可能なコマンド:",
            "  :list / :ls         — エージェント一覧",
            "  :use <名前|id>       — 対象エージェントを変更",
            "  :clear              — 画面をクリア",
            "  :help               — このヘルプ",
            "  <テキスト>           — 選択中エージェントにタスク作成＆実行",
          ].join("\n"),
          zh: [
            "可用命令:",
            "  :list / :ls         — 显示代理列表",
            "  :use <名称|id>       — 切换目标代理",
            "  :clear              — 清屏",
            "  :help               — 本帮助",
            "  <任意文本>           — 向选中代理创建并运行任务",
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
      });
      await assignTask(taskId, agent.id);
      await runTask(taskId);
      addEntry(
        "output",
        t({
          ko: `✓ 태스크 생성 완료 (id: ${taskId})\n  에이전트: ${agent.avatar_emoji} ${agent.name}`,
          en: `✓ Task created (id: ${taskId})\n  Agent: ${agent.avatar_emoji} ${agent.name}`,
          ja: `✓ タスク作成完了 (id: ${taskId})\n  エージェント: ${agent.avatar_emoji} ${agent.name}`,
          zh: `✓ 任务已创建 (id: ${taskId})\n  代理: ${agent.avatar_emoji} ${agent.name}`,
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
    if (kind === "error") return "#f87171";
    if (kind === "info") return "var(--th-text-muted)";
    return "var(--th-text)";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--th-bg)",
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
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--th-text)" }}>
          {t({ ko: "에이전트 REPL", en: "Agent REPL", ja: "エージェント REPL", zh: "代理 REPL" })}
        </span>
        <span style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
          {t({ ko: "에이전트에게 직접 태스크 전송", en: "send tasks directly to agents", ja: "エージェントに直接タスク送信", zh: "直接向代理发送任务" })}
        </span>
        {/* 에이전트 선택 드롭다운 */}
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 11,
            background: "var(--th-surface)",
            color: "var(--th-text)",
            border: "1px solid var(--th-border)",
            borderRadius: 4,
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
                {entry.kind === "input" && <span style={{ color: "var(--th-text-muted)", marginRight: 4 }}>›</span>}
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
          background: "var(--th-surface)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--th-accent)", flexShrink: 0, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prompt} ›
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
            color: "var(--th-text)",
            opacity: busy ? 0.5 : 1,
          }}
          autoFocus
        />
        {busy && (
          <span style={{ fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0 }}>
            ●
          </span>
        )}
      </div>
    </div>
  );
}
