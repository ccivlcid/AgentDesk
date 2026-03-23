import { useCallback, useEffect, useRef, useState } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { analyzeApp, getAppStatus, runApp, stopApp, getAppLogs, type AppAnalysis, type AppLogEntry } from "../../api/app-runner";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function ReadmePanel({ projectPath }: { projectPath: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/read-file?project_path=${encodeURIComponent(projectPath)}&filename=README.md`)
      .then((r) => r.json())
      .then((j) => setContent(j.content ?? null))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [projectPath]);

  if (loading) return <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: 16 }}>README.md loading...</div>;
  if (!content) return <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: 16 }}>README.md not found</div>;

  return (
    <pre style={{
      ...mono, fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.5,
      padding: 16, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
      background: "var(--th-bg-elevated)", borderRadius: 6, maxHeight: 260, overflow: "auto",
    }}>
      {content}
    </pre>
  );
}

function AnalysisPanel({ analysis, t }: { analysis: AppAnalysis; t: ReturnType<typeof useI18n>["t"] }) {
  return (
    <div style={{
      padding: 16, background: "var(--th-bg-elevated)", borderRadius: 8,
      border: "1px solid var(--th-border)", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
        {t({ ko: "분석 결과", en: "Analysis Result", ja: "分析結果", zh: "分析结果" })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "6px 12px", ...mono, fontSize: 12 }}>
        <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "타입", en: "Type", ja: "タイプ", zh: "类型" })}</span>
        <span style={{ color: "var(--th-text-primary)", fontWeight: 600 }}>{analysis.type}</span>
        {analysis.language && <>
          <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "언어", en: "Language", ja: "言語", zh: "语言" })}</span>
          <span style={{ color: "var(--th-text-primary)" }}>{analysis.language}</span>
        </>}
        {analysis.framework && <>
          <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "프레임워크", en: "Framework", ja: "FW", zh: "框架" })}</span>
          <span style={{ color: "var(--th-text-primary)" }}>{analysis.framework}</span>
        </>}
        {analysis.install_command && <>
          <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "설치", en: "Install", ja: "インストール", zh: "安装" })}</span>
          <span style={{ color: "var(--th-accent)" }}>{analysis.install_command}</span>
        </>}
        {analysis.run_command && <>
          <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}</span>
          <span style={{ color: "var(--th-accent)" }}>{analysis.run_command}</span>
        </>}
        {analysis.default_port && <>
          <span style={{ color: "var(--th-text-muted)" }}>{t({ ko: "포트", en: "Port", ja: "ポート", zh: "端口" })}</span>
          <span style={{ color: "var(--th-text-primary)" }}>{analysis.default_port}</span>
        </>}
      </div>
      {analysis.ai_description && (
        <div style={{
          ...mono, fontSize: 12, color: "var(--th-text-primary)", lineHeight: 1.6,
          padding: "10px 12px", background: "rgba(245,158,11,0.06)", borderRadius: 6,
          borderLeft: "3px solid var(--th-accent)", marginTop: 4,
        }}>
          {analysis.ai_description}
        </div>
      )}
      {analysis.warnings.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {analysis.warnings.map((w, i) => (
            <div key={i} style={{ ...mono, fontSize: 11, color: "#f59e0b", lineHeight: 1.5, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppRunnerWindow() {
  const { t } = useI18n();
  const { appRunnerProjectId } = useUiStore();
  const { projects } = useProjectStore();

  const project = projects.find((p) => p.id === appRunnerProjectId) ?? null;
  const [analysis, setAnalysis] = useState<AppAnalysis | null>(null);
  const [status, setStatus] = useState<string>("downloaded");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Load status on mount
  useEffect(() => {
    if (!appRunnerProjectId) return;
    getAppStatus(appRunnerProjectId).then((r) => {
      setStatus(r.status);
      setAnalysis(r.analysis);
      setPort(r.port);
      if (r.status === "installing" || r.status === "running") startLogPoll();
    }).catch(() => {});
    return () => { if (logPollRef.current) clearInterval(logPollRef.current); };
  }, [appRunnerProjectId]);

  // Auto-scroll logs
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  function startLogPoll() {
    if (logPollRef.current) return;
    let lastTs = 0;
    logPollRef.current = setInterval(async () => {
      if (!appRunnerProjectId) return;
      try {
        const r = await getAppLogs(appRunnerProjectId, lastTs);
        if (r.logs.length > 0) {
          lastTs = r.logs[r.logs.length - 1].ts;
          setLogs((prev) => [...prev, ...r.logs]);
        }
        // Refresh status
        const st = await getAppStatus(appRunnerProjectId);
        setStatus(st.status);
        if (st.port) setPort(st.port);
        if (st.status !== "installing" && st.status !== "running") {
          if (logPollRef.current) { clearInterval(logPollRef.current); logPollRef.current = null; }
        }
      } catch { /* ignore */ }
    }, 1500);
  }

  const handleAnalyze = useCallback(async () => {
    if (!appRunnerProjectId || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setStatus("analyzing");
    try {
      const r = await analyzeApp(appRunnerProjectId);
      setAnalysis(r.analysis);
      setStatus("analyzed");
      if (r.analysis.default_port) setPort(r.analysis.default_port);
    } catch (err) {
      setStatus("downloaded");
      setAnalyzeError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  }, [appRunnerProjectId, analyzing]);

  const [running, setRunning] = useState(false);
  const [runUrl, setRunUrl] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!appRunnerProjectId || running) return;
    setRunning(true);
    setRunError(null);
    setAnalyzeError(null);
    setLogs([]);

    try {
      // Auto-analyze if not yet analyzed
      let currentAnalysis = analysis;
      if (!currentAnalysis) {
        setStatus("analyzing");
        const aRes = await analyzeApp(appRunnerProjectId);
        currentAnalysis = aRes.analysis;
        setAnalysis(currentAnalysis);
        if (currentAnalysis.default_port) setPort(currentAnalysis.default_port);
      }

      setStatus("installing");
      const r = await runApp(appRunnerProjectId, port ?? currentAnalysis?.default_port ?? undefined);
      setPort(r.port);
      setRunUrl(`http://localhost:${r.port}`);
      startLogPoll();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
      setStatus(analysis ? "analyzed" : "downloaded");
    } finally {
      setRunning(false);
    }
  }, [appRunnerProjectId, running, port, analysis]);

  const handleStop = useCallback(async () => {
    if (!appRunnerProjectId) return;
    try {
      await stopApp(appRunnerProjectId);
      setStatus("stopped");
      setRunUrl(null);
    } catch { /* ignore */ }
  }, [appRunnerProjectId]);

  if (!project) return null;

  const btnBase: React.CSSProperties = {
    ...mono, fontSize: 12, fontWeight: 600, padding: "14px 20px", borderRadius: 8,
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    transition: "background 0.12s, opacity 0.12s", flex: 1,
  };

  return (
    <AppWindow
      windowType="app-runner"
      title={project.name}
      emoji={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      }
      defaultWidth={700}
      defaultHeight={560}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--th-border)", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #30d158, #28a745)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--th-text-heading)" }}>{project.name}</div>
            <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>{project.github_repo ?? project.project_path}</div>
          </div>
          <span style={{
            ...mono, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
            background: status === "analyzed" ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.06)",
            color: status === "analyzed" ? "#30d158" : "var(--th-text-muted)",
          }}>
            {status === "downloaded" && t({ ko: "미분석", en: "Not Analyzed", ja: "未分析", zh: "未分析" })}
            {status === "analyzing" && t({ ko: "분석 중...", en: "Analyzing...", ja: "分析中...", zh: "分析中..." })}
            {status === "analyzed" && t({ ko: "분석 완료", en: "Analyzed", ja: "分析完了", zh: "分析完成" })}
            {status === "installed" && t({ ko: "설치 완료", en: "Installed", ja: "インストール済", zh: "已安装" })}
            {status === "running" && t({ ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中" })}
            {status === "stopped" && t({ ko: "중지됨", en: "Stopped", ja: "停止", zh: "已停止" })}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Analysis result */}
          {analysis && <AnalysisPanel analysis={analysis} t={t} />}

          {/* README (only if not yet analyzed) */}
          {!analysis && (
            <>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
                README.md
              </div>
              <ReadmePanel projectPath={project.project_path} />
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 8 }}>
            {(status === "downloaded" || status === "analyzed") && (
              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyze}
                style={{
                  ...btnBase,
                  border: "1px solid var(--th-border)", background: "var(--th-bg-surface)",
                  color: "var(--th-text-primary)", opacity: analyzing ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!analyzing) e.currentTarget.style.background = "var(--th-bg-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--th-bg-surface)"; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{analyzing ? t({ ko: "분석 중...", en: "Analyzing...", ja: "分析中...", zh: "分析中..." }) : t({ ko: "분석", en: "Analyze", ja: "分析", zh: "分析" })}</span>
                <span style={{ fontSize: 9, color: "var(--th-text-muted)", fontWeight: 400 }}>
                  {t({ ko: "코드 구조와 실행 방법을 파악합니다", en: "Detect code structure and how to run", ja: "コード構造と実行方法を検出", zh: "检测代码结构和运行方法" })}
                </span>
              </button>
            )}

            {status !== "running" && (
              <button
                type="button"
                disabled={running}
                onClick={handleRun}
                style={{
                  ...btnBase,
                  border: "none", background: "var(--th-accent)", color: "#000",
                  opacity: running ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!running) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>
                  {running
                    ? t({ ko: "설치 중...", en: "Installing...", ja: "インストール中...", zh: "安装中..." })
                    : (status === "installed" || status === "stopped")
                      ? t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })
                      : t({ ko: "설치 & 실행", en: "Install & Run", ja: "インストール & 実行", zh: "安装 & 运行" })}
                </span>
                <span style={{ fontSize: 9, color: "rgba(0,0,0,0.5)", fontWeight: 400 }}>
                  {t({ ko: "의존성 설치 후 자동으로 실행합니다", en: "Installs dependencies and runs automatically", ja: "依存関係をインストールして自動実行", zh: "安装依赖后自动运行" })}
                </span>
              </button>
            )}
          </div>

          {/* Analyze error */}
          {analyzeError && (
            <div style={{
              ...mono, fontSize: 11, color: "#ff9f0a", padding: "10px 12px", marginTop: 8,
              background: "rgba(255,159,10,0.08)", borderRadius: 6, border: "1px solid rgba(255,159,10,0.2)",
              lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {t({ ko: "분석 실패: ", en: "Analysis failed: ", ja: "分析失敗: ", zh: "分析失败: " })}{analyzeError}
            </div>
          )}

          {/* Terminal logs */}
          {logs.length > 0 && (
            <div style={{
              marginTop: 12, background: "#0d1117", borderRadius: 8, border: "1px solid #30363d",
              maxHeight: 200, overflow: "auto", padding: "10px 12px",
            }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "#8b949e", marginBottom: 6, letterSpacing: "0.06em" }}>
                {t({ ko: "터미널", en: "TERMINAL", ja: "ターミナル", zh: "终端" })}
              </div>
              {logs.map((l, i) => (
                <div key={i} style={{ ...mono, fontSize: 10, lineHeight: 1.6, color: l.phase === "install" ? "#79c0ff" : "#c9d1d9", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {l.line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Error message */}
          {runError && (
            <div style={{
              ...mono, fontSize: 11, color: "#ff453a", padding: "10px 12px", marginTop: 8,
              background: "rgba(255,69,58,0.08)", borderRadius: 6, border: "1px solid rgba(255,69,58,0.2)",
              lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {runError}
            </div>
          )}

          {/* Running state */}
          {status === "running" && (
            <div style={{ marginTop: 12, padding: 16, background: "rgba(48,209,88,0.08)", borderRadius: 8, border: "1px solid rgba(48,209,88,0.2)" }}>
              <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "#30d158", marginBottom: 8 }}>
                {t({ ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中" })}
              </div>
              <div style={{ ...mono, fontSize: 13, color: "var(--th-text-primary)" }}>
                {runUrl ?? `http://localhost:${port}`}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { window.open(runUrl ?? `http://localhost:${port}`, "_blank"); }}
                  style={{
                    ...mono, fontSize: 10, fontWeight: 600, padding: "5px 14px", borderRadius: 4,
                    border: "1px solid var(--th-border)", background: "var(--th-bg-surface)",
                    color: "var(--th-text-primary)", cursor: "pointer",
                  }}
                >
                  {t({ ko: "브라우저에서 열기", en: "Open in Browser", ja: "ブラウザで開く", zh: "在浏览器打开" })}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  style={{
                    ...mono, fontSize: 10, fontWeight: 600, padding: "5px 14px", borderRadius: 4,
                    border: "1px solid rgba(255,69,58,0.3)", background: "rgba(255,69,58,0.08)",
                    color: "#ff453a", cursor: "pointer",
                  }}
                >
                  {t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppWindow>
  );
}
