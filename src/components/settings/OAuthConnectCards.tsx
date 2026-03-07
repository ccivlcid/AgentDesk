import { CONNECTABLE_PROVIDERS } from "./constants";
import type { OAuthConnectCardProps } from "./types";

export default function OAuthConnectCards({
  t,
  oauthStatus,
  deviceCode,
  deviceStatus,
  deviceError,
  onConnect,
  onStartDeviceCodeFlow,
}: OAuthConnectCardProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "OAuth 계정 추가",
          en: "Add OAuth Account",
          ja: "OAuth アカウント追加",
          zh: "添加 OAuth 账号",
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CONNECTABLE_PROVIDERS.map(({ id, label, Logo, description }) => {
          const providerInfo = oauthStatus.providers[id];
          const isConnected = Boolean(providerInfo?.executionReady ?? providerInfo?.connected);
          const isDetectedOnly = Boolean(providerInfo?.detected) && !isConnected;
          const storageOk = oauthStatus.storageReady;
          const isGitHub = id === "github-copilot";

          return (
            <div
              key={id}
              className="flex flex-col items-center gap-2 p-4 transition-all"
              style={{
                borderRadius: "2px",
                border: isConnected
                  ? "1px solid rgba(52,211,153,0.35)"
                  : isDetectedOnly
                    ? "1px solid rgba(251,191,36,0.35)"
                    : storageOk
                      ? "1px solid var(--th-border)"
                      : "1px solid var(--th-border)",
                background: isConnected
                  ? "rgba(52,211,153,0.05)"
                  : isDetectedOnly
                    ? "rgba(251,191,36,0.05)"
                    : "var(--th-bg-elevated)",
                opacity: storageOk ? 1 : 0.5,
              }}
            >
              <Logo className="w-8 h-8" />
              <span className="text-sm font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>{label}</span>
              <span className="text-[10px] font-mono text-center leading-tight" style={{ color: "var(--th-text-muted)" }}>{description}</span>

              {!storageOk ? (
                <span className="text-[10px] font-mono px-2 py-0.5" style={{ borderRadius: "2px", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}>
                  {t({
                    ko: "암호화 키 필요",
                    en: "Encryption key required",
                    ja: "暗号化キーが必要",
                    zh: "需要加密密钥",
                  })}
                </span>
              ) : (
                <>
                  {isConnected ? (
                    <span className="text-[11px] px-2.5 py-1 font-mono font-medium" style={{ borderRadius: "2px", background: "rgba(52,211,153,0.15)", color: "rgb(167,243,208)", border: "1px solid rgba(52,211,153,0.4)" }}>
                      {t({ ko: "실행 가능", en: "Runnable", ja: "実行可能", zh: "可执行" })}
                    </span>
                  ) : isDetectedOnly ? (
                    <span className="text-[11px] px-2.5 py-1 font-mono font-medium" style={{ borderRadius: "2px", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.4)" }}>
                      {t({ ko: "감지됨", en: "Detected", ja: "検出済み", zh: "已检测" })}
                    </span>
                  ) : null}

                  {isGitHub ? (
                    deviceCode && deviceStatus === "polling" ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="text-xs font-mono px-3 py-1.5 tracking-widest select-all" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", border: "1px solid var(--th-border)" }}>
                          {deviceCode.userCode}
                        </div>
                        <span className="text-[10px] font-mono animate-pulse" style={{ color: "var(--th-accent)" }}>
                          {t({
                            ko: "코드 입력 대기 중...",
                            en: "Waiting for code...",
                            ja: "コード入力待機中...",
                            zh: "等待输入代码...",
                          })}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => void onStartDeviceCodeFlow()}
                        className="text-[11px] px-3 py-1 font-mono font-medium transition" style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
                      >
                        {isConnected || isDetectedOnly
                          ? t({ ko: "계정 추가", en: "Add Account", ja: "アカウント追加", zh: "添加账号" })
                          : t({ ko: "연결하기", en: "Connect", ja: "接続", zh: "连接" })}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onConnect(id)}
                      className="text-[11px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                    >
                      {isConnected || isDetectedOnly
                        ? t({ ko: "계정 추가", en: "Add Account", ja: "アカウント追加", zh: "添加账号" })
                        : t({ ko: "연결하기", en: "Connect", ja: "接続", zh: "连接" })}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {deviceStatus === "complete" && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono px-3 py-2" style={{ borderRadius: "2px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "rgb(167,243,208)" }}>
            {t({ ko: "GitHub 연결 완료!", en: "GitHub connected!", ja: "GitHub 接続完了!", zh: "GitHub 已连接!" })}
          </div>
          <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}>
            {t({
              ko: "Copilot 구독이 있으면 AI 모델을 사용할 수 있고, 없어도 프로젝트 관리의 GitHub 리포 가져오기 기능은 정상 작동합니다.",
              en: "With a Copilot subscription you can use AI models. Without it, GitHub repo import in Project Manager still works.",
              ja: "Copilot サブスクリプションがあれば AI モデルを利用できます。なくてもプロジェクト管理の GitHub リポインポートは利用可能です。",
              zh: "有 Copilot 订阅可使用 AI 模型；没有订阅也可正常使用项目管理的 GitHub 仓库导入功能。",
            })}
          </div>
        </div>
      )}

      {deviceError && (
        <div className="text-xs font-mono px-3 py-2" style={{ borderRadius: "2px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.35)", color: "rgb(253,164,175)" }}>
          {deviceError}
        </div>
      )}
    </div>
  );
}
