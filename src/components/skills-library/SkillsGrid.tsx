import type { MutableRefObject } from "react";
import type { SkillDetail, SkillHistoryProvider } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLabel,
  cliProviderIcon,
  formatFirstSeen,
  getRankBadge,
  learnedProviderLabel,
  localizeAuditStatus,
  type CategorizedSkill,
  type TFunction,
} from "./model";

interface SkillsGridProps {
  t: TFunction;
  localeTag: string;
  agents: Agent[];
  filtered: CategorizedSkill[];
  learnedProvidersBySkill: Map<string, SkillHistoryProvider[]>;
  learnedRepresentatives: Map<SkillHistoryProvider, Agent | null>;
  hoveredSkill: string | null;
  setHoveredSkill: (key: string | null) => void;
  detailCache: Record<string, SkillDetail | "loading" | "error">;
  tooltipRef: MutableRefObject<HTMLDivElement | null>;
  hoverTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  copiedSkill: string | null;
  onHoverEnter: (skill: CategorizedSkill) => void;
  onHoverLeave: () => void;
  onOpenLearningModal: (skill: CategorizedSkill) => void;
  onCopy: (skill: CategorizedSkill) => void;
}

export default function SkillsGrid({
  t,
  localeTag,
  agents,
  filtered,
  learnedProvidersBySkill,
  learnedRepresentatives,
  hoveredSkill,
  setHoveredSkill,
  detailCache,
  tooltipRef,
  hoverTimerRef,
  copiedSkill,
  onHoverEnter,
  onHoverLeave,
  onOpenLearningModal,
  onCopy,
}: SkillsGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((skill) => {
          const badge = getRankBadge(skill.rank);
          const catColor = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.Other;
          const detailId = skill.skillId || skill.name;
          const detailKey = `${skill.repo}/${detailId}`;
          const learnedProviders = learnedProvidersBySkill.get(detailKey) ?? [];
          const learnedProvidersForCard = learnedProviders.slice(0, 4);
          const isHovered = hoveredSkill === detailKey;
          const detail = detailCache[detailKey];

          return (
            <div
              key={`${skill.rank}-${detailId}`}
              className="relative p-4 transition-all group"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
              onMouseEnter={() => onHoverEnter(skill)}
              onMouseLeave={onHoverLeave}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold" style={{ borderRadius: "2px", background: "var(--th-bg-primary)" }}>
                    {badge.icon ? <span>{badge.icon}</span> : <span className={badge.color}>#{skill.rank}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{skill.name}</div>
                    <div className="mt-0.5 truncate text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{skill.repo}</div>
                  </div>
                </div>

                {learnedProvidersForCard.length > 0 && (
                  <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 p-1" style={{ borderRadius: "2px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.05)" }}>
                    {learnedProvidersForCard.map((provider) => {
                      const agent = learnedRepresentatives.get(provider) ?? null;
                      return (
                        <span
                          key={`${detailKey}-${provider}`}
                          className="inline-flex h-5 w-6 items-center justify-center gap-0.5 border border-emerald-500/20"
                          style={{ borderRadius: "2px", background: "rgba(15,17,23,0.7)" }}
                          title={`${learnedProviderLabel(provider)}${agent ? ` · ${agent.name}` : ""}`}
                        >
                          <span className="flex h-2.5 w-2.5 items-center justify-center">
                            {cliProviderIcon(provider)}
                          </span>
                          <span className="h-2.5 w-2.5 overflow-hidden" style={{ borderRadius: "3px", background: "rgba(15,17,23,0.8)" }}>
                            <AgentAvatar agent={agent ?? undefined} agents={agents} size={10} rounded="xl" />
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] px-2 py-0.5 border font-mono ${catColor}`} style={{ borderRadius: "2px" }}>
                  {CATEGORY_ICONS[skill.category]} {categoryLabel(skill.category, t)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                    <span className="text-empire-green font-medium">{skill.installsDisplay}</span>{" "}
                    {t({ ko: "설치", en: "installs", ja: "インストール", zh: "安装" })}
                  </span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onOpenLearningModal(skill)}
                      className={`px-2 py-1 text-[10px] border font-mono transition-all ${
                        learnedProviders.length > 0
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/25"
                          : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                      }`}
                      style={{ borderRadius: "2px" }}
                      title={
                        learnedProviders.length > 0
                          ? t({
                              ko: "학습 완료 · 클릭 시 학습 모달",
                              en: "Learned · Click to open learning modal",
                              ja: "学習済み · クリックで学習モーダル",
                              zh: "已学习 · 点击打开学习弹窗",
                            })
                          : t({
                              ko: "CLI 대표자에게 스킬 학습시키기",
                              en: "Teach this skill to selected CLI leaders",
                              ja: "選択したCLI代表にこのスキルを学習させる",
                              zh: "让所选 CLI 代表学习此技能",
                            })
                      }
                    >
                      {learnedProviders.length > 0
                        ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                        : t({ ko: "학습", en: "Learn", ja: "学習", zh: "学习" })}
                    </button>
                    <button
                      onClick={() => onCopy(skill)}
                      className="px-2 py-1 text-[10px] font-mono transition-all"
                      style={{ borderRadius: "2px", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.3)" }}
                      title={`npx skills add ${skill.repo}`}
                    >
                      {copiedSkill === skill.name
                        ? t({ ko: "복사됨", en: "Copied", ja: "コピー済み", zh: "已复制" })
                        : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
                    </button>
                  </div>
                </div>
              </div>

              {isHovered && (
                <div
                  ref={tooltipRef}
                  className="absolute z-50 left-0 right-0 top-full mt-2 p-4 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-1 duration-200"
                  style={{ borderRadius: "4px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}
                  onMouseEnter={() => {
                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    setHoveredSkill(detailKey);
                  }}
                  onMouseLeave={onHoverLeave}
                >
                  {detail === "loading" && (
                    <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                      <div className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderColor: "var(--th-accent)", borderTopColor: "transparent", borderRadius: "50%" }} />
                      {t({
                        ko: "상세정보 로딩중...",
                        en: "Loading details...",
                        ja: "詳細を読み込み中...",
                        zh: "加载详情...",
                      })}
                    </div>
                  )}

                  {detail === "error" && (
                    <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {t({
                        ko: "상세정보를 불러올 수 없습니다",
                        en: "Could not load details",
                        ja: "詳細を読み込めません",
                        zh: "无法加载详情",
                      })}
                    </div>
                  )}

                  {detail && typeof detail === "object" && (
                    <div className="space-y-3">
                      {detail.title && <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{detail.title}</div>}

                      {detail.description && (
                        <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{detail.description}</p>
                      )}

                      {detail.whenToUse.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "사용 시점", en: "When to Use", ja: "使うタイミング", zh: "适用场景" })}
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px]" style={{ color: "var(--th-text-secondary)" }}>
                            {detail.whenToUse.slice(0, 6).map((item, idx) => (
                              <li key={`${detailKey}-when-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-[11px]">
                        {detail.weeklyInstalls && (
                          <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>
                            <span className="text-empire-green font-medium">{detail.weeklyInstalls}</span>{" "}
                            {t({ ko: "주간 설치", en: "weekly", ja: "週間", zh: "周安装" })}
                          </span>
                        )}
                        {detail.firstSeen && (
                          <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "최초 등록", en: "First seen", ja: "初登録", zh: "首次发现" })}:{" "}
                            {formatFirstSeen(detail.firstSeen, localeTag)}
                          </span>
                        )}
                      </div>

                      {detail.platforms.length > 0 && (
                        <div>
                          <div className="text-[10px] mb-1.5 uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({
                              ko: "플랫폼별 설치",
                              en: "Platform Installs",
                              ja: "プラットフォーム別",
                              zh: "平台安装量",
                            })}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.platforms.slice(0, 6).map((platform) => (
                              <span
                                key={platform.name}
                                className="text-[10px] px-2 py-0.5 border font-mono"
                                style={{ borderRadius: "2px", background: "var(--th-bg-primary)", borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
                              >
                                {platform.name} <span style={{ color: "rgb(167,243,208)" }}>{platform.installs}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {detail.audits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {detail.audits.map((audit) => (
                            <span
                              key={audit.name}
                              className={`text-[10px] px-2 py-0.5 border font-mono ${
                                audit.status.toLowerCase() === "pass"
                                  ? "text-green-400 bg-green-500/10 border-green-500/30"
                                  : audit.status.toLowerCase() === "warn" || audit.status.toLowerCase() === "pending"
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                                    : "text-red-400 bg-red-500/10 border-red-500/30"
                              }`}
                              style={{ borderRadius: "2px" }}
                            >
                              {audit.name}: {localizeAuditStatus(audit.status, t)}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] font-mono px-2 py-1.5 truncate" style={{ color: "var(--th-text-muted)", background: "var(--th-terminal-bg)", borderRadius: "2px" }}>
                        $ {detail.installCommand}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "검색 결과가 없습니다", en: "No search results", ja: "検索結果はありません", zh: "没有搜索结果" })}
          </div>
          <div className="text-xs mt-1 font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "다른 키워드로 검색해보세요",
              en: "Try a different keyword",
              ja: "別のキーワードで検索してください",
              zh: "请尝试其他关键词",
            })}
          </div>
        </div>
      )}
    </>
  );
}
