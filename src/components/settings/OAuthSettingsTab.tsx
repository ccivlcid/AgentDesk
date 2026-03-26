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
  const mono = "var(--th-font-mono)";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div style={{ padding: 6, background: "var(--th-accent-glow)", borderRadius: 10, color: "var(--th-accent)" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151" }}>
            {t({ ko: "OAuth 인증 관리", en: "OAuth Authentication", ja: "OAuth認証管理", zh: "OAuth认证管理" })}
          </h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 transition-all hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {oauthResult && (
        <div
          className="flex items-center justify-between px-4 py-3 text-xs font-bold font-mono"
          style={oauthResult.error
            ? { borderRadius: 16, background: "var(--th-danger-bg)", border: "1px solid #FECACA", color: "var(--th-danger-text)" }
            : { borderRadius: 16, background: "#ECFDF5", border: "1px solid #A7F3D0", color: "var(--th-success)" }}
        >
          <div className="flex items-center gap-2">
            <span>{oauthResult.error ? "✗" : "✓"}</span>
            <span>
              {oauthResult.error
                ? `${t({ ko: "연결 실패", en: "Connection failed", ja: "接続失敗", zh: "连接失败" })}: ${oauthResult.error}`
                : `${OAUTH_INFO[oauthResult.provider || ""]?.label || oauthResult.provider} ${t({ ko: "연결 완료!", en: "connected!", ja: "接続完了!", zh: "连接成功!" })}`}
            </span>
          </div>
          <button onClick={() => onOauthResultClear?.()} className="p-1 hover:bg-black/5 rounded-full transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {oauthStatus && (
        <div
          className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold font-mono"
          style={oauthStatus.storageReady
            ? { borderRadius: 16, background: "#F0FDF4", border: "1px solid #DCFCE7", color: "#166534" }
            : { borderRadius: 16, background: "#FFFBEB", border: "1px solid #FEF3C7", color: "#92400E" }}
        >
          <span className="text-base">{oauthStatus.storageReady ? "🛡️" : "⚠️"}</span>
          <span className="leading-relaxed">
            {oauthStatus.storageReady
              ? t({
                  ko: "OAuth 저장소 암호화 활성화됨 (보안 연결 중)",
                  en: "OAuth storage is encrypted and active",
                  ja: "OAuth ストレージ有効（暗号化済み）",
                  zh: "OAuth 存储加密已启用",
                })
              : t({
                  ko: "OAUTH_ENCRYPTION_SECRET 환경변수 설정이 필요합니다",
                  en: "OAUTH_ENCRYPTION_SECRET environment variable required",
                  ja: "OAUTH_ENCRYPTION_SECRET 環境変数が必要です",
                  zh: "需要设置 OAUTH_ENCRYPTION_SECRET 环境变量",
                })}
          </span>
        </div>
      )}

      {/* OAuth 자동 전환 토글 */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 transition-all hover:bg-gray-50"
        style={{ border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", borderRadius: 20 }}
      >
        <div className="flex items-center gap-3">
          <div style={{ padding: 8, background: "var(--th-bg-primary)", borderRadius: 12, color: "var(--th-text-secondary)" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l5 5M4 4l5 5" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-900">
              {t({ ko: "OAuth 자동 전환", en: "OAUTH AUTO SWAP", ja: "OAuth 自動切替", zh: "OAuth 自动切换" })}
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {t({
                ko: "실패/한도 시 다음 계정으로 자동 전환합니다.",
                en: "Switch to next account on failure or limit.",
                ja: "失敗/上限時に次のアカウントへ自動切替.",
                zh: "失败/额度限制时自动切换账号.",
              })}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = { ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) };
            setForm(next);
            persistSettings(next);
          }}
          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          style={{ background: form.oauthAutoSwap !== false ? "var(--th-accent)" : "var(--th-border-strong)" }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            style={{ transform: form.oauthAutoSwap !== false ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {oauthLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-dashed border-gray-200">
          <svg className="animate-spin text-blue-500" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <circle cx="12" cy="12" r="10" strokeOpacity={0.1} />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t({ ko: "연결 정보 로딩 중...", en: "Loading connections...", ja: "読み込み中...", zh: "加载中..." })}</span>
        </div>
      ) : oauthStatus ? (
        <div className="space-y-8">
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
        </div>
      ) : null}
    </section>
  );
}
