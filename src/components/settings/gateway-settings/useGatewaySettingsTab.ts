import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../../../api";
import {
  MESSENGER_CHANNELS,
  type Agent,
  type MessengerSessionConfig,
} from "../../../types";
import type { ChannelSettingsTabProps } from "../types";
import { CHANNEL_META, isWorkflowPackKey } from "./constants";
import {
  type ChatRow,
  createEditorState,
  createSessionId,
  normalizeChannelsConfig,
  resolveChannelsConfig,
} from "./state";
import { createWebhook } from "../../../api/webhooks";

export function useGatewaySettingsTab({
  t,
  form,
  setForm,
  persistSettings,
  managerAgents,
}: ChannelSettingsTabProps) {
  const channelsConfig = resolveChannelsConfig(form.messengerChannels);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendText, setSendText] = useState("");
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeSessions, setRuntimeSessions] = useState<Awaited<ReturnType<typeof api.getMessengerRuntimeSessions>>>([]);
  const [receiverLoading, setReceiverLoading] = useState(false);
  const [telegramReceiverStatus, setTelegramReceiverStatus] = useState<Awaited<ReturnType<typeof api.getTelegramReceiverStatus>> | null>(null);
  const [discordReceiverStatus, setDiscordReceiverStatus] = useState<Awaited<ReturnType<typeof api.getDiscordReceiverStatus>> | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [fetchedAgents, setFetchedAgents] = useState<Agent[]>([]);
  const agents = managerAgents ?? fetchedAgents;
  const [guideOpen, setGuideOpen] = useState(false);
  const [editor, setEditor] = useState(() => createEditorState(channelsConfig));
  const [editorError, setEditorError] = useState<string | null>(null);
  const [webhookRefreshTrigger, setWebhookRefreshTrigger] = useState(0);
  const [discordChannelsLoading, setDiscordChannelsLoading] = useState(false);
  const [discordChannelOptions, setDiscordChannelOptions] = useState<api.DiscordDiscoverableChannel[]>([]);
  const [discordChannelsError, setDiscordChannelsError] = useState<string | null>(null);
  const discordLookupSeq = useRef(0);

  const chatRows = useMemo<ChatRow[]>(() => {
    return MESSENGER_CHANNELS.flatMap((channel) => {
      const channelConfig = channelsConfig[channel];
      return (channelConfig.sessions ?? [])
        .map((session) => ({
          key: `${channel}:${session.id}`,
          channel,
          token: (session.token ?? "").trim() || (channelConfig.token ?? ""),
          receiveEnabled: channelConfig.receiveEnabled !== false,
          session,
        }))
        .filter((entry) => entry.session.targetId.trim().length > 0);
    });
  }, [channelsConfig]);

  const [selectedChatKey, setSelectedChatKey] = useState<string>("");

  useEffect(() => {
    if (chatRows.length === 0) {
      setSelectedChatKey("");
      return;
    }
    const exists = chatRows.some((row) => row.key === selectedChatKey);
    if (!exists) setSelectedChatKey(chatRows[0].key);
  }, [chatRows, selectedChatKey]);

  const selectedChat = chatRows.find((row) => row.key === selectedChatKey) ?? null;
  const agentById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) map.set(agent.id, agent);
    return map;
  }, [agents]);

  const resolveDiscordLookupErrorMessage = useCallback(
    (error: unknown): string => {
      if (api.isApiRequestError(error)) {
        const code = error.code ?? "";
        if (code === "discord_token_required") return t({ ko: "Discord 토큰을 입력해주세요.", en: "Please enter a Discord token.", ja: "Discordトークンを入力してください。", zh: "请输入 Discord 令牌。" });
        if (code === "discord_auth_failed") return t({ ko: "Discord 인증에 실패했습니다. Bot 토큰과 권한을 확인하세요.", en: "Discord authentication failed. Check your bot token and permissions.", ja: "Discord認証に失敗しました。Botトークンと権限を確認してください。", zh: "Discord 认证失败，请检查 Bot 令牌和权限。" });
        if (code === "discord_rate_limited") return t({ ko: "Discord API 요청이 많습니다. 잠시 후 다시 시도해주세요.", en: "Discord API is rate-limited. Please try again shortly.", ja: "Discord API のレート制限に達しました。しばらくしてから再試行してください。", zh: "Discord API 已触发限流，请稍后重试。" });
        if (code === "discord_channel_lookup_failed") return t({ ko: "Discord 채널 조회에 실패했습니다. 네트워크/권한 상태를 확인해주세요.", en: "Failed to load Discord channels. Check network connectivity and permissions.", ja: "Discordチャネルの取得に失敗しました。ネットワークと権限を確認してください。", zh: "Discord 频道加载失败，请检查网络和权限状态。" });
      }
      return t({ ko: "Discord 채널 조회 중 오류가 발생했습니다.", en: "An error occurred while loading Discord channels.", ja: "Discordチャネルの取得中にエラーが発生しました。", zh: "加载 Discord 频道时发生错误。" });
    },
    [t],
  );

  const persistChannelsForm = useCallback(
    (nextChannels: ReturnType<typeof resolveChannelsConfig>, successMsg?: string) => {
      const normalized = normalizeChannelsConfig(nextChannels);
      const nextForm = { ...form, messengerChannels: normalized };
      setForm(nextForm);
      setSaving(true);
      setSaved(null);
      try {
        persistSettings(nextForm);
        setSaved({
          ok: true,
          msg: successMsg ?? t({ ko: "채널 설정 저장 완료", en: "Channel settings saved", ja: "チャネル設定を保存しました", zh: "频道设置已保存" }),
        });
        setTimeout(() => setSaved(null), 2500);
        return true;
      } catch (error) {
        setSaved({ ok: false, msg: error instanceof Error ? error.message : String(error) });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [form, setForm, persistSettings, t],
  );

  const removeChat = useCallback(
    (row: ChatRow) => {
      const next = resolveChannelsConfig(form.messengerChannels);
      next[row.channel] = {
        ...next[row.channel],
        sessions: next[row.channel].sessions.filter((session) => session.id !== row.session.id),
      };
      persistChannelsForm(next, t({ ko: "채팅 삭제 완료", en: "Chat deleted", ja: "チャットを削除しました", zh: "聊天已删除" }));
      setSendStatus(null);
    },
    [form.messengerChannels, persistChannelsForm, t],
  );

  const openCreateModal = useCallback(() => {
    setEditor({ ...createEditorState(channelsConfig), open: true, mode: "create" });
    setEditorError(null);
  }, [channelsConfig]);

  const openEditModal = useCallback(
    (row: ChatRow) => {
      setEditor({
        ...createEditorState(channelsConfig),
        open: true,
        mode: "edit",
        ref: { channel: row.channel, sessionId: row.session.id },
        channel: row.channel,
        token: row.session.token?.trim() || (channelsConfig[row.channel].token ?? ""),
        name: row.session.name ?? "",
        targetId: row.session.targetId ?? "",
        enabled: row.session.enabled !== false,
        agentId: row.session.agentId ?? "",
        workflowPackKey: isWorkflowPackKey(row.session.workflowPackKey) ? row.session.workflowPackKey : "development",
        receiveEnabled: channelsConfig[row.channel].receiveEnabled !== false,
      });
      setEditorError(null);
    },
    [channelsConfig],
  );

  const closeEditorModal = useCallback(() => {
    setEditor((prev) => ({ ...prev, open: false, ref: null }));
    setEditorError(null);
  }, []);

  const handleSaveEditor = useCallback(async () => {
    const token = editor.token.trim();
    const name = editor.name.trim();
    const targetId = editor.targetId.trim();
    const agentId = editor.agentId.trim();
    if (!token) {
      setEditorError(t({ ko: "토큰을 입력해주세요.", en: "Please enter a token.", ja: "トークンを入力してください。", zh: "请输入令牌。" }));
      return;
    }
    if (!name) {
      setEditorError(t({ ko: "채팅 이름을 입력해주세요.", en: "Please enter a chat name.", ja: "チャット名を入力してください。", zh: "请输入聊天名称。" }));
      return;
    }
    if (!targetId) {
      setEditorError(t({ ko: "채널/대상 ID를 입력해주세요.", en: "Please enter a channel/target ID.", ja: "チャンネル/対象 ID を入力してください。", zh: "请输入频道/目标 ID。" }));
      return;
    }
    const next = resolveChannelsConfig(form.messengerChannels);
    next[editor.channel] = {
      ...next[editor.channel],
      receiveEnabled: editor.channel === "telegram" ? editor.receiveEnabled : next[editor.channel].receiveEnabled,
    };
    const nextSession: MessengerSessionConfig = {
      id: editor.ref?.sessionId || createSessionId(editor.channel),
      name,
      targetId,
      enabled: editor.enabled,
      token,
      agentId: agentId || undefined,
      workflowPackKey: editor.workflowPackKey,
    };
    let insertIndex: number | null = null;
    if (editor.ref) {
      const sourceChannel = editor.ref.channel;
      const sourceSessions = [...next[sourceChannel].sessions];
      const sourceIndex = sourceSessions.findIndex((session) => session.id === editor.ref?.sessionId);
      if (sourceIndex >= 0) {
        sourceSessions.splice(sourceIndex, 1);
        next[sourceChannel] = { ...next[sourceChannel], sessions: sourceSessions };
        if (sourceChannel === editor.channel) insertIndex = sourceIndex;
      }
    }
    const targetSessions = [...next[editor.channel].sessions];
    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= targetSessions.length) {
      targetSessions.splice(insertIndex, 0, nextSession);
    } else {
      targetSessions.push(nextSession);
    }
    next[editor.channel] = { ...next[editor.channel], sessions: targetSessions };
    const savedOk = persistChannelsForm(next, t({ ko: "채팅 설정 저장 완료", en: "Chat saved", ja: "チャット設定を保存しました", zh: "聊天设置已保存" }));
    if (!savedOk) {
      setEditorError(t({ ko: "채팅 저장에 실패했습니다. 다시 시도해주세요.", en: "Failed to save chat. Please try again.", ja: "チャット保存に失敗しました。再試行してください。", zh: "聊天保存失败，请重试。" }));
      return;
    }
    if ((editor.channel === "slack" || editor.channel === "discord") && editor.webhookUrl?.trim()) {
      try {
        await createWebhook({
          name: editor.webhookName?.trim() || editor.name?.trim() || (editor.channel === "slack" ? "Slack 알림" : "Discord 알림"),
          url: editor.webhookUrl.trim(),
          events: editor.webhookEvents?.length ? editor.webhookEvents : ["task_done"],
        });
        setWebhookRefreshTrigger((prev) => prev + 1);
      } catch {
        setEditorError(t({ ko: "웹훅 저장에 실패했습니다.", en: "Failed to save webhook.", ja: "ウェブフックの保存に失敗しました。", zh: "保存 Webhook 失败。" }));
        return;
      }
    }
    setSelectedChatKey(`${editor.channel}:${nextSession.id}`);
    closeEditorModal();
  }, [editor, form.messengerChannels, persistChannelsForm, t, closeEditorModal]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedChat || !sendText.trim()) return;
    setSending(true);
    setSendStatus(null);
    try {
      const result = await api.sendMessengerRuntimeMessage({ sessionKey: selectedChat.key, text: sendText.trim() });
      if (!result.ok) {
        setSendStatus({ ok: false, msg: result.error || "send_failed" });
        return;
      }
      setSendStatus({ ok: true, msg: t({ ko: "메시지 전송 완료", en: "Message sent", ja: "メッセージを送信しました", zh: "消息已发送" }) });
      setSendText("");
    } catch (error) {
      setSendStatus({ ok: false, msg: error instanceof Error ? error.message : String(error) });
    } finally {
      setSending(false);
    }
  }, [selectedChat, sendText, t]);

  const loadRuntimeSessions = useCallback(async () => {
    setRuntimeLoading(true);
    try {
      const sessions = await api.getMessengerRuntimeSessions();
      setRuntimeSessions(sessions);
    } catch {
      setRuntimeSessions([]);
    } finally {
      setRuntimeLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    if (managerAgents) return;
    setAgentsLoading(true);
    try {
      const rows = await api.getAgents({ includeSeed: true });
      setFetchedAgents(rows);
    } catch {
      setFetchedAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }, [managerAgents]);

  useEffect(() => void loadAgents(), [loadAgents]);

  useEffect(() => {
    if (!editor.open || editor.channel !== "discord") {
      setDiscordChannelsLoading(false);
      setDiscordChannelsError(null);
      setDiscordChannelOptions([]);
      return;
    }
    const token = editor.token.trim();
    if (!token) {
      setDiscordChannelsLoading(false);
      setDiscordChannelsError(null);
      setDiscordChannelOptions([]);
      return;
    }
    const seq = discordLookupSeq.current + 1;
    discordLookupSeq.current = seq;
    const timer = setTimeout(() => {
      setDiscordChannelsLoading(true);
      setDiscordChannelsError(null);
      void api
        .listDiscordChannelsByToken(token)
        .then((channels) => {
          if (discordLookupSeq.current !== seq) return;
          setDiscordChannelOptions(channels);
        })
        .catch((error) => {
          if (discordLookupSeq.current !== seq) return;
          setDiscordChannelOptions([]);
          setDiscordChannelsError(resolveDiscordLookupErrorMessage(error));
        })
        .finally(() => {
          if (discordLookupSeq.current !== seq) return;
          setDiscordChannelsLoading(false);
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [editor.open, editor.channel, editor.token, resolveDiscordLookupErrorMessage]);

  const loadMessengerReceiverStatus = useCallback(async () => {
    setReceiverLoading(true);
    try {
      const [telegramStatus, discordStatus] = await Promise.all([
        api.getTelegramReceiverStatus().catch(() => null),
        api.getDiscordReceiverStatus().catch(() => null),
      ]);
      setTelegramReceiverStatus(telegramStatus);
      setDiscordReceiverStatus(discordStatus);
    } catch {
      setTelegramReceiverStatus(null);
      setDiscordReceiverStatus(null);
    } finally {
      setReceiverLoading(false);
    }
  }, []);

  const selectedChatTransportReady = selectedChat ? CHANNEL_META[selectedChat.channel].transportReady : false;

  return {
    t,
    channelsConfig,
    saving,
    saved,
    sending,
    sendText,
    setSendText,
    sendStatus,
    runtimeLoading,
    runtimeSessions,
    receiverLoading,
    telegramReceiverStatus,
    discordReceiverStatus,
    agents,
    agentsLoading,
    guideOpen,
    setGuideOpen,
    editor,
    setEditor,
    editorError,
    webhookRefreshTrigger,
    discordChannelsLoading,
    discordChannelOptions,
    discordChannelsError,
    chatRows,
    selectedChatKey,
    setSelectedChatKey,
    selectedChat,
    agentById,
    selectedChatTransportReady,
    removeChat,
    openCreateModal,
    openEditModal,
    closeEditorModal,
    handleSaveEditor,
    handleSendMessage,
    loadRuntimeSessions,
    loadMessengerReceiverStatus,
  };
}

export type GatewaySettingsTabState = ReturnType<typeof useGatewaySettingsTab>;
