import { CHANNEL_META } from "./constants";
import type { GatewaySettingsTabState } from "./useGatewaySettingsTab";

interface TestSendSectionProps {
  state: GatewaySettingsTabState;
}

export function TestSendSection({ state }: TestSendSectionProps) {
  const {
    t,
    chatRows,
    selectedChat,
    setSelectedChatKey,
    sendText,
    setSendText,
    sending,
    sendStatus,
    selectedChatTransportReady,
    receiverLoading,
    telegramReceiverStatus,
    discordReceiverStatus,
    runtimeLoading,
    runtimeSessions,
    handleSendMessage,
    loadMessengerReceiverStatus,
    loadRuntimeSessions,
  } = state;

  return (
    <div className="p-3 space-y-3" style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "세션 테스트 전송", en: "Test Send", ja: "送信テスト", zh: "发送测试" })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadMessengerReceiverStatus()}
            disabled={receiverLoading}
            className="text-xs font-mono transition disabled:opacity-60"
            style={{ color: "var(--th-accent)" }}
          >
            {t({ ko: "수신상태", en: "Receiver", ja: "受信状態", zh: "接收状态" })}
          </button>
          <button
            onClick={() => void loadRuntimeSessions()}
            disabled={runtimeLoading}
            className="text-xs font-mono transition disabled:opacity-60"
            style={{ color: "var(--th-accent)" }}
          >
            {t({ ko: "실행중 세션", en: "Runtime", ja: "実行セッション", zh: "运行会话" })}
          </button>
        </div>
      </div>

      {telegramReceiverStatus && (
        <div className="px-3 py-2 text-xs font-mono space-y-1" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}>
          <div>
            {t({ ko: "텔레그램 수신기", en: "Telegram Receiver", ja: "Telegram 受信機", zh: "Telegram 接收器" })}:{" "}
            <span className={telegramReceiverStatus.enabled ? "text-emerald-400" : "text-amber-300"}>
              {telegramReceiverStatus.enabled
                ? t({ ko: "활성", en: "active", ja: "有効", zh: "已启用" })
                : t({ ko: "비활성", en: "inactive", ja: "無効", zh: "未启用" })}
            </span>
          </div>
          <div>
            {t({ ko: "허용 chat 수", en: "Allowed chats", ja: "許可チャット数", zh: "允许聊天数" })}: {telegramReceiverStatus.allowedChatCount}
          </div>
          {telegramReceiverStatus.lastError && <div className="text-red-400">{telegramReceiverStatus.lastError}</div>}
        </div>
      )}

      {discordReceiverStatus && (
        <div className="px-3 py-2 text-xs font-mono space-y-1" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}>
          <div>
            {t({ ko: "디스코드 수신기", en: "Discord Receiver", ja: "Discord 受信機", zh: "Discord 接收器" })}:{" "}
            <span className={discordReceiverStatus.enabled ? "text-emerald-400" : "text-amber-300"}>
              {discordReceiverStatus.enabled
                ? t({ ko: "활성", en: "active", ja: "有効", zh: "已启用" })
                : t({ ko: "비활성", en: "inactive", ja: "無効", zh: "未启用" })}
            </span>
          </div>
          <div>
            {t({ ko: "폴링 채널 수", en: "Polled channels", ja: "ポーリングチャネル数", zh: "轮询频道数" })}: {discordReceiverStatus.routeCount}
          </div>
          {discordReceiverStatus.lastError && <div className="text-red-400">{discordReceiverStatus.lastError}</div>}
        </div>
      )}

      <div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
          // {t({ ko: "전송 대상 세션", en: "target session", ja: "送信先セッション", zh: "目标会话" })}
        </div>
        {chatRows.length === 0 ? (
          <div className="text-xs font-mono py-1" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "저장된 세션이 없습니다. 먼저 채팅을 등록하세요.",
              en: "No saved session. Add a chat first.",
              ja: "保存済みセッションがありません。先にチャットを追加してください。",
              zh: "没有已保存会话，请先添加聊天。",
            })}
          </div>
        ) : (
          <select
            value={selectedChat?.key ?? ""}
            onChange={(e) => setSelectedChatKey(e.target.value)}
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          >
            {chatRows.map((row) => (
              <option key={row.key} value={row.key}>
                {CHANNEL_META[row.channel].label} · {row.session.name} ({row.session.targetId})
              </option>
            ))}
          </select>
        )}
      </div>

      <textarea
        value={sendText}
        onChange={(e) => setSendText(e.target.value)}
        rows={3}
        placeholder={t({
          ko: "테스트 메시지를 입력하세요...",
          en: "Type a test message...",
          ja: "テストメッセージを入力...",
          zh: "输入测试消息...",
        })}
        className="w-full px-3 py-2 text-sm focus:outline-none resize-y"
        style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
      />

      {!selectedChatTransportReady && selectedChat && (
        <div className="text-xs font-mono px-3 py-2 text-amber-300" style={{ borderRadius: 0, border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)" }}>
          {t({
            ko: "이 채널은 현재 설정 저장/매핑은 가능하지만, 직접 전송 런타임은 아직 준비되지 않았습니다.",
            en: "This channel can be configured and mapped, but direct transport runtime is not ready yet.",
            ja: "このチャネルは設定/マッピングは可能ですが、直接送信ランタイムは未対応です。",
            zh: "该渠道可配置和映射，但直连发送运行时暂未就绪。",
          })}
        </div>
      )}

      <button
        onClick={() => void handleSendMessage()}
        disabled={sending || !selectedChat || !sendText.trim() || !selectedChatTransportReady}
        className="px-4 py-2 text-sm font-medium font-mono uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
      >
        {sending
          ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
          : t({ ko: "메시지 전송", en: "Send", ja: "送信", zh: "发送" })}
      </button>

      {sendStatus && (
        <div
          className="text-xs font-mono px-3 py-2"
          style={{
            borderRadius: 0,
            background: sendStatus.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: sendStatus.ok ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
            color: sendStatus.ok ? "#4ade80" : "#f87171",
          }}
        >
          {sendStatus.msg}
        </div>
      )}

      {runtimeSessions.length > 0 && (
        <div className="pt-1">
          <div className="text-xs font-mono mb-1" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "런타임 세션", en: "Runtime Sessions", ja: "実行中セッション", zh: "运行时会话" })}
          </div>
          <div className="max-h-44 overflow-auto" style={{ borderRadius: 0, border: "1px solid var(--th-border)" }}>
            {runtimeSessions.map((session) => (
              <div
                key={session.sessionKey}
                className="px-2.5 py-2 text-[11px] font-mono border-b last:border-b-0"
                style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
              >
                <span className="font-semibold">{session.channel}</span> · {session.displayName} · {session.targetId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
