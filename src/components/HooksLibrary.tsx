import { useMemo } from "react";
import { useI18n } from "../i18n";
import type { Agent, Department, Project } from "../types";
import HooksEventTypeBar from "./hooks/HooksEventTypeBar";
import HooksGrid from "./hooks/HooksGrid";
import HooksHeader from "./hooks/HooksHeader";
import HookFormModal from "./hooks/HookFormModal";
import HookMemorySection from "./hooks/HookMemorySection";
import HookLearningModal from "./hooks/HookLearningModal";
import { useHooksState } from "./hooks/useHooksState";

interface HooksLibraryProps {
  agents: Agent[];
  departments: Department[];
  currentProject?: Project | null;
}

export default function HooksLibrary({ agents, departments, currentProject }: HooksLibraryProps) {
  const { t, locale: localeTag } = useI18n();

  // Don't filter by project scope — always show all hooks (global + project)
  const filters = undefined;

  const vm = useHooksState({
    agents,
    departments,
    t,
    filters,
  });


  if (vm.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent mx-auto mb-4" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "훅 로딩중...", en: "Loading hooks...", ja: "フックを読み込み中...", zh: "正在加载钩子..." })}
          </div>
        </div>
      </div>
    );
  }

  if (vm.error && vm.hooks.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">&#x26A0;&#xFE0F;</div>
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "훅 데이터를 불러올 수 없습니다", en: "Unable to load hooks data", ja: "フックデータを読み込めません", zh: "无法加载钩子数据" })}
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: "var(--th-text-muted)" }}>{vm.error}</div>
          <button
            onClick={vm.loadHooks}
            className="mt-4 px-4 py-2 text-sm font-mono transition-all"
            style={{ borderRadius: 6, background: "rgba(251,191,36,0.1)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.35)" }}
          >
            {t({ ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--th-bg-primary)" }}>
      <div className="space-y-4">
        <HooksHeader
          t={t}
          hooksCount={vm.hooks.length}
          search={vm.search}
          onSearchChange={vm.setSearch}
          sortBy={vm.sortBy}
          onSortByChange={vm.setSortBy}
          onOpenCreateModal={vm.openCreateModal}
        />

        <HooksEventTypeBar
          t={t}
          selectedEventType={vm.selectedEventType}
          onSelectEventType={vm.setSelectedEventType}
          eventTypeCounts={vm.eventTypeCounts}
          filteredLength={vm.filtered.length}
          search={vm.search}
        />

        <HookMemorySection
          t={t}
          localeTag={localeTag}
          agents={agents}
          historyRefreshToken={vm.historyRefreshToken}
          onRefreshHistory={vm.bumpHistoryRefreshToken}
        />

        <HooksGrid
          t={t}
          filtered={vm.filtered}
          onToggle={vm.handleToggleHook}
          onEdit={vm.openEditModal}
          onDelete={vm.handleDeleteHook}
          deletingHookId={vm.deletingHookId}
          learnedProvidersByHook={vm.learnedProvidersByHook}
          learnedRepresentatives={vm.learnedRepresentatives}
          agents={agents}
          onOpenLearningModal={vm.openLearningModal}
          onOpenCreateModal={vm.openCreateModal}
          emptyMessage={t({ ko: "아직 훅이 없습니다", en: "No hooks yet", ja: "フックがありません", zh: "暂无钩子" })}
        />

        {currentProject && (
          <div className="text-center text-xs font-mono py-4" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: `'${currentProject.name}' 프로젝트 전용 훅`,
              en: `Hooks for '${currentProject.name}' project`,
              ja: `'${currentProject.name}' プロジェクト専用フック`,
              zh: `'${currentProject.name}' 项目专用钩子`,
            })}
          </div>
        )}
      </div>

      <HookFormModal
        t={t}
        show={vm.showFormModal}
        editingHook={vm.editingHook}
        agents={agents}
        departments={departments}
        submitting={vm.formSubmitting}
        error={vm.formError}
        onClose={vm.closeFormModal}
        defaultProjectId={currentProject?.id}
        onCreate={(input) => { void vm.handleCreateHook(input); }}
        onUpdate={(id, input) => { void vm.handleUpdateHook(id, input); }}
      />

      <HookLearningModal
        t={t}
        localeTag={localeTag}
        agents={agents}
        learningHook={vm.learningHook}
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
        squadAgentIds={vm.squadAgentIds}
        onClose={vm.closeLearningModal}
        onToggleProvider={vm.toggleProvider}
        onUnlearnProvider={vm.handleUnlearnProvider}
        onStartLearning={vm.handleStartLearning}
        onAddAgent={vm.addAgentToSquad}
        onRemoveAgent={vm.removeAgentFromSquad}
      />
    </div>
  );
}
