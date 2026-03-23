import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import AppWindow from "../../windows/AppWindow";
import type { ChannelSettingsTabProps } from "../types";
import type { MessengerChannelType } from "../../../types";

type GuideModalProps = {
  t: ChannelSettingsTabProps["t"];
  onClose: () => void;
};

type ChannelGuide = {
  channel: MessengerChannelType;
  icon: string;
  color: string;
  tokenLabel: string;
  targetLabel: string;
  steps: string[];
  tip?: string;
};

export default function ChannelGuideModal({ t, onClose }: GuideModalProps) {
  const [activeChannel, setActiveChannel] = useState<MessengerChannelType>("telegram");

  const guides: ChannelGuide[] = [
    {
      channel: "telegram",
      icon: "✈",
      color: "#2AABEE",
      tokenLabel: t({ ko: "Bot Token", en: "Bot Token", ja: "Bot Token", zh: "Bot Token" }),
      targetLabel: t({ ko: "Chat ID", en: "Chat ID", ja: "Chat ID", zh: "Chat ID" }),
      steps: [
        t({ ko: "Telegram에서 @BotFather를 검색하고 대화를 시작하세요", en: "Search for @BotFather on Telegram and start a chat", ja: "Telegramで@BotFather를 검색해서 대화를 시작하세요", zh: "在Telegram中搜索@BotFather并开始聊天" }),
        t({ ko: "/newbot 명령어로 새 봇을 생성하세요", en: "Create a new bot with the /newbot command", ja: "/newbot 명령어로 새 봇을 생성하세요", zh: "使用/newbot命令创建新机器人" }),
        t({ ko: "발급받은 Bot Token을 '토큰' 필드에 입력하세요", en: "Enter the issued Bot Token into the 'Token' field", ja: "발급받은 Bot Token을 '토큰' 필드에 입력하세요", zh: "将获得的Bot Token输入到'令牌'字段" }),
        t({ ko: "봇을 채팅/그룹에 추가한 뒤, Chat ID를 '채널/대상 ID'에 입력하세요", en: "Add the bot to a chat/group, then enter the Chat ID in 'Channel/Target ID'", ja: "봇을 채팅/그룹에 추가한 뒤, Chat ID를 '채널/대상 ID'에 입력하세요", zh: "将机器人添加到聊天/群组，然后在'频道/目标ID'中输入Chat ID" }),
      ],
      tip: t({ ko: "Chat ID는 t.me/userinfobot 주소로 접속한 뒤 메시지를 보내면 확인할 수 있습니다. 그룹 ID는 보통 음수(-)로 시작합니다.", en: "Open t.me/userinfobot and send a message to get your Chat ID. Group IDs usually start with a minus sign (-).", ja: "Chat ID는 t.me/userinfobot 주소로 접속한 뒤 메시지를 보내면 확인할 수 있습니다. 그룹 ID는 보통 음수(-)로 시작합니다.", zh: "打开 t.me/userinfobot 并发送消息即可获取 Chat ID。群组ID通常以负号(-)开头。" }),
    },
    {
      channel: "discord",
      icon: "🎮",
      color: "#5865F2",
      tokenLabel: t({ ko: "Bot Token", en: "Bot Token", ja: "Bot Token", zh: "Bot Token" }),
      targetLabel: t({ ko: "Channel ID", en: "Channel ID", ja: "Channel ID", zh: "Channel ID" }),
      steps: [
        t({ ko: "Discord Developer Portal(discord.com/developers)에서 새 Application을 만드세요", en: "Create a new Application at Discord Developer Portal", ja: "Discord Developer Portal에서 새 Application을 만드세요", zh: "在Discord Developer Portal创建新的Application" }),
        t({ ko: "Bot 탭에서 Bot을 추가하고 Token을 복사하세요", en: "Add a Bot in the Bot tab and copy the Token", ja: "Bot 탭에서 Bot을 추가하고 Token을 복사하세요", zh: "在Bot标签中添加Bot并复制Token" }),
        t({ ko: "OAuth2 > URL Generator에서 bot 스코프와 필요한 권한을 선택하여 서버에 초대하세요", en: "In OAuth2 > URL Generator, select bot scope and required permissions to invite to your server", ja: "OAuth2 > URL Generator에서 bot 스코프와 필요한 권한을 선택하여 서버에 초대하세요", zh: "在OAuth2 > URL Generator中选择bot范围并邀请" }),
        t({ ko: "Token을 입력하면 채널 목록이 자동으로 로드됩니다. 원하는 채널을 선택하세요.", en: "Channels will auto-load after entering the token. Select your desired channel.", ja: "Token을 입력하면 채널 목록이 자동으로 로드됩니다.", zh: "输入Token后频道列表会自动加载。" }),
      ],
      tip: t({ ko: "Bot에 Message Content Intent를 활성화해야 메시지 수신이 가능합니다.", en: "Enable Message Content Intent for your bot to receive messages.", ja: "Bot에 Message Content Intent를 활성화해야 메시지 수신이 가능합니다.", zh: "需要为机器人启用Message Content Intent才能接收消息。" }),
    },
    {
      channel: "slack",
      icon: "💬",
      color: "#4A154B",
      tokenLabel: t({ ko: "Bot Token (xoxb-)", en: "Bot Token (xoxb-)", ja: "Bot Token (xoxb-)", zh: "Bot Token (xoxb-)" }),
      targetLabel: t({ ko: "Channel ID", en: "Channel ID", ja: "Channel ID", zh: "Channel ID" }),
      steps: [
        t({ ko: "api.slack.com/apps에서 새 Slack App을 만드세요", en: "Create a new Slack App at api.slack.com/apps", ja: "api.slack.com/apps에서 새 Slack App을 만드세요", zh: "在api.slack.com/apps创建新的Slack App" }),
        t({ ko: "OAuth & Permissions에서 Bot Token Scopes를 추가하세요", en: "Add Bot Token Scopes in OAuth & Permissions", ja: "OAuth & Permissions에서 Bot Token Scopes를 추가하세요", zh: "在OAuth & Permissions中添加Bot Token Scopes" }),
        t({ ko: "워크스페이스에 앱을 설치하고 Bot Token(xoxb-)을 복사하세요", en: "Install the app to your workspace and copy the Bot Token", ja: "워크스페이스에 앱을 설치하고 Bot Token(xoxb-)을 복사하세요", zh: "将应用安装到工作区并复制" }),
        t({ ko: "채널에 봇을 초대(/invite @봇이름)한 뒤, 채널 ID를 입력하세요", en: "Invite the bot to a channel, then enter the Channel ID", ja: "채널에 봇을 초대(/invite @봇이름)한 뒤, 채널 ID를 입력하세요", zh: "邀请机器人到频道，然后输入Channel ID" }),
      ],
      tip: t({ ko: "Channel ID는 채널 이름을 우클릭 > '채널 세부정보 보기' 하단에서 확인할 수 있습니다.", en: "Find Channel ID by right-clicking the channel name > 'View channel details'.", ja: "Channel ID는 채널 이름을 우클릭 > '채널 세부정보 보기' 하단에서 확인할 수 있습니다.", zh: "右键频道名称 > '查看频道详情'可找到Channel ID。" }),
    },
    {
      channel: "whatsapp",
      icon: "📱",
      color: "#25D366",
      tokenLabel: t({ ko: "Cloud API Token", en: "Cloud API Token", ja: "Cloud API Token", zh: "Cloud API Token" }),
      targetLabel: t({ ko: "Phone Number ID : 수신자 번호", en: "Phone Number ID : Recipient", ja: "Phone Number ID : 수신자 번호", zh: "Phone Number ID : 收件人号码" }),
      steps: [
        t({ ko: "Meta for Developers에서 비즈니스 앱을 만드세요", en: "Create a business app at Meta for Developers", ja: "Meta for Developers에서 비즈니스 앱을 만드세요", zh: "在Meta for Developers创建商业应用" }),
        t({ ko: "WhatsApp 제품을 추가하고, API 설정에서 액세스 토큰을 생성하세요", en: "Add the WhatsApp product and generate an access token", ja: "WhatsApp 제품을 추가하고, API 설정에서 액세스 토큰을 생성하세요", zh: "添加WhatsApp产品，生成访问令牌" }),
        t({ ko: "Phone Number ID와 수신자 번호를 콜론(:)으로 구분하여 입력하세요", en: "Enter Phone Number ID and recipient number separated by colon (:)", ja: "Phone Number ID와 수신자 번호를 콜론(:)으로 구분하여 입력하세요", zh: "用冒号(:)分隔输入Phone Number ID和收件人号码" }),
      ],
    },
    {
      channel: "googlechat",
      icon: "🟢",
      color: "#00AC47",
      tokenLabel: t({ ko: "Webhook URL 또는 Key|Token", en: "Webhook URL or Key|Token", ja: "Webhook URL 또는 Key|Token", zh: "Webhook URL 或 Key|Token" }),
      targetLabel: t({ ko: "Space ID (spaces/AAA...)", en: "Space ID (spaces/AAA...)", ja: "Space ID (spaces/AAA...)", zh: "Space ID (spaces/AAA...)" }),
      steps: [
        t({ ko: "Google Chat 스페이스에서 '앱 및 통합' > 'Webhook 추가'를 선택하세요", en: "In a Google Chat space, select 'Apps & integrations' > 'Add webhook'", ja: "Google Chat 스페이스에서 '앱 및 통합' > 'Webhook 추가'를 선택하세요", zh: "在Google Chat空间中选择'添加Webhook'" }),
        t({ ko: "생성된 Webhook URL 전체를 '토큰' 필드에 입력하세요", en: "Enter the complete Webhook URL in the 'Token' field", ja: "생성된 Webhook URL 전체를 '토큰' 필드에 입력하세요", zh: "将完整的Webhook URL输入到'令牌'字段" }),
        t({ ko: "Space ID(spaces/로 시작하는 값)를 '채널/대상 ID'에 입력하세요", en: "Enter the Space ID (starts with spaces/) in 'Channel/Target ID'", ja: "Space ID(spaces/로 시작하는 값)를 '채널/대상 ID'에 입력하세요", zh: "在'频道/目标ID'中输入Space ID" }),
      ],
    },
    {
      channel: "signal",
      icon: "▣",
      color: "#3A76F0",
      tokenLabel: t({ ko: "Signal API 인증 정보", en: "Signal API Credentials", ja: "Signal API 인증 정보", zh: "Signal API凭证" }),
      targetLabel: t({ ko: "전화번호, group:<id>, username:<id>", en: "Phone number, group:<id>, username:<id>", ja: "전화번호, group:<id>", zh: "电话号码、group:<id>" }),
      steps: [
        t({ ko: "Signal CLI 또는 signal-cli-rest-api를 설치하고 실행하세요", en: "Install and run Signal CLI or signal-cli-rest-api", ja: "Signal CLI 또는 signal-cli-rest-api를 설치하고 실행하세요", zh: "安装并运行Signal CLI" }),
        t({ ko: "API 인증 정보를 '토큰' 필드에 입력하세요", en: "Enter API credentials in the 'Token' field", ja: "API 인증 정보를 '토큰' 필드에 입력하세요", zh: "在'令牌'字段输入API凭证" }),
        t({ ko: "수신자 정보를 형식에 맞게 입력하세요 (전화번호/그룹/사용자명)", en: "Enter recipient info in the correct format", ja: "수신자 정보를 형식에 맞게 입력하세요", zh: "按格式输入收件人信息" }),
      ],
    },
    {
      channel: "imessage",
      icon: "🍎",
      color: "#34C759",
      tokenLabel: t({ ko: "macOS 인증 정보", en: "macOS Credentials", ja: "macOS 인증 정보", zh: "macOS凭证" }),
      targetLabel: t({ ko: "전화번호 또는 이메일", en: "Phone number or Email", ja: "전화번호 또는 이메일", zh: "电话号码或邮箱" }),
      steps: [
        t({ ko: "macOS 환경에서만 사용 가능합니다 (Messages 앱 연동)", en: "Available only on macOS (Messages app integration)", ja: "macOS 환경에서만 사용 가능합니다", zh: "仅在macOS环境下可用" }),
        t({ ko: "수신자의 전화번호 또는 Apple ID 이메일을 '채널/대상 ID'에 입력하세요", en: "Enter the recipient's phone number or Apple ID email", ja: "수신자의 전화번호 또는 Apple ID 이메일을 입력하세요", zh: "在'频道/目标ID'中输入收件人信息" }),
      ],
    },
  ];

  const active = guides.find((g) => g.channel === activeChannel) ?? guides[0];
  const mono = "var(--th-font-mono)";

  const title = t({ ko: "메신저 연동 가이드", en: "Messenger Setup Guide", ja: "연동 가이드", zh: "设置指南" });

  const guideContent = (
    <AppWindow
      windowType="settings"
      title={title}
      emoji="📖"
      defaultWidth={640}
      defaultHeight={720}
      onClose={onClose}
    >
      <div className="flex flex-col h-full bg-white">
        {/* Channel Tabs */}
        <div className="px-6 pt-4 bg-gray-50/50 border-bottom border-gray-100">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
            {guides.map((g) => (
              <button
                key={g.channel}
                type="button"
                onClick={() => setActiveChannel(g.channel)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  borderRadius: 12,
                  background: activeChannel === g.channel ? "#FFFFFF" : "transparent",
                  color: activeChannel === g.channel ? "#3B82F6" : "#64748B",
                  boxShadow: activeChannel === g.channel ? "0 4px 6px -1px rgba(0, 0, 0, 0.05)" : "none",
                  border: activeChannel === g.channel ? "1px solid #E5E7EB" : "1px solid transparent"
                }}
              >
                <span className="text-base">{g.icon}</span>
                <span className="capitalize">{g.channel === "googlechat" ? "Google Chat" : g.channel === "imessage" ? "iMessage" : g.channel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Field Reference Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4" style={{ borderRadius: 20, background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: mono }}>{t({ ko: "토큰 필드", en: "Token Field", ja: "토큰 필드", zh: "令牌" })}</div>
              <div className="text-sm font-bold text-gray-900">{active.tokenLabel}</div>
            </div>
            <div className="p-4" style={{ borderRadius: 20, background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: mono }}>{t({ ko: "대상 ID 필드", en: "Target ID Field", ja: "대상 ID 필드", zh: "目标 ID" })}</div>
              <div className="text-sm font-bold text-gray-900">{active.targetLabel}</div>
            </div>
          </div>

          {/* Steps with Modern Timeline */}
          <div className="space-y-6">
            {active.steps.map((step, i) => (
              <div key={i} className="flex gap-5 group">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-black bg-white transition-all shadow-sm"
                    style={{ borderRadius: 10, border: `2px solid ${active.color}`, color: active.color }}
                  >
                    {i + 1}
                  </div>
                  {i < active.steps.length - 1 && (
                    <div className="w-0.5 flex-1 my-2" style={{ background: `linear-gradient(180deg, ${active.color}40 0%, transparent 100%)` }} />
                  )}
                </div>
                <div className={`text-sm font-bold leading-relaxed pt-1.5 ${i < active.steps.length - 1 ? "pb-6" : "pb-2"}`} style={{ color: "#374151" }}>
                  {step}
                </div>
              </div>
            ))}
          </div>

          {/* Modernized Tip Box */}
          {active.tip && (
            <div className="p-5 flex gap-4" style={{ borderRadius: 20, background: "#FFFBEB", border: "1px solid #FEF3C7" }}>
              <div style={{ fontSize: 20 }}>💡</div>
              <p className="text-sm leading-relaxed text-amber-900 font-medium">{active.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-end bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all hover:bg-white hover:shadow-sm rounded-xl border border-gray-200 text-gray-600"
          >
            {t({ ko: "확인 완료", en: "GOT IT", ja: "닫기", zh: "已确认" })}
          </button>
        </div>
      </div>
    </AppWindow>
  );

  return createPortal(guideContent, document.body);
}
