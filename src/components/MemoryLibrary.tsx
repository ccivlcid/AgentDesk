import { useI18n } from "../i18n";
import type { Agent, Department } from "../types";
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
}

export default function MemoryLibrary({ agents, departments }: MemoryLibraryProps) {
  const { t, locale: localeTag } = useI18n();
  const vm = useMemoryState({ agents, departments, t });

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent mx-auto mb-4" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "\uBA54\uBAA8\uB9AC \uB85C\uB529\uC911...",
              en: "Loading memory entries...",
              ja: "\u30E1\u30E2\u30EA\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...",
              zh: "\u6B63\u5728\u52A0\u8F7D\u5185\u5B58\u6761\u76EE...",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (vm.error && vm.entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">{"\u26A0\uFE0F"}</div>
          <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "\uBA54\uBAA8\uB9AC \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
              en: "Unable to load memory data",
              ja: "\u30E1\u30E2\u30EA\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093",
              zh: "\u65E0\u6CD5\u52A0\u8F7D\u5185\u5B58\u6570\u636E",
            })}
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: "var(--th-text-muted)" }}>{vm.error}</div>
          <button
            onClick={vm.loadEntries}
            className="mt-4 px-4 py-2 text-sm font-mono transition-all"
            style={{ borderRadius: "2px", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.35)" }}
          >
            {t({ ko: "\uB2E4\uC2DC \uC2DC\uB3C4", en: "Retry", ja: "\u518D\u8A66\u884C", zh: "\u91CD\u8BD5" })}
          </button>
        </div>
      </div>
    );
  }

  return (
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
        onCreate={(input) => {
          void vm.handleCreateEntry(input);
        }}
        onUpdate={(id, input) => {
          void vm.handleUpdateEntry(id, input);
        }}
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

      <div className="text-center text-xs font-mono py-4" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "\uBA54\uBAA8\uB9AC \uD56D\uBAA9\uC740 \uD0DC\uC2A4\uD06C \uC2E4\uD589 \uC2DC \uC5D0\uC774\uC804\uD2B8 \uCEE8\uD14D\uC2A4\uD2B8\uC5D0 \uC790\uB3D9 \uC8FC\uC785\uB429\uB2C8\uB2E4",
          en: "Memory entries are automatically injected into agent context during task execution",
          ja: "\u30E1\u30E2\u30EA\u9805\u76EE\u306F\u30BF\u30B9\u30AF\u5B9F\u884C\u6642\u306B\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306B\u81EA\u52D5\u6CE8\u5165\u3055\u308C\u307E\u3059",
          zh: "\u5185\u5B58\u6761\u76EE\u5728\u4EFB\u52A1\u6267\u884C\u65F6\u81EA\u52A8\u6CE8\u5165\u5230\u4EE3\u7406\u4E0A\u4E0B\u6587\u4E2D",
        })}
      </div>
    </div>
  );
}
