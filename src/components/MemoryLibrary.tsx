import { useMemo } from "react";
import { useI18n } from "../i18n";
import type { Agent, Department, Project } from "../types";
import MemoryCategoryBar from "./memory/MemoryCategoryBar";
import MemoryGrid from "./memory/MemoryGrid";
import MemoryHeader from "./memory/MemoryHeader";
import MemoryFormModal from "./memory/MemoryFormModal";
import MemoryMemorySection from "./memory/MemoryMemorySection";
import MemoryLearningModal from "./memory/MemoryLearningModal";
import { useMemoryState } from "./memory/useMemoryState";

interface MemoryLibraryProps {
  agents: Agent[];
  departments: Department[];
  currentProject?: Project | null;
}

export default function MemoryLibrary({ agents, departments, currentProject }: MemoryLibraryProps) {
  const { t, locale: localeTag } = useI18n();

  // Don't filter by project scope — always show all entries (global + project)
  const filters = undefined;

  const vm = useMemoryState({ agents, departments, t, filters });

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent mx-auto mb-4" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "메모리 로딩중...", en: "Loading memory entries...", ja: "メモリを読み込み中...", zh: "正在加载内存条目..." })}
          </div>
        </div>
      </div>
    );
  }

  if (vm.error && vm.entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">&#x26A0;&#xFE0F;</div>
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "메모리 데이터를 불러올 수 없습니다", en: "Unable to load memory data", ja: "メモリデータを読み込めません", zh: "无法加载内存数据" })}
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: "var(--th-text-muted)" }}>{vm.error}</div>
          <button
            onClick={vm.loadEntries}
            className="mt-4 px-4 py-2 text-sm font-mono transition-all"
            style={{ borderRadius: 6, background: "var(--th-accent-bg)", color: "var(--th-accent)", border: "1px solid var(--th-accent-border-subtle)" }}
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
        <MemoryHeader
          t={t}
          entriesCount={vm.entries.length}
          search={vm.search}
          onSearchChange={vm.setSearch}
          sortBy={vm.sortBy}
          onSortByChange={vm.setSortBy}
          onOpenCreateModal={vm.openCreateModal}
        />

        <MemoryCategoryBar
          t={t}
          selectedCategory={vm.selectedCategory}
          onSelectCategory={vm.setSelectedCategory}
          categoryCounts={vm.categoryCounts}
          filteredLength={vm.filtered.length}
          search={vm.search}
        />

        <MemoryMemorySection
          t={t}
          localeTag={localeTag}
          agents={agents}
          historyRefreshToken={vm.historyRefreshToken}
          onRefreshHistory={vm.bumpHistoryRefreshToken}
        />

        <MemoryGrid
          t={t}
          filtered={vm.filtered}
          onToggle={vm.handleToggleEntry}
          onEdit={vm.openEditModal}
          onDelete={vm.handleDeleteEntry}
          deletingEntryId={vm.deletingEntryId}
          learnedProvidersByEntry={vm.learnedProvidersByEntry}
          learnedRepresentatives={vm.learnedRepresentatives}
          agents={agents}
          onOpenLearningModal={vm.openLearningModal}
        />

        <MemoryFormModal
          t={t}
          show={vm.showFormModal}
          editingEntry={vm.editingEntry}
          agents={agents}
          departments={departments}
          submitting={vm.formSubmitting}
          error={vm.formError}
          onClose={vm.closeFormModal}
          scopeOverride={currentProject ? { scope_type: "project", scope_id: currentProject.id } : undefined}
          onCreate={(input) => { void vm.handleCreateEntry(input); }}
          onUpdate={(id, input) => { void vm.handleUpdateEntry(id, input); }}
        />

        <MemoryLearningModal
          t={t}
          localeTag={localeTag}
          agents={agents}
          learningEntry={vm.learningEntry}
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

        {currentProject && (
          <div className="text-center text-xs font-mono py-4" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: `'${currentProject.name}' 프로젝트 전용 메모리`,
              en: `Memory entries for '${currentProject.name}' project`,
              ja: `'${currentProject.name}' プロジェクト専用メモリ`,
              zh: `'${currentProject.name}' 项目专用记忆`,
            })}
          </div>
        )}
      </div>
    </div>
  );
}
