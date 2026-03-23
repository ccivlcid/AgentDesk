import { type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import AgentSelect from "../../AgentSelect";
import AppWindow from "../../windows/AppWindow";
import type { Agent, MessengerChannelType, MessengerChannelsConfig } from "../../../types";
import type { ChannelSettingsTabProps } from "../types";
import { CHANNEL_META, channelTargetHint } from "./constants";
import type { ChatEditorState } from "./state";
import { MESSENGER_CHANNELS } from "../../../types";
import { WEBHOOK_EVENTS } from "../../../api/webhooks";

type ChatEditorModalProps = {
  t: ChannelSettingsTabProps["t"];
  editor: ChatEditorState;
  setEditor: Dispatch<SetStateAction<ChatEditorState>>;
  closeEditorModal: () => void;
  handleSaveEditor: () => void;
  channelsConfig: MessengerChannelsConfig;
  agents: Agent[];
  agentsLoading: boolean;
  editorError: string | null;
  discordChannels: Array<{
    id: string;
    name: string;
    guildId: string;
    guildName: string;
    type: number;
  }>;
  discordChannelsLoading: boolean;
  discordChannelsError: string | null;
};

export default function ChatEditorModal({
  t,
  editor,
  setEditor,
  closeEditorModal,
  handleSaveEditor,
  channelsConfig,
  agents,
  agentsLoading,
  editorError,
  discordChannels,
  discordChannelsLoading,
  discordChannelsError,
}: ChatEditorModalProps) {
  const discordSelectedChannel =
    editor.channel === "discord" ? discordChannels.find((entry) => entry.id === editor.targetId.trim()) : null;

  const title =
    editor.mode === "create"
      ? t({ ko: "새 채팅 추가", en: "Add Chat", ja: "チャット追加", zh: "新增聊天" })
      : t({ ko: "채팅 편집", en: "Edit Chat", ja: "チャット編集", zh: "编辑聊天" });

  const mono = "var(--th-font-mono)";
  const lightInputStyle: React.CSSProperties = { 
    borderRadius: 12, 
    padding: "10px 14px", 
    background: "#F9FAFB", 
    border: "1px solid #E5E7EB",
    color: "#111827",
    fontSize: "13px",
    transition: "all 0.2s"
  };

  const modalContent = (
    <AppWindow
      windowType="settings" // Use settings window context
      title={title}
      emoji={editor.channel === "telegram" ? "✈" : editor.channel === "discord" ? "🎮" : "💬"}
      defaultWidth={520}
      defaultHeight={640}
      onClose={closeEditorModal}
    >
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
              {t({ ko: "메신저", en: "Messenger", ja: "메ッセンジャー", zh: "消息渠道" })}
            </label>
            <select
              value={editor.channel}
              onChange={(e) => {
                const nextChannel = e.target.value as MessengerChannelType;
                setEditor((prev) => ({
                  ...prev,
                  channel: nextChannel,
                  token: channelsConfig[nextChannel].token ?? "",
                  receiveEnabled: channelsConfig[nextChannel].receiveEnabled !== false,
                }));
              }}
              className="w-full focus:outline-none cursor-pointer"
              style={lightInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              {MESSENGER_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_META[channel].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
              {t({ ko: "활성 여부", en: "Enabled", ja: "有効", zh: "启用" })}
            </label>
            <div className="flex items-center h-[42px]">
              <button
                type="button"
                onClick={() => setEditor((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className="flex items-center gap-2 px-4 py-2 transition-all"
                style={{ 
                  borderRadius: 12, 
                  background: editor.enabled ? "#ECFDF5" : "#F9FAFB",
                  border: `1px solid ${editor.enabled ? "#A7F3D0" : "#E5E7EB"}`,
                  color: editor.enabled ? "#059669" : "#6B7280",
                  fontSize: "12px",
                  fontWeight: 800
                }}
              >
                <span className={`w-2 h-2 rounded-full ${editor.enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                {editor.enabled
                  ? t({ ko: "활성", en: "ACTIVE", ja: "有効", zh: "启用" })
                  : t({ ko: "비활성", en: "DISABLED", ja: "無効", zh: "禁用" })}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
            {t({ ko: "인증 토큰", en: "Auth Token", ja: "トークン", zh: "令牌" })}
          </label>
          <input
            type="password"
            value={editor.token}
            onChange={(e) => setEditor((prev) => ({ ...prev, token: e.target.value }))}
            placeholder={t({
              ko: `${CHANNEL_META[editor.channel].label} 토큰 입력`,
              en: `Enter ${CHANNEL_META[editor.channel].label} token`,
              ja: `${CHANNEL_META[editor.channel].label} トークンを入力`,
              zh: `输入 ${CHANNEL_META[editor.channel].label} 令牌`,
            })}
            className="w-full focus:outline-none font-mono"
            style={lightInputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
              {t({ ko: "채팅 이름", en: "Chat Name", ja: "チャット名", zh: "聊天名称" })}
            </label>
            <input
              value={editor.name}
              onChange={(e) => setEditor((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t({
                ko: "예: 디자인팀 알림",
                en: "e.g. Design Alerts",
                ja: "例: デザイン通知",
                zh: "例如：设计组通知",
              })}
              className="w-full focus:outline-none"
              style={lightInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
              {t({ ko: "채널/대상 ID", en: "Target ID", ja: "対象 ID", zh: "目标 ID" })}
            </label>
            {editor.channel === "discord" && discordChannels.length > 0 && (
              <select
                value={discordSelectedChannel ? discordSelectedChannel.id : ""}
                onChange={(e) => {
                  const nextTargetId = e.target.value;
                  setEditor((prev) => {
                    const matched = discordChannels.find((entry) => entry.id === nextTargetId);
                    return {
                      ...prev,
                      targetId: nextTargetId,
                      name: matched && !prev.name.trim() ? `${matched.guildName} #${matched.name}` : prev.name,
                    };
                  });
                }}
                className="mb-2 w-full focus:outline-none text-xs"
                style={lightInputStyle}
              >
                <option value="">{t({ ko: "Discord 채널 선택 (선택)", en: "Select Channel (Optional)", ja: "채널 선택", zh: "选择频道" })}</option>
                {discordChannels.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.guildName} / #{entry.name}
                  </option>
                ))}
              </select>
            )}
            <input
              value={editor.targetId}
              onChange={(e) => {
                const nextTargetId = e.target.value;
                setEditor((prev) => {
                  const matched = prev.channel === "discord" ? discordChannels.find((entry) => entry.id === nextTargetId.trim()) : undefined;
                  return {
                    ...prev,
                    targetId: nextTargetId,
                    name: matched && !prev.name.trim() ? `${matched.guildName} #${matched.name}` : prev.name,
                  };
                });
              }}
              placeholder={channelTargetHint(editor.channel)}
              className="w-full focus:outline-none font-mono"
              style={lightInputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            />
          </div>
        </div>

        {(editor.channel === "slack" || editor.channel === "discord") && (
          <div className="space-y-4 p-5" style={{ borderRadius: 20, border: "1px solid #BFDBFE", background: "#F0F7FF" }}>
            <div className="flex items-center gap-2">
              <div style={{ padding: 5, background: "#FFFFFF", borderRadius: 8, color: "#3B82F6" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                {t({ ko: "태스크 알림 웹훅 (선택)", en: "Task Webhook (Optional)", ja: "通知ウェブフック", zh: "任务 Webhook" })}
              </h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <input
                  type="url"
                  value={editor.webhookUrl}
                  onChange={(e) => setEditor((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full focus:outline-none text-xs font-mono"
                  style={{ ...lightInputStyle, background: "#FFFFFF" }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev.value}
                    type="button"
                    onClick={() =>
                      setEditor((prev) => ({
                        ...prev,
                        webhookEvents: prev.webhookEvents.includes(ev.value)
                          ? prev.webhookEvents.filter((e) => e !== ev.value)
                          : [...prev.webhookEvents, ev.value],
                      }))
                    }
                    className="px-3 py-1.5 text-[10px] font-bold transition-all"
                    style={{
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: editor.webhookEvents.includes(ev.value) ? "#3B82F6" : "#E5E7EB",
                      background: editor.webhookEvents.includes(ev.value) ? "#3B82F6" : "#FFFFFF",
                      color: editor.webhookEvents.includes(ev.value) ? "#FFFFFF" : "#64748B",
                    }}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-gray-400" style={{ fontFamily: mono }}>
            {t({ ko: "담당 에이전트", en: "Assigned Agent", ja: "担当Agent", zh: "对话 Agent" })}
          </label>
          <AgentSelect
            agents={agents}
            value={editor.agentId}
            onChange={(agentId) => setEditor((prev) => ({ ...prev, agentId: agentId || "" }))}
            placeholder={t({ ko: "에이전트 선택", en: "Select Agent", ja: "Agent選択", zh: "选择 Agent" })}
            className={agentsLoading ? "pointer-events-none opacity-60" : ""}
          />
        </div>

        {editorError && (
          <div className="p-3 text-xs font-bold font-mono rounded-xl bg-red-50 border border-red-100 text-red-600">
            ✗ {editorError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <button
            onClick={closeEditorModal}
            className="px-5 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all rounded-xl"
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={handleSaveEditor}
            className="px-6 py-2 text-xs font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-blue-500/20"
            style={{ borderRadius: 12, background: "#3B82F6", color: "#FFFFFF" }}
          >
            {t({ ko: "저장 ↵", en: "SAVE ↵", ja: "保存 ↵", zh: "保存 ↵" })}
          </button>
        </div>
      </div>
    </AppWindow>
  );

  return createPortal(modalContent, document.body);
}
