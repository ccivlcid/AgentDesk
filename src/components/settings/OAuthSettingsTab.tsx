import GitHubOAuthAppConfig from "./GitHubOAuthAppConfig";
import OAuthConnectCards from "./OAuthConnectCards";
import OAuthConnectedProvidersSection from "./OAuthConnectedProvidersSection";
import { OAUTH_INFO } from "./constants";
import type { DeviceCodeStart } from "../../api";
import type { OAuthCallbackResultLike, OAuthCommonProps, TFunction } from "./types";

type OAuthSettingsTabProps = Omit<OAuthCommonProps, "oauthStatus"> & {
  t: TFunction;
  oauthLoading: boolean;
  oauthStatus: OAuthCommonProps["oauthStatus"] | null;
  oauthResult?: OAuthCallbackResultLike | null;
  onOauthResultClear?: () => void;
  onRefresh: () => void;
  deviceCode: DeviceCodeStart | null;
  deviceStatus: string | null;
  deviceError: string | null;
  onStartDeviceCodeFlow: () => Promise<void>;
};

export default function OAuthSettingsTab({
  t,
  localeTag,
  form,
  setForm,
  persistSettings,
  oauthLoading,
  oauthStatus,
  oauthResult,
  onOauthResultClear,
  onRefresh,
  models,
  modelsLoading,
  refreshing,
  disconnecting,
  savingAccountId,
  accountDrafts,
  onConnect,
  onDisconnect,
  onRefreshToken,
  onUpdateAccountDraft,
  onActivateAccount,
  onSaveAccount,
  onToggleAccount,
  onDeleteAccount,
  deviceCode,
  deviceStatus,
  deviceError,
  onStartDeviceCodeFlow,
}: OAuthSettingsTabProps) {
  return (
    <section
      className="space-y-4 p-4 sm:p-5"
      style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px" }}>
          // oauth status
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="transition-colors hover:opacity-80"
          style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-text-muted)", border: "1px solid var(--th-border)", padding: "2px 6px", borderRadius: 0, background: "var(--th-bg-elevated)" }}
        >
          [↺]
        </button>
      </div>

      {oauthResult && (
        <div
          className="flex items-center justify-between px-3 py-2 text-sm font-mono"
          style={oauthResult.error
            ? { borderRadius: 0, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.35)", color: "rgb(253,164,175)" }
            : { borderRadius: 0, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "rgb(167,243,208)" }}
        >
          <span>
            {oauthResult.error
              ? `${t({ ko: "OAuth 연결 실패", en: "OAuth connection failed", ja: "OAuth 接続失敗", zh: "OAuth 连接失败" })}: ${oauthResult.error}`
              : `${OAUTH_INFO[oauthResult.provider || ""]?.label || oauthResult.provider} ${t({ ko: "연결 완료!", en: "connected!", ja: "接続完了!", zh: "连接成功!" })}`}
          </span>
          <button onClick={() => onOauthResultClear?.()} className="text-xs opacity-60 hover:opacity-100 ml-2">
            ✕
          </button>
        </div>
      )}

      {oauthStatus && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs font-mono"
          style={oauthStatus.storageReady
            ? { borderRadius: 0, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "rgb(167,243,208)" }
            : { borderRadius: 0, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "var(--th-accent)" }}
        >
          <span>{oauthStatus.storageReady ? "▣" : "▲"}</span>
          <span>
            {oauthStatus.storageReady
              ? t({
                  ko: "OAuth 저장소 활성화됨 (암호화 키 설정됨)",
                  en: "OAuth storage is active (encryption key configured)",
                  ja: "OAuth ストレージ有効（暗号化キー設定済み）",
                  zh: "OAuth 存储已启用（已配置加密密钥）",
                })
              : t({
                  ko: "OAUTH_ENCRYPTION_SECRET 환경변수가 설정되지 않았습니다",
                  en: "OAUTH_ENCRYPTION_SECRET environment variable is not set",
                  ja: "OAUTH_ENCRYPTION_SECRET 環境変数が設定されていません",
                  zh: "未设置 OAUTH_ENCRYPTION_SECRET 环境变量",
                })}
          </span>
        </div>
      )}

      {/* OAuth 자동 전환 토글 */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-2"
        style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderRadius: 6 }}
      >
        <span
          className="text-xs font-mono"
          style={{ color: "var(--th-text-secondary)" }}
          title={t({
            ko: "실패/한도 시 다음 OAuth 계정으로 자동 전환",
            en: "Auto-switch to next OAuth account on failures/limits",
            ja: "失敗/上限時に次の OAuth アカウントへ自動切替",
            zh: "失败/额度限制时自动切换到下一个 OAuth 账号",
          })}
        >
          {t({ ko: "OAuth 자동 전환", en: "OAUTH AUTO SWAP", ja: "OAuth 自動切替", zh: "OAuth 自动切换" })}
        </span>
        <button
          type="button"
          aria-pressed={form.oauthAutoSwap !== false}
          onClick={() => {
            const next = { ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) };
            setForm(next);
            persistSettings(next);
          }}
          className="flex-shrink-0 font-mono text-[11px] transition-colors"
          style={{
            borderRadius: 6,
            border: `1px solid ${form.oauthAutoSwap !== false ? "var(--th-accent)" : "var(--th-border)"}`,
            background: form.oauthAutoSwap !== false ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)",
            color: form.oauthAutoSwap !== false ? "var(--th-accent)" : "var(--th-text-muted)",
            padding: "2px 8px",
            minWidth: "3rem",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          {form.oauthAutoSwap !== false ? "ON" : "OFF"}
        </button>
      </div>

      {oauthLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
          <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </div>
      ) : oauthStatus ? (
        <>
          <OAuthConnectedProvidersSection
            t={t}
            localeTag={localeTag}
            form={form}
            setForm={setForm}
            persistSettings={persistSettings}
            oauthStatus={oauthStatus}
            models={models}
            modelsLoading={modelsLoading}
            refreshing={refreshing}
            disconnecting={disconnecting}
            savingAccountId={savingAccountId}
            accountDrafts={accountDrafts}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onRefreshToken={onRefreshToken}
            onUpdateAccountDraft={onUpdateAccountDraft}
            onActivateAccount={onActivateAccount}
            onSaveAccount={onSaveAccount}
            onToggleAccount={onToggleAccount}
            onDeleteAccount={onDeleteAccount}
          />

          <OAuthConnectCards
            t={t}
            oauthStatus={oauthStatus}
            deviceCode={deviceCode}
            deviceStatus={deviceStatus}
            deviceError={deviceError}
            onConnect={onConnect}
            onStartDeviceCodeFlow={onStartDeviceCodeFlow}
          />

          <GitHubOAuthAppConfig t={t} />
        </>
      ) : null}
    </section>
  );
}
