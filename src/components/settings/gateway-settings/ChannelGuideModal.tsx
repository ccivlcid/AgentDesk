import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
        t({
          ko: "Telegram에서 @BotFather를 검색하고 대화를 시작하세요",
          en: "Search for @BotFather on Telegram and start a chat",
          ja: "Telegramで@BotFatherを検索してチャットを開始",
          zh: "在Telegram中搜索@BotFather并开始聊天",
        }),
        t({
          ko: "/newbot 명령어로 새 봇을 생성하세요",
          en: "Create a new bot with the /newbot command",
          ja: "/newbotコマンドで新しいBotを作成",
          zh: "使用/newbot命令创建新机器人",
        }),
        t({
          ko: "발급받은 Bot Token을 '토큰' 필드에 입력하세요",
          en: "Enter the issued Bot Token into the 'Token' field",
          ja: "発行されたBot Tokenを「トークン」欄に入力",
          zh: "将获得的Bot Token输入到'令牌'字段",
        }),
        t({
          ko: "봇을 채팅/그룹에 추가한 뒤, Chat ID를 '채널/대상 ID'에 입력하세요",
          en: "Add the bot to a chat/group, then enter the Chat ID in 'Channel/Target ID'",
          ja: "Botをチャット/グループに追加し、Chat IDを「チャンネル/対象ID」に入力",
          zh: "将机器人添加到聊天/群组，然后在'频道/目标ID'中输入Chat ID",
        }),
      ],
      tip: t({
        ko: "Chat ID는 t.me/userinfobot 주소로 접속한 뒤 메시지를 보내면 확인할 수 있습니다. 그룹 ID는 보통 음수(-)로 시작합니다.",
        en: "Open t.me/userinfobot and send a message to get your Chat ID. Group IDs usually start with a minus sign (-).",
        ja: "t.me/userinfobot にアクセスしてメッセージを送るとChat IDを確認できます。グループIDは通常マイナス(-)で始まります。",
        zh: "打开 t.me/userinfobot 并发送消息即可获取 Chat ID。群组ID通常以负号(-)开头。",
      }),
    },
    {
      channel: "discord",
      icon: "🎮",
      color: "#5865F2",
      tokenLabel: t({ ko: "Bot Token", en: "Bot Token", ja: "Bot Token", zh: "Bot Token" }),
      targetLabel: t({ ko: "Channel ID", en: "Channel ID", ja: "Channel ID", zh: "Channel ID" }),
      steps: [
        t({
          ko: "Discord Developer Portal(discord.com/developers)에서 새 Application을 만드세요",
          en: "Create a new Application at Discord Developer Portal (discord.com/developers)",
          ja: "Discord Developer Portal(discord.com/developers)で新しいApplicationを作成",
          zh: "在Discord Developer Portal(discord.com/developers)创建新的Application",
        }),
        t({
          ko: "Bot 탭에서 Bot을 추가하고 Token을 복사하세요",
          en: "Add a Bot in the Bot tab and copy the Token",
          ja: "BotタブでBotを追加し、Tokenをコピー",
          zh: "在Bot标签中添加Bot并复制Token",
        }),
        t({
          ko: "OAuth2 > URL Generator에서 bot 스코프와 필요한 권한을 선택하여 서버에 초대하세요",
          en: "In OAuth2 > URL Generator, select bot scope and required permissions to invite to your server",
          ja: "OAuth2 > URL Generatorでbotスコープと必要な権限を選択してサーバーに招待",
          zh: "在OAuth2 > URL Generator中选择bot范围和所需权限，邀请到服务器",
        }),
        t({
          ko: "Token을 입력하면 채널 목록이 자동으로 로드됩니다. 원하는 채널을 선택하세요.",
          en: "Channels will auto-load after entering the token. Select your desired channel.",
          ja: "Tokenを入力するとチャネル一覧が自動ロードされます。希望のチャネルを選択してください。",
          zh: "输入Token后频道列表会自动加载。选择您需要的频道。",
        }),
      ],
      tip: t({
        ko: "Bot에 Message Content Intent를 활성화해야 메시지 수신이 가능합니다.",
        en: "Enable Message Content Intent for your bot to receive messages.",
        ja: "メッセージ受信にはMessage Content Intentの有効化が必要です。",
        zh: "需要为机器人启用Message Content Intent才能接收消息。",
      }),
    },
    {
      channel: "slack",
      icon: "💬",
      color: "#4A154B",
      tokenLabel: t({ ko: "Bot Token (xoxb-)", en: "Bot Token (xoxb-)", ja: "Bot Token (xoxb-)", zh: "Bot Token (xoxb-)" }),
      targetLabel: t({ ko: "Channel ID", en: "Channel ID", ja: "Channel ID", zh: "Channel ID" }),
      steps: [
        t({
          ko: "api.slack.com/apps에서 새 Slack App을 만드세요",
          en: "Create a new Slack App at api.slack.com/apps",
          ja: "api.slack.com/appsで新しいSlack Appを作成",
          zh: "在api.slack.com/apps创建新的Slack App",
        }),
        t({
          ko: "OAuth & Permissions에서 Bot Token Scopes(chat:write, channels:read)를 추가하세요",
          en: "Add Bot Token Scopes (chat:write, channels:read) in OAuth & Permissions",
          ja: "OAuth & PermissionsでBot Token Scopes(chat:write, channels:read)を追加",
          zh: "在OAuth & Permissions中添加Bot Token Scopes(chat:write, channels:read)",
        }),
        t({
          ko: "워크스페이스에 앱을 설치하고 Bot Token(xoxb-)을 복사하세요",
          en: "Install the app to your workspace and copy the Bot Token (xoxb-)",
          ja: "ワークスペースにアプリをインストールし、Bot Token(xoxb-)をコピー",
          zh: "将应用安装到工作区并复制Bot Token(xoxb-)",
        }),
        t({
          ko: "채널에 봇을 초대(/invite @봇이름)한 뒤, 채널 ID를 입력하세요",
          en: "Invite the bot to a channel (/invite @botname), then enter the Channel ID",
          ja: "チャンネルにBotを招待(/invite @bot名)し、Channel IDを入力",
          zh: "邀请机器人到频道(/invite @botname)，然后输入Channel ID",
        }),
      ],
      tip: t({
        ko: "Channel ID는 채널 이름을 우클릭 > '채널 세부정보 보기' 하단에서 확인할 수 있습니다.",
        en: "Find Channel ID by right-clicking the channel name > 'View channel details' at the bottom.",
        ja: "Channel IDはチャンネル名を右クリック >「チャンネル詳細を表示」の下部で確認できます。",
        zh: "右键频道名称 > '查看频道详情'底部可找到Channel ID。",
      }),
    },
    {
      channel: "whatsapp",
      icon: "📱",
      color: "#25D366",
      tokenLabel: t({ ko: "Cloud API Token", en: "Cloud API Token", ja: "Cloud API Token", zh: "Cloud API Token" }),
      targetLabel: t({
        ko: "Phone Number ID : 수신자 번호",
        en: "Phone Number ID : Recipient",
        ja: "Phone Number ID : 受信者番号",
        zh: "Phone Number ID : 收件人号码",
      }),
      steps: [
        t({
          ko: "Meta for Developers(developers.facebook.com)에서 비즈니스 앱을 만드세요",
          en: "Create a business app at Meta for Developers (developers.facebook.com)",
          ja: "Meta for Developers(developers.facebook.com)でビジネスアプリを作成",
          zh: "在Meta for Developers(developers.facebook.com)创建商业应用",
        }),
        t({
          ko: "WhatsApp 제품을 추가하고, API 설정에서 액세스 토큰을 생성하세요",
          en: "Add the WhatsApp product and generate an access token in API settings",
          ja: "WhatsApp製品を追加し、API設定でアクセストークンを生成",
          zh: "添加WhatsApp产品，在API设置中生成访问令牌",
        }),
        t({
          ko: "Phone Number ID와 수신자 번호를 콜론(:)으로 구분하여 입력하세요",
          en: "Enter Phone Number ID and recipient number separated by colon (:)",
          ja: "Phone Number IDと受信者番号をコロン(:)で区切って入力",
          zh: "用冒号(:)分隔输入Phone Number ID和收件人号码",
        }),
      ],
      tip: t({
        ko: "형식: 1234567890:+8210xxxxxxxx (Phone Number ID:수신자번호)",
        en: "Format: 1234567890:+8210xxxxxxxx (Phone Number ID:recipient)",
        ja: "形式: 1234567890:+8210xxxxxxxx (Phone Number ID:受信者番号)",
        zh: "格式：1234567890:+8210xxxxxxxx（Phone Number ID:收件人号码）",
      }),
    },
    {
      channel: "googlechat",
      icon: "🟢",
      color: "#00AC47",
      tokenLabel: t({ ko: "Webhook URL 또는 Key|Token", en: "Webhook URL or Key|Token", ja: "Webhook URLまたはKey|Token", zh: "Webhook URL或Key|Token" }),
      targetLabel: t({ ko: "Space ID (spaces/AAA...)", en: "Space ID (spaces/AAA...)", ja: "Space ID (spaces/AAA...)", zh: "Space ID (spaces/AAA...)" }),
      steps: [
        t({
          ko: "Google Chat 스페이스에서 '앱 및 통합' > 'Webhook 추가'를 선택하세요",
          en: "In a Google Chat space, select 'Apps & integrations' > 'Add webhook'",
          ja: "Google Chatスペースで「アプリと統合」>「Webhook追加」を選択",
          zh: "在Google Chat空间中选择'应用和集成' > '添加Webhook'",
        }),
        t({
          ko: "생성된 Webhook URL 전체를 '토큰' 필드에 입력하세요",
          en: "Enter the complete Webhook URL in the 'Token' field",
          ja: "生成されたWebhook URL全体を「トークン」欄に入力",
          zh: "将完整的Webhook URL输入到'令牌'字段",
        }),
        t({
          ko: "Space ID(spaces/로 시작하는 값)를 '채널/대상 ID'에 입력하세요",
          en: "Enter the Space ID (starts with spaces/) in 'Channel/Target ID'",
          ja: "Space ID(spaces/で始まる値)を「チャンネル/対象ID」に入力",
          zh: "在'频道/目标ID'中输入Space ID（以spaces/开头）",
        }),
      ],
    },
    {
      channel: "signal",
      icon: "🔒",
      color: "#3A76F0",
      tokenLabel: t({ ko: "Signal API 인증 정보", en: "Signal API Credentials", ja: "Signal API認証情報", zh: "Signal API凭证" }),
      targetLabel: t({
        ko: "전화번호, group:<id>, username:<id>",
        en: "Phone number, group:<id>, username:<id>",
        ja: "電話番号、group:<id>、username:<id>",
        zh: "电话号码、group:<id>、username:<id>",
      }),
      steps: [
        t({
          ko: "Signal CLI 또는 signal-cli-rest-api를 설치하고 실행하세요",
          en: "Install and run Signal CLI or signal-cli-rest-api",
          ja: "Signal CLIまたはsignal-cli-rest-apiをインストールして実行",
          zh: "安装并运行Signal CLI或signal-cli-rest-api",
        }),
        t({
          ko: "API 인증 정보를 '토큰' 필드에 입력하세요",
          en: "Enter API credentials in the 'Token' field",
          ja: "API認証情報を「トークン」欄に入力",
          zh: "在'令牌'字段输入API凭证",
        }),
        t({
          ko: "수신자 정보를 형식에 맞게 입력하세요 (전화번호/그룹/사용자명)",
          en: "Enter recipient info in the correct format (phone/group/username)",
          ja: "受信者情報を形式に合わせて入力（電話番号/グループ/ユーザー名）",
          zh: "按格式输入收件人信息（电话号码/群组/用户名）",
        }),
      ],
    },
    {
      channel: "imessage",
      icon: "🍎",
      color: "#34C759",
      tokenLabel: t({ ko: "macOS 인증 정보", en: "macOS Credentials", ja: "macOS認証情報", zh: "macOS凭证" }),
      targetLabel: t({ ko: "전화번호 또는 이메일", en: "Phone number or Email", ja: "電話番号またはメール", zh: "电话号码或邮箱" }),
      steps: [
        t({
          ko: "macOS 환경에서만 사용 가능합니다 (Messages 앱 연동)",
          en: "Available only on macOS (Messages app integration)",
          ja: "macOS環境でのみ利用可能（Messagesアプリ連携）",
          zh: "仅在macOS环境下可用（Messages应用集成）",
        }),
        t({
          ko: "수신자의 전화번호 또는 Apple ID 이메일을 '채널/대상 ID'에 입력하세요",
          en: "Enter the recipient's phone number or Apple ID email in 'Channel/Target ID'",
          ja: "受信者の電話番号またはApple IDメールを「チャンネル/対象ID」に入力",
          zh: "在'频道/目标ID'中输入收件人的电话号码或Apple ID邮箱",
        }),
      ],
      tip: t({
        ko: "iMessage는 macOS에서 AppleScript를 통해 동작하므로, Mac에서만 사용할 수 있습니다.",
        en: "iMessage works via AppleScript on macOS, so it's only available on Mac.",
        ja: "iMessageはmacOSのAppleScriptで動作するため、Macでのみ利用可能です。",
        zh: "iMessage通过macOS上的AppleScript工作，因此仅在Mac上可用。",
      }),
    },
  ];

  const active = guides.find((g) => g.channel === activeChannel) ?? guides[0];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const modal = (
    <div
      className="skills-learn-modal fixed inset-0 z-[2300] flex items-center justify-center p-4" style={{ background: "var(--th-modal-overlay)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-guide-title"
    >
      <div
        className="skills-learn-modal-card relative w-full max-w-2xl min-w-0 max-h-[90vh] flex flex-col overflow-hidden" style={{ borderRadius: "4px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 id="channel-guide-title" className="text-base font-semibold font-mono tracking-tight" style={{ color: "var(--th-text-heading)" }}>
                {t({
                  ko: "메신저 연동 가이드",
                  en: "Messenger Setup Guide",
                  ja: "メッセンジャー連携ガイド",
                  zh: "消息渠道设置指南",
                })}
              </h3>
              <p className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "각 메신저별 설정 방법을 안내합니다",
                  en: "Step-by-step setup instructions for each messenger",
                  ja: "各メッセンジャーの設定方法をご案内します",
                  zh: "各消息渠道的逐步设置说明",
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center transition" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {/* Channel Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-0.5 -mb-px scrollbar-none min-w-0 flex-shrink-0">
            {guides.map((g) => (
              <button
                key={g.channel}
                type="button"
                onClick={() => setActiveChannel(g.channel)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition"
                style={activeChannel === g.channel
                  ? { borderRadius: "2px 2px 0 0", background: "var(--th-bg-elevated)", color: "var(--th-accent)", borderBottom: "2px solid var(--th-accent)" }
                  : { color: "var(--th-text-muted)" }}
              >
                <span className="text-sm">{g.icon}</span>
                <span className="capitalize">{g.channel === "googlechat" ? "Google Chat" : g.channel === "imessage" ? "iMessage" : g.channel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-5">
          {/* Field Reference */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              <div className="text-[10px] uppercase tracking-wider font-mono mb-1" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "토큰", en: "Token", ja: "トークン", zh: "令牌" })}
              </div>
              <div className="text-xs font-mono font-medium" style={{ color: "var(--th-text-primary)" }}>{active.tokenLabel}</div>
            </div>
            <div className="p-3" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              <div className="text-[10px] uppercase tracking-wider font-mono mb-1" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "채널/대상 ID", en: "Channel/Target ID", ja: "チャンネル/対象ID", zh: "频道/目标ID" })}
              </div>
              <div className="text-xs font-mono font-medium" style={{ color: "var(--th-text-primary)" }}>{active.targetLabel}</div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {active.steps.map((step, i) => (
              <div key={i} className="flex gap-3 group">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0" style={{ borderRadius: "50%", color: "#000", backgroundColor: active.color + "CC" }}
                  >
                    {i + 1}
                  </div>
                  {i < active.steps.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ backgroundColor: active.color + "30" }} />
                  )}
                </div>
                {/* Text */}
                <div className={`text-sm font-mono leading-relaxed ${i < active.steps.length - 1 ? "pb-4" : "pb-1"}`} style={{ color: "var(--th-text-primary)" }}>
                  {step}
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          {active.tip && (
            <div className="mt-4 px-4 py-3 flex gap-2.5" style={{ borderRadius: "4px", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
              <span className="text-amber-400 text-sm flex-shrink-0 mt-px">💡</span>
              <p className="text-xs text-amber-200/80 leading-relaxed">{active.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 flex justify-end" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono transition" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", border: "1px solid var(--th-border)" }}
          >
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
