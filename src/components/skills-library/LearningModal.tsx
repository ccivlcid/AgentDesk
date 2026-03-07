import { useEffect, useMemo, useRef, useState } from "react";
import type { SkillHistoryProvider, SkillLearnProvider } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  learningStatusLabel,
  providerLabel,
  roleLabel,
  type CategorizedSkill,
  type TFunction,
  type UnlearnEffect,
} from "./model";

interface LearningModalProps {
  t: TFunction;
  localeTag: string;
  agents: Agent[];
  learningSkill: CategorizedSkill | null;
  learnInProgress: boolean;
  selectedProviders: SkillLearnProvider[];
  representatives: Array<{ provider: SkillLearnProvider; agent: Agent | null }>;
  preferKoreanName: boolean;
  modalLearnedProviders: Set<SkillHistoryProvider>;
  unlearningProviders: SkillLearnProvider[];
  unlearnEffects: Partial<Record<SkillLearnProvider, UnlearnEffect>>;
  learnJob: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed";
    command: string;
    logTail: string[];
    completedAt: number | null;
    error?: string | null;
  } | null;
  learnError: string | null;
  unlearnError: string | null;
  learnSubmitting: boolean;
  defaultSelectedProviders: SkillLearnProvider[];
  squadAgentIds: string[];
  onClose: () => void;
  onToggleProvider: (provider: SkillLearnProvider) => void;
  onUnlearnProvider: (provider: SkillLearnProvider) => void;
  onStartLearning: () => void;
  onAddAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
}

export default function LearningModal({
  t,
  localeTag,
  agents,
  learningSkill,
  learnInProgress,
  selectedProviders,
  representatives,
  preferKoreanName,
  modalLearnedProviders,
  unlearningProviders,
  unlearnEffects,
  learnJob,
  learnError,
  unlearnError,
  learnSubmitting,
  defaultSelectedProviders,
  squadAgentIds,
  onClose,
  onToggleProvider,
  onUnlearnProvider,
  onStartLearning,
  onAddAgent,
  onRemoveAgent,
}: LearningModalProps) {
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  const representativeAgentIds = useMemo(
    () => new Set(representatives.map((r) => r.agent?.id).filter(Boolean) as string[]),
    [representatives],
  );

  const availableAgents = useMemo(() => {
    const excludeIds = new Set([...representativeAgentIds, ...squadAgentIds]);
    let list = agents.filter((a) => !excludeIds.has(a.id));
    if (agentSearch.trim()) {
      const q = agentSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.name_ko && a.name_ko.toLowerCase().includes(q)) ||
          (a.cli_provider && a.cli_provider.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [agents, representativeAgentIds, squadAgentIds, agentSearch]);

  const squadAgents = useMemo(
    () => squadAgentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[],
    [agents, squadAgentIds],
  );

  useEffect(() => {
    if (!showAgentPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAgentPicker(false);
        setAgentSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAgentPicker]);

  if (!learningSkill) return null;

  return (
    <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="skills-learn-modal-card w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div>
            <h3 className="text-base font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {t({
                ko: "스킬 학습 스쿼드",
                en: "Skill Learning Squad",
                ja: "スキル学習スクワッド",
                zh: "技能学习小队",
              })}
            </h3>
            <div className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {learningSkill.name} · {learningSkill.repo}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={learnInProgress}
            className="px-2.5 py-1 text-xs font-mono transition-all"
            style={learnInProgress
              ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {learnInProgress
              ? t({ ko: "학습중", en: "Running", ja: "実行中", zh: "进行中" })
              : t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
          <div className="px-3 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.25)", background: "var(--th-terminal-bg)" }}>
            <div className="text-[11px] font-mono" style={{ color: "rgb(167,243,208)" }}>
              {t({ ko: "실행 명령", en: "Install command", ja: "実行コマンド", zh: "执行命令" })}
            </div>
            <div className="mt-1 text-[11px] font-mono text-emerald-300 break-all">
              npx skills add {learningSkill.repo}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "CLI 대표자를 선택하세요 (복수 선택 가능)",
                en: "Select CLI representatives (multi-select)",
                ja: "CLI代表を選択してください（複数選択可）",
                zh: "选择 CLI 代表（可多选）",
              })}
            </div>
            <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {selectedProviders.length}
              {t({ ko: "명 선택됨", en: " selected", ja: "名を選択", zh: " 已选择" })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {representatives.map((row) => {
              const isSelected = selectedProviders.includes(row.provider);
              const hasAgent = !!row.agent;
              const isAnimating = learnInProgress && isSelected && hasAgent;
              const isAlreadyLearned = modalLearnedProviders.has(row.provider);
              const isUnlearning = unlearningProviders.includes(row.provider);
              const unlearnEffect = unlearnEffects[row.provider];
              const isHitAnimating = !!unlearnEffect;
              const displayName = row.agent
                ? preferKoreanName
                  ? row.agent.name_ko || row.agent.name
                  : row.agent.name || row.agent.name_ko
                : t({ ko: "배치된 인원 없음", en: "No assigned member", ja: "担当メンバーなし", zh: "暂无成员" });

              return (
                <div
                  key={row.provider}
                  role={hasAgent ? "button" : undefined}
                  tabIndex={hasAgent ? 0 : -1}
                  onClick={() => {
                    if (!hasAgent || learnInProgress) return;
                    onToggleProvider(row.provider);
                  }}
                  onKeyDown={(event) => {
                    if (!hasAgent || learnInProgress) return;
                    const target = event.target as HTMLElement | null;
                    if (target?.closest("button")) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleProvider(row.provider);
                    }
                  }}
                  aria-disabled={!hasAgent || learnInProgress}
                  className="relative overflow-hidden p-3 text-left transition-all"
                  style={!hasAgent
                    ? { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", opacity: 0.6, cursor: "not-allowed" }
                    : isSelected
                      ? { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.1)" }
                      : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
                >
                  {isAnimating && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <span
                          key={`${row.provider}-book-${idx}`}
                          className="learn-book-drop"
                          style={{ left: `${8 + idx * 15}%`, animationDelay: `${idx * 0.15}s` }}
                        >
                          {idx % 2 === 0 ? "📘" : "📙"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <div
                      className={`relative ${isAnimating ? "learn-avatar-reading" : ""} ${isHitAnimating ? "unlearn-avatar-hit" : ""}`}
                    >
                      <AgentAvatar agent={row.agent ?? undefined} agents={agents} size={50} rounded="xl" />
                      {isAnimating && <span className="learn-reading-book">📖</span>}
                      {unlearnEffect === "pot" && <span className="unlearn-pot-drop">🪴</span>}
                      {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing">🔨</span>}
                      {isHitAnimating && (
                        <span className="unlearn-hit-text">
                          {t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{providerLabel(row.provider)}</div>
                      <div className="text-sm font-medium font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{displayName}</div>
                      <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {row.agent
                          ? roleLabel(row.agent.role, t)
                          : t({ ko: "사용 불가", en: "Unavailable", ja: "利用不可", zh: "不可用" })}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div
                        className="text-[11px] px-2 py-0.5 font-mono"
                        style={isAlreadyLearned
                          ? { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", color: "rgb(110,231,183)", background: "rgba(52,211,153,0.15)" }
                          : isSelected
                            ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", color: "var(--th-accent)", background: "rgba(251,191,36,0.1)" }
                            : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-primary)" }}
                      >
                        {isAlreadyLearned
                          ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                          : isSelected
                            ? t({ ko: "선택됨", en: "Selected", ja: "選択", zh: "已选" })
                            : t({ ko: "대기", en: "Idle", ja: "待機", zh: "待命" })}
                      </div>
                      {isAlreadyLearned && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onUnlearnProvider(row.provider);
                          }}
                          disabled={learnInProgress || isUnlearning}
                          className="skill-unlearn-btn px-2 py-0.5 text-[10px] font-mono transition-all"
                          style={learnInProgress || isUnlearning
                            ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                            : { borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.1)" }}
                        >
                          {isUnlearning
                            ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                            : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {squadAgents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {squadAgents.map((agent) => {
                const agentProvider = agent.cli_provider as SkillLearnProvider | undefined;
                const isProviderSelected = agentProvider ? selectedProviders.includes(agentProvider) : false;
                const isAnimating = learnInProgress && isProviderSelected;
                const displayName = preferKoreanName
                  ? agent.name_ko || agent.name
                  : agent.name || agent.name_ko;

                return (
                  <div
                    key={`squad-${agent.id}`}
                    className="relative overflow-hidden p-3 text-left transition-all"
                    style={isProviderSelected
                      ? { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.1)" }
                      : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
                  >
                    {isAnimating && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <span
                            key={`squad-${agent.id}-book-${idx}`}
                            className="learn-book-drop"
                            style={{ left: `${8 + idx * 15}%`, animationDelay: `${idx * 0.15}s` }}
                          >
                            {idx % 2 === 0 ? "📘" : "📙"}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative z-10 flex items-center gap-3">
                      <div className={`relative ${isAnimating ? "learn-avatar-reading" : ""}`}>
                        <AgentAvatar agent={agent} agents={agents} size={50} rounded="xl" />
                        {isAnimating && <span className="learn-reading-book">📖</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                          {agentProvider ? providerLabel(agentProvider) : "—"}
                        </div>
                        <div className="text-sm font-medium font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{displayName}</div>
                        <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{roleLabel(agent.role, t)}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveAgent(agent.id)}
                        disabled={learnInProgress}
                        className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono transition-all"
                        style={learnInProgress
                          ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                          : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => {
                if (!learnInProgress) {
                  setShowAgentPicker((prev) => !prev);
                  setAgentSearch("");
                }
              }}
              disabled={learnInProgress}
              className="w-full p-2.5 text-xs font-mono transition-all"
              style={learnInProgress
                ? { borderRadius: "2px", border: "1px dashed var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                : { borderRadius: "2px", border: "1px dashed var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              + {t({ ko: "에이전트 추가", en: "Add Agent", ja: "エージェント追加", zh: "添加代理" })}
            </button>

            {showAgentPicker && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-hidden" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
                <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)" }}>
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder={t({ ko: "검색...", en: "Search...", ja: "検索...", zh: "搜索..." })}
                    className="w-full bg-transparent text-xs font-mono outline-none"
                    style={{ color: "var(--th-text-primary)" }}
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {availableAgents.length === 0 ? (
                    <div className="px-3 py-3 text-center text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {t({
                        ko: "추가 가능한 에이전트가 없습니다",
                        en: "No agents available",
                        ja: "追加できるエージェントがありません",
                        zh: "没有可添加的代理",
                      })}
                    </div>
                  ) : (
                    availableAgents.map((agent) => {
                      const displayName = preferKoreanName
                        ? agent.name_ko || agent.name
                        : agent.name || agent.name_ko;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            onAddAgent(agent.id);
                            setShowAgentPicker(false);
                            setAgentSearch("");
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-[var(--th-bg-surface-hover)]"
                        >
                          <AgentAvatar agent={agent} agents={agents} size={28} rounded="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{displayName}</div>
                            <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                              {agent.cli_provider ? providerLabel(agent.cli_provider as SkillLearnProvider) : "—"} · {roleLabel(agent.role, t)}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-mono" style={{ color: "var(--th-text-secondary)" }}>
                {t({ ko: "작업 상태", en: "Job status", ja: "ジョブ状態", zh: "任务状态" })}:{" "}
                <span
                  className={`font-medium ${
                    learnJob?.status === "succeeded"
                      ? "text-emerald-300"
                      : learnJob?.status === "failed"
                        ? "text-rose-300"
                        : learnJob?.status === "running" || learnJob?.status === "queued"
                          ? "text-amber-300"
                          : "text-[#64748b]"
                  }`}
                >
                  {learningStatusLabel(learnJob?.status ?? null, t)}
                </span>
              </div>

              {learnJob?.completedAt && (
                <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {new Intl.DateTimeFormat(localeTag, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(new Date(learnJob.completedAt))}
                </div>
              )}
            </div>

            {learnError && <div className="mt-2 text-[11px] font-mono" style={{ color: "rgb(253,164,175)" }}>{learnError}</div>}
            {unlearnError && <div className="mt-2 text-[11px] font-mono" style={{ color: "rgb(253,164,175)" }}>{unlearnError}</div>}
            {learnJob?.error && <div className="mt-2 text-[11px] font-mono" style={{ color: "rgb(253,164,175)" }}>{learnJob.error}</div>}

            {learnJob && (
              <div className="mt-2 p-2 font-mono text-[10px] max-h-32 overflow-y-auto space-y-1" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)", color: "var(--th-text-secondary)" }}>
                <div style={{ color: "var(--th-text-muted)" }}>$ {learnJob.command}</div>
                {learnJob.logTail.length > 0 ? (
                  learnJob.logTail.slice(-10).map((line, idx) => <div key={`${learnJob.id}-log-${idx}`}>{line}</div>)
                ) : (
                  <div style={{ color: "var(--th-text-muted)" }}>
                    {t({ ko: "로그가 아직 없습니다", en: "No logs yet", ja: "ログはまだありません", zh: "暂无日志" })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={learnInProgress}
              className="px-3 py-1.5 text-xs font-mono border transition-all"
            style={learnInProgress
              ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              onClick={onStartLearning}
              disabled={
                selectedProviders.length === 0 ||
                learnSubmitting ||
                learnInProgress ||
                defaultSelectedProviders.length === 0
              }
              className="px-3 py-1.5 text-xs font-mono border transition-all"
              style={selectedProviders.length === 0 || learnInProgress || defaultSelectedProviders.length === 0
                ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                : { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.2)", color: "rgb(167,243,208)" }}
            >
              {learnSubmitting || learnInProgress
                ? t({ ko: "학습중...", en: "Learning...", ja: "学習中...", zh: "学习中..." })
                : t({ ko: "학습 시작", en: "Start Learning", ja: "学習開始", zh: "开始学习" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
