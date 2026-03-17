import { useCallback, useEffect, useState } from "react";
import { useUiStore } from "../../../store/uiStore";
import { useI18n } from "../../../i18n";
import { getNotionInfo, getObsidianInfo, getFigmaInfo, getSynapseSnapshots, getSynapseRules } from "../../../api/synapse";

const mono = "var(--th-font-mono)";

interface ConnectionStatus {
  notion: boolean;
  obsidian: boolean;
  figma: boolean;
}

// ─── Source icons ─────────────────────────────────────────────────────────────

function NotionIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function ObsidianIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="4" y1="7" x2="20" y2="17" />
      <line x1="4" y1="17" x2="20" y2="7" />
    </svg>
  );
}

function NotebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="12" y1="9" x2="18" y2="9" />
      <line x1="12" y1="13" x2="18" y2="13" />
      <line x1="12" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function FigmaIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" fill="currentColor">
      <path d="M19 28.5C19 24.91 21.91 22 25.5 22C29.09 22 32 24.91 32 28.5C32 32.09 29.09 35 25.5 35C21.91 35 19 32.09 19 28.5Z" opacity="0.9"/>
      <path d="M6 47.5C6 43.91 8.91 41 12.5 41H19V47.5C19 51.09 16.09 54 12.5 54C8.91 54 6 51.09 6 47.5Z" opacity="0.6"/>
      <path d="M19 3V22H25.5C29.09 22 32 19.09 32 15.5C32 11.91 29.09 9 25.5 9H19V3Z" opacity="0.7"/>
      <path d="M6 15.5C6 19.09 8.91 22 12.5 22H19V9H12.5C8.91 9 6 11.91 6 15.5Z" opacity="0.8"/>
      <path d="M6 28.5C6 32.09 8.91 35 12.5 35H19V22H12.5C8.91 22 6 24.91 6 28.5Z" opacity="0.85"/>
    </svg>
  );
}

function RulesIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function SynapseWidget() {
  const { t } = useI18n();
  const { openWindow } = useUiStore();
  const [connections, setConnections] = useState<ConnectionStatus>({ notion: false, obsidian: false, figma: false });
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [ruleCount, setRuleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [notionInfo, obsidianInfo, figmaInfo, snapshots, rules] = await Promise.all([
        getNotionInfo(),
        getObsidianInfo(),
        getFigmaInfo(),
        getSynapseSnapshots(),
        getSynapseRules(),
      ]);
      setConnections({
        notion: notionInfo.connected ?? false,
        obsidian: obsidianInfo.connected ?? false,
        figma: figmaInfo.connected ?? false,
      });
      setSnapshotCount(snapshots.length);
      setRuleCount(rules.filter((r) => r.enabled).length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const connectedCount = (connections.notion ? 1 : 0) + (connections.obsidian ? 1 : 0) + (connections.figma ? 1 : 0);
  const anyConnected = connectedCount > 0;

  const SOURCES = [
    {
      key: "notion" as const,
      label: "Notion",
      icon: <NotionIcon size={13} />,
      color: "#e6e6e6",
      accentBg: "rgba(255,255,255,0.07)",
    },
    {
      key: "obsidian" as const,
      label: "Obsidian",
      icon: <ObsidianIcon size={13} />,
      color: "#a78bfa",
      accentBg: "rgba(167,139,250,0.08)",
    },
    {
      key: "figma" as const,
      label: "Figma",
      icon: <FigmaIcon size={13} />,
      color: "#f24e1e",
      accentBg: "rgba(242,78,30,0.08)",
    },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: mono, fontSize: 11, overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 11px 7px 12px",
        borderBottom: "1px solid var(--th-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Synapse graph icon */}
          <svg viewBox="0 0 18 18" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.5} strokeLinecap="round" width={13} height={13}>
            <circle cx="4" cy="9" r="2" />
            <circle cx="14" cy="4" r="2" />
            <circle cx="14" cy="14" r="2" />
            <line x1="5.8" y1="8.2" x2="12.2" y2="5" />
            <line x1="5.8" y1="9.8" x2="12.2" y2="13" />
          </svg>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--th-text-muted)",
          }}>
            Synapse
          </span>
        </div>

        {/* Connection badge */}
        {!loading && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
            padding: "2px 7px", borderRadius: 20,
            background: anyConnected ? "rgba(48,209,88,0.12)" : "rgba(120,120,128,0.12)",
            border: `1px solid ${anyConnected ? "rgba(48,209,88,0.28)" : "rgba(120,120,128,0.2)"}`,
            color: anyConnected ? "#30d158" : "var(--th-text-muted)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: anyConnected ? "#30d158" : "var(--th-text-muted)",
              boxShadow: anyConnected ? "0 0 5px #30d158" : "none",
              display: "inline-block",
            }} />
            {anyConnected
              ? t({ ko: `${connectedCount}개 연결`, en: `${connectedCount} linked`, ja: `${connectedCount}接続`, zh: `${connectedCount}已连接` })
              : t({ ko: "미연결", en: "none", ja: "未接続", zh: "未连接" })}
          </span>
        )}
        {loading && (
          <span style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>…</span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 8px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 36, borderRadius: 6, background: "var(--th-hover-overlay)", opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Source cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {SOURCES.map((src) => {
                const isConnected = connections[src.key];
                return (
                  <div key={src.key} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "7px 10px",
                    borderRadius: 7,
                    background: isConnected ? src.accentBg : "var(--th-hover-overlay-subtle)",
                    border: `1px solid ${isConnected ? "rgba(255,255,255,0.06)" : "var(--th-border)"}`,
                    transition: "background 0.2s",
                  }}>
                    {/* Icon */}
                    <span style={{
                      color: isConnected ? src.color : "var(--th-text-muted)",
                      display: "flex", alignItems: "center", flexShrink: 0,
                      opacity: isConnected ? 1 : 0.45,
                    }}>
                      {src.icon}
                    </span>

                    {/* Label */}
                    <span style={{
                      flex: 1,
                      fontSize: 11, fontWeight: isConnected ? 500 : 400,
                      color: isConnected ? "var(--th-text-primary)" : "var(--th-text-muted)",
                    }}>
                      {src.label}
                    </span>

                    {/* Status */}
                    {isConnected ? (
                      <span style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                        color: "#30d158",
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <span style={{
                          width: 4, height: 4, borderRadius: "50%",
                          background: "#30d158",
                          boxShadow: "0 0 4px #30d158",
                          display: "inline-block",
                        }} />
                        {t({ ko: "연결됨", en: "on", ja: "接続", zh: "已连" })}
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.02em" }}>
                        {t({ ko: "미연결", en: "off", ja: "未接続", zh: "未连" })}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* NotebookLM — always shown as snapshot count */}
              <div style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "7px 10px",
                borderRadius: 7,
                background: snapshotCount > 0 ? "rgba(10,132,255,0.07)" : "var(--th-hover-overlay-subtle)",
                border: `1px solid ${snapshotCount > 0 ? "rgba(10,132,255,0.15)" : "var(--th-border)"}`,
              }}>
                <span style={{
                  color: snapshotCount > 0 ? "#0a84ff" : "var(--th-text-muted)",
                  display: "flex", alignItems: "center", flexShrink: 0,
                  opacity: snapshotCount > 0 ? 1 : 0.45,
                }}>
                  <NotebookIcon size={13} />
                </span>
                <span style={{
                  flex: 1, fontSize: 11,
                  fontWeight: snapshotCount > 0 ? 500 : 400,
                  color: snapshotCount > 0 ? "var(--th-text-primary)" : "var(--th-text-muted)",
                }}>
                  NotebookLM
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                  color: snapshotCount > 0 ? "#0a84ff" : "var(--th-text-muted)",
                }}>
                  {snapshotCount > 0
                    ? t({ ko: `${snapshotCount}개 스냅샷`, en: `${snapshotCount} snap`, ja: `${snapshotCount}件`, zh: `${snapshotCount}快照` })
                    : t({ ko: "없음", en: "none", ja: "なし", zh: "无" })}
                </span>
              </div>
            </div>

            {/* ── Divider + Stats ── */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--th-border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {/* Active rules */}
                <div style={{
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: ruleCount > 0 ? "rgba(245,158,11,0.07)" : "var(--th-hover-overlay-subtle)",
                  border: `1px solid ${ruleCount > 0 ? "rgba(245,158,11,0.2)" : "var(--th-border)"}`,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4, marginBottom: 3,
                    color: ruleCount > 0 ? "var(--th-accent)" : "var(--th-text-muted)",
                  }}>
                    <RulesIcon size={10} />
                    <span style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {t({ ko: "규칙", en: "Rules", ja: "ルール", zh: "规则" })}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, lineHeight: 1,
                    color: ruleCount > 0 ? "var(--th-accent)" : "var(--th-text-muted)",
                    letterSpacing: "-0.02em",
                  }}>
                    {ruleCount}
                  </div>
                </div>

                {/* Sources total */}
                <div style={{
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: anyConnected ? "rgba(48,209,88,0.06)" : "var(--th-hover-overlay-subtle)",
                  border: `1px solid ${anyConnected ? "rgba(48,209,88,0.18)" : "var(--th-border)"}`,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4, marginBottom: 3,
                    color: anyConnected ? "#30d158" : "var(--th-text-muted)",
                  }}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" width={10} height={10}>
                      <circle cx="6" cy="6" r="4" />
                      <circle cx="6" cy="6" r="1.5" />
                    </svg>
                    <span style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {t({ ko: "소스", en: "Sources", ja: "ソース", zh: "来源" })}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, lineHeight: 1,
                    color: anyConnected ? "#30d158" : "var(--th-text-muted)",
                    letterSpacing: "-0.02em",
                  }}>
                    {connectedCount + (snapshotCount > 0 ? 1 : 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Empty state CTA */}
            {!anyConnected && snapshotCount === 0 && (
              <button
                type="button"
                onClick={() => openWindow("synapse")}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "8px",
                  borderRadius: 7,
                  border: "1px dashed var(--th-border-accent, rgba(245,158,11,0.4))",
                  background: "rgba(245,158,11,0.04)",
                  color: "var(--th-accent)",
                  fontFamily: mono,
                  fontSize: 10,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {t({ ko: "+ 지식 베이스 연결", en: "+ Connect knowledge base", ja: "+ KBを接続", zh: "+ 连接知识库" })}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "5px 12px",
        borderTop: "1px solid var(--th-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
          {!loading && anyConnected
            ? t({ ko: "30초마다 갱신", en: "updates every 30s", ja: "30秒更新", zh: "每30秒刷新" })
            : ""}
        </span>
        <button
          type="button"
          onClick={() => openWindow("synapse")}
          style={{
            background: "none", border: "none",
            color: "var(--th-accent)",
            fontFamily: mono, fontSize: 10,
            cursor: "pointer", padding: 0,
            letterSpacing: "0.04em",
            opacity: loading ? 0.4 : 1,
          }}
        >
          {t({ ko: "관리 →", en: "Manage →", ja: "管理 →", zh: "管理 →" })}
        </button>
      </div>
    </div>
  );
}
