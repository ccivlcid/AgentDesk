/**
 * AgentTaskTerminal — xterm.js 기반 에이전트 CLI 터미널
 * - 입력 → 에이전트 태스크 생성 + 실행
 * - cli_output WS 이벤트를 xterm.js에 실시간 스트리밍
 * - 다른 곳에서 생성된 태스크 출력도 자동 구독
 */
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useWebSocket } from "../../hooks/useWebSocket";
import type { Agent, Project } from "../../types";
import {
  createTask,
  runTask,
  assignTask,
} from "../../api/organization-projects";
import "@xterm/xterm/css/xterm.css";

interface Props {
  agents: Agent[];
  currentProject?: Project | null;
  initialAgentId?: string | null;
}

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  amber:  "\x1b[38;5;214m",
  green:  "\x1b[38;5;114m",
  red:    "\x1b[38;5;203m",
  blue:   "\x1b[38;5;111m",
  gray:   "\x1b[38;5;245m",
  cyan:   "\x1b[38;5;87m",
  white:  "\x1b[38;5;253m",
};

export default function AgentTaskTerminal({ agents, currentProject, initialAgentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  // 항상 최신값 유지 (stale closure 방지)
  const agentsRef = useRef(agents);
  const currentProjectRef = useRef(currentProject);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  const inputBufRef = useRef("");
  const busyRef = useRef(false);
  const runningTaskIdRef = useRef<string | null>(null);
  const selectedAgentIdRef = useRef<string>("");
  const { on, send, connected } = useWebSocket();

  // 에이전트 초기 선택
  useEffect(() => {
    if (selectedAgentIdRef.current) return; // 이미 선택됨
    const pick = initialAgentId
      ? agents.find(a => a.id === initialAgentId)
      : agents.find(a => a.status === "idle") ?? agents[0];
    if (pick) selectedAgentIdRef.current = pick.id;
  }, [agents, initialAgentId]);

  // ── 프롬프트 / 유틸 ─────────────────────────────────────────────────────
  function writePrompt(term: Terminal) {
    const curAgents = agentsRef.current;
    const proj = currentProjectRef.current;
    const agent = curAgents.find(a => a.id === selectedAgentIdRef.current);
    const agentLabel = agent ? `${agent.avatar_emoji} ${agent.name}` : "(에이전트 없음)";
    const projPart = proj ? ` ${C.gray}(${proj.name})${C.reset}` : "";
    term.write(`\r${C.amber}${agentLabel}${C.reset}${projPart} ${C.green}$${C.reset} `);
  }

  function clearLine(term: Terminal) {
    term.write("\r\x1b[2K");
  }

  // ── xterm.js 초기화 (마운트 1회) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "var(--th-font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
      theme: {
        background: "#0f1117", foreground: "#e2e8f0", cursor: "#f59e0b",
        selectionBackground: "rgba(245,158,11,0.3)",
        black: "#0f1117",   brightBlack: "#475569",
        red: "#ef4444",     brightRed: "#f87171",
        green: "#22c55e",   brightGreen: "#4ade80",
        yellow: "#f59e0b",  brightYellow: "#fbbf24",
        blue: "#3b82f6",    brightBlue: "#60a5fa",
        magenta: "#a855f7", brightMagenta: "#c084fc",
        cyan: "#06b6d4",    brightCyan: "#22d3ee",
        white: "#e2e8f0",   brightWhite: "#f8fafc",
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    const observer = new ResizeObserver(() => { try { fitAddon.fit(); } catch { /* */ } });
    observer.observe(containerRef.current);

    // 환영 메시지
    term.writeln(`${C.amber}${C.bold}AgentDesk CLI${C.reset}  ${C.gray}에이전트에게 직접 태스크를 보냅니다${C.reset}`);
    term.writeln(`${C.gray}:help 도움말  :list 에이전트  :use <이름>  :clear 화면지우기${C.reset}`);
    term.writeln("");
    writePrompt(term);
    term.focus();

    // 키 입력
    term.onData((data) => {
      if (busyRef.current) return;

      for (const ch of data) {
        const code = ch.charCodeAt(0);

        if (ch === "\r") {
          term.write("\r\n");
          const line = inputBufRef.current.trim();
          inputBufRef.current = "";
          if (line) void handleCommand(term, line);
          else writePrompt(term);

        } else if (code === 127 || ch === "\x08") {
          if (inputBufRef.current.length > 0) {
            inputBufRef.current = inputBufRef.current.slice(0, -1);
            term.write("\b \b");
          }

        } else if (code >= 32) {
          inputBufRef.current += ch;
          term.write(ch);
        }
      }
    });

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      inputBufRef.current = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 프로젝트 전환 감지 ──────────────────────────────────────────────────
  const prevProjectIdRef = useRef(currentProject?.id);
  useEffect(() => {
    if (prevProjectIdRef.current === currentProject?.id) return;
    prevProjectIdRef.current = currentProject?.id;
    const term = termRef.current;
    if (!term) return;
    clearLine(term);
    term.writeln(`${C.blue}[프로젝트 전환] ${C.amber}${currentProject?.name ?? "전체"}${C.reset}`);
    const pick = agents.find(a => a.status === "idle") ?? agents[0];
    if (pick) selectedAgentIdRef.current = pick.id;
    if (!busyRef.current) writePrompt(term);
  }, [currentProject?.id, currentProject?.name, agents]);

  // ── cli_output → terminal ────────────────────────────────────────────────
  useEffect(() => {
    return on("cli_output", (payload) => {
      const p = payload as { task_id?: string; data?: string; text?: string; line?: string };
      if (!p.task_id || p.task_id !== runningTaskIdRef.current) return;
      const raw = p.data ?? p.text ?? p.line ?? "";
      if (!raw) return;
      termRef.current?.write(raw);
    });
  }, [on]);

  // ── task_update: 완료/오류 ───────────────────────────────────────────────
  useEffect(() => {
    return on("task_update", (payload) => {
      const p = payload as { id?: string; status?: string };
      if (!p.id || p.id !== runningTaskIdRef.current) return;
      if (!["done", "cancelled", "error"].includes(p.status ?? "")) return;

      send({ type: "unsubscribe_task", taskId: p.id });
      runningTaskIdRef.current = null;
      busyRef.current = false;

      const term = termRef.current;
      if (!term) return;
      const ok = p.status === "done";
      term.write(`\r\n${ok ? C.green : C.red}${ok ? "✓ 완료" : `✗ ${p.status?.toUpperCase()}`}${C.reset}\r\n`);
      writePrompt(term);
    });
  }, [on, send]);

  // ── 외부 태스크 자동 구독 ───────────────────────────────────────────────
  useEffect(() => {
    return on("task_update", (payload) => {
      const p = payload as { id?: string; status?: string; project_id?: string; assigned_agent_id?: string };
      if (!p.id || p.id === runningTaskIdRef.current) return;
      if (currentProjectRef.current && p.project_id && p.project_id !== currentProjectRef.current.id) return;
      if (p.status !== "working" || busyRef.current) return;

      const term = termRef.current;
      const agent = agentsRef.current.find(a => a.id === p.assigned_agent_id);
      const label = agent ? `${agent.avatar_emoji} ${agent.name}` : "Agent";
      if (term) {
        clearLine(term);
        term.writeln(`${C.cyan}[${label}] 태스크 시작 → ${p.id}${C.reset}`);
      }
      busyRef.current = true;
      runningTaskIdRef.current = p.id;
      send({ type: "subscribe_task", taskId: p.id });
    });
  }, [on, send]);

  // ── WS 연결 후 에이전트 자동 선택 ───────────────────────────────────────
  useEffect(() => {
    if (!connected || selectedAgentIdRef.current) return;
    const pick = agentsRef.current.find(a => a.status === "idle") ?? agentsRef.current[0];
    if (pick) selectedAgentIdRef.current = pick.id;
  }, [connected]);

  // ── 명령 처리 ───────────────────────────────────────────────────────────
  async function handleCommand(term: Terminal, raw: string) {
    const curAgents = agentsRef.current;
    const proj = currentProjectRef.current;

    if (raw === ":clear") {
      term.clear();
      term.writeln(`${C.amber}${C.bold}AgentDesk CLI${C.reset}`);
      writePrompt(term);
      return;
    }

    if (raw === ":list" || raw === ":ls") {
      if (curAgents.length === 0) {
        term.writeln(`${C.gray}(에이전트 없음)${C.reset}`);
      } else {
        curAgents.forEach(a => {
          const col = a.status === "working" ? C.amber : a.status === "idle" ? C.green : C.gray;
          const sel = a.id === selectedAgentIdRef.current ? `${C.amber}▶${C.reset}` : " ";
          term.writeln(`${sel} ${a.avatar_emoji} ${C.white}${a.name}${C.reset}  ${col}[${a.status}]${C.reset}  ${C.gray}${a.id}${C.reset}`);
        });
      }
      writePrompt(term);
      return;
    }

    if (raw === ":status") {
      const tid = runningTaskIdRef.current;
      term.writeln(tid ? `${C.amber}● 실행 중 — ${tid}${C.reset}` : `${C.gray}○ 실행 중인 태스크 없음${C.reset}`);
      writePrompt(term);
      return;
    }

    if (raw === ":help") {
      [
        `${C.amber}명령어:${C.reset}`,
        `  ${C.cyan}:list${C.reset}         에이전트 목록`,
        `  ${C.cyan}:use <이름>${C.reset}   에이전트 변경`,
        `  ${C.cyan}:status${C.reset}       실행 중인 태스크 확인`,
        `  ${C.cyan}:clear${C.reset}        화면 지우기`,
        `  ${C.cyan}<텍스트>${C.reset}      에이전트에게 태스크 전송`,
      ].forEach(l => term.writeln(l));
      writePrompt(term);
      return;
    }

    if (raw.startsWith(":use ")) {
      const q = raw.slice(5).trim().toLowerCase();
      const found = curAgents.find(a =>
        a.id.toLowerCase() === q ||
        a.name.toLowerCase().includes(q) ||
        (a.name_ko ?? "").toLowerCase().includes(q)
      );
      if (found) {
        selectedAgentIdRef.current = found.id;
        term.writeln(`${C.green}→ ${found.avatar_emoji} ${found.name} (${found.status})${C.reset}`);
      } else {
        term.writeln(`${C.red}에이전트를 찾을 수 없습니다: ${q}${C.reset}`);
      }
      writePrompt(term);
      return;
    }

    if (raw.startsWith(":")) {
      term.writeln(`${C.red}알 수 없는 명령어: ${raw}${C.reset}`);
      writePrompt(term);
      return;
    }

    // 태스크 생성 + 실행
    const agent = curAgents.find(a => a.id === selectedAgentIdRef.current);
    if (!agent) {
      term.writeln(`${C.red}에이전트가 선택되지 않았습니다. :use <이름>으로 선택하세요.${C.reset}`);
      writePrompt(term);
      return;
    }

    busyRef.current = true;
    term.writeln(`${C.gray}▶ ${agent.avatar_emoji} ${agent.name}에게 전송 중...${C.reset}`);

    try {
      const taskId = await createTask({
        title: raw,
        assigned_agent_id: agent.id,
        project_id: proj?.id,
        project_path: proj?.project_path,
      });
      await assignTask(taskId, agent.id);
      await runTask(taskId);
      runningTaskIdRef.current = taskId;
      send({ type: "subscribe_task", taskId });
      term.writeln(`${C.amber}● 실행 중 [${taskId}]${C.reset}`);
    } catch (err) {
      busyRef.current = false;
      runningTaskIdRef.current = null;
      const msg = err instanceof Error ? err.message : String(err);
      term.writeln(`${C.red}✗ ${msg}${C.reset}`);
      writePrompt(term);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden", background: "#0f1117" }}
    />
  );
}
