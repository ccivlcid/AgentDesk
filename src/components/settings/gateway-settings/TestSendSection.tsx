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

  const lightBoxStyle: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    padding: "12px 16px",
    transition: "all 0.2s"
  };

  return (
    <div className="p-4 space-y-5" style={{ borderRadius: 20, border: "1px solid rgba(0, 0, 0, 0.05)", background: "#F9FAFB" }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-black font-mono uppercase tracking-widest" style={{ color: "#4B5563" }}>
          {t({ ko: "세션 테스트 전송", en: "Messaging Test", ja: "送信テスト", zh: "发送测试" })}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadMessengerReceiverStatus()}
            disabled={receiverLoading}
            className="text-[10px] font-black font-mono uppercase tracking-tighter transition-all hover:text-blue-600 disabled:opacity-40"
            style={{ color: "#3B82F6" }}
          >
            {receiverLoading ? "..." : t({ ko: "수신상태", en: "RECEIVER", ja: "受信状態", zh: "接收状态" })}
          </button>
          <button
            onClick={() => void loadRuntimeSessions()}
            disabled={runtimeLoading}
            className="text-[10px] font-black font-mono uppercase tracking-tighter transition-all hover:text-blue-600 disabled:opacity-40"
            style={{ color: "#3B82F6" }}
          >
            {runtimeLoading ? "..." : t({ ko: "실행세션", en: "RUNTIME", ja: "実行セッション", zh: "运行会话" })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {telegramReceiverStatus && (
          <div className="px-3 py-2.5 text-[11px] font-mono space-y-1" style={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#FFFFFF" }}>
            <div className="flex justify-between">
              <span className="opacity-60 text-gray-500">{t({ ko: "텔레그램 수신기", en: "Telegram", ja: "Telegram", zh: "Telegram" })}</span>
              <span className={telegramReceiverStatus.enabled ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {telegramReceiverStatus.enabled ? "[ACTIVE]" : "[INACTIVE]"}
              </span>
            </div>
            <div className="text-[10px] opacity-40">Chats: {telegramReceiverStatus.allowedChatCount}</div>
            {telegramReceiverStatus.lastError && <div className="text-red-500 text-[9px] mt-1 break-all">{telegramReceiverStatus.lastError}</div>}
          </div>
        )}

        {discordReceiverStatus && (
          <div className="px-3 py-2.5 text-[11px] font-mono space-y-1" style={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#FFFFFF" }}>
            <div className="flex justify-between">
              <span className="opacity-60 text-gray-500">{t({ ko: "디스코드 수신기", en: "Discord", ja: "Discord", zh: "Discord" })}</span>
              <span className={discordReceiverStatus.enabled ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {discordReceiverStatus.enabled ? "[ACTIVE]" : "[INACTIVE]"}
              </span>
            </div>
            <div className="text-[10px] opacity-40">Routes: {discordReceiverStatus.routeCount}</div>
            {discordReceiverStatus.lastError && <div className="text-red-500 text-[9px] mt-1 break-all">{discordReceiverStatus.lastError}</div>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", fontWeight: 800, color: "#6B7280", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            // {t({ ko: "전송 대상 세션", en: "target session", ja: "送信先セッション", zh: "目标会话" })}
          </div>
          {chatRows.length === 0 ? (
            <div className="px-4 py-3 text-xs font-mono italic opacity-40" style={{ borderRadius: 12, border: "1px dashed #D1D5DB" }}>
              {t({
                ko: "저장된 세션이 없습니다.",
                en: "No saved session.",
                ja: "保存済みセッションがありません。",
                zh: "没有已保存会话。",
              })}
            </div>
          ) : (
            <select
              value={selectedChat?.key ?? ""}
              onChange={(e) => setSelectedChatKey(e.target.value)}
              className="w-full px-4 py-3 text-sm focus:outline-none transition-all"
              style={{ ...lightBoxStyle, fontFamily: "var(--th-font-mono)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
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
            ko: "보낼 테스트 메시지를 입력하세요...",
            en: "Type a test message...",
            ja: "テストメッセージを入力...",
            zh: "输入测试消息...",
          })}
          className="w-full px-4 py-3 text-sm focus:outline-none resize-none transition-all"
          style={{ ...lightBoxStyle, fontFamily: "var(--th-font-mono)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
        />

        {!selectedChatTransportReady && selectedChat && (
          <div className="text-[11px] font-mono px-4 py-2.5 text-amber-700 leading-relaxed" style={{ borderRadius: 12, border: "1px solid #FCD34D", background: "#FFFBEB" }}>
            <span className="font-bold mr-1">[!]</span>
            {t({
              ko: "이 채널은 현재 설정 매핑만 가능하며, 직접 전송 런타임은 준비 중입니다.",
              en: "Channel configured, but direct transport runtime is pending.",
              ja: "このチャネルは設定のみ可能です。送信ラン타임은 준비 중입니다.",
              zh: "该渠道已配置，但直连发送运行时正在准备中。",
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {sendStatus && (
            <div
              className="flex-1 text-[11px] font-mono px-4 py-2.5"
              style={{
                borderRadius: 12,
                background: sendStatus.ok ? "#ECFDF5" : "#FEF2F2",
                border: sendStatus.ok ? "1px solid #A7F3D0" : "1px solid #FECACA",
                color: sendStatus.ok ? "#059669" : "#DC2626",
              }}
            >
              <span className="font-bold mr-1">{sendStatus.ok ? "✓" : "✗"}</span>
              {sendStatus.msg}
            </div>
          )}
          
          <button
            onClick={() => void handleSendMessage()}
            disabled={sending || !selectedChat || !sendText.trim() || !selectedChatTransportReady}
            className="px-6 py-2.5 text-xs font-black font-mono uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderRadius: 12, background: "#3B82F6", color: "#FFFFFF", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)" }}
          >
            {sending
              ? t({ ko: "전송 중...", en: "Sending...", ja: "送信中...", zh: "发送中..." })
              : t({ ko: "메시지 전송 ↵", en: "Send Message ↵", ja: "送信 ↵", zh: "发送 ↵" })}
          </button>
        </div>
      </div>

      {runtimeSessions.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <div className="text-[10px] font-black font-mono uppercase tracking-widest mb-3 opacity-40 text-gray-500">
            {t({ ko: "활성 런타임 세션", en: "Active Runtime Sessions", ja: "実行中セッション", zh: "运行时会话" })}
          </div>
          <div className="max-h-40 overflow-auto space-y-1.5 pr-1">
            {runtimeSessions.map((session) => (
              <div
                key={session.sessionKey}
                className="px-3 py-2 text-[10px] font-mono transition-colors hover:bg-white"
                style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "rgba(255,255,255,0.5)", color: "#4B5563" }}
              >
                <span className="font-black text-blue-600 mr-2">{session.channel}</span>
                <span className="font-bold text-gray-700">{session.displayName}</span>
                <span className="mx-2 opacity-30">|</span>
                <span className="opacity-60">{session.targetId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
