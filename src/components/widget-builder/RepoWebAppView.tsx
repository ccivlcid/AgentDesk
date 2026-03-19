import { useState, useEffect, useCallback } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface WebAppConfig {
  type: "web-app";
  repo_dir: string;
  dev_cmd: string;
  build_cmd?: string | null;
  description?: string;
  npm_name?: string;
}

type Status = "idle" | "starting" | "running" | "error";

export default function RepoWebAppView({ featureId, config }: { featureId: string; config: WebAppConfig }) {
  const [status, setStatus] = useState<Status>("idle");
  const [port, setPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repoName = config.npm_name || config.repo_dir?.split(/[/\\]/).pop() || "app";

  // Check if already running on mount
  useEffect(() => {
    fetch(`/api/custom-features/${featureId}/dev-status`)
      .then((r) => r.json())
      .then((j: { running: boolean; port: number | null }) => {
        if (j.running && j.port) {
          setPort(j.port);
          setStatus("running");
        }
      })
      .catch(() => {});
  }, [featureId]);

  const handleStart = useCallback(async () => {
    setStatus("starting");
    setError(null);
    try {
      const res = await fetch(`/api/custom-features/${featureId}/run-dev`, { method: "POST" });
      const j = await res.json() as { ok: boolean; port?: number; error?: string };
      if (!j.ok) throw new Error(j.error ?? "Failed to start");
      setPort(j.port ?? 5173);
      setStatus("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [featureId]);

  const handleStop = useCallback(async () => {
    await fetch(`/api/custom-features/${featureId}/stop-dev`, { method: "POST" }).catch(() => {});
    setStatus("idle");
    setPort(null);
  }, [featureId]);

  if (status === "running" && port) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* toolbar */}
        <div
          style={{
            ...mono,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-panel)",
            fontSize: 10,
          }}
        >
          <span style={{ color: "var(--th-attr-elite)" }}>●</span>
          <span style={{ color: "var(--th-text-muted)" }}>
            {repoName}
            <span style={{ color: "var(--th-text-primary)", marginLeft: 6 }}>localhost:{port}</span>
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={handleStop}
            style={{
              background: "none",
              border: "1px solid var(--th-border)",
              color: "var(--th-text-muted)",
              fontFamily: "var(--th-font-mono)",
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            [stop]
          </button>
          <a
            href={`http://localhost:${port}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "none",
              border: "1px solid var(--th-border)",
              color: "var(--th-text-muted)",
              fontFamily: "var(--th-font-mono)",
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 3,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            [open ↗]
          </a>
        </div>
        <iframe
          src={`http://localhost:${port}`}
          style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
          title={repoName}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...mono,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        color: "var(--th-text-primary)",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--th-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
          $ run{" "}
          <span style={{ color: "var(--th-accent)" }}>/ {repoName}</span>
        </div>
        {config.description && (
          <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginTop: 4 }}>
            // {config.description}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* dev command */}
        <div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6 }}>
            // dev command
          </div>
          <div
            style={{
              background: "var(--th-bg-panel)",
              border: "1px solid var(--th-border)",
              borderRadius: 3,
              padding: "7px 10px",
              fontSize: 12,
              color: "var(--th-accent)",
            }}
          >
            {config.dev_cmd}
          </div>
        </div>

        {/* repo path */}
        <div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6 }}>
            // local path
          </div>
          <div
            style={{
              background: "var(--th-bg-panel)",
              border: "1px solid var(--th-border)",
              borderRadius: 3,
              padding: "6px 10px",
              fontSize: 10,
              color: "var(--th-text-muted)",
              wordBreak: "break-all",
            }}
          >
            {config.repo_dir}
          </div>
        </div>

        {/* error */}
        {error && (
          <div style={{ fontSize: 11, color: "var(--th-danger-text)", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 3, padding: "6px 10px" }}>
            ✗ {error}
          </div>
        )}

        {/* start button */}
        <button
          onClick={handleStart}
          disabled={status === "starting"}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "1px solid var(--th-accent)",
            color: "var(--th-accent)",
            fontFamily: "var(--th-font-mono)",
            fontSize: 12,
            padding: "6px 20px",
            borderRadius: 3,
            cursor: status === "starting" ? "wait" : "pointer",
            opacity: status === "starting" ? 0.6 : 1,
          }}
        >
          {status === "starting" ? "[starting...]" : "[start app]"}
        </button>

        {status === "starting" && (
          <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
            // npm run dev 실행 중... 포트 감지 대기 (최대 30초)
          </div>
        )}
      </div>
    </div>
  );
}
