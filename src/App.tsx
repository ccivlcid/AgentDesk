import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import * as api from "./api";
import { useTheme } from "./ThemeContext";
import { useAppLabels } from "./app/useAppLabels";
import AppLoadingScreen from "./app/AppLoadingScreen";
import Desktop from "./components/desktop/Desktop";
import AppOverlays from "./app/AppOverlays";
import ProjectCreateModal from "./components/project-create-modal/ProjectCreateModal";
import AppWindow from "./components/windows/AppWindow";
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
    chatAgent, showChat, unreadAgentIds, streamingMessage,
    setDepartments, setAgents, setLibraryAgents, setSubAgents, setStats,
    setChatAgent, setShowChat, setUnreadAgentIds, setStreamingMessage,
  } = useAgentStore();

  // ── Task store ───────────────────────────────────────────────────────────
  const {
    tasks, messages, cliStatus, subtasks, taskPanel, taskReport,
    crossDeptDeliveries, clientOfficeCalls, meetingPresence, decisionInboxItems,
    setTasks, setMessages, setCliStatus, setSubtasks, setTaskPanel, setTaskReport,
    setCrossDeptDeliveries, setClientOfficeCalls, setMeetingPresence, setDecisionInboxItems,
  } = useTaskStore();

  // ── Project store ────────────────────────────────────────────────────────
  const {
    categories, projects, currentProjectId, projectAgentIds, projectAgentsLoaded,
    showProjectCreate, projectCreateBusy,
    setCategories, setProjects, setCurrentProjectId, setProjectAgentIds,
    setProjectAgentsLoaded, setShowProjectCreate, setProjectCreateBusy,
  } = useProjectStore();

  // ── UI store ─────────────────────────────────────────────────────────────
  const {
    view, loading, settings, oauthResult,
    showReportHistory, showAgentStatus, showGroupChat, groupChatInitialAgentIds,
    decisionInboxLoading, decisionReplyBusyKey,
    mobileNavOpen, mobileHeaderMenuOpen, runtimeOs, forceUpdateBanner,
    updateStatus, dismissedUpdateVersion,
    setView, setLoading, setSettings, setOauthResult,
    setShowReportHistory, setShowAgentStatus, setShowGroupChat, setGroupChatInitialAgentIds,
    setDecisionInboxLoading, setDecisionReplyBusyKey, openWindow,
    setMobileNavOpen, setMobileHeaderMenuOpen, setUpdateStatus, setDismissedUpdateVersion,
    addToast,
  } = useUiStore();
  const { t } = useI18n();

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
            title: t({ ko: "API 프로바이더를 설정하세요", en: "Set up an API provider", ja: "APIプロバイダを設定してください", zh: "请设置API提供商" }),
            body: t({
              ko: "Settings → API 탭에서 OpenAI, Anthropic 등 API 키를 등록하거나, Local LLM을 연결하세요.",
              en: "Go to Settings → API tab to add an OpenAI/Anthropic key, or connect a Local LLM.",
              ja: "Settings → APIタブでAPIキーを登録するか、ローカルLLMを接続してください。",
              zh: "前往设置→API标签添加API密钥，或连接本地LLM。",
            }),
            duration: 12000,
            onClick: () => openWindow("settings"),
          });
        }
      }).catch(() => { /* ignore */ }),
    );
  }, [loading, addToast, t, openWindow]);

  // ── Derived values ───────────────────────────────────────────────────────
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (!currentProjectId) {
      setProjectAgentIds(new Set());
      setProjectAgentsLoaded(false);
      return;
    }
    setProjectAgentsLoaded(false);
    import("./api/categories-dashboard").then(({ fetchProjectAgents }) =>
      fetchProjectAgents(currentProjectId)
        .then((list) => {
          setProjectAgentIds(new Set(list.map((a: { id: string }) => a.id)));
          setProjectAgentsLoaded(true);
        })
        .catch(() => { setProjectAgentsLoaded(true); }),
    );
  }, [currentProjectId, setProjectAgentIds, setProjectAgentsLoaded]);

  /** 전사 공지·단톡 등: 현재 선택 프로젝트에 배정된 에이전트만 (미선택·로딩 중·배정 0명은 빈 배열) */
  const projectAgents = useMemo(() => {
    if (!currentProjectId) return [];
    if (!projectAgentsLoaded) return [];
    return agents.filter((a) => projectAgentIds.has(a.id));
  }, [agents, projectAgentIds, projectAgentsLoaded, currentProjectId]);

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
  // 채팅 오버레이/윈도우 열림 여부 + 현재 채팅 대상 (알림 뱃지 제어에 사용)
  const chatWindowOpen = useUiStore((s) => s.openWindows.has("chat"));
  const activeChatRef = useRef({ showChat: showChat || chatWindowOpen, agentId: chatAgent?.id ?? null });
  activeChatRef.current = { showChat: showChat || chatWindowOpen, agentId: chatAgent?.id ?? null };

  // 채팅 윈도우가 열리면 모든 unread 배지 제거
  useEffect(() => {
    if (chatWindowOpen) {
      setUnreadAgentIds((prev) => (prev.size === 0 ? prev : new Set()));
    }
  }, [chatWindowOpen, setUnreadAgentIds]);

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
        title: t({ ko: `태스크 완료: ${task.title ?? ""}`, en: `Task complete: ${task.title ?? ""}`, ja: `タスク完了: ${task.title ?? ""}`, zh: `任务完成: ${task.title ?? ""}` }),
      });
    },
    [addToast, t],
  );
  const onTaskFailed = useCallback(
    (task: { title?: string }) => {
      addToast({
        type: "error",
        title: t({ ko: `태스크 실패: ${task.title ?? ""}`, en: `Task failed: ${task.title ?? ""}`, ja: `タスク失敗: ${task.title ?? ""}`, zh: `任务失败: ${task.title ?? ""}` }),
      });
    },
    [addToast, t],
  );

  // WebSocket 이벤트 → 스토어 실시간 반영 (task/agent/message/cli_output 등)
  useRealtimeSync({
    on, connected, scheduleLiveSync,
    agentsRef, tasksRef, subAgentsRef, viewRef, activeChatRef,
    codexThreadToSubAgentIdRef, codexThreadBindingTsRef, subAgentStreamTailRef,
    setTasks, setAgents, setMessages, setUnreadAgentIds, setTaskReport,
    setCrossDeptDeliveries, setClientOfficeCalls, setMeetingPresence,
    setSubtasks, setSubAgents, setStreamingMessage,
    onTaskDone, onTaskFailed,
  });

  // 사용자 액션 핸들러 모음 (태스크 생성/실행/삭제, 채팅 전송, 설정 저장 등)
  const actions = useAppActions({
    agents, settings, scheduleLiveSync,
    setSettings, setAgents, setLibraryAgents, setDepartments, setTasks, setStats,
    setMessages, setChatAgent, setShowChat, setUnreadAgentIds,
    setDecisionInboxLoading, setDecisionInboxItems,
    setDecisionReplyBusyKey, setCliStatus,
  });

  // 현재 진행 중인 미팅 태스크 ID (미팅 분 패널 자동 오픈용)
  const activeMeetingTaskId = useActiveMeetingTaskId(meetingPresence);

  // 언어·테마·업데이트 배너 등 UI 레이블 계산 (i18n)
  const labels = useAppLabels({
    view, settings, theme, runtimeOs, forceUpdateBanner, updateStatus, dismissedUpdateVersion,
  });

  const [clarificationRequest, setClarificationRequest] = useState<{
    projectId: string;
    clarificationId: string;
    question: string;
  } | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [clarificationBusy, setClarificationBusy] = useState(false);
  const { kickoffBusy, setKickoffBusy } = useUiStore();

  // clarification_request WS 이벤트 처리
  useEffect(() => {
    return on("clarification_request", (payload) => {
      const p = payload as { projectId: string; clarificationId: string; question: string };
      setClarificationRequest(p);
    });
  }, [on]);

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
    <Desktop
      connected={connected}
      on={on}
      onSaveSettings={actions.handleSaveSettings}
      onRefreshCli={actions.handleRefreshCli}
      oauthResult={oauthResult}
      onOauthResultClear={() => setOauthResult(null)}
      onAgentsChange={actions.handleAgentsChange}
      onSendMessage={actions.handleSendMessage}
      onSendAnnouncement={actions.handleSendAnnouncement}
      onSendDirective={actions.handleSendDirective}
      onClearMessages={actions.handleClearMessages}
      onProjectCreate={() => setShowProjectCreate(true)}
      onOpenDecisionInbox={() => { openWindow("decision-inbox"); void actions.loadDecisionInbox(); }}
      onOpenReportHistory={() => { /* handled by openWindows["reports"] */ }}
    >
      <AppOverlays
        showChat={showChat}
        chatAgent={chatAgent}
        messages={messages}
        agents={agents}
        groupChatAgents={projectAgents}
        streamingMessage={streamingMessage}
        onSendMessage={actions.handleSendMessage}
        onSendAnnouncement={actions.handleSendAnnouncement}
        onSendDirective={actions.handleSendDirective}
        onClearMessages={actions.handleClearMessages}
        onCloseChat={() => setShowChat(false)}
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
        taskReport={taskReport}
        onCloseTaskReport={() => setTaskReport(null)}
        showReportHistory={false}
        onCloseReportHistory={() => { /* no-op */ }}
        showAgentStatus={showAgentStatus}
        onCloseAgentStatus={() => setShowAgentStatus(false)}
        showGroupChat={showGroupChat}
        groupChatInitialAgentIds={groupChatInitialAgentIds}
        onCloseGroupChat={() => { setShowGroupChat(false); setGroupChatInitialAgentIds([]); }}
        onOpenGroupChatWithAgents={(agentIds) => { setGroupChatInitialAgentIds(agentIds); setShowGroupChat(true); }}
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
                // 프로젝트 생성 후 에이전트가 자동으로 태스크 계획 수립
                setKickoffBusy(true);
                kickoffProject(newProject.id)
                  .then((result) => {
                    if (result.status !== "clarification_needed") {
                      addToast({ type: "success", title: t({ ko: "에이전트가 태스크를 계획했습니다", en: "Agent planned tasks", ja: "エージェントがタスクを計画しました", zh: "代理已规划任务" }) });
                    }
                  })
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
      {/* 에이전트 clarification 요청 — 일반 AppWindow */}
      {clarificationRequest && (
        <AppWindow
          windowType="decision-inbox"
          title={t({ ko: "에이전트 확인 요청", en: "Agent Clarification", ja: "エージェントの確認", zh: "代理确认" })}
          emoji={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          defaultWidth={480}
          defaultHeight={320}
          onClose={() => { setClarificationRequest(null); setClarificationAnswer(""); }}
        >
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 14, fontWeight: 600, color: "var(--th-text-heading)", lineHeight: 1.5 }}>
              {clarificationRequest.question}
            </div>
            <textarea
              autoFocus
              value={clarificationAnswer}
              onChange={(e) => setClarificationAnswer(e.target.value)}
              placeholder={t({ ko: "답변을 입력하세요...", en: "Enter your answer...", ja: "回答を入力...", zh: "输入您的回答..." })}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box", flex: 1,
                fontFamily: "var(--th-font-mono)", fontSize: 12,
                padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-elevated)", color: "var(--th-text-primary)",
                outline: "none", resize: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => { setClarificationRequest(null); setClarificationAnswer(""); }}
                style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, padding: "7px 16px", borderRadius: 7, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
              >
                {t({ ko: "나중에", en: "Later", ja: "後で", zh: "稍后" })}
              </button>
              <button
                type="button"
                disabled={!clarificationAnswer.trim() || clarificationBusy}
                onClick={() => {
                  if (!clarificationAnswer.trim()) return;
                  const answer = clarificationAnswer.trim();
                  const req = clarificationRequest;
                  // Close window immediately — kickoff runs in background
                  setClarificationRequest(null);
                  setClarificationAnswer("");
                  setClarificationBusy(true);
                  setKickoffBusy(true);
                  kickoffProject(req.projectId, answer, undefined, req.clarificationId)
                    .then((result) => {
                      if (result.status === "ok") {
                        addToast({ type: "success", title: t({ ko: "태스크가 생성되었습니다", en: "Tasks created", ja: "タスクが作成されました", zh: "任务已创建" }) });
                      }
                    })
                    .catch((err) => {
                      const detail = isApiRequestError(err)
                        ? ((err.details as { detail?: string } | null)?.detail ?? null)
                        : null;
                      addToast({ type: "error", title: detail ?? t({ ko: "태스크 계획 실패", en: "Planning failed", ja: "計画失敗", zh: "计划失败" }) });
                    })
                    .finally(() => { setClarificationBusy(false); setKickoffBusy(false); });
                }}
                style={{
                  fontFamily: "var(--th-font-mono)", fontSize: 12, fontWeight: 700,
                  padding: "7px 22px", borderRadius: 7, border: "none",
                  background: clarificationAnswer.trim() ? "var(--th-accent)" : "var(--th-bg-elevated)",
                  color: clarificationAnswer.trim() ? "var(--th-bg-primary)" : "var(--th-text-muted)",
                  cursor: clarificationAnswer.trim() ? "pointer" : "not-allowed",
                }}
              >
                {t({ ko: "답변하기", en: "Reply", ja: "回答する", zh: "回复" })}
              </button>
            </div>
          </div>
        </AppWindow>
      )}
    </Desktop>
  );
}
