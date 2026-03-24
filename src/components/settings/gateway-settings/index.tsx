import type { ChannelSettingsTabProps } from "../types";
import WebhookSettingsTab from "../WebhookSettingsTab";
import ChatEditorModal from "./ChatEditorModal";
import ChannelGuideModal from "./ChannelGuideModal";
import { ChatSessionsSection } from "./ChatSessionsSection";
import { TestSendSection } from "./TestSendSection";
import { useGatewaySettingsTab } from "./useGatewaySettingsTab";

export default function GatewaySettingsTab(props: ChannelSettingsTabProps) {
  const state = useGatewaySettingsTab(props);
  const {
    t,
    saved,
    guideOpen,
    setGuideOpen,
    editor,
    setEditor,
    closeEditorModal,
    handleSaveEditor,
    channelsConfig,
    agents,
    agentsLoading,
    editorError,
    discordChannelOptions,
    discordChannelsLoading,
    discordChannelsError,
    webhookRefreshTrigger,
  } = state;

  return (
    <section
      className="space-y-6 p-6 sm:p-8"
      style={{
        borderRadius: 24,
        background: "#FFFFFF",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151" }}>
            {t({ ko: "채팅 채널 설정", en: "Chat Channel Configuration", ja: "チャットチャネル設定", zh: "聊天渠道设置" })}
          </h3>
        </div>
        {saved && (
          <div className="flex items-center gap-2" style={{ color: "#059669" }}>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 800 }}>{saved.msg}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: "#6B7280", fontFamily: "var(--th-font-mono)" }}>
          {t({
            ko: "• 이 탭에서 메신저 채널을 직접 설정할 수 있습니다. '새 채팅 추가'로 메신저/토큰/대상 ID/대화 Agent를 등록하세요.",
            en: "• Configure messenger channels directly. Use 'Add Chat' to register messenger/token/target ID/conversation agent.",
            ja: "• このタブでチャネルを設定。'チャット追加'からメッセンジャー/トークン/対象ID/担当Agentを登録。",
            zh: "• 可在此标签页直接配置消息渠道。通过“新增聊天”注册消息渠道/令牌/目标ID/对话 Agent。",
          })}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#6B7280", fontFamily: "var(--th-font-mono)" }}>
          {t({
            ko: "• $로 시작하면 전사 공지, !로 시작하면 업무(태스크)로 처리되고, 일반 메시지는 선택된 Agent에게 1:1 대화로 전달됩니다.",
            en: "• $ for company-wide directives; ! for work (task); normal messages are delivered as 1:1 chat to the selected agent.",
            ja: "• $ で全社通知、! で業務（タスク）、通常は 선택 Agent 에 1:1 로 届きます。",
            zh: "• 以 $ 开头为全员公告, 以 ! 开头按工作（任务）处理, 普通消息会以 1:1 对话形式发给所选 Agent。",
          })}
        </p>
      </div>

      <ChatSessionsSection state={state} />
      <TestSendSection state={state} />

      <div className="mt-8 p-5 space-y-4" style={{ borderRadius: 20, border: "1px solid rgba(0, 0, 0, 0.05)", background: "#F9FAFB" }}>
        <p className="text-[11px] font-mono leading-relaxed" style={{ color: "#6B7280" }}>
          {t({
            ko: "• Slack·Discord 웹훅은 위 '새 채팅 추가'에서 해당 채널을 선택한 뒤 모달 안에서 설정하세요. 기타 URL은 아래에서 추가할 수 있습니다.",
            en: "• Set Slack/Discord webhooks in the channel modal (Add Chat → choose Slack or Discord). Add other URLs below.",
            ja: "• Slack・Discord のウェブフックは「チャット追加」で該当チャネルを選び、モーダル内で設定。その他URL은 아래에서 추가할 수 있습니다.",
            zh: "• Slack/Discord Webhook 请在“新增聊天”中选择对应频道后在弹窗中设置。其他 URL 可在下方添加。",
          })}
        </p>
        <WebhookSettingsTab refreshTrigger={webhookRefreshTrigger} />
      </div>

      {editor.open && (
        <ChatEditorModal
          t={t}
          editor={editor}
          setEditor={setEditor}
          closeEditorModal={closeEditorModal}
          handleSaveEditor={handleSaveEditor}
          channelsConfig={channelsConfig}
          agents={agents}
          agentsLoading={agentsLoading}
          editorError={editorError}
          discordChannels={discordChannelOptions}
          discordChannelsLoading={discordChannelsLoading}
          discordChannelsError={discordChannelsError}
        />
      )}
      {guideOpen && <ChannelGuideModal t={t} onClose={() => setGuideOpen(false)} />}
    </section>
  );
}
