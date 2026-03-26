import { useState } from "react";
import type { AgentRule, Agent } from "../../types";
import type { RuleHistoryProvider } from "../../api/agent-rules";
import AgentAvatar from "../AgentAvatar";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLabel,
  cliProviderIcon,
  ruleLearnedProviderLabel,
  type TFunction,
} from "./model";

interface AgentRulesGridProps {
  t: TFunction;
  filtered: AgentRule[];
  onToggle: (id: string) => void;
  onEdit: (rule: AgentRule) => void;
  onDelete: (id: string) => void;
  deletingRuleId: string | null;
  learnedProvidersByRule: Map<string, RuleHistoryProvider[]>;
  learnedRepresentatives: Map<RuleHistoryProvider, Agent | null>;
  agents: Agent[];
  onOpenLearningModal: (rule: AgentRule) => void;
}

export default function AgentRulesGrid({
  t,
  filtered,
  onToggle,
  onEdit,
  onDelete,
  deletingRuleId,
  learnedProvidersByRule,
  learnedRepresentatives,
  agents,
  onOpenLearningModal,
}: AgentRulesGridProps) {
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);

  function handleCopy(rule: AgentRule) {
    void navigator.clipboard.writeText(rule.rule_content);
    setCopiedRuleId(rule.id);
    setTimeout(() => setCopiedRuleId(null), 1500);
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">&#x1F50D;</div>
        <div className="text-sm font-mono" style={{ color: "#9CA3AF" }}>
          {t({
            ko: "검색 결과가 없습니다",
            en: "No search results",
            ja: "検索結果はありません",
            zh: "没有搜索结果",
          })}
        </div>
        <div className="text-xs mt-1 font-mono" style={{ color: "#9CA3AF" }}>
          {t({
            ko: "다른 키워드로 검색해보세요",
            en: "Try a different keyword",
            ja: "別のキーワードで検索してください",
            zh: "请尝试其他关键词",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {filtered.map((rule) => {
        const catColor = CATEGORY_COLORS[rule.category] || CATEGORY_COLORS.general;
        const isDeleting = deletingRuleId === rule.id;
        const learnedProviders = (learnedProvidersByRule.get(rule.id) ?? []).slice(0, 4);

        return (
          <div
            key={rule.id}
            className={`relative p-4 transition-all group ${
              !rule.enabled ? "opacity-50" : ""
            } ${isDeleting ? "pointer-events-none opacity-30" : ""}`}
            style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "#FFFFFF" }}
          >
            {/* Top: icon + title/desc + learned avatars — same as SkillsGrid */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold" style={{ borderRadius: 0, background: "#F3F4F6" }}>
                  {CATEGORY_ICONS[rule.category] || <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold font-mono" style={{ color: "#111827" }}>{rule.title}</div>
                  <div className="mt-0.5 truncate text-xs font-mono" style={{ color: "#9CA3AF" }}>
                    {rule.description || rule.rule_content.slice(0, 60)}
                  </div>
                </div>
              </div>

              {learnedProviders.length > 0 && (
                <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 p-1" style={{ borderRadius: 0, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.05)" }}>
                  {learnedProviders.map((provider) => {
                    const agent = learnedRepresentatives.get(provider) ?? null;
                    return (
                      <span
                        key={`${rule.id}-${provider}`}
                        className="inline-flex h-5 w-6 items-center justify-center gap-0.5 border border-emerald-500/20"
                        style={{ borderRadius: 0, background: "rgba(15,17,23,0.7)" }}
                        title={`${ruleLearnedProviderLabel(provider)}${agent ? ` \u00B7 ${agent.name}` : ""}`}
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

            {/* Bottom: category badge + priority + Learn/Copy — same layout as SkillsGrid */}
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] px-2 py-0.5 border font-mono ${catColor}`} style={{ borderRadius: 0 }}>
                {CATEGORY_ICONS[rule.category]} {categoryLabel(rule.category, t)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>
                  <span className="font-medium font-mono" style={{ color: "#3B82F6" }}>P{rule.priority}</span>
                </span>
                <div className="flex flex-row gap-1.5">
                  <button
                    onClick={() => onOpenLearningModal(rule)}
                    className={`px-2 py-1 text-[10px] border font-mono transition-all ${
                      learnedProviders.length > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/25"
                        : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                    }`}
                    style={{ borderRadius: 0 }}
                    title={
                      learnedProviders.length > 0
                        ? t({
                            ko: "학습 완료 · 클릭 시 학습 모달",
                            en: "Learned · Click to open learning modal",
                            ja: "学習済み · クリックで学習モーダル",
                            zh: "已学习 · 点击打开学习弹窗",
                          })
                        : t({
                            ko: "CLI 대표자에게 룰 학습시키기",
                            en: "Teach this rule to selected CLI leaders",
                            ja: "選択したCLI代表にこのルールを学習させる",
                            zh: "让所选 CLI 代表学习此规则",
                          })
                    }
                  >
                    {learnedProviders.length > 0
                      ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                      : t({ ko: "학습", en: "Learn", ja: "学習", zh: "学习" })}
                  </button>
                  <button
                    onClick={() => handleCopy(rule)}
                    className="px-2 py-1 text-[10px] font-mono transition-all"
                    style={{ borderRadius: 0, background: "rgba(251,191,36,0.1)", color: "#3B82F6", border: "1px solid rgba(251,191,36,0.35)" }}
                    title={rule.rule_content.slice(0, 80)}
                  >
                    {copiedRuleId === rule.id
                      ? t({ ko: "복사됨", en: "Copied", ja: "コピー済み", zh: "已复制" })
                      : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
                  </button>
                </div>
              </div>
            </div>

            {/* Hover overlay: toggle + edit + delete */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggle(rule.id)}
                className={`px-1.5 py-0.5 text-[10px] border font-mono transition-all ${
                  rule.enabled
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    : ""
                }`}
                style={rule.enabled ? { borderRadius: 0 } : { borderRadius: 0, background: "#FFFFFF", color: "#9CA3AF", border: "1px solid #E5E7EB" }}
                title={rule.enabled
                  ? t({ ko: "비활성화", en: "Disable", ja: "無効化", zh: "禁用" })
                  : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
              >
                {rule.enabled
                  ? t({ ko: "ON", en: "ON", ja: "ON", zh: "ON" })
                  : t({ ko: "OFF", en: "OFF", ja: "OFF", zh: "OFF" })}
              </button>
              <button
                onClick={() => onEdit(rule)}
                className="px-1.5 py-0.5 text-[10px] font-mono transition-all"
                style={{ borderRadius: 0, background: "rgba(251,191,36,0.1)", color: "#3B82F6", border: "1px solid rgba(251,191,36,0.35)" }}
              >
                {t({ ko: "수정", en: "Edit", ja: "編集", zh: "编辑" })}
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="px-1.5 py-0.5 text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 font-mono transition-all"
                style={{ borderRadius: 0 }}
              >
                {t({ ko: "삭제", en: "Del", ja: "削除", zh: "删" })}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
