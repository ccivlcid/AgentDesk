import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useWebSocket } from "../../hooks/useWebSocket";
import "@xterm/xterm/css/xterm.css";

interface XTerminalProps {
  sessionId: string;
  cwd?: string;
  taskId?: string;
  initialCommand?: string; // PTY ready 후 자동 실행할 명령어 (cd + cli cmd)
  onExit?: (code: number) => void;
}

export default function XTerminal({ sessionId, cwd, taskId, initialCommand, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const readyRef = useRef(false);           // PTY session confirmed ready
  const termOpenRef = useRef(false);        // xterm.js UI opened
  const ptyRequestedRef = useRef(false);    // pty_create already sent
  const hasRunInitialRef = useRef(false);   // initialCommand already sent
  const initialCommandRef = useRef<string | undefined>(initialCommand);
  initialCommandRef.current = initialCommand;

  const { on, send, connected } = useWebSocket();

  const sendPty = useCallback(
    (type: string, extra?: Record<string, unknown>) => {
      send({ type, id: sessionId, ...extra });
    },
    [send, sessionId],
  );

  // ── xterm.js UI 초기화 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "var(--th-font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
      theme: {
        background: "#0f1117",
        foreground: "#e2e8f0",
        cursor: "#f59e0b",
        selectionBackground: "rgba(245,158,11,0.3)",
        black: "#0f1117",        brightBlack: "#475569",
        red: "#ef4444",          brightRed: "#f87171",
        green: "#22c55e",        brightGreen: "#4ade80",
        yellow: "#f59e0b",       brightYellow: "#fbbf24",
        blue: "#3b82f6",         brightBlue: "#60a5fa",
        magenta: "#a855f7",      brightMagenta: "#c084fc",
        cyan: "#06b6d4",         brightCyan: "#22d3ee",
        white: "#e2e8f0",        brightWhite: "#f8fafc",
      },
      allowTransparency: false,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    termOpenRef.current = true;

    // 사용자 입력 → PTY
    term.onData((data) => {
      if (readyRef.current) sendPty("pty_input", { data });
    });

    // 리사이즈 → PTY
    term.onResize(({ cols, rows }) => {
      if (readyRef.current) sendPty("pty_resize", { cols, rows });
    });

    // ResizeObserver
    const observer = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      sendPty("pty_destroy");
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      termOpenRef.current = false;
      readyRef.current = false;
      ptyRequestedRef.current = false;
      hasRunInitialRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── PTY 세션 생성 — WS 연결 완료 + 터미널 준비 후 한 번만 ────────────────
  useEffect(() => {
    if (!connected || !termOpenRef.current || ptyRequestedRef.current) return;
    ptyRequestedRef.current = true;
    const term = termRef.current;
    const cols = term?.cols ?? 120;
    const rows = term?.rows ?? 30;
    sendPty("pty_create", { cwd, cols, rows, ...(taskId ? { taskId } : {}) });
  }, [connected, sendPty, cwd, taskId]);

  // ── WebSocket 메시지 핸들러 ────────────────────────────────────────────────
  useEffect(() => {
    const offReady = on("pty_ready", (payload) => {
      const p = payload as { id: string };
      if (p.id !== sessionId) return;
      readyRef.current = true;
      termRef.current?.focus();
      // PTY ready 직후 initialCommand 실행 (같은 WS 연결로 전송)
      if (!hasRunInitialRef.current && initialCommandRef.current) {
        hasRunInitialRef.current = true;
        sendPty("pty_input", { data: initialCommandRef.current });
      }
    });

    const offOutput = on("pty_output", (payload) => {
      const p = payload as { id: string; data: string };
      if (p.id !== sessionId) return;
      termRef.current?.write(p.data);
    });

    const offExit = on("pty_exit", (payload) => {
      const p = payload as { id: string; exitCode: number };
      if (p.id !== sessionId) return;
      readyRef.current = false;
      termRef.current?.write(`\r\n\x1b[33m[Process exited with code ${p.exitCode}]\x1b[0m\r\n`);
      onExit?.(p.exitCode);
    });

    return () => { offReady(); offOutput(); offExit(); };
  }, [on, sessionId, onExit, sendPty]);

  // initialCommand가 PTY ready 이후에 늦게 세팅되는 경우 처리
  // (예: agents가 비동기 로드된 후 initialCommand가 계산될 때)
  useEffect(() => {
    if (!initialCommand || hasRunInitialRef.current || !readyRef.current) return;
    hasRunInitialRef.current = true;
    sendPty("pty_input", { data: initialCommand });
  }, [initialCommand, sendPty]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#0f1117",
      }}
    />
  );
}
