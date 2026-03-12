import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";

interface WelcomeScreenProps {
  onCreateProject: () => void;
  onSkip?: () => void;
  onGitHubImport?: () => void;
  onTemplate?: () => void;
}

const BOOT_LINES = [
  { text: "initializing agent runtime...",        color: "var(--th-text-muted)",  delay: 0 },
  { text: "✓ core loaded",                        color: "#4ade80",               delay: 400 },
  { text: "✓ memory store mounted",               color: "#4ade80",               delay: 800 },
  { text: "✓ hook dispatcher ready",              color: "#4ade80",               delay: 1200 },
  { text: "spawning agents...",                   color: "var(--th-text-muted)",  delay: 1700 },
  { text: "  agent-01  [alpha]   IDLE  ░░░░░░░░", color: "#94a3b8",               delay: 2000 },
  { text: "  agent-02  [beta]    IDLE  ░░░░░░░░", color: "#94a3b8",               delay: 2200 },
  { text: "  agent-03  [gamma]   IDLE  ░░░░░░░░", color: "#94a3b8",               delay: 2400 },
  { text: "all systems nominal. ready.",          color: "var(--th-accent)",      delay: 2900 },
];

function TerminalAnimation() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  useEffect(() => {
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), line.delay));
    });
    const resetDelay = BOOT_LINES[BOOT_LINES.length - 1].delay + 3000;
    timers.push(setTimeout(() => setCycleKey((k) => k + 1), resetDelay));
    return () => timers.forEach(clearTimeout);
  }, [cycleKey]);

  return (
    <div
      style={{
        ...mono,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "var(--th-bg-surface)",
        borderRadius: 0,
        border: "1px solid var(--th-border)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ padding: "12px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: "1px solid var(--th-border)",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
          <span style={{ fontSize: "10px", color: "var(--th-text-muted)", marginLeft: 4, letterSpacing: "0.08em" }}>
            agentdesk — boot
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {BOOT_LINES.slice(0, visibleCount).map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: line.color,
                lineHeight: 1.7,
                animation: "welcomeFadeIn 0.2s ease-out",
                letterSpacing: "0.02em",
              }}
            >
              {line.text}
            </div>
          ))}
          {visibleCount > 0 && visibleCount < BOOT_LINES.length && (
            <div style={{ fontSize: "11px", color: "var(--th-accent)", lineHeight: 1.7 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 12,
                  background: "var(--th-accent)",
                  verticalAlign: "middle",
                  borderRadius: 1,
                  animation: "welcomeBlink 0.9s step-end infinite",
                }}
              />
            </div>
          )}
        </div>
      </div>
      {visibleCount >= BOOT_LINES.length && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)",
            pointerEvents: "none",
            borderRadius: 0,
          }}
        />
      )}
    </div>
  );
}

export default function WelcomeScreen({
  onCreateProject,
  onSkip,
  onGitHubImport,
  onTemplate,
}: WelcomeScreenProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { t } = useI18n();
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const options: Array<{ key: number; label: string; hint: string; icon: string; action: () => void; muted?: boolean }> = [
    {
      key: 0,
      label: t({ ko: "템플릿으로 시작하기", en: "Start from template", ja: "テンプレートで開始", zh: "从模板开始" }),
      hint: t({ ko: "추천 구성으로 빠르게 시작", en: "Quick start with recommended config", ja: "推奨設定で素早く開始", zh: "使用推荐配置快速开始" }),
      icon: "◇",
      action: onTemplate ?? onCreateProject,
    },
    {
      key: 1,
      label: t({ ko: "GitHub에서 가져오기", en: "Import from GitHub", ja: "GitHubからインポート", zh: "从GitHub导入" }),
      hint: t({ ko: "기존 저장소와 연결", en: "Connect to existing repo", ja: "既存リポジトリに接続", zh: "连接到현有仓库" }),
      icon: "⎘",
      action: onGitHubImport ?? onCreateProject,
    },
  ];

  return (
    <div
      className="flex flex-col h-full w-full overflow-auto"
      style={{ background: "var(--th-bg-primary)" }}
    >
      <div className="flex flex-col items-center flex-shrink-0" style={{ padding: "48px 24px 32px" }}>
        <div style={{ width: "100%", maxWidth: 580 }}>
          {/* 브랜딩 + 초기화 카드 */}
          <div
            style={{
              ...mono,
              marginBottom: 28,
              padding: "20px 24px",
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: 0,
              borderLeft: "3px solid var(--th-accent)",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--th-text-muted)", marginBottom: 10, letterSpacing: "0.08em" }}>
              agentdesk v2.0.0 — AI agent management
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "13px" }}>$</span>
              <span style={{ fontSize: "13px", color: "var(--th-text-primary)" }}>agentdesk init</span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 14,
                  background: "var(--th-accent)",
                  borderRadius: 0,
                  verticalAlign: "middle",
                  animation: "welcomeBlink 1.2s step-end infinite",
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "var(--th-text-secondary)", lineHeight: 1.8 }}>
              <span style={{ color: "#4ade80", marginRight: 6 }}>✓</span>
              {t({ ko: "AgentDesk가 초기화되었어요.", en: "AgentDesk initialized.", ja: "AgentDesk が初期化されました。", zh: "AgentDesk 已初始化。" })}
            </div>
            <div style={{ fontSize: "11px", color: "var(--th-text-muted)", marginTop: 6 }}>
              {t({ ko: "시작 방법을 선택하세요", en: "choose how to start", ja: "開始方法を選択してください", zh: "选择启动方式" })}
            </div>
          </div>

          {/* 옵션 카드 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {options.map((opt) => {
              const isHover = hovered === opt.key;
              const isMuted = opt.muted ?? false;
              return (
                <button
                  key={opt.key}
                  onClick={opt.action}
                  onMouseEnter={() => setHovered(opt.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    ...mono,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    background: isHover && !isMuted ? "var(--th-bg-elevated)" : "var(--th-bg-surface)",
                    border: `1px solid ${isHover && !isMuted ? "var(--th-accent)" : "var(--th-border)"}`,
                    borderRadius: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: isHover && !isMuted ? "0 0 0 1px var(--th-accent)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      background: isMuted ? "var(--th-bg-elevated)" : (isHover ? "rgba(245,158,11,0.15)" : "var(--th-bg-elevated)"),
                      color: isMuted ? "var(--th-text-muted)" : (isHover ? "var(--th-accent)" : "var(--th-text-secondary)"),
                      borderRadius: 0,
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: isMuted ? 400 : 600,
                        color: isMuted ? "var(--th-text-muted)" : "var(--th-text-heading)",
                        opacity: isMuted ? 0.85 : 1,
                      }}
                    >
                      {opt.label}
                    </div>
                    {opt.hint && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--th-text-muted)",
                          marginTop: 2,
                          opacity: isMuted ? 0.6 : 1,
                        }}
                      >
                        {opt.hint}
                      </div>
                    )}
                  </div>
                  {!isMuted && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: isHover ? "var(--th-accent)" : "var(--th-text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 — 부트 터미널 */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{
          padding: "0 24px 24px",
          borderTop: "1px solid var(--th-border)",
          minHeight: 200,
        }}
      >
        <TerminalAnimation />
      </div>

      <style>{`
        @keyframes welcomeBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes welcomeFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
