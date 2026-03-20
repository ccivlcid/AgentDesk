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
      className="space-y-4 p-4 sm:p-5"
      style={{ borderRadius: 8, background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px" }}>
          // channel messaging
        </div>
        {saved && (
          <span className="text-xs font-mono" style={{ color: saved.ok ? "rgb(167,243,208)" : "rgb(253,164,175)" }}>
            {saved.msg}
          </span>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "이 탭에서 메신저 채널을 직접 설정할 수 있습니다. '새 채팅 추가'로 메신저/토큰/대상 ID/대화 Agent를 등록하세요.",
          en: "You can configure messenger channels directly in this tab. Use 'Add Chat' to register messenger/token/target ID/conversation agent.",
          ja: "このタブでメッセンジャーチャネルを直接設定できます。'チャット追加'からメッセンジャー/トークン/対象ID/担当Agentを登録してください。",
          zh: "可在此标签页直接配置消息渠道。通过“新增聊天”注册消息渠道/令牌/目标ID/对话 Agent。",
        })}
      </p>
      <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "$로 시작하면 전사 공지, !로 시작하면 업무(태스크)로 처리되고, 일반 메시지는 선택된 Agent에게 1:1 대화로 전달됩니다.",
          en: "Messages starting with $ are company-wide directives; with ! they are treated as work (task); normal messages are delivered as 1:1 chat to the selected agent.",
          ja: "$ で始めると全社通知、! で始めると業務（タスク）、通常メッセージは選択した Agent に 1:1 で届きます。",
          zh: "以 $ 开头为全员公告，以 ! 开头按工作（任务）处理，普通消息会以 1:1 对话形式发给所选 Agent。",
        })}
      </p>

      <ChatSessionsSection state={state} />
      <TestSendSection state={state} />

      <div className="mt-5 p-3 space-y-3" style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "Slack·Discord 웹훅은 위 '새 채팅 추가'에서 해당 채널을 선택한 뒤 모달 안에서 설정하세요. 기타 URL은 아래에서 추가할 수 있습니다.",
            en: "Set Slack/Discord webhooks in the channel modal (Add Chat → choose Slack or Discord). Add other URLs below.",
            ja: "Slack・Discord のウェブフックは「チャット追加」で該当チャネルを選び、モーダル内で設定。その他URLは下で追加できます。",
            zh: "Slack/Discord Webhook 请在“新增聊天”中选择对应频道后在弹窗中设置。其他 URL 可在下方添加。",
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
