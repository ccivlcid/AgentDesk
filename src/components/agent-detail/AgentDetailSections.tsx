import { useI18n } from "../../i18n";
import type { AgentDetailData } from "./AgentDetailPanel";

const mono = "var(--th-font-mono)";

const SCOPE_COLOR: Record<string, string> = {
  project: "var(--th-accent)",
  agent:   "#0ea5e9",
  global:  "#30d158",
};

function relativeDate(ts: number | undefined, t: (s: { ko: string; en: string; ja: string; zh: string }) => string): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000 / 60 / 60 / 24);
  if (diff === 0) return t({ ko: "오늘", en: "today", ja: "今日", zh: "今天" });
  if (diff === 1) return t({ ko: "어제", en: "yesterday", ja: "昨日", zh: "昨天" });
  if (diff < 7)  return t({ ko: `${diff}일 전`, en: `${diff}d ago`, ja: `${diff}日前`, zh: `${diff}天前` });
  const weeks = Math.floor(diff / 7);
  return t({ ko: `${weeks}주 전`, en: `${weeks}w ago`, ja: `${weeks}週前`, zh: `${weeks}周前` });
}

interface Props {
  data: AgentDetailData;
  loading: boolean;
  isLight: boolean;
}

export default function AgentDetailSections({ data, loading, isLight }: Props) {
  const { t } = useI18n();

  const skeletonBg   = "var(--th-border)";
  const dividerBdr   = "var(--th-border)";
  const labelClr     = "var(--th-text-muted)";
  const skillBg      = "var(--th-bg-primary)";
  const skillBorder  = "var(--th-border)";
  const skillColor   = "var(--th-text-secondary)";
  const moreColor    = "var(--th-text-muted)";
  const ruleColor    = "var(--th-text-secondary)";
  const defaultScope = "var(--th-text-muted)";
  const memColor     = "var(--th-text-secondary)";
  const dateColor    = "var(--th-text-muted)";
  const taskColor    = "var(--th-text-secondary)";
  const costSubColor = "var(--th-text-muted)";
  const tokenColor   = "var(--th-text-primary)";
  const tokenTotalCl = "var(--th-text-secondary)";
  const tokenTotalSb = "var(--th-text-muted)";

  const dividerStyle = { borderBottom: `1px solid ${dividerBdr}` };

  return (
    <>
      {/* skills */}
      {(loading || data.skills.length > 0) && (
        <div style={{ padding: "12px 20px", ...dividerStyle }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            skills
          </div>
          {loading ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[60, 80, 50].map((w, i) => (
                <div key={i} style={{ height: 22, width: w, borderRadius: 4, background: skeletonBg }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {data.skills.slice(0, 4).map((s, i) => (
                <span key={s.id ?? i} style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: skillColor,
                  background: skillBg,
                  border: `1px solid ${skillBorder}`,
                  padding: "3px 8px",
                  borderRadius: 4,
                }}>
                  {s.name ?? (s as Record<string, unknown>).skill_label as string ?? "—"}
                </span>
              ))}
              {data.skills.length > 4 && (
                <span style={{ fontFamily: mono, fontSize: 10, color: moreColor, alignSelf: "center" }}>
                  +{data.skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* rules */}
      {(loading || data.rules.length > 0) && (
        <div style={{ padding: "12px 20px", ...dividerStyle }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            rules
          </div>
          {loading ? (
            <>{[1, 2].map((i) => <div key={i} style={{ height: 11, borderRadius: 3, background: skeletonBg, marginBottom: 6 }} />)}</>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {data.rules.map((r) => {
                const scopeColor = SCOPE_COLOR[r.scope] ?? defaultScope;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, opacity: r.enabled ? 1 : 0.4 }}>
                    <span style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: scopeColor,
                      background: `${scopeColor}18`,
                      border: `1px solid ${scopeColor}40`,
                      padding: "1px 5px",
                      borderRadius: 3,
                      flexShrink: 0,
                      letterSpacing: "0.04em",
                    }}>
                      {r.scope || "—"}
                    </span>
                    <span style={{
                      fontFamily: mono,
                      fontSize: 11,
                      color: ruleColor,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}>
                      {r.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* memory */}
      {(loading || data.memories.length > 0) && (
        <div style={{ padding: "12px 20px", ...dividerStyle }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            memory
          </div>
          {loading ? (
            <>{[1, 2].map((i) => <div key={i} style={{ height: 11, borderRadius: 3, background: skeletonBg, marginBottom: 6 }} />)}</>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {data.memories.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: mono,
                    fontSize: 11,
                    color: memColor,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {m.title}
                  </span>
                  {m.created_at && (
                    <span style={{ fontFamily: mono, fontSize: 9, color: dateColor, flexShrink: 0 }}>
                      {relativeDate(m.created_at, t)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* recent tasks */}
      {(loading || data.recentTasks.length > 0) && (
        <div style={{ padding: "12px 20px", ...dividerStyle }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            recent tasks
          </div>
          {loading ? (
            <>{[1, 2, 3].map((i) => <div key={i} style={{ height: 11, borderRadius: 3, background: skeletonBg, marginBottom: 6 }} />)}</>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {data.recentTasks.map((task) => {
                const isDone = task.status === "done";
                return (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: isDone ? "#30d158" : "rgba(255,80,80,0.8)",
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                    }}>
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </span>
                    <span style={{
                      fontFamily: mono,
                      fontSize: 11,
                      color: taskColor,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {task.title}
                    </span>
                    {task.completed_at && (
                      <span style={{ fontFamily: mono, fontSize: 9, color: dateColor, flexShrink: 0 }}>
                        {relativeDate(task.completed_at, t)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* cost */}
      {(loading || data.cost) && (
        <div style={{ padding: "12px 20px" }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            usage
          </div>
          {loading ? (
            <div style={{ height: 11, borderRadius: 3, background: skeletonBg }} />
          ) : data.cost ? (
            <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
              <div style={{ fontFamily: mono }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--th-accent)", letterSpacing: "-0.02em" }}>
                  ${data.cost.thisMonthUsd.toFixed(4)}
                </div>
                <div style={{ fontSize: 9, color: costSubColor, marginTop: 2 }}>
                  {t({ ko: "이번달", en: "this month", ja: "今月", zh: "本月" })}
                </div>
              </div>
              <div style={{ fontFamily: mono }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: tokenColor }}>
                  {data.cost.thisMonthTokens.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: costSubColor, marginTop: 2 }}>
                  tok / month
                </div>
              </div>
              <div style={{ fontFamily: mono }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: tokenTotalCl }}>
                  {data.cost.totalTokens.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: tokenTotalSb, marginTop: 2 }}>
                  tok / total
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
