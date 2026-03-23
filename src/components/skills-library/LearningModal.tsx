import type { SkillHistoryProvider, SkillLearnProvider } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import AppWindow from "../windows/AppWindow";
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
  selectedAgentIds: string[];
  onClose: () => void;
  onToggleAgent: (agentId: string) => void;
  onUnlearnProvider: (provider: SkillLearnProvider) => void;
  onStartLearning: () => void;
}

export default function LearningModal({
  t,
  localeTag,
  agents,
  learningSkill,
  learnInProgress,
  preferKoreanName,
  modalLearnedProviders,
  unlearningProviders,
  unlearnEffects,
  learnJob,
  learnError,
  unlearnError,
  learnSubmitting,
  defaultSelectedProviders,
  selectedAgentIds,
  onClose,
  onToggleAgent,
  onUnlearnProvider,
  onStartLearning,
}: LearningModalProps) {
  if (!learningSkill) return null;

  return (
    <AppWindow
      windowType="learn-skill"
      title={t({ ko: "스킬 학습 스쿼드", en: "Skill Learning Squad", ja: "スキル学習スクワッド", zh: "技能学习小队" })}
      emoji={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      }
      defaultWidth={760}
      defaultHeight={560}
      onClose={learnInProgress ? () => {} : onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {learningSkill.name} · {learningSkill.repo}
        </div>
        <div className="px-3 py-2" style={{ borderRadius: 0, border: "1px solid rgba(52,211,153,0.25)", background: "var(--th-terminal-bg)" }}>
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
              ko: "학습시킬 에이전트를 선택하세요",
              en: "Select agents to train",
              ja: "学習させるエージェントを選択してください",
              zh: "选择要训练的代理",
            })}
          </div>
          <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {selectedAgentIds.length}
            {t({ ko: "명 선택됨", en: " selected", ja: "名を選択", zh: " 已选择" })}
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="py-8 text-center font-mono text-sm" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "프로젝트에 배정된 에이전트가 없습니다",
              en: "No agents assigned to this project",
              ja: "プロジェクトに配属されたエージェントがいません",
              zh: "该项目没有分配的代理",
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent) => {
              const provider = agent.cli_provider as SkillLearnProvider | undefined;
              const isSelected = selectedAgentIds.includes(agent.id);
              const isAnimating = learnInProgress && isSelected;
              const isAlreadyLearned = provider ? modalLearnedProviders.has(provider as SkillHistoryProvider) : false;
              const isUnlearning = provider ? unlearningProviders.includes(provider) : false;
              const unlearnEffect = provider ? unlearnEffects[provider] : undefined;
              const isHitAnimating = !!unlearnEffect;
              const displayName = preferKoreanName
                ? agent.name_ko || agent.name
                : agent.name || agent.name_ko;

              return (
                <div
                  key={agent.id}
                  role={provider ? "button" : undefined}
                  tabIndex={provider ? 0 : -1}
                  onClick={() => {
                    if (!provider || learnInProgress) return;
                    onToggleAgent(agent.id);
                  }}
                  onKeyDown={(event) => {
                    if (!provider || learnInProgress) return;
                    const target = event.target as HTMLElement | null;
                    if (target?.closest("button")) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleAgent(agent.id);
                    }
                  }}
                  aria-disabled={!provider || learnInProgress}
                  className="relative overflow-hidden p-3 text-left transition-all"
                  style={!provider
                    ? { borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", opacity: 0.5, cursor: "not-allowed" }
                    : isSelected
                      ? { borderRadius: 0, border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.1)" }
                      : { borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", cursor: "pointer" }}
                >
                  {isAnimating && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <span
                          key={`${agent.id}-book-${idx}`}
                          className="learn-book-drop"
                          style={{ left: `${8 + idx * 15}%`, animationDelay: `${idx * 0.15}s` }}
                        >
                          {idx % 2 === 0 ? "📘" : "📙"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <div className={`relative ${isAnimating ? "learn-avatar-reading" : ""} ${isHitAnimating ? "unlearn-avatar-hit" : ""}`}>
                      <AgentAvatar agent={agent} agents={agents} size={50} rounded="xl" />
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
                      <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {provider ? providerLabel(provider) : t({ ko: "CLI 없음", en: "No CLI", ja: "CLIなし", zh: "无CLI" })}
                      </div>
                      <div className="text-sm font-medium font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{displayName}</div>
                      <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {roleLabel(agent.role, t)}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div
                        className="text-[11px] px-2 py-0.5 font-mono"
                        style={isAlreadyLearned
                          ? { borderRadius: 0, border: "1px solid rgba(52,211,153,0.5)", color: "rgb(110,231,183)", background: "rgba(52,211,153,0.15)" }
                          : isSelected
                            ? { borderRadius: 0, border: "1px solid rgba(251,191,36,0.5)", color: "var(--th-accent)", background: "rgba(251,191,36,0.1)" }
                            : { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-primary)" }}
                      >
                        {isAlreadyLearned
                          ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                          : isSelected
                            ? t({ ko: "선택됨", en: "Selected", ja: "選択", zh: "已选" })
                            : t({ ko: "대기", en: "Idle", ja: "待機", zh: "待命" })}
                      </div>
                      {isAlreadyLearned && provider && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onUnlearnProvider(provider);
                          }}
                          disabled={learnInProgress || isUnlearning}
                          className="skill-unlearn-btn px-2 py-0.5 text-[10px] font-mono transition-all"
                          style={learnInProgress || isUnlearning
                            ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                            : { borderRadius: 0, border: "1px solid rgba(244,63,94,0.35)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.1)" }}
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
        )}

        <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
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
            <div className="mt-2 p-2 font-mono text-[10px] max-h-32 overflow-y-auto space-y-1" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)", color: "var(--th-text-secondary)" }}>
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

        <div className="flex justify-end gap-2 pb-2">
          <button
            onClick={onClose}
            disabled={learnInProgress}
            className="px-3 py-1.5 text-xs font-mono border transition-all"
            style={learnInProgress
              ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={onStartLearning}
            disabled={
              selectedAgentIds.length === 0 ||
              learnSubmitting ||
              learnInProgress ||
              defaultSelectedProviders.length === 0
            }
            className="px-3 py-1.5 text-xs font-mono border transition-all"
            style={selectedAgentIds.length === 0 || learnInProgress || defaultSelectedProviders.length === 0
              ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: 0, border: "1px solid rgba(52,211,153,0.7)", background: "rgba(52,211,153,0.2)", color: "var(--th-text-primary)" }}
          >
            {learnSubmitting || learnInProgress
              ? t({ ko: "학습중...", en: "Learning...", ja: "学習中...", zh: "学习中..." })
              : t({ ko: "학습 시작", en: "Start Learning", ja: "学習開始", zh: "开始学习" })}
          </button>
        </div>
      </div>
    </AppWindow>
  );
}
