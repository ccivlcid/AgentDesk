import { Component, useRef, useCallback, useEffect, useState } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import * as api from "./api";
import { useTheme } from "./ThemeContext";
import { useAppLabels } from "./app/useAppLabels";
import AppLoadingScreen from "./app/AppLoadingScreen";
import Desktop from "./components/desktop/Desktop";
import AppOverlays from "./app/AppOverlays";
import ProjectCreateModal from "./components/project-create-modal/ProjectCreateModal";
import AppWindow from "./components/windows/AppWindow";

/** Root-level error boundary — prevents full app crash from component errors */
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
     
    console.error("[AgentDesk] Uncaught UI error:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "monospace", flexDirection: "column", gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: "#8b949e", maxWidth: 400, textAlign: "center" }}>{this.state.error?.message}</div>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{ marginTop: 8, padding: "8px 24px", borderRadius: 6, border: "1px solid #30363d", background: "#21262d", color: "#c9d1d9", cursor: "pointer", fontSize: 13 }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { kickoffProject } from "./api/project-kickoff";
import { isApiRequestError } from "./api/core";
import { useAppActions } from "./app/useAppActions";
import { useActiveMeetingTaskId } from "./app/useActiveMeetingTaskId";
import { useUpdateStatusPolling } from "./app/useUpdateStatusPolling";
import { useAppViewEffects } from "./app/useAppViewEffects";
import { useAppBootstrapData } from "./app/useAppBootstrapData";
import { useLiveSyncScheduler } from "./app/useLiveSyncScheduler";
import { useRealtimeSync } from "./app/useRealtimeSync";
import { mergeSettingsWithDefaults } from "./app/utils";
import { useAgentStore } from "./store/agentStore";
import { useTaskStore } from "./store/taskStore";
import { useProjectStore } from "./store/projectStore";
import { useUiStore } from "./store/uiStore";
import { useI18n } from "./i18n";
import type { Project } from "./types";

export type { OAuthCallbackResult } from "./app/types";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // ── Agent store ──────────────────────────────────────────────────────────
  const {
    departments, agents, libraryAgents, subAgents, stats,
    setDepartments, setAgents, setLibraryAgents, setSubAgents, setStats,
  } = useAgentStore();

  // ── Task store ───────────────────────────────────────────────────────────
  const {
    tasks, cliStatus, subtasks, taskPanel,
    meetingPresence, decisionInboxItems,
    setTasks, setCliStatus, setSubtasks, setTaskPanel,
    setMeetingPresence, setDecisionInboxItems,
  } = useTaskStore();

  // ── Project store ────────────────────────────────────────────────────────
  const {
    categories, projects, currentProjectId, projectAgentIds, projectAgentsLoaded,
    showProjectCreate, projectCreateBusy,
    setCategories, setProjects, setCurrentProjectId, setProjectAgentIds,
    setProjectAgentsLoaded, setProjectPmAgentId, setShowProjectCreate, setProjectCreateBusy,
  } = useProjectStore();

  // ── UI store ─────────────────────────────────────────────────────────────
  const {
    view, loading, settings, oauthResult,
    showAgentStatus,
    decisionInboxLoading, decisionReplyBusyKey,
    mobileNavOpen, mobileHeaderMenuOpen, runtimeOs, forceUpdateBanner,
    updateStatus, dismissedUpdateVersion,
    setView, setLoading, setSettings, setOauthResult,
    setShowAgentStatus,
    setDecisionInboxLoading, setDecisionReplyBusyKey, openWindow,
    setMobileNavOpen, setMobileHeaderMenuOpen, setUpdateStatus, setDismissedUpdateVersion,
    addToast,
  } = useUiStore();
  const { tk, t } = useI18n();

  // ── Onboarding: check API provider on first load ──────────────────────
  const onboardingCheckedRef = useRef(false);
  useEffect(() => {
    if (loading || onboardingCheckedRef.current) return;
    onboardingCheckedRef.current = true;
    import("./api/providers-reports-github").then(({ getApiProviders }) =>
      getApiProviders().then((providers) => {
        if (providers.length === 0) {
          addToast({
            type: "info",
            title: tk("app.onboarding.apiProvider.title"),
            body: tk("app.onboarding.apiProvider.body"),
            duration: 12000,
            onClick: () => openWindow("settings"),
          });
        }
      }).catch(() => { /* ignore */ }),
    );
  }, [loading, addToast, tk, openWindow]);

  // ── Derived values ───────────────────────────────────────────────────────
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (!currentProjectId) {
      setProjectAgentIds(new Set());
      setProjectPmAgentId(null);
      setProjectAgentsLoaded(false);
      return;
    }
    setProjectAgentsLoaded(false);
    import("./api/categories-dashboard").then(({ fetchProjectAgents }) =>
      fetchProjectAgents(currentProjectId)
        .then((list) => {
          setProjectAgentIds(new Set(list.map((a: { id: string; project_role: string | null }) => a.id)));
          const pm = list.find((a: { id: string; project_role: string | null }) => a.project_role === "pm");
          setProjectPmAgentId(pm?.id ?? null);
          setProjectAgentsLoaded(true);
        })
        .catch(() => { setProjectAgentsLoaded(true); }),
    );
  }, [currentProjectId, setProjectAgentIds, setProjectAgentsLoaded, setProjectPmAgentId]);

  // ── Refs for WebSocket callbacks ─────────────────────────────────────────
  // WebSocket 이벤트 핸들러는 마운트 시 한 번만 등록되므로, 최신 state를
  // 클로저로 캡처할 수 없다. ref를 매 렌더마다 동기화해서 핸들러가 항상
  // 최신 값을 참조하도록 한다 (stale closure 방지).
  const viewRef = useRef(view);
  viewRef.current = view;
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const subAgentsRef = useRef(subAgents);
  subAgentsRef.current = subAgents;
  // Codex 스트리밍: thread ID → subAgent ID 매핑 (세션 동안 누적)
  const codexThreadToSubAgentIdRef = useRef<Map<string, string>>(new Map());
  // Codex thread 바인딩 타임스탬프 (오래된 바인딩 무효화용)
  const codexThreadBindingTsRef = useRef<Map<string, number>>(new Map());
  // subAgent 스트림 마지막 청크 (중복 tail 제거용)
  const subAgentStreamTailRef = useRef<Map<string, string>>(new Map());
  // ── Hooks ────────────────────────────────────────────────────────────────
  const { connected, on } = useWebSocket();
  const shouldIncludeSeedAgents = useCallback(() => false, []);

  // 주기적 API 폴링 스케줄러. WebSocket 재연결·이벤트 누락 시 상태를 복구한다.
  const scheduleLiveSync = useLiveSyncScheduler({
    setTasks, setAgents, setStats, setDecisionInboxItems, shouldIncludeSeedAgents,
  });

  // 앱 초기 로딩: 부서·에이전트·태스크·설정·카테고리 등 전체 초기 데이터 fetch
  useAppBootstrapData({
    setDepartments, setAgents, setLibraryAgents, setTasks, setStats,
    setSettings, setSubtasks, setMeetingPresence, setDecisionInboxItems,
    setCategories, setProjects, setLoading,
  });

  // 앱 업데이트 버전 폴링 (백그라운드, 배너 표시용)
  useUpdateStatusPolling(setUpdateStatus);
  // URL 쿼리(?oauth=...) 파싱, CLI 상태 변화에 따른 뷰 전환 등 부수효과 처리
  useAppViewEffects({ view, cliStatus, setView, setOauthResult, setCliStatus, setMobileNavOpen });

  const onTaskDone = useCallback(
    (task: { title?: string }) => {
      addToast({
        type: "success",
        title: tk("toast.task.complete", { title: task.title ?? "" }),
      });
    },
    [addToast, tk],
  );
  const onTaskFailed = useCallback(
    (task: { title?: string }) => {
      addToast({
        type: "error",
        title: tk("toast.task.failed", { title: task.title ?? "" }),
      });
    },
    [addToast, tk],
  );

  // WebSocket 이벤트 → 스토어 실시간 반영 (task/agent/message/cli_output 등)
  useRealtimeSync({
    on, connected, scheduleLiveSync,
    agentsRef, tasksRef, subAgentsRef, viewRef,
    codexThreadToSubAgentIdRef, codexThreadBindingTsRef, subAgentStreamTailRef,
    setTasks, setAgents,
    setMeetingPresence,
    setSubtasks, setSubAgents,
    onTaskDone, onTaskFailed,
  });

  // 사용자 액션 핸들러 모음 (태스크 생성/실행/삭제, 채팅 전송, 설정 저장 등)
  const actions = useAppActions({
    settings, scheduleLiveSync,
    setSettings, setAgents, setLibraryAgents, setDepartments, setTasks, setStats,
    setDecisionInboxLoading, setDecisionInboxItems,
    setDecisionReplyBusyKey, setCliStatus,
  });

  // 현재 진행 중인 미팅 태스크 ID (미팅 분 패널 자동 오픈용)
  const activeMeetingTaskId = useActiveMeetingTaskId(meetingPresence);

  // 언어·테마·업데이트 배너 등 UI 레이블 계산 (i18n)
  const labels = useAppLabels({
    view, settings, theme, runtimeOs, forceUpdateBanner, updateStatus, dismissedUpdateVersion,
  });

  const { kickoffBusy, setKickoffBusy } = useUiStore();

  // OAuth 콜백 시 settings 창 자동 열기
  useEffect(() => {
    if (oauthResult) openWindow("settings");
  }, [oauthResult, openWindow]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLoadingScreen language={labels.uiLanguage} title={labels.loadingTitle} subtitle={labels.loadingSubtitle} />
    );
  }

  return (
    <AppErrorBoundary>
    <Desktop
      connected={connected}
      on={on}
      onSaveSettings={actions.handleSaveSettings}
      onRefreshCli={actions.handleRefreshCli}
      oauthResult={oauthResult}
      onOauthResultClear={() => setOauthResult(null)}
      onAgentsChange={actions.handleAgentsChange}
      onProjectCreate={() => setShowProjectCreate(true)}
      onOpenDecisionInbox={() => { openWindow("decision-inbox"); void actions.loadDecisionInbox(); }}
    >
      <AppOverlays
        agents={agents}
        decisionInboxLoading={decisionInboxLoading}
        decisionInboxItems={decisionInboxItems}
        decisionReplyBusyKey={decisionReplyBusyKey}
        uiLanguage={labels.uiLanguage}
        onRefreshDecisionInbox={() => { void actions.loadDecisionInbox(); }}
        onReplyDecisionOption={actions.handleReplyDecisionOption}
        onOpenDecisionChat={actions.handleOpenDecisionChat}
        taskPanel={taskPanel}
        tasks={tasks}
        onCloseTaskPanel={() => setTaskPanel(null)}
        showAgentStatus={showAgentStatus}
        onCloseAgentStatus={() => setShowAgentStatus(false)}
      />
      {showProjectCreate && (
        <ProjectCreateModal
          categories={categories}
          agents={agents}
          onConfirm={({ name, categoryId, project_path, core_goal, agentIds, roleAssignments, figma_url, directive, directive_type_slug }) => {
            if (projectCreateBusy) return;
            setProjectCreateBusy(true);
            const cat = categories.find((c) => c.id === categoryId);
            const resolvedGoal = core_goal || (cat ? `${cat.name_ko ?? cat.name} 프로젝트` : name.trim());
            (api.createProject as (input: Record<string, unknown>) => Promise<Project>)({
              name: name.trim(),
              project_path: project_path ?? "",
              core_goal: resolvedGoal,
              category_id: categoryId ?? undefined,
              figma_url: figma_url ?? undefined,
              directive: directive ?? undefined,
              directive_type_slug: directive_type_slug ?? undefined,
              create_path_if_missing: true,
              assignment_mode: "manual",
              agent_ids: agentIds,
              role_assignments: roleAssignments,
            })
              .then(async (newProject) => {
                setProjects((prev) => [...prev, newProject]);
                setCurrentProjectId(newProject.id);
                setShowProjectCreate(false);
                openWindow("tasks"); // 오케스트레이션 창 즉시 열기
                setKickoffBusy(true);
                kickoffProject(newProject.id)
                  .catch((err) => {
                    const detail = isApiRequestError(err)
                      ? ((err.details as { detail?: string } | null)?.detail ?? null)
                      : null;
                    addToast({
                      type: "error",
                      title: detail
                        ? detail
                        : t({ ko: "태스크 계획 실패. 직접 추가해주세요.", en: "Planning failed. Please add tasks manually.", ja: "計画失敗", zh: "计划失败" }),
                    });
                  })
                  .finally(() => setKickoffBusy(false));
              })
              .catch((err) => console.error("Project create failed:", err))
              .finally(() => setProjectCreateBusy(false));
          }}
          onGitHubComplete={(projectId) => {
            import("./api/organization-projects").then(({ getProjectDetail }) => {
              getProjectDetail(projectId)
                .then((detail) => {
                  setProjects((prev) => [...prev, detail.project]);
                  setCurrentProjectId(detail.project.id);
                  setShowProjectCreate(false);
                })
                .catch((err) => console.error("GitHub project fetch failed:", err));
            });
          }}
          onClose={() => setShowProjectCreate(false)}
        />
      )}
    </Desktop>
    </AppErrorBoundary>
  );
}
