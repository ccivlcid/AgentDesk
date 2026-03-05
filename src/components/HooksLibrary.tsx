import { useI18n } from "../i18n";
import type { Agent, Department } from "../types";
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
}

export default function HooksLibrary({ agents, departments }: HooksLibraryProps) {
  const { t, locale: localeTag } = useI18n();
  const vm = useHooksState({ agents, departments, t });

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-slate-400 text-sm">
            {t({
              ko: "\uD6C5 \uB85C\uB529\uC911...",
              en: "Loading hooks...",
              ja: "\u30D5\u30C3\u30AF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...",
              zh: "\u6B63\u5728\u52A0\u8F7D\u94A9\u5B50...",
            })}
          </div>
        </div>
      </div>
    );
  }

  if (vm.error && vm.hooks.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3">{"\u26A0\uFE0F"}</div>
          <div className="text-slate-400 text-sm">
            {t({
              ko: "\uD6C5 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
              en: "Unable to load hooks data",
              ja: "\u30D5\u30C3\u30AF\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093",
              zh: "\u65E0\u6CD5\u52A0\u8F7D\u94A9\u5B50\u6570\u636E",
            })}
          </div>
          <div className="text-slate-500 text-xs mt-1">{vm.error}</div>
          <button
            onClick={vm.loadHooks}
            className="mt-4 px-4 py-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all"
          >
            {t({ ko: "\uB2E4\uC2DC \uC2DC\uB3C4", en: "Retry", ja: "\u518D\u8A66\u884C", zh: "\u91CD\u8BD5" })}
          </button>
        </div>
      </div>
    );
  }

  return (
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
      />

      <HookFormModal
        t={t}
        show={vm.showFormModal}
        editingHook={vm.editingHook}
        agents={agents}
        departments={departments}
        submitting={vm.formSubmitting}
        error={vm.formError}
        onClose={vm.closeFormModal}
        onCreate={(input) => {
          void vm.handleCreateHook(input);
        }}
        onUpdate={(id, input) => {
          void vm.handleUpdateHook(id, input);
        }}
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

      <div className="text-center text-xs text-slate-600 py-4">
        {t({
          ko: "\uD6C5\uC740 \uC5D0\uC774\uC804\uD2B8 \uD0DC\uC2A4\uD06C \uB77C\uC774\uD504\uC0AC\uC774\uD074\uC758 \uD2B9\uC815 \uC2DC\uC810\uC5D0 \uC258 \uBA85\uB839\uC744 \uC2E4\uD589\uD569\uB2C8\uB2E4",
          en: "Hooks execute shell commands at specific points in the agent task lifecycle",
          ja: "\u30D5\u30C3\u30AF\u306F\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u30BF\u30B9\u30AF\u30E9\u30A4\u30D5\u30B5\u30A4\u30AF\u30EB\u306E\u7279\u5B9A\u6642\u70B9\u3067\u30B7\u30A7\u30EB\u30B3\u30DE\u30F3\u30C9\u3092\u5B9F\u884C\u3057\u307E\u3059",
          zh: "\u94A9\u5B50\u5728\u4EE3\u7406\u4EFB\u52A1\u751F\u547D\u5468\u671F\u7684\u7279\u5B9A\u65F6\u95F4\u70B9\u6267\u884Cshell\u547D\u4EE4",
        })}
      </div>
    </div>
  );
}
