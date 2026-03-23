import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "../../../i18n";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { detectProjectType } from "./detectProjectType";
import { runProjectApp, stopProjectApp, getProjectAppStatus } from "../../../api/app-runner";

type AppState = "idle" | "running" | "stopped";

export function TerminalTab({ projectId, projectPath, projectName }: { projectId: string; projectPath: string | null; projectName: string }) {
  const { t } = useI18n();
  const { on } = useWebSocket();
  const [runInfo, setRunInfo] = useState<ReturnType<typeof detectProjectType>>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Run App state
  const [appState, setAppState] = useState<AppState>("idle");
  const [command, setCommand] = useState<string | null>(null);
  const [customCmd, setCustomCmd] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [runLoading, setRunLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  // Check initial status on mount
  useEffect(() => {
    if (!projectId) return;
    getProjectAppStatus(projectId).then((res) => {
      if (res.running) {
        setAppState("running");
        setOutputLines(res.recentLogs.map((l) => l.line));
      }
    }).catch(() => {});
  }, [projectId]);

  // Phase tracking for color coding
  const [linePhases, setLinePhases] = useState<string[]>([]);

  // Subscribe to WebSocket for real-time output
  useEffect(() => {
    if (!projectId) return;
    const unsub = on("project_app_output", (payload: unknown) => {
      const p = payload as { projectId?: string; data?: string; status?: string; phase?: string };
      if (p.projectId !== projectId) return;
      if (p.data) {
        const phase = p.phase ?? "run";
        setOutputLines((prev) => {
          const next = [...prev, p.data!];
          return next.length > 1000 ? next.slice(-1000) : next;
        });
        setLinePhases((prev) => {
          const next = [...prev, phase];
          return next.length > 1000 ? next.slice(-1000) : next;
        });
      }
      if (p.status === "running") setAppState("running");
      if (p.status === "stopped") setAppState("stopped");
      if (p.status === "install_done" || p.status === "install_error") {
        // Install phase ended — keep state for color but don't change app state
      }
    });
    return unsub;
  }, [projectId, on]);

  // Detect project type for command list
  useEffect(() => {
    if (!projectPath) return;
    setLoading(true);
    fetch(`/api/projects/path-tree?path=${encodeURIComponent(projectPath)}&depth=1`)
      .then((r) => r.json())
      .then(async (data: { ok?: boolean; tree?: Array<{ name: string }>; root?: string }) => {
        if (!data.ok) return;
        const rootFiles = new Set<string>((data.tree ?? []).map((n) => n.name));
        let pkgJson: Record<string, unknown> | null = null;
        if (rootFiles.has("package.json")) {
          try {
            const pr = await fetch(`/api/projects/file-content?path=${encodeURIComponent(projectPath + "/package.json")}`);
            const pd = await pr.json();
            if (pd.ok) pkgJson = JSON.parse(pd.content);
          } catch { /* ignore */ }
        }
        setRunInfo(detectProjectType(rootFiles, pkgJson));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectPath]);

  const handleOpenTerminal = () => {
    if (!projectPath) return;
    fetch("/api/projects/open-terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: projectPath }),
    }).then(() => {
      setOpened(true);
      setTimeout(() => setOpened(false), 2000);
    }).catch(() => {});
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopied(cmd);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleRunApp = useCallback(async (cmdOverride?: string) => {
    if (!projectId) return;
    setRunLoading(true);
    setOutputLines([]);
    setLinePhases([]);
    setShowCustomInput(false);
    try {
      const res = await runProjectApp(projectId, cmdOverride || undefined);
      setCommand(res.command);
      setAppState("running");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("no_run_command")) {
        setShowCustomInput(true);
        setOutputLines((prev) => [...prev, t({
          ko: "실행 명령을 감지하지 못했습니다. 직접 입력해주세요.",
          en: "Could not detect run command. Please enter manually.",
          ja: "実行コマンドを検出できません。手動で入力してください。",
          zh: "无法检测运行命令，请手动输入。",
        })]);
        setTimeout(() => customInputRef.current?.focus(), 100);
      } else {
        setOutputLines((prev) => [...prev, `Failed: ${msg}`]);
      }
      setAppState("stopped");
    } finally {
      setRunLoading(false);
    }
  }, [projectId, t]);

  const handleStopApp = useCallback(async () => {
    if (!projectId) return;
    try {
      await stopProjectApp(projectId);
      setAppState("stopped");
    } catch { /* ignore */ }
  }, [projectId]);

  const mono = "var(--th-font-mono)";

  if (!projectPath) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12, fontFamily: mono }}>
        {t({ ko: "프로젝트 경로가 설정되지 않았습니다", en: "No project path configured", ja: "パス未設定", zh: "未配置项目路径" })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header bar with path, Run/Stop, and Open Terminal */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0, background: "var(--th-bg-elevated)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              {projectPath}
            </div>
          </div>

          {/* Run App / Stop buttons */}
          {appState === "running" ? (
            <button
              type="button"
              onClick={handleStopApp}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 700, padding: "7px 14px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 6,
                color: "#ef4444",
                cursor: "pointer",
                fontFamily: mono,
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
              {t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleRunApp()}
              disabled={runLoading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 700, padding: "7px 14px",
                background: runLoading ? "var(--th-bg-surface)" : "rgba(34,197,94,0.12)",
                border: `1px solid ${runLoading ? "var(--th-border)" : "rgba(34,197,94,0.4)"}`,
                borderRadius: 6,
                color: runLoading ? "var(--th-text-muted)" : "#22c55e",
                cursor: runLoading ? "wait" : "pointer",
                fontFamily: mono,
                transition: "all 0.15s",
                flexShrink: 0,
                opacity: runLoading ? 0.6 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
              {runLoading
                ? t({ ko: "시작 중...", en: "Starting...", ja: "起動中...", zh: "启动中..." })
                : t({ ko: "앱 실행", en: "Run App", ja: "アプリ実行", zh: "运行应用" })}
            </button>
          )}

          {/* Custom command input — shown when auto-detect fails */}
          {showCustomInput && appState !== "running" && (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                ref={customInputRef}
                type="text"
                value={customCmd}
                onChange={(e) => setCustomCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customCmd.trim()) void handleRunApp(customCmd.trim()); }}
                placeholder={t({ ko: "명령어 입력 (예: npm run dev)", en: "Enter command (e.g., npm run dev)", ja: "コマンド入力 (例: npm run dev)", zh: "输入命令 (如: npm run dev)" })}
                style={{
                  background: "var(--th-input-bg)", border: "1px solid var(--th-border)",
                  color: "var(--th-text-primary)", fontFamily: mono, fontSize: 11,
                  padding: "5px 8px", borderRadius: 4, outline: "none", width: 200,
                }}
              />
              <button
                type="button"
                onClick={() => { if (customCmd.trim()) void handleRunApp(customCmd.trim()); }}
                disabled={!customCmd.trim()}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "5px 10px",
                  background: customCmd.trim() ? "rgba(34,197,94,0.12)" : "transparent",
                  border: `1px solid ${customCmd.trim() ? "rgba(34,197,94,0.4)" : "var(--th-border)"}`,
                  borderRadius: 4, color: customCmd.trim() ? "#22c55e" : "var(--th-text-muted)",
                  cursor: customCmd.trim() ? "pointer" : "not-allowed", fontFamily: mono,
                }}
              >
                {t({ ko: "실행", en: "Run", ja: "実行", zh: "执行" })}
              </button>
            </div>
          )}

          {/* Open Terminal button */}
          <button
            type="button"
            onClick={handleOpenTerminal}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 700, padding: "7px 16px",
              background: opened ? "rgba(34,197,94,0.15)" : "var(--th-accent)",
              border: `1px solid ${opened ? "rgba(34,197,94,0.4)" : "transparent"}`,
              borderRadius: 6,
              color: opened ? "#22c55e" : "#000",
              cursor: "pointer",
              fontFamily: mono,
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            {opened
              ? t({ ko: "터미널 열림!", en: "Terminal opened!", ja: "ターミナル起動!", zh: "终端已打开!" })
              : t({ ko: "터미널 열기", en: "Open Terminal", ja: "ターミナルを開く", zh: "打开终端" })}
          </button>
        </div>

        {/* Status indicator + detected command */}
        {(appState !== "idle" || command) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontFamily: mono, padding: "2px 8px", borderRadius: 10,
              background: appState === "running" ? "rgba(34,197,94,0.12)" : appState === "stopped" ? "rgba(239,68,68,0.08)" : "var(--th-bg-surface)",
              border: `1px solid ${appState === "running" ? "rgba(34,197,94,0.3)" : appState === "stopped" ? "rgba(239,68,68,0.2)" : "var(--th-border)"}`,
              color: appState === "running" ? "#22c55e" : appState === "stopped" ? "#ef4444" : "var(--th-text-muted)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: appState === "running" ? "#22c55e" : appState === "stopped" ? "#ef4444" : "var(--th-text-muted)" }} />
              {appState === "running"
                ? t({ ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中" })
                : appState === "stopped"
                ? t({ ko: "중지됨", en: "Stopped", ja: "停止", zh: "已停止" })
                : t({ ko: "대기", en: "Idle", ja: "待機", zh: "待机" })}
            </span>
            {command && (
              <code style={{ fontSize: 10, fontFamily: mono, color: "var(--th-text-secondary)", background: "none" }}>
                {command}
              </code>
            )}
          </div>
        )}
      </div>

      {/* Terminal output area (shown when there's output) */}
      {outputLines.length > 0 && (
        <div
          ref={outputRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 14px",
            background: "#0d1117",
            fontFamily: mono,
            fontSize: 11,
            lineHeight: 1.6,
            color: "#c9d1d9",
            minHeight: 120,
          }}
        >
          {outputLines.map((line, i) => {
            const phase = linePhases[i] ?? "run";
            const color = phase === "install" ? "#60a5fa"
              : phase === "run" ? "#34d399"
              : phase.includes("error") ? "#ef4444"
              : "#c9d1d9";
            return (
              <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color }}>
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* Command reference section (shown when no output or scrollable below) */}
      {outputLines.length === 0 && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{ color: "var(--th-text-muted)", fontSize: 11, fontFamily: mono }}>
              {t({ ko: "프로젝트 분석 중...", en: "Analyzing project...", ja: "解析中...", zh: "分析中..." })}
            </div>
          )}

          {!loading && runInfo && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{runInfo.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: runInfo.color, fontFamily: mono }}>{runInfo.type}</div>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono }}>{projectName}</div>
                </div>
              </div>

              {runInfo.sections.map((section) => (
                <div key={section.title}>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    {section.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {section.commands.map((c) => (
                      <div
                        key={c.cmd}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", borderRadius: 6,
                          background: "var(--th-bg-elevated)",
                          border: "1px solid var(--th-border)",
                        }}
                      >
                        <code style={{ flex: 1, fontSize: 12, fontFamily: mono, color: "var(--th-text-primary)", background: "none" }}>
                          {c.cmd}
                        </code>
                        {c.description && (
                          <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, flexShrink: 0 }}>
                            {c.description}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(c.cmd)}
                          style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 4,
                            background: copied === c.cmd ? "rgba(34,197,94,0.12)" : "var(--th-bg-surface)",
                            border: `1px solid ${copied === c.cmd ? "rgba(34,197,94,0.3)" : "var(--th-border)"}`,
                            color: copied === c.cmd ? "#22c55e" : "var(--th-text-muted)",
                            cursor: "pointer", fontFamily: mono, flexShrink: 0,
                          }}
                        >
                          {copied === c.cmd
                            ? t({ ko: "복사됨", en: "Copied", ja: "コピー済", zh: "已复制" })
                            : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && !runInfo && (
            <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, color: "var(--th-text-secondary)", fontFamily: mono }}>
                {t({
                  ko: "프로젝트 타입을 자동으로 감지하지 못했습니다.\n터미널을 열고 직접 명령어를 입력하세요.",
                  en: "Could not auto-detect project type.\nOpen a terminal and enter commands manually.",
                  ja: "プロジェクトタイプを自動検出できませんでした。\nターミナルを開いて手動でコマンドを入力してください。",
                  zh: "无法自动检测项目类型。\n请打开终端并手动输入命令。",
                })}
              </div>
              <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, lineHeight: 1.8 }}>
                {t({ ko: "지원 타입: Node.js, Python, Rust, Go, Java (Maven/Gradle), Docker, Make", en: "Supported: Node.js, Python, Rust, Go, Java (Maven/Gradle), Docker, Make", ja: "対応: Node.js, Python, Rust, Go, Java (Maven/Gradle), Docker, Make", zh: "支持: Node.js, Python, Rust, Go, Java (Maven/Gradle), Docker, Make" })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
