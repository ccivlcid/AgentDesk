import { useState, useEffect, useCallback, useRef } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface WebAppConfig {
  type: "web-app";
  repo_dir: string;
  dev_cmd: string;
  description?: string;
  npm_name?: string;
}

type Status = "idle" | "starting" | "running";

function logColor(line: string): string {
  if (/\[system\]/i.test(line)) return "var(--th-text-muted)";
  if (/error|오류|EADDRINUSE|failed|✘/i.test(line)) return "var(--th-danger-text)";
  if (/warn|warning/i.test(line)) return "#d29922";
  if (/Local.*http:\/\//i.test(line)) return "var(--th-attr-elite)";
  return "var(--th-text-primary)";
}

export default function RepoWebAppView({ featureId, config }: { featureId: string; config: WebAppConfig }) {
  const [status, setStatus] = useState<Status>("idle");
  const [port, setPort] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const repoName = config.npm_name || config.repo_dir?.split(/[/\\]/).pop() || "app";

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/custom-features/${featureId}/dev-log`);
        const j = await r.json() as { running: boolean; ready: boolean; port: number | null; log: string[] };
        setLogs(j.log ?? []);
        if (j.ready && j.port) {
          setPort(j.port);
          setStatus("running");
          stopPoll();
        } else if (!j.running) {
          // 프로세스 종료됨 — 로그는 유지, 버튼 복원
          stopPoll();
          setStatus("idle");
        }
      } catch { /* ignore */ }
    }, 1500);
  }, [featureId, stopPoll]);

  // 마운트 시 이미 실행 중인지 확인
  useEffect(() => {
    fetch(`/api/custom-features/${featureId}/dev-log`)
      .then((r) => r.json())
      .then((j: { running: boolean; ready: boolean; port: number | null; log: string[] }) => {
        if (j.running && j.ready && j.port) {
          setPort(j.port);
          setLogs(j.log ?? []);
          setStatus("running");
        } else if (j.running) {
          setLogs(j.log ?? []);
          setStatus("starting");
          startPolling();
        }
      })
      .catch(() => {});
    return () => stopPoll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  // 로그 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [logs]);

  const handleStart = useCallback(async () => {
    setStatus("starting");
    setLogs([]);
    try {
      const res = await fetch(`/api/custom-features/${featureId}/run-dev`, { method: "POST" });
      const j = await res.json() as { ok: boolean; port?: number; log?: string[]; error?: string };
      if (!j.ok) throw new Error(j.error ?? "Failed to start");
      setLogs(j.log ?? []);
      startPolling();
    } catch (e) {
      setLogs([`[system] 오류: ${e instanceof Error ? e.message : String(e)}`]);
      setStatus("idle");
    }
  }, [featureId, startPolling]);

  const handleStop = useCallback(async () => {
    stopPoll();
    await fetch(`/api/custom-features/${featureId}/stop-dev`, { method: "POST" }).catch(() => {});
    setStatus("idle");
    setPort(null);
    setLogs([]);
  }, [featureId, stopPoll]);

  if (status === "running" && port) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ ...mono, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-panel)", fontSize: 10 }}>
          <span style={{ color: "var(--th-attr-elite)" }}>●</span>
          <span style={{ color: "var(--th-text-muted)" }}>
            {repoName}
            <span style={{ color: "var(--th-text-primary)", marginLeft: 6 }}>localhost:{port}</span>
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={handleStop} style={{ background: "none", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 9, padding: "2px 8px", borderRadius: 3, cursor: "pointer" }}>
            [stop]
          </button>
          <a href={`http://localhost:${port}`} target="_blank" rel="noreferrer" style={{ background: "none", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 9, padding: "2px 8px", borderRadius: 3, textDecoration: "none" }}>
            [open ↗]
          </a>
        </div>
        <iframe src={`http://localhost:${port}`} style={{ flex: 1, border: "none", width: "100%" }} title={repoName} />
      </div>
    );
  }

  return (
    <div style={{ ...mono, width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--th-bg-elevated)" }}>
      {/* 헤더 */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
          $ run <span style={{ color: "var(--th-accent)" }}>/ {repoName}</span>
        </div>
        {config.description && (
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 4 }}>// {config.description}</div>
        )}
      </div>

      {/* 로그 터미널 */}
      {logs.length > 0 && (
        <div style={{ flex: 1, overflow: "auto", background: "#0d1117", padding: "8px 12px", fontSize: 10.5, lineHeight: 1.7, minHeight: 0 }}>
          {logs.map((line, i) => (
            <div key={i} style={{ color: logColor(line), whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{line}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div style={{ padding: 14, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {status === "idle" && logs.length === 0 && (
          <>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>// dev command</div>
            <div style={{ background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 3, padding: "7px 10px", fontSize: 11, color: "var(--th-accent)" }}>
              {config.dev_cmd}
            </div>
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status === "idle" && (
            <button
              onClick={handleStart}
              style={{ background: "none", border: "1px solid var(--th-accent)", color: "var(--th-accent)", fontFamily: "var(--th-font-mono)", fontSize: 12, padding: "6px 20px", borderRadius: 3, cursor: "pointer" }}
            >
              [start app]
            </button>
          )}
          {status === "starting" && (
            <>
              <span className="animate-pulse" style={{ fontSize: 10, color: "var(--th-text-muted)" }}>// 시작 중...</span>
              <button onClick={handleStop} style={{ background: "none", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 9, padding: "2px 8px", borderRadius: 3, cursor: "pointer" }}>
                [cancel]
              </button>
            </>
          )}
          {status === "idle" && logs.length > 0 && (
            <button
              onClick={handleStart}
              style={{ background: "none", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: 10, padding: "4px 12px", borderRadius: 3, cursor: "pointer" }}
            >
              [retry]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
