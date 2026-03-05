import { useI18n } from "../i18n";
import type { Agent, Department } from "../types";
import AgentRulesCategoryBar from "./agent-rules/AgentRulesCategoryBar";
import AgentRulesGrid from "./agent-rules/AgentRulesGrid";
import AgentRulesHeader from "./agent-rules/AgentRulesHeader";
import AgentRulesScopeBar from "./agent-rules/AgentRulesScopeBar";
import RuleFormModal from "./agent-rules/RuleFormModal";
import RuleMemorySection from "./agent-rules/RuleMemorySection";
import RuleLearningModal from "./agent-rules/RuleLearningModal";
import { useAgentRulesState } from "./agent-rules/useAgentRulesState";

interface AgentRulesLibraryProps {
  agents: Agent[];
  departments: Department[];
}

export default function AgentRulesLibrary({ agents, departments }: AgentRulesLibraryProps) {
  const { t, locale: localeTag } = useI18n();
  const vm = useAgentRulesState({ agents, departments, t });

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-slate-400 text-sm">
            {t({
              ko: "에이전트 룰 로딩중...",
              en: "Loading agent rules...",
              ja: "エージェントルールを読み込み中...",
              zh: "正在加载代理规则...",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (vm.error && vm.rules.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">&#x26A0;&#xFE0F;</div>
          <div className="text-slate-400 text-sm">
            {t({
              ko: "룰 데이터를 불러올 수 없습니다",
              en: "Unable to load rules data",
              ja: "ルールデータを読み込めません",
              zh: "无法加载规则数据",
            })}
          </div>
          <div className="text-slate-500 text-xs mt-1">{vm.error}</div>
          <button
            onClick={vm.loadRules}
            className="mt-4 px-4 py-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all"
          >
            {t({ ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AgentRulesHeader
        t={t}
        rulesCount={vm.rules.length}
        search={vm.search}
        onSearchChange={vm.setSearch}
        sortBy={vm.sortBy}
        onSortByChange={vm.setSortBy}
        onOpenCreateModal={vm.openCreateModal}
      />

      <AgentRulesCategoryBar
        t={t}
        selectedCategory={vm.selectedCategory}
        onSelectCategory={vm.setSelectedCategory}
        categoryCounts={vm.categoryCounts}
        filteredLength={vm.filtered.length}
        search={vm.search}
      />

      <AgentRulesScopeBar
        t={t}
        selectedScope={vm.selectedScope}
        onSelectScope={vm.setSelectedScope}
        scopeCounts={vm.scopeCounts}
      />

      <RuleMemorySection
        t={t}
        agents={agents}
        historyRefreshToken={vm.historyRefreshToken}
        onRefreshHistory={vm.bumpHistoryRefreshToken}
        optimisticHistoryRows={vm.optimisticRuleHistoryRows}
      />

      <AgentRulesGrid
        t={t}
        filtered={vm.filtered}
        onToggle={vm.handleToggleRule}
        onEdit={vm.openEditModal}
        onDelete={vm.handleDeleteRule}
        deletingRuleId={vm.deletingRuleId}
        learnedProvidersByRule={vm.learnedProvidersByRule}
        learnedRepresentatives={vm.learnedRepresentatives}
        agents={agents}
        onOpenLearningModal={vm.openLearningModal}
      />

      <RuleFormModal
        t={t}
        show={vm.showFormModal}
        editingRule={vm.editingRule}
        agents={agents}
        departments={departments}
        submitting={vm.formSubmitting}
        error={vm.formError}
        onClose={vm.closeFormModal}
        onCreate={(input) => {
          void vm.handleCreateRule(input);
        }}
        onUpdate={(id, input) => {
          void vm.handleUpdateRule(id, input);
        }}
      />

      <RuleLearningModal
        t={t}
        localeTag={localeTag}
        agents={agents}
        learningRule={vm.learningRule}
        learnInProgress={vm.learnInProgress}
        selectedProviders={vm.selectedProviders}
        representatives={vm.representatives}
        preferKoreanName={vm.preferKoreanName}
        modalLearnedProviders={vm.modalLearnedProviders}
        unlearningProviders={vm.unlearningProviders}
        unlearnEffects={vm.unlearnEffects}
        learnJob={vm.learnJob}
        learnError={vm.learnError}
        unlearnError={vm.unlearnError}
        learnSubmitting={vm.learnSubmitting}
        defaultSelectedProviders={vm.defaultSelectedProviders}
        onClose={vm.closeLearningModal}
        onToggleProvider={vm.toggleProvider}
        onUnlearnProvider={vm.handleUnlearnProvider}
        onStartLearning={vm.handleStartLearning}
      />

      <div className="text-center text-xs text-slate-600 py-4">
        {t({
          ko: "에이전트 룰은 태스크 실행 시 에이전트 프롬프트에 자동 주입됩니다",
          en: "Agent rules are automatically injected into agent prompts during task execution",
          ja: "エージェントルールはタスク実行時にエージェントプロンプトに自動注入されます",
          zh: "代理规则在任务执行时自动注入到代理提示中",
        })}
      </div>
    </div>
  );
}
