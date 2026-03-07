import type { OAuthConnectProvider } from "../../api";
import { OAUTH_INFO } from "./constants";
import { AntigravityLogo, GitHubCopilotLogo } from "./Logos";
import type { OAuthCommonProps } from "./types";

export default function OAuthConnectedProvidersSection({
  t,
  localeTag,
  form,
  setForm,
  persistSettings,
  oauthStatus,
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
}: OAuthCommonProps) {
  const detectedProviders = Object.entries(oauthStatus.providers).filter(([, info]) =>
    Boolean(info.detected ?? info.connected),
  );
  if (detectedProviders.length === 0) return null;

  const logoMap: Record<string, ({ className }: { className?: string }) => React.ReactElement> = {
    "github-copilot": GitHubCopilotLogo,
    antigravity: AntigravityLogo,
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider mb-2 font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({ ko: "인증 상태", en: "Auth Status", ja: "認証状態", zh: "认证状态" })}
      </div>
      {detectedProviders.map(([provider, info]) => {
        const oauthInfo = OAUTH_INFO[provider];
        const LogoComp = logoMap[provider];
        const expiresAt = info.expires_at ? new Date(info.expires_at) : null;
        const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
        const isWebOAuth = info.source === "web-oauth";
        const isFileDetected = info.source === "file-detected";
        const isRunnable = Boolean(info.executionReady ?? info.connected);
        const accountList = info.accounts ?? [];

        return (
          <div key={provider} className="space-y-2 overflow-hidden p-4" style={{ borderRadius: "4px", background: "var(--th-bg-elevated)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                {LogoComp ? <LogoComp className="w-5 h-5" /> : <span className="text-lg">🔑</span>}
                <span className="text-sm font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>{oauthInfo?.label ?? provider}</span>
                {info.email && <span className="max-w-full break-all text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{info.email}</span>}
                {isFileDetected && (
                  <span className="text-[10px] px-1.5 py-0.5 font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)" }}>
                    {t({ ko: "CLI 감지", en: "CLI detected", ja: "CLI 検出", zh: "检测到 CLI" })}
                  </span>
                )}
                {isWebOAuth && (
                  <span className="text-[10px] px-1.5 py-0.5 font-mono" style={{ borderRadius: "2px", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}>
                    {t({ ko: "웹 OAuth", en: "Web OAuth", ja: "Web OAuth", zh: "网页 OAuth" })}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {!isRunnable ? (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono" style={{ borderRadius: "2px" }}>
                    {t({
                      ko: "감지됨 (실행 불가)",
                      en: "Detected (not runnable)",
                      ja: "検出済み（実行不可）",
                      zh: "已检测（不可执行）",
                    })}
                  </span>
                ) : !isExpired ? (
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 font-mono" style={{ borderRadius: "2px" }}>
                    {info.lastRefreshed
                      ? t({ ko: "자동 갱신됨", en: "Auto-refreshed", ja: "自動更新済", zh: "已自动刷新" })
                      : t({ ko: "연결됨", en: "Connected", ja: "接続中", zh: "已连接" })}
                  </span>
                ) : info.refreshFailed ? (
                  <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 font-mono" style={{ borderRadius: "2px" }}>
                    {t({ ko: "갱신 실패", en: "Refresh failed", ja: "更新失敗", zh: "刷新失败" })}
                  </span>
                ) : isExpired && !info.hasRefreshToken ? (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 font-mono" style={{ borderRadius: "2px" }}>
                    {t({
                      ko: "만료됨 — 재인증 필요",
                      en: "Expired — re-auth needed",
                      ja: "期限切れ — 再認証が必要",
                      zh: "已过期 — 需重新认证",
                    })}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 font-mono" style={{ borderRadius: "2px" }}>
                    {t({ ko: "만료됨", en: "Expired", ja: "期限切れ", zh: "已过期" })}
                  </span>
                )}

                {info.hasRefreshToken && isWebOAuth && (
                  <button
                    onClick={() => void onRefreshToken(provider as OAuthConnectProvider)}
                    disabled={refreshing === provider}
                    className="text-xs px-2.5 py-1 font-mono transition-colors disabled:opacity-50"
                    style={{ borderRadius: "2px", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.3)" }}
                  >
                    {refreshing === provider
                      ? t({ ko: "갱신 중...", en: "Refreshing...", ja: "更新中...", zh: "刷新中..." })
                      : t({ ko: "갱신", en: "Refresh", ja: "更新", zh: "刷新" })}
                  </button>
                )}

                {isExpired && !info.hasRefreshToken && isWebOAuth && (
                  <button
                    onClick={() => onConnect(provider as OAuthConnectProvider)}
                    className="text-xs px-2.5 py-1 font-mono uppercase transition-colors"
                    style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
                  >
                    {t({ ko: "재연결", en: "Reconnect", ja: "再接続", zh: "重新连接" })}
                  </button>
                )}

                {isWebOAuth && (
                  <button
                    onClick={() => void onDisconnect(provider as OAuthConnectProvider)}
                    disabled={disconnecting === provider}
                    className="text-xs px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-mono transition-colors disabled:opacity-50"
                    style={{ borderRadius: "2px" }}
                  >
                    {disconnecting === provider
                      ? t({ ko: "해제 중...", en: "Disconnecting...", ja: "切断中...", zh: "断开中..." })
                      : t({ ko: "연결 해제", en: "Disconnect", ja: "接続解除", zh: "断开连接" })}
                  </button>
                )}
              </div>
            </div>

            {info.requiresWebOAuth && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 font-mono" style={{ borderRadius: "2px" }}>
                {t({
                  ko: "CLI에서 감지된 자격 증명은 AgentDesk 실행에 직접 사용되지 않습니다. Web OAuth로 다시 연결하세요.",
                  en: "CLI-detected credentials are not used directly for AgentDesk execution. Reconnect with Web OAuth.",
                  ja: "CLI 検出の資格情報は AgentDesk 実行では直接利用されません。Web OAuth で再接続してください。",
                  zh: "CLI 检测到的凭据不会直接用于 AgentDesk 执行。请使用 Web OAuth 重新连接。",
                })}
              </div>
            )}

            {(info.scope || expiresAt || info.created_at > 0) && (
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {info.scope && (
                  <div className="col-span-2">
                    <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {t({ ko: "스코프", en: "Scope", ja: "スコープ", zh: "范围" })}:{" "}
                    </span>
                    <span className="break-all font-mono text-[10px] leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{info.scope}</span>
                  </div>
                )}
                {expiresAt && (
                  <div>
                    <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>{t({ ko: "만료", en: "Expires", ja: "期限", zh: "到期" })}: </span>
                    <span className={isExpired ? "text-red-400" : ""} style={isExpired ? {} : { color: "var(--th-text-secondary)" }}>
                      {expiresAt.toLocaleString(localeTag)}
                    </span>
                  </div>
                )}
                {info.created_at > 0 && (
                  <div>
                    <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>{t({ ko: "등록", en: "Created", ja: "登録", zh: "创建" })}: </span>
                    <span style={{ color: "var(--th-text-secondary)" }}>{new Date(info.created_at).toLocaleString(localeTag)}</span>
                  </div>
                )}
              </div>
            )}

            {(() => {
              const modelKey =
                provider === "github-copilot" ? "copilot" : provider === "antigravity" ? "antigravity" : null;
              if (!modelKey) return null;
              const modelList = models?.[modelKey];
              const currentModel = form.providerModelConfig?.[modelKey]?.model || "";

              return (
                <div className="flex min-w-0 flex-col items-stretch gap-1.5 pt-1 sm:flex-row sm:items-center sm:gap-2">
                  <span className="w-auto shrink-0 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {t({ ko: "모델:", en: "Model:", ja: "モデル:", zh: "模型:" })}
                  </span>
                  {modelsLoading ? (
                    <span className="text-xs animate-pulse font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
                    </span>
                  ) : modelList && modelList.length > 0 ? (
                    <select
                      value={currentModel}
                      onChange={(e) => {
                        const newConfig = {
                          ...form.providerModelConfig,
                          [modelKey]: { model: e.target.value },
                        };
                        const newForm = { ...form, providerModelConfig: newConfig };
                        setForm(newForm);
                        persistSettings(newForm);
                      }}
                      className="w-full min-w-0 px-2 py-1 text-xs focus:outline-none sm:flex-1"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                    >
                      {!currentModel && (
                        <option value="">
                          {t({ ko: "선택하세요...", en: "Select...", ja: "選択してください...", zh: "请选择..." })}
                        </option>
                      )}
                      {modelList.map((model, idx) => (
                        <option key={`${model}-${idx}`} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {t({ ko: "모델 목록 없음", en: "No models", ja: "モデル一覧なし", zh: "无模型列表" })}
                      </span>
                      {provider === "github-copilot" && (
                        <span className="text-[11px] text-amber-400/80">
                          {t({
                            ko: "GitHub Copilot 구독이 없으면 모델을 사용할 수 없습니다. 리포 가져오기만 사용하려면 무시해도 됩니다.",
                            en: "Models require a GitHub Copilot subscription. You can ignore this if you only need repo import.",
                            ja: "モデル利用には GitHub Copilot サブスクリプションが必要です。リポインポートのみなら無視できます。",
                            zh: "模型需要 GitHub Copilot 订阅。如果仅需导入仓库，可忽略此项。",
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {accountList.length > 0 && (
              <div className="space-y-2 p-2.5" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {t({ ko: "계정 풀", en: "Account Pool", ja: "アカウントプール", zh: "账号池" })}
                  </div>
                  <div className="text-[10px] text-right font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {t({
                      ko: "여러 계정을 동시에 활성 가능 · 우선순위 숫자가 낮을수록 먼저 시도",
                      en: "Multiple active accounts supported · lower priority runs first",
                      ja: "複数アクティブ対応 · 優先度の数字が小さいほど先に実行",
                      zh: "支持多账号同时激活 · 优先级数字越小越先执行",
                    })}
                  </div>
                </div>

                {accountList.map((account) => {
                  const modelKey =
                    provider === "github-copilot" ? "copilot" : provider === "antigravity" ? "antigravity" : null;
                  const modelList = modelKey ? (models?.[modelKey] ?? []) : [];
                  const draft = accountDrafts[account.id] ?? {
                    label: account.label ?? "",
                    modelOverride: account.modelOverride ?? "",
                    priority: String(account.priority ?? 100),
                  };
                  const hasCustomOverride = Boolean(draft.modelOverride) && !modelList.includes(draft.modelOverride);

                  return (
                    <div
                      key={account.id}
                      className="p-2.5 space-y-2"
                      style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            account.active ? "bg-green-500/20 text-green-300" : "bg-[var(--th-bg-elevated)] text-[var(--th-text-muted)]"
                          }`}
                          style={{ borderRadius: "2px" }}
                        >
                          {account.active
                            ? t({ ko: "활성", en: "Active", ja: "有効", zh: "活动" })
                            : t({ ko: "대기", en: "Standby", ja: "待機", zh: "待命" })}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            account.executionReady ? "bg-[rgba(59,130,246,0.2)] text-[#93c5fd]" : "bg-amber-500/20 text-amber-300"
                          }`}
                          style={{ borderRadius: "2px" }}
                        >
                          {account.executionReady
                            ? t({ ko: "실행 가능", en: "Runnable", ja: "実行可能", zh: "可执行" })
                            : t({ ko: "실행 불가", en: "Not runnable", ja: "実行不可", zh: "不可执行" })}
                        </span>
                        {account.email && <span className="text-[11px] break-all font-mono" style={{ color: "var(--th-text-secondary)" }}>{account.email}</span>}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <label className="space-y-1">
                          <span className="block text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "라벨", en: "Label", ja: "ラベル", zh: "标签" })}
                          </span>
                          <input
                            value={draft.label}
                            onChange={(e) => onUpdateAccountDraft(account.id, { label: e.target.value })}
                            placeholder={t({
                              ko: "계정 별칭",
                              en: "Account alias",
                              ja: "アカウント別名",
                              zh: "账号别名",
                            })}
                            className="w-full px-2 py-1 text-xs focus:outline-none"
                            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="block text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "모델 오버라이드", en: "Model Override", ja: "モデル上書き", zh: "模型覆盖" })}
                          </span>
                          <select
                            value={draft.modelOverride}
                            onChange={(e) => onUpdateAccountDraft(account.id, { modelOverride: e.target.value })}
                            className="w-full px-2 py-1 text-xs focus:outline-none"
                            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          >
                            <option value="">
                              {t({
                                ko: "프로바이더 기본값 사용",
                                en: "Use provider default",
                                ja: "プロバイダ既定値を使用",
                                zh: "使用提供方默认值",
                              })}
                            </option>
                            {hasCustomOverride && <option value={draft.modelOverride}>{draft.modelOverride}</option>}
                            {modelList.map((model, idx) => (
                              <option key={`${model}-${idx}`} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="block text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "우선순위", en: "Priority", ja: "優先度", zh: "优先级" })}
                          </span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={draft.priority}
                            onChange={(e) => onUpdateAccountDraft(account.id, { priority: e.target.value })}
                            placeholder="100"
                            className="w-full px-2 py-1 text-xs focus:outline-none"
                            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() =>
                            void onActivateAccount(provider as OAuthConnectProvider, account.id, account.active)
                          }
                          disabled={savingAccountId === account.id || account.status !== "active"}
                          className={`text-[11px] px-2 py-1 font-mono disabled:opacity-50 ${
                            account.active
                              ? "bg-orange-600/20 hover:bg-orange-600/35 text-orange-200"
                              : "bg-[rgba(251,191,36,0.1)] hover:bg-[rgba(251,191,36,0.2)] text-[var(--th-accent)]"
                          }`}
                          style={{ borderRadius: "2px" }}
                        >
                          {account.active
                            ? t({ ko: "풀 해제", en: "Pool Off", ja: "プール解除", zh: "移出池" })
                            : t({ ko: "풀 추가", en: "Pool On", ja: "プール追加", zh: "加入池" })}
                        </button>

                        <button
                          onClick={() => void onSaveAccount(account.id)}
                          disabled={savingAccountId === account.id}
                          className="text-[11px] px-2 py-1 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 font-mono disabled:opacity-50"
                          style={{ borderRadius: "2px" }}
                        >
                          {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                        </button>

                        <button
                          onClick={() =>
                            void onToggleAccount(account.id, account.status === "active" ? "disabled" : "active")
                          }
                          disabled={savingAccountId === account.id}
                          className="text-[11px] px-2 py-1 bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 font-mono disabled:opacity-50"
                          style={{ borderRadius: "2px" }}
                        >
                          {account.status === "active"
                            ? t({ ko: "비활성", en: "Disable", ja: "無効化", zh: "禁用" })
                            : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
                        </button>

                        <button
                          onClick={() => void onDeleteAccount(provider as OAuthConnectProvider, account.id)}
                          disabled={savingAccountId === account.id}
                          className="text-[11px] px-2 py-1 bg-red-600/20 hover:bg-red-600/35 text-red-300 font-mono disabled:opacity-50"
                          style={{ borderRadius: "2px" }}
                        >
                          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                        </button>
                      </div>

                      {account.lastError && (
                        <div className="text-[10px] text-red-300 break-words">{account.lastError}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
