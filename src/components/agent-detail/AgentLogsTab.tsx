import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import type { TFunction } from "./constants";

interface Props {
  agentId: string;
  taskId: string | null;
  t: TFunction;
  isLight: boolean;
}

interface LogLine {
  id: number;
  text: string;
  ts: number;
}

const MAX_LINES = 500;
let _seq = 0;

/** ANSI 이스케이프 코드 제거 */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[mGKHFJABCDsu]/g, "").replace(/\r/g, "");
}

/** 로그 라인 색 추론 (키워드 기반) */
function lineColor(text: string, isLight: boolean): string {
  const t = text.toLowerCase();
  if (/error|fail|exception|fatal|traceback/i.test(t)) return "#ff453a";
  if (/warn/i.test(t)) return "#ffd60a";
  if (/success|done|complete|✓|✔/i.test(t)) return "#30d158";
  return "#111827";
}

export default function AgentLogsTab({ agentId: _agentId, taskId, t, isLight }: Props) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { send, on } = useWebSocket();

  // taskId 구독/해제
  useEffect(() => {
    if (!taskId) return;
    send({ type: "subscribe_task", taskId });
    return () => { send({ type: "unsubscribe_task", taskId }); };
  }, [taskId, send]);

  // cli_output 수신
  useEffect(() => {
    return on("cli_output", (payload) => {
      const p = payload as { task_id?: string; data?: string; text?: string; line?: string };
      if (!p.task_id || p.task_id !== taskId) return;
      const raw = p.data ?? p.text ?? p.line ?? "";
      if (!raw) return;
      const cleaned = stripAnsi(raw);
      const newLines: LogLine[] = cleaned
        .split("\n")
        .filter(Boolean)
        .map((text) => ({ id: ++_seq, text, ts: Date.now() }));
      setLines((prev) => {
        const next = [...prev, ...newLines];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    });
  }, [on, taskId]);

  // taskId 변경 시 로그 초기화
  useEffect(() => {
    setLines([]);
  }, [taskId]);

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const clear = useCallback(() => setLines([]), []);

  const bg = "#F9FAFB";
  const border = "#E5E7EB";
  const muted = "#9CA3AF";
  const mono = "var(--th-font-mono, monospace)";

  if (!taskId) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        gap: 8,
        fontFamily: mono,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <span style={{ fontSize: 11, color: muted }}>
          {t({ ko: "실행 중인 태스크 없음", en: "No active task", ja: "実行中のタスクなし", zh: "无运行中任务" })}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 헤더 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 10, color: muted, letterSpacing: "0.06em" }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#30d158",
            boxShadow: "0 0 4px #30d158",
            animation: "pulse 1.5s ease-in-out infinite",
            display: "inline-block",
          }} />
          {t({ ko: "실시간 로그", en: "LIVE LOG", ja: "ライブログ", zh: "实时日志" })}
          {lines.length > 0 && (
            <span style={{ opacity: 0.6 }}>— {lines.length} lines</span>
          )}
        </span>
        <button
          type="button"
          onClick={clear}
          style={{
            fontFamily: mono,
            fontSize: 9,
            background: "none",
            border: `1px solid ${border}`,
            borderRadius: 4,
            color: muted,
            padding: "2px 8px",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {t({ ko: "지우기", en: "clear", ja: "クリア", zh: "清除" })}
        </button>
      </div>

      {/* 로그 뷰어 */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        background: bg,
        padding: "8px 14px",
        minHeight: 0,
      }}>
        {lines.length === 0 ? (
          <div style={{
            fontFamily: mono,
            fontSize: 10,
            color: muted,
            textAlign: "center",
            paddingTop: 40,
          }}>
            {t({ ko: "출력 대기 중...", en: "Waiting for output...", ja: "出力待機中...", zh: "等待输出..." })}
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              style={{
                display: "flex",
                gap: 10,
                lineHeight: "18px",
                fontSize: 11,
                fontFamily: mono,
              }}
            >
              <span style={{
                color: muted,
                flexShrink: 0,
                fontSize: 9,
                paddingTop: 1,
                userSelect: "none",
                minWidth: 42,
              }}>
                {new Date(line.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span style={{
                color: lineColor(line.text, isLight),
                wordBreak: "break-all",
                whiteSpace: "pre-wrap",
                flex: 1,
              }}>
                {line.text}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
