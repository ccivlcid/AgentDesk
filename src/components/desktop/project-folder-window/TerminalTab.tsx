import { useState, useEffect } from "react";
import { useI18n } from "../../../i18n";
import { detectProjectType } from "./detectProjectType";

export function TerminalTab({ projectPath, projectName }: { projectPath: string | null; projectName: string }) {
  const { t } = useI18n();
  const [runInfo, setRunInfo] = useState<ReturnType<typeof detectProjectType>>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0, background: "var(--th-bg-elevated)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📁 {projectPath}
            </div>
          </div>
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
            <span style={{ fontSize: 13 }}>{">"}_</span>
            {opened
              ? t({ ko: "터미널 열림!", en: "Terminal opened!", ja: "ターミナル起動!", zh: "终端已打开!" })
              : t({ ko: "터미널 열기", en: "Open Terminal", ja: "ターミナルを開く", zh: "打开终端" })}
          </button>
        </div>
      </div>

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
                        {copied === c.cmd ? "✓" : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
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
    </div>
  );
}
