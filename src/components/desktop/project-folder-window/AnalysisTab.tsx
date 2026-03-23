import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "../../../i18n";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { analyzeApp, installProjectApp, runProjectApp, stopProjectApp } from "../../../api/app-runner";
import type { AppAnalysis } from "../../../api/app-runner";

type InstallState = "idle" | "installing" | "done" | "error";
type RunState = "idle" | "running" | "stopped";

export function AnalysisTab({ projectId, projectPath }: { projectId: string; projectPath: string | null }) {
  const { t } = useI18n();
  const { on } = useWebSocket();
  const mono = "var(--th-font-mono)";

  const [analysis, setAnalysis] = useState<AppAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [installState, setInstallState] = useState<InstallState>("idle");
  const [runState, setRunState] = useState<RunState>("idle");
  const [logLines, setLogLines] = useState<Array<{ line: string; phase: string }>>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  // WebSocket listener for install/run output
  useEffect(() => {
    if (!projectId) return;
    const unsub = on("project_app_output", (payload: unknown) => {
      const p = payload as { projectId?: string; data?: string; phase?: string; status?: string };
      if (p.projectId !== projectId) return;
      if (p.data) {
        setLogLines((prev) => {
          const next = [...prev, { line: p.data!, phase: p.phase ?? "unknown" }];
          return next.length > 500 ? next.slice(-500) : next;
        });
      }
      if (p.status === "install_done") setInstallState("done");
      if (p.status === "install_error") setInstallState("error");
      if (p.status === "running") setRunState("running");
      if (p.status === "stopped") setRunState("stopped");
    });
    return unsub;
  }, [projectId, on]);

  // Run analysis on mount
  useEffect(() => {
    if (!projectId || !projectPath) return;
    setLoading(true);
    setError(null);
    analyzeApp(projectId)
      .then((res) => {
        if (res.ok) setAnalysis(res.analysis);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [projectId, projectPath]);

  const handleInstall = useCallback(async () => {
    if (!projectId) return;
    setInstallState("installing");
    setLogLines([]);
    try {
      await installProjectApp(projectId);
    } catch (err) {
      setInstallState("error");
      const msg = err instanceof Error ? err.message : String(err);
      setLogLines((prev) => [...prev, { line: `Install failed: ${msg}`, phase: "install" }]);
    }
  }, [projectId]);

  const handleRun = useCallback(async () => {
    if (!projectId) return;
    setRunState("running");
    try {
      await runProjectApp(projectId);
    } catch (err) {
      setRunState("stopped");
      const msg = err instanceof Error ? err.message : String(err);
      setLogLines((prev) => [...prev, { line: `Run failed: ${msg}`, phase: "run" }]);
    }
  }, [projectId]);

  const handleStop = useCallback(async () => {
    if (!projectId) return;
    try {
      await stopProjectApp(projectId);
      setRunState("stopped");
    } catch { /* ignore */ }
  }, [projectId]);

  if (!projectPath) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12, fontFamily: mono }}>
        {t({ ko: "프로젝트 경로가 설정되지 않았습니다", en: "No project path configured", ja: "パス未設定", zh: "未配置项目路径" })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
            <div style={{
              width: 18, height: 18, border: "2px solid var(--th-border)",
              borderTop: "2px solid var(--th-accent)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 12, fontFamily: mono, color: "var(--th-text-secondary)" }}>
              {t({ ko: "AI 분석 중...", en: "AI analyzing...", ja: "AI分析中...", zh: "AI分析中..." })}
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            padding: "10px 14px", borderRadius: 6,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 11, fontFamily: mono, color: "#ef4444",
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {analysis && !loading && (
          <>
            {/* Basic Info */}
            <Section title={t({ ko: "기본 정보", en: "Basic Info", ja: "基本情報", zh: "基本信息" })}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <InfoBadge
                  label={t({ ko: "타입", en: "Type", ja: "タイプ", zh: "类型" })}
                  value={analysis.type}
                  color="var(--th-accent)"
                />
                {analysis.language && (
                  <InfoBadge
                    label={t({ ko: "언어", en: "Language", ja: "言語", zh: "语言" })}
                    value={analysis.language}
                    color="#60a5fa"
                  />
                )}
                {analysis.framework && (
                  <InfoBadge
                    label={t({ ko: "프레임워크", en: "Framework", ja: "フレームワーク", zh: "框架" })}
                    value={analysis.framework}
                    color="#a78bfa"
                  />
                )}
                {analysis.default_port && (
                  <InfoBadge
                    label={t({ ko: "포트", en: "Port", ja: "ポート", zh: "端口" })}
                    value={String(analysis.default_port)}
                    color="#34d399"
                  />
                )}
              </div>
            </Section>

            {/* AI Analysis */}
            {analysis.ai_description && (
              <Section title={t({ ko: "AI 분석", en: "AI Analysis", ja: "AI分析", zh: "AI分析" })}>
                <div style={{
                  fontSize: 12, fontFamily: mono, color: "var(--th-text-secondary)",
                  lineHeight: 1.7, whiteSpace: "pre-wrap",
                }}>
                  {renderMarkdown(analysis.ai_description)}
                </div>
              </Section>
            )}

            {!analysis.ai_description && (
              <Section title={t({ ko: "AI 분석", en: "AI Analysis", ja: "AI分析", zh: "AI分析" })}>
                <div style={{ fontSize: 11, fontFamily: mono, color: "var(--th-text-muted)", fontStyle: "italic" }}>
                  {t({
                    ko: "API 프로바이더가 설정되지 않아 AI 분석을 건너뛰었습니다. Settings > API Providers에서 설정하세요.",
                    en: "AI analysis skipped — no API provider configured. Set one in Settings > API Providers.",
                    ja: "APIプロバイダー未設定のためAI分析をスキップしました。Settings > API Providersで設定してください。",
                    zh: "未配置API提供程序，已跳过AI分析。请在Settings > API Providers中设置。",
                  })}
                </div>
              </Section>
            )}

            {/* Commands */}
            <Section title={t({ ko: "명령어", en: "Commands", ja: "コマンド", zh: "命令" })}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Install */}
                {analysis.install_command && (
                  <CommandRow
                    label={t({ ko: "설치", en: "Install", ja: "インストール", zh: "安装" })}
                    command={analysis.install_command}
                    actionLabel={
                      installState === "installing"
                        ? t({ ko: "설치 중...", en: "Installing...", ja: "インストール中...", zh: "安装中..." })
                        : installState === "done"
                        ? t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })
                        : t({ ko: "설치", en: "Install", ja: "インストール", zh: "安装" })
                    }
                    actionColor={installState === "done" ? "#22c55e" : "#60a5fa"}
                    disabled={installState === "installing"}
                    onAction={handleInstall}
                  />
                )}
                {/* Run */}
                {analysis.run_command && (
                  <CommandRow
                    label={t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
                    command={analysis.run_command}
                    actionLabel={
                      runState === "running"
                        ? t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })
                        : t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })
                    }
                    actionColor={runState === "running" ? "#ef4444" : "#22c55e"}
                    disabled={false}
                    onAction={runState === "running" ? handleStop : handleRun}
                  />
                )}
              </div>
            </Section>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <Section title={t({ ko: "경고", en: "Warnings", ja: "警告", zh: "警告" })}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {analysis.warnings.map((w, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      fontSize: 11, fontFamily: mono, color: "#fbbf24",
                      padding: "6px 10px", borderRadius: 4,
                      background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      {/* Log output area */}
      {logLines.length > 0 && (
        <div
          ref={logRef}
          style={{
            height: 160, flexShrink: 0, overflowY: "auto",
            padding: "8px 14px", background: "#0d1117",
            borderTop: "1px solid var(--th-border)",
            fontFamily: mono, fontSize: 11, lineHeight: 1.6,
          }}
        >
          {logLines.map((entry, i) => (
            <div key={i} style={{
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              color: entry.phase === "install" ? "#60a5fa"
                : entry.phase === "run" ? "#34d399"
                : entry.phase.includes("error") ? "#ef4444"
                : "#c9d1d9",
            }}>
              {entry.line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const mono = "var(--th-font-mono)";
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--th-text-muted)", fontFamily: mono, marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const mono = "var(--th-font-mono)";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6,
      background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
      fontFamily: mono, fontSize: 11,
    }}>
      <span style={{ color: "var(--th-text-muted)", fontSize: 10 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function CommandRow({
  label, command, actionLabel, actionColor, disabled, onAction,
}: {
  label: string;
  command: string;
  actionLabel: string;
  actionColor: string;
  disabled: boolean;
  onAction: () => void;
}) {
  const mono = "var(--th-font-mono)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 6,
      background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
    }}>
      <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, flexShrink: 0, width: 50 }}>
        {label}
      </span>
      <code style={{ flex: 1, fontSize: 12, fontFamily: mono, color: "var(--th-text-primary)", background: "none" }}>
        {command}
      </code>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        style={{
          fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 4,
          background: `${actionColor}18`, border: `1px solid ${actionColor}40`,
          color: actionColor, cursor: disabled ? "wait" : "pointer",
          fontFamily: mono, flexShrink: 0, opacity: disabled ? 0.6 : 1,
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** Very simple markdown-to-JSX renderer for headings, bullets, bold, code */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 12, color: "var(--th-accent)", marginTop: i > 0 ? 12 : 0, marginBottom: 4 }}>
          {line.slice(3)}
        </div>,
      );
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ paddingLeft: 12, display: "flex", gap: 6 }}>
          <span style={{ color: "var(--th-text-muted)", flexShrink: 0 }}>
            <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="2" fill="currentColor" /></svg>
          </span>
          <span>{renderInline(line.slice(2))}</span>
        </div>,
      );
      continue;
    }

    // Regular text
    if (line.trim()) {
      elements.push(<div key={i}>{renderInline(line)}</div>);
    } else {
      elements.push(<div key={i} style={{ height: 6 }} />);
    }
  }

  return <>{elements}</>;
}

/** Render inline markdown: **bold**, `code` */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: "var(--th-text-primary)" }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={key++} style={{
          padding: "1px 4px", borderRadius: 3, fontSize: "0.92em",
          background: "var(--th-bg-surface)", color: "var(--th-accent)",
        }}>
          {match[3]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}
