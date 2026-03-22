import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import * as api from "../api";
import { isApiRequestError } from "../api/core";
import { handleApiError } from "../api/handleApiError";
import { useToast } from "../components/ui/Toast";
import { buildDecisionInboxItems } from "../components/chat/decision-inbox";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import { LANGUAGE_USER_SET_STORAGE_KEY, normalizeLanguage, pickLang } from "../i18n";
import type {
  Agent,
  CliStatusMap,
  CompanySettings,
  CompanyStats,
  Department,
  Message,
  Task,
} from "../types";
import { mapWorkflowDecisionItemsLocalized } from "./decision-inbox";
import { mergeSettingsWithDefaults, syncClientLanguage } from "./utils";
import type { ProjectMetaPayload } from "./types";

interface UseAppActionsParams {
  agents: Agent[];
  settings: CompanySettings;
  scheduleLiveSync: (delayMs?: number) => void;
  setSettings: Dispatch<SetStateAction<CompanySettings>>;
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  setLibraryAgents: Dispatch<SetStateAction<Agent[]>>;
  setDepartments: Dispatch<SetStateAction<Department[]>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setStats: Dispatch<SetStateAction<CompanyStats | null>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setChatAgent: Dispatch<SetStateAction<Agent | null>>;
  setShowChat: Dispatch<SetStateAction<boolean>>;
  setUnreadAgentIds: Dispatch<SetStateAction<Set<string>>>;
  setDecisionInboxLoading: Dispatch<SetStateAction<boolean>>;
  setDecisionInboxItems: Dispatch<SetStateAction<DecisionInboxItem[]>>;
  setDecisionReplyBusyKey: Dispatch<SetStateAction<string | null>>;
  setCliStatus: Dispatch<SetStateAction<CliStatusMap | null>>;
}

export function useAppActions({
  agents,
  settings,
  scheduleLiveSync,
  setSettings,
  setAgents,
  setLibraryAgents,
  setDepartments,
  setTasks,
  setStats,
  setMessages,
  setChatAgent,
  setShowChat,
  setUnreadAgentIds,
  setDecisionInboxLoading,
  setDecisionInboxItems,
  setDecisionReplyBusyKey,
  setCliStatus,
}: UseAppActionsParams) {
  const { openWindow, closeWindow } = useUiStore();
  const { showToast } = useToast();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const settingsSaveRequestSeqRef = useRef(0);

  const handleSendMessage = useCallback(
    async (
      content: string,
      receiverType: "agent" | "department" | "all",
      receiverId?: string,
      messageType?: string,
      projectMeta?: ProjectMetaPayload,
    ) => {
      try {
        await api.sendMessage({
          receiver_type: receiverType,
          receiver_id: receiverId,
          content,
          message_type: (messageType as "chat" | "task_assign" | "report") || "chat",
          project_id: projectMeta?.project_id,
          project_path: projectMeta?.project_path,
          project_context: projectMeta?.project_context,
        });
        // 서버가 즉시 `new_message` WS로 브로드캐스트하므로, 전체 재조회는 백그라운드로만 동기화 (응답 체감 지연 방지)
        void api
          .getMessages({ receiver_type: receiverType, receiver_id: receiverId, limit: 50 })
          .then(setMessages)
          .catch(() => {});
      } catch (error) {
        handleApiError(error, showToast, { context: "Send message failed" });
      }
    },
    [setMessages, showToast],
  );

  const handleSendAnnouncement = useCallback(async (content: string) => {
    try {
      const projectId = useProjectStore.getState().currentProjectId;
      await api.sendAnnouncement(content, projectId);
    } catch (error) {
      handleApiError(error, showToast, { context: "Announcement failed" });
    }
  }, [showToast]);

  const handleSendDirective = useCallback(async (content: string, projectMeta?: ProjectMetaPayload) => {
    try {
      if (projectMeta?.project_id || projectMeta?.project_path || projectMeta?.project_context) {
        await api.sendDirectiveWithProject({
          content,
          project_id: projectMeta.project_id,
          project_path: projectMeta.project_path,
          project_context: projectMeta.project_context,
        });
      } else {
        await api.sendDirective(content);
      }
    } catch (error) {
      handleApiError(error, showToast, { context: "Directive failed" });
    }
  }, [showToast]);

  const handleCreateTask = useCallback(
    async (input: {
      title: string;
      description?: string;
      department_id?: string;
      task_type?: string;
      priority?: number;
      project_id?: string;
      project_path?: string;
      assigned_agent_id?: string;
      handoff_to_agent_id?: string | null;
      handoff_condition?: "always" | "on_success" | "on_fail" | null;
      kb_context_sources?: string | null;
      use_runtime?: boolean;
    }) => {
      try {
        const taskId = await api.createTask(input as Parameters<typeof api.createTask>[0]);
        if (input.assigned_agent_id) {
          if (input.use_runtime) {
            // Runtime 엔진으로 직접 실행
            await api.runWithRuntime({
              agentId: input.assigned_agent_id,
              taskId,
              projectId: input.project_id ?? null,
            });
          } else {
            await api.runTask(taskId);
          }
        }
        const tks = await api.getTasks();
        setTasks(tks);
        const sts = await api.getStats();
        setStats(sts);
      } catch (error) {
        handleApiError(error, showToast, { context: "Create task failed" });
      }
    },
    [setTasks, setStats, showToast],
  );

  const handleUpdateTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      try {
        await api.updateTask(id, data);
        const tks = await api.getTasks();
        setTasks(tks);
      } catch (error) {
        handleApiError(error, showToast, { context: "Update task failed" });
        return;
      }

      // 완료 처리 시 자동 병합 + 결과물 파일 생성
      if (data.status === "done") {
        const locale = normalizeLanguage(settingsRef.current.language);
        try {
          const result = await api.mergeTask(id);
          if (result.ok) {
            showToast(
              pickLang(locale, {
                ko: `병합 완료: ${result.message}`,
                en: `Merged: ${result.message}`,
                ja: `マージ完了: ${result.message}`,
                zh: `合并完成: ${result.message}`,
              }),
              "success",
            );
          } else if (result.message) {
            // 워크트리 없음(비 git 프로젝트) 등은 조용히 무시
            const isNoWorktree =
              result.message.includes("worktree") ||
              result.message.includes("No git") ||
              result.message.includes("already merged");
            if (!isNoWorktree) {
              showToast(
                pickLang(locale, {
                  ko: `병합 실패: ${result.message}`,
                  en: `Merge failed: ${result.message}`,
                  ja: `マージ失敗: ${result.message}`,
                  zh: `合并失败: ${result.message}`,
                }),
                "error",
              );
            }
          }
        } catch (mergeError) {
          console.error("Auto-merge failed:", mergeError);
        }
      }
    },
    [setTasks, showToast],
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      try {
        await api.deleteTask(id);
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } catch (error) {
        handleApiError(error, showToast, { context: "Delete task failed" });
      }
    },
    [setTasks, showToast],
  );

  const refreshTasksAndAgents = useCallback(async () => {
    const [tks, ags] = await Promise.all([api.getTasks(), api.getAgents({ includeSeed: false })]);
    setTasks(tks);
    setAgents(ags);
  }, [setTasks, setAgents]);

  const handleAssignTask = useCallback(
    async (taskId: string, agentId: string) => {
      try {
        await api.assignTask(taskId, agentId);
        await refreshTasksAndAgents();
      } catch (error) {
        handleApiError(error, showToast, { context: "Assign task failed" });
      }
    },
    [refreshTasksAndAgents, showToast],
  );

  const handleRunTask = useCallback(
    async (id: string) => {
      try {
        await api.runTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        if (isApiRequestError(error) && error.code === "cost_limit_exceeded") {
          const details = error.details as { message?: string } | null;
          showToast(details?.message || "Execution blocked: cost limit exceeded. Adjust cost alert settings.", "warning");
        } else {
          handleApiError(error, showToast, { context: "Failed to start task" });
        }
      }
    },
    [refreshTasksAndAgents, showToast],
  );

  const handleStopTask = useCallback(
    async (id: string) => {
      try {
        await api.stopTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        handleApiError(error, showToast, { context: "Stop task failed" });
      }
    },
    [refreshTasksAndAgents, showToast],
  );

  const handlePauseTask = useCallback(
    async (id: string) => {
      try {
        await api.pauseTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        handleApiError(error, showToast, { context: "Pause task failed" });
      }
    },
    [refreshTasksAndAgents, showToast],
  );

  const handleResumeTask = useCallback(
    async (id: string) => {
      try {
        await api.resumeTask(id);
        await refreshTasksAndAgents();
      } catch (error) {
        handleApiError(error, showToast, { context: "Resume task failed" });
      }
    },
    [refreshTasksAndAgents, showToast],
  );

  const handleSaveSettings = useCallback(
    async (nextInput: CompanySettings) => {
      const previousSettings = settings;
      const nextSettings = mergeSettingsWithDefaults(nextInput);
      const autoUpdateChanged = Boolean(nextSettings.autoUpdateEnabled) !== Boolean(settings.autoUpdateEnabled);
      const saveRequestSeq = (settingsSaveRequestSeqRef.current += 1);
      const attemptedSnapshot = JSON.stringify(nextSettings);
      setSettings(nextSettings);
      syncClientLanguage(nextSettings.language);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_USER_SET_STORAGE_KEY, "1");
      }
      try {
        await api.saveSettings(nextSettings);
        if (autoUpdateChanged) {
          try {
            await api.setAutoUpdateEnabled(Boolean(nextSettings.autoUpdateEnabled));
          } catch (syncErr) {
            console.error("Auto update runtime sync failed:", syncErr);
          }
        }
      } catch (error) {
        const isLatestRequest = settingsSaveRequestSeqRef.current === saveRequestSeq;
        const currentSnapshot = JSON.stringify(settingsRef.current);
        if (isLatestRequest && currentSnapshot === attemptedSnapshot) {
          setSettings(previousSettings);
          syncClientLanguage(previousSettings.language);
        }
        handleApiError(error, showToast, { context: "Save settings failed" });
      }
    },
    [settings, setSettings, showToast],
  );

  const handleDismissAutoUpdateNotice = useCallback(async () => {
    if (!settings.autoUpdateNoticePending) return;
    setSettings((prev) => ({ ...prev, autoUpdateNoticePending: false }));
    try {
      await api.saveSettingsPatch({ autoUpdateNoticePending: false });
    } catch (error) {
      console.error("Failed to persist auto-update notice dismissal:", error);
    }
  }, [settings.autoUpdateNoticePending, setSettings]);

  const handleOpenChat = useCallback(
    (agent: Agent) => {
      setChatAgent(agent);
      setShowChat(true);
      setUnreadAgentIds((prev) => {
        if (!prev.has(agent.id)) return prev;
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
      api
        .getMessages({ receiver_type: "agent", receiver_id: agent.id, limit: 50 })
        .then(setMessages)
        .catch(console.error);
    },
    [setChatAgent, setShowChat, setUnreadAgentIds, setMessages],
  );

  const loadDecisionInbox = useCallback(async () => {
    setDecisionInboxLoading(true);
    try {
      const [allMessages, workflowDecisionItems] = await Promise.all([
        api.getMessages({ limit: 500 }),
        api.getDecisionInbox(),
      ]);
      const agentDecisionItems = buildDecisionInboxItems(allMessages, agents);
      const workflowItems = mapWorkflowDecisionItemsLocalized(workflowDecisionItems, settings.language);
      const merged = [...workflowItems, ...agentDecisionItems];
      const deduped = new Map<string, DecisionInboxItem>();
      for (const item of merged) deduped.set(item.id, item);
      setDecisionInboxItems(Array.from(deduped.values()).sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      handleApiError(error, showToast, { context: "Load decision inbox failed" });
    } finally {
      setDecisionInboxLoading(false);
    }
  }, [agents, settings.language, setDecisionInboxLoading, setDecisionInboxItems, showToast]);

  const handleOpenDecisionInbox = useCallback(() => {
    openWindow("decision-inbox");
    void loadDecisionInbox();
  }, [loadDecisionInbox, openWindow]);

  const handleOpenDecisionChat = useCallback(
    (agentId: string) => {
      const matchedAgent = agents.find((agent) => agent.id === agentId);
      if (!matchedAgent) {
        showToast(
          pickLang(normalizeLanguage(settings.language), {
            ko: "요청 에이전트 정보를 찾지 못했습니다.",
            en: "Could not find the requested agent.",
            ja: "対象エージェント情報が見つかりません。",
            zh: "未找到对应代理信息。",
          }),
          "error",
        );
        return;
      }
      closeWindow("decision-inbox");
      handleOpenChat(matchedAgent);
    },
    [agents, settings.language, closeWindow, handleOpenChat, showToast],
  );

  const handleReplyDecisionOption = useCallback(
    async (
      item: DecisionInboxItem,
      optionNumber: number,
      payloadInput?: { note?: string; selected_option_numbers?: number[] },
    ) => {
      const option = item.options.find((entry) => entry.number === optionNumber);
      if (!option) return;
      const busyKey = `${item.id}:${option.number}`;
      setDecisionReplyBusyKey(busyKey);
      const locale = normalizeLanguage(settings.language);
      try {
        if (item.kind === "agent_request") {
          if (!item.agentId) return;
          const replyContent = pickLang(locale, {
            ko: `[의사결정 회신] ${option.number}번으로 진행해 주세요. (${option.label})`,
            en: `[Decision Reply] Please proceed with option ${option.number}. (${option.label})`,
            ja: `[意思決定返信] ${option.number}番で進めてください。(${option.label})`,
            zh: `[决策回复] 请按选项 ${option.number} 推进。（${option.label}）`,
          });
          await api.sendMessage({
            receiver_type: "agent",
            receiver_id: item.agentId,
            content: replyContent,
            message_type: "chat",
            task_id: item.taskId ?? undefined,
          });
          setDecisionInboxItems((prev) => prev.filter((entry) => entry.id !== item.id));
        } else {
          const selectedAction = option.action ?? "";
          let payload: { note?: string; target_task_id?: string; selected_option_numbers?: number[] } | undefined;
          if (selectedAction === "add_followup_request") {
            const note = payloadInput?.note?.trim() ?? "";
            if (!note) {
              showToast(
                pickLang(locale, {
                  ko: "추가요청사항이 비어 있습니다.",
                  en: "Additional request is empty.",
                  ja: "追加要請が空です。",
                  zh: "追加请求内容为空。",
                }),
                "warning",
              );
              return;
            }
            payload = { note, ...(item.taskId ? { target_task_id: item.taskId } : {}) };
          } else if (item.kind === "review_round_pick") {
            const selectedOptionNumbers = payloadInput?.selected_option_numbers;
            const note = payloadInput?.note?.trim() ?? "";
            payload = {
              ...(note ? { note } : {}),
              ...(Array.isArray(selectedOptionNumbers) ? { selected_option_numbers: selectedOptionNumbers } : {}),
            };
          }
          const replyResult = await api.replyDecisionInbox(item.id, optionNumber, payload);
          if (replyResult.action === "start_project_review_blocked") {
            const blockedLines = (replyResult.blocked_tasks ?? [])
              .slice(0, 3)
              .map((entry) => `- ${entry.title} (${entry.reason})`);
            const blockedSummary =
              blockedLines.length > 0
                ? `\n\n${blockedLines.join("\n")}`
                : pickLang(locale, {
                    ko: "\n\n세부 사유는 태스크 로그를 확인해 주세요.",
                    en: "\n\nCheck task logs for details.",
                    ja: "\n\n詳細はタスクログを確認してください。",
                    zh: "\n\n请查看任务日志了解详情。",
                  });
            showToast(
              pickLang(locale, {
                ko: "PM 미팅 시작이 보류되었습니다. 필요한 게이트를 먼저 해소해 주세요.",
                en: "PM meeting start is on hold. Resolve required gates first.",
                ja: "PMミーティングの開始は保留です。先に必要なゲートを解消してください。",
                zh: "PM评审会议暂缓启动。请先解决必要门禁。",
              }),
              "warning",
            );
          }
          if (replyResult.resolved) {
            setDecisionInboxItems((prev) => prev.filter((entry) => entry.id !== item.id));
            scheduleLiveSync(40);
            // 서버 상태 반영 대기 후 갱신 (즉시 호출하면 아직 처리 중인 항목이 다시 나타남)
            setTimeout(() => { void loadDecisionInbox(); }, 1500);
          } else {
            await loadDecisionInbox();
          }
        }
      } catch (error) {
        handleApiError(error, showToast, { context: "Decision reply failed" });
        showToast(
          pickLang(locale, {
            ko: "의사결정 회신 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            en: "Failed to send decision reply. Please try again.",
            ja: "意思決定返信の送信に失敗しました。もう一度お試しください。",
            zh: "发送决策回复失败，请稍后重试。",
          }),
          "error",
        );
      } finally {
        setDecisionReplyBusyKey((prev) => (prev === busyKey ? null : prev));
      }
    },
    [settings.language, setDecisionReplyBusyKey, setDecisionInboxItems, scheduleLiveSync, loadDecisionInbox, showToast],
  );

  const handleAgentsChange = useCallback(() => {
    api.getAgents({ includeSeed: false }).then(setAgents).catch(console.error);
    api.getAgents({ includeSeed: true }).then(setLibraryAgents).catch(console.error);
    api.getDepartments().then(setDepartments).catch(console.error);
    api.getTasks().then(setTasks).catch(console.error);
  }, [setAgents, setLibraryAgents, setDepartments, setTasks]);

  const handleRefreshCli = useCallback(async () => {
    const status = await api.getCliStatus(true);
    setCliStatus(status);
  }, [setCliStatus]);

  const handleOpenAnnouncement = useCallback(() => {
    setChatAgent(null);
    setShowChat(true);
    api.getMessages({ receiver_type: "all", limit: 50 }).then(setMessages).catch(console.error);
  }, [setChatAgent, setShowChat, setMessages]);

  const handleClearMessages = useCallback(
    async (agentId?: string) => {
      try {
        await api.clearMessages(agentId);
        setMessages([]);
      } catch (error) {
        handleApiError(error, showToast, { context: "Clear messages failed" });
      }
    },
    [setMessages, showToast],
  );

  return {
    handleSendMessage,
    handleSendAnnouncement,
    handleSendDirective,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
    handleAssignTask,
    handleRunTask,
    handleStopTask,
    handlePauseTask,
    handleResumeTask,
    handleSaveSettings,
    handleDismissAutoUpdateNotice,
    handleOpenChat,
    loadDecisionInbox,
    handleOpenDecisionInbox,
    handleOpenDecisionChat,
    handleReplyDecisionOption,
    handleAgentsChange,
    handleRefreshCli,
    handleOpenAnnouncement,
    handleClearMessages,
  };
}
