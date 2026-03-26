import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, CliModelInfo, CliStatusMap, CompanySettings } from "../types";
import * as api from "../api";
import type { DeviceCodeStart, OAuthConnectProvider, OAuthStatus } from "../api";
import type { OAuthCallbackResult } from "../App";
import { LANGUAGE_STORAGE_KEY, LANGUAGE_USER_SET_STORAGE_KEY, normalizeLanguage, useI18n } from "../i18n";
import ApiSettingsTab from "./settings/ApiSettingsTab";
import CliSettingsTab from "./settings/CliSettingsTab";
import GeneralSettingsTab from "./settings/GeneralSettingsTab";
import OAuthSettingsTab from "./settings/OAuthSettingsTab";
import DataSettingsTab from "./settings/DataSettingsTab";
import SettingsTabNav from "./settings/SettingsTabNav";
import { useConfirm } from "./ui/ConfirmDialog";
import type { AccountDraftMap, AccountDraftPatch, LocalSettings, SettingsTab } from "./settings/types";
import { useApiProvidersState } from "./settings/useApiProvidersState";
import { startCliInstall, pollCliInstall } from "../api/cli-install";
import type { CliInstallJob } from "../api/cli-install";

interface SettingsPanelProps {
  settings: CompanySettings;
  cliStatus: CliStatusMap | null;
  onSave: (settings: CompanySettings) => void;
  onRefreshCli: () => void;
  oauthResult?: OAuthCallbackResult | null;
  onOauthResultClear?: () => void;
  /** 현재 워크플로 팩 직원 (메신저 채팅 대화 직원 선택용) */
  managerAgents?: Agent[];
  /** 열릴 때 포커스할 초기 탭 */
  initialTab?: SettingsTab | null;
}

export default function SettingsPanel({
  settings,
  cliStatus,
  onSave,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
  managerAgents,
  initialTab,
}: SettingsPanelProps) {
  const [form, setForm] = useState<LocalSettings>(settings as LocalSettings);
  const { t, locale: localeTag } = useI18n(form.language);
  const { confirm } = useConfirm();
  const [saved, setSaved] = useState(false);
  const isMounted = useRef(false);
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? (oauthResult ? "oauth" : "general"));

  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [accountDrafts, setAccountDrafts] = useState<AccountDraftMap>({});

  const [models, setModels] = useState<Record<string, string[]> | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [cliModels, setCliModels] = useState<Record<string, CliModelInfo[]> | null>(null);
  const [cliModelsLoading, setCliModelsLoading] = useState(false);

  const [installJobs, setInstallJobs] = useState<Record<string, CliInstallJob | null>>({});
  const installPollers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const [deviceCode, setDeviceCode] = useState<DeviceCodeStart | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSettings = useCallback(
    (next: LocalSettings) => {
      onSave(next as CompanySettings);
    },
    [onSave],
  );

  const apiState = useApiProvidersState({ tab, t });

  const loadOAuthStatus = useCallback(async () => {
    setOauthLoading(true);
    try {
      const next = await api.getOAuthStatus();
      setOauthStatus(next);
      setAccountDrafts((prev) => {
        const merged = { ...prev };
        for (const info of Object.values(next.providers)) {
          for (const account of info.accounts ?? []) {
            if (!merged[account.id]) {
              merged[account.id] = {
                label: account.label ?? "",
                modelOverride: account.modelOverride ?? "",
                priority: String(account.priority ?? 100),
              };
            }
          }
        }
        return merged;
      });
    } finally {
      setOauthLoading(false);
    }
  }, []);

  const refreshOAuthTab = useCallback(() => {
    setOauthStatus(null);
    setOauthLoading(true);
    void loadOAuthStatus().catch(console.error);
    setModelsLoading(true);
    api
      .getOAuthModels(true)
      .then(setModels)
      .catch(console.error)
      .finally(() => setModelsLoading(false));
  }, [loadOAuthStatus]);

  const refreshCliTab = useCallback(() => {
    onRefreshCli();
    setCliModelsLoading(true);
    api
      .getCliModels(true)
      .then(setCliModels)
      .catch(console.error)
      .finally(() => setCliModelsLoading(false));
  }, [onRefreshCli]);

  const handleInstall = useCallback((provider: string) => {
    setInstallJobs((prev) => ({ ...prev, [provider]: { status: "running", logs: [], exitCode: null } }));
    startCliInstall(provider)
      .then((jobId) => {
        const timer = setInterval(async () => {
          try {
            const job = await pollCliInstall(jobId);
            setInstallJobs((prev) => ({ ...prev, [provider]: job }));
            if (job.status !== "running") {
              clearInterval(installPollers.current[provider]);
              delete installPollers.current[provider];
              if (job.status === "success") {
                // npm이 파일 쓰기를 완료할 때까지 여유를 주고 감지 재시도
                setTimeout(() => refreshCliTab(), 2500);
              }
            }
          } catch {
            clearInterval(installPollers.current[provider]);
            delete installPollers.current[provider];
          }
        }, 500);
        installPollers.current[provider] = timer;
      })
      .catch(() => {
        setInstallJobs((prev) => ({ ...prev, [provider]: { status: "failed", logs: ["Failed to start install"], exitCode: 1 } }));
      });
  }, [refreshCliTab]);

  useEffect(() => {
    if (!isMounted.current) {
      // 마운트 최초 1회: form만 초기화, localStorage 언어는 건드리지 않음
      isMounted.current = true;
      setForm(settings as LocalSettings);
      return;
    }
    // settings가 실제로 변경됐을 때(저장 후 서버 반영 등)만 localStorage 동기화
    setForm(settings as LocalSettings);
    const syncedLocale = normalizeLanguage((settings as LocalSettings).language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, syncedLocale);
    window.dispatchEvent(new Event("agentdesk-language-change"));
  }, [settings]);

  useEffect(() => {
    if (oauthResult) {
      setTab("oauth");
      setOauthStatus(null);
      if (!oauthResult.error) {
        setModels(null);
      }
    }
  }, [oauthResult]);

  useEffect(() => {
    if (tab === "oauth" && !oauthStatus) {
      void loadOAuthStatus().catch(console.error);
    }
  }, [tab, oauthStatus, loadOAuthStatus]);

  useEffect(() => {
    if (tab !== "cli" || cliModels) return;
    setCliModelsLoading(true);
    api
      .getCliModels()
      .then(setCliModels)
      .catch(console.error)
      .finally(() => setCliModelsLoading(false));
  }, [tab, cliModels]);

  useEffect(() => {
    if (tab !== "oauth" || !oauthStatus || models) return;
    const hasConnected = Object.values(oauthStatus.providers).some((provider) => provider.connected);
    if (!hasConnected) return;
    setModelsLoading(true);
    api
      .getOAuthModels()
      .then(setModels)
      .catch(console.error)
      .finally(() => setModelsLoading(false));
  }, [tab, oauthStatus, models]);

  useEffect(() => {
    if (oauthResult) {
      const timer = setTimeout(() => onOauthResultClear?.(), 8000);
      return () => clearTimeout(timer);
    }
  }, [oauthResult, onOauthResultClear]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  function handleSave() {
    const nextLocale = normalizeLanguage(form.language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    window.localStorage.setItem(LANGUAGE_USER_SET_STORAGE_KEY, "1");
    window.dispatchEvent(new Event("agentdesk-language-change"));
    persistSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleConnect(provider: OAuthConnectProvider) {
    const redirectTo = window.location.origin + window.location.pathname;
    window.location.assign(api.getOAuthStartUrl(provider, redirectTo));
  }

  const startDeviceCodeFlow = useCallback(async () => {
    setDeviceError(null);
    setDeviceStatus(null);
    try {
      const dc = await api.startGitHubDeviceFlow();
      setDeviceCode(dc);
      setDeviceStatus("polling");
      window.open(dc.verificationUri, "_blank");

      let intervalMs = Math.max((dc.interval || 5) * 1000, 5000);
      const expiresAt = Date.now() + (dc.expiresIn || 900) * 1000;
      let stopped = false;

      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

      const poll = () => {
        if (stopped) return;
        pollTimerRef.current = setTimeout(async () => {
          if (stopped) return;
          if (Date.now() > expiresAt) {
            stopped = true;
            pollTimerRef.current = null;
            setDeviceStatus("expired");
            setDeviceCode(null);
            setDeviceError(
              t({
                ko: "코드가 만료되었습니다. 다시 시도하세요.",
                en: "Code expired. Please try again.",
                ja: "コードの有効期限が切れました。再試行してください。",
                zh: "代码已过期，请重试。",
              }),
            );
            return;
          }

          try {
            const result = await api.pollGitHubDevice(dc.stateId);
            if (result.status === "complete") {
              stopped = true;
              pollTimerRef.current = null;
              setDeviceStatus("complete");
              setDeviceCode(null);
              await loadOAuthStatus();
              return;
            } else if (result.status === "expired" || result.status === "denied") {
              stopped = true;
              pollTimerRef.current = null;
              setDeviceStatus(result.status);
              setDeviceError(
                result.status === "expired"
                  ? t({ ko: "코드가 만료되었습니다", en: "Code expired", ja: "コードの期限切れ", zh: "代码已过期" })
                  : t({
                      ko: "인증이 거부되었습니다",
                      en: "Authentication denied",
                      ja: "認証が拒否されました",
                      zh: "认证被拒绝",
                    }),
              );
              return;
            } else if (result.status === "slow_down") {
              intervalMs += 5000;
            } else if (result.status === "error") {
              stopped = true;
              pollTimerRef.current = null;
              setDeviceStatus("error");
              setDeviceError(
                result.error || t({ ko: "알 수 없는 오류", en: "Unknown error", ja: "不明なエラー", zh: "未知错误" }),
              );
              return;
            }
          } catch {
            // Network error — keep polling
          }

          poll();
        }, intervalMs);
      };

      poll();
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const msg =
        code === "github_client_id_not_configured"
          ? t({
              ko: "GitHub OAuth Client ID가 설정되지 않았습니다. 아래 'GitHub OAuth App' 섹션에서 Client ID를 입력하세요.",
              en: "GitHub OAuth Client ID is not configured. Enter a Client ID in the 'GitHub OAuth App' section below.",
              ja: "GitHub OAuth Client ID が未設定です。下の「GitHub OAuth App」セクションで Client ID を入力してください。",
              zh: "GitHub OAuth Client ID 未配置。请在下方的「GitHub OAuth App」部分输入 Client ID。",
            })
          : code === "github_device_code_failed"
            ? t({
                ko: "GitHub 인증 코드 요청 실패. Client ID가 올바른지, Device Flow가 활성화되었는지 확인하세요.",
                en: "Failed to request GitHub device code. Check that the Client ID is correct and Device Flow is enabled.",
                ja: "GitHub デバイスコードのリクエストに失敗しました。Client ID が正しく、Device Flow が有効か確認してください。",
                zh: "请求 GitHub 设备码失败。请确认 Client ID 正确且已启用 Device Flow。",
              })
            : code;
      setDeviceError(msg);
      setDeviceStatus("error");
    }
  }, [loadOAuthStatus, t]);

  const handleDisconnect = useCallback(
    async (provider: OAuthConnectProvider) => {
      setDisconnecting(provider);
      try {
        await api.disconnectOAuth(provider);
        await loadOAuthStatus();
        if (provider === "github-copilot") {
          setDeviceCode(null);
          setDeviceStatus(null);
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        }
      } catch (error) {
        console.error("Disconnect failed:", error);
      } finally {
        setDisconnecting(null);
      }
    },
    [loadOAuthStatus],
  );

  const handleRefreshOAuthToken = useCallback(
    async (provider: OAuthConnectProvider) => {
      setRefreshing(provider);
      try {
        await api.refreshOAuthToken(provider);
        await loadOAuthStatus();
      } catch (error) {
        console.error("Manual refresh failed:", error);
      } finally {
        setRefreshing(null);
      }
    },
    [loadOAuthStatus],
  );

  const updateAccountDraft = useCallback((accountId: string, patch: AccountDraftPatch) => {
    setAccountDrafts((prev) => ({
      ...prev,
      [accountId]: {
        label: prev[accountId]?.label ?? "",
        modelOverride: prev[accountId]?.modelOverride ?? "",
        priority: prev[accountId]?.priority ?? "100",
        ...patch,
      },
    }));
  }, []);

  const handleActivateAccount = useCallback(
    async (provider: OAuthConnectProvider, accountId: string, currentlyActive: boolean) => {
      setSavingAccountId(accountId);
      try {
        await api.activateOAuthAccount(provider, accountId, currentlyActive ? "remove" : "add");
        await loadOAuthStatus();
      } catch (error) {
        console.error("Activate account failed:", error);
      } finally {
        setSavingAccountId(null);
      }
    },
    [loadOAuthStatus],
  );

  const handleSaveAccount = useCallback(
    async (accountId: string) => {
      const draft = accountDrafts[accountId];
      if (!draft) return;
      setSavingAccountId(accountId);
      try {
        await api.updateOAuthAccount(accountId, {
          label: draft.label.trim() || null,
          model_override: draft.modelOverride.trim() || null,
          priority: Number.isFinite(Number(draft.priority)) ? Math.max(1, Math.round(Number(draft.priority))) : 100,
        });
        await loadOAuthStatus();
      } catch (error) {
        console.error("Save account failed:", error);
      } finally {
        setSavingAccountId(null);
      }
    },
    [accountDrafts, loadOAuthStatus],
  );

  const handleToggleAccount = useCallback(
    async (accountId: string, nextStatus: "active" | "disabled") => {
      setSavingAccountId(accountId);
      try {
        await api.updateOAuthAccount(accountId, { status: nextStatus });
        await loadOAuthStatus();
      } catch (error) {
        console.error("Toggle account failed:", error);
      } finally {
        setSavingAccountId(null);
      }
    },
    [loadOAuthStatus],
  );

  const handleDeleteAccount = useCallback(
    async (provider: OAuthConnectProvider, accountId: string) => {
      const ok = await confirm({
        title: t({ ko: "OAuth 계정 삭제", en: "Delete OAuth Account", ja: "OAuth アカウントを削除", zh: "删除 OAuth 账号" }),
        message: t({
          ko: "이 OAuth 계정을 삭제하시겠습니까?",
          en: "Delete this OAuth account?",
          ja: "この OAuth アカウントを削除しますか？",
          zh: "要删除此 OAuth 账号吗？",
        }),
        confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
        cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
        variant: "danger",
      });
      if (!ok) return;

      setSavingAccountId(accountId);
      try {
        await api.deleteOAuthAccount(provider, accountId);
        await loadOAuthStatus();
      } catch (error) {
        console.error("Delete account failed:", error);
      } finally {
        setSavingAccountId(null);
      }
    },
    [loadOAuthStatus, confirm, t],
  );

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <div
      className="min-h-0 flex-1 flex flex-col"
      style={{
        ...mono,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        overflow: "hidden",
        background: "var(--th-bg-surface)",
        color: "#1F2937",
      }}
    >
      <SettingsTabNav tab={tab} setTab={setTab} t={t} />

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ padding: "32px 24px 40px", background: "var(--th-bg-primary)" }}
      >
        <div 
          className="max-w-4xl mx-auto"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "var(--th-glass-blur)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 24,
            padding: "40px 32px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div className="space-y-12">
      {tab === "general" && (
        <GeneralSettingsTab t={t} form={form} setForm={setForm} saved={saved} onSave={handleSave} />
      )}

      {tab === "cli" && (
        <CliSettingsTab
          t={t}
          cliStatus={cliStatus}
          cliModels={cliModels}
          cliModelsLoading={cliModelsLoading}
          form={form}
          setForm={setForm}
          persistSettings={persistSettings}
          onRefresh={refreshCliTab}
          onInstall={handleInstall}
          installJobs={installJobs}
        />
      )}

      {tab === "oauth" && (
        <OAuthSettingsTab
          t={t}
          localeTag={localeTag}
          form={form}
          setForm={setForm}
          persistSettings={persistSettings}
          oauthLoading={oauthLoading}
          oauthStatus={oauthStatus}
          oauthResult={oauthResult}
          onOauthResultClear={onOauthResultClear}
          onRefresh={refreshOAuthTab}
          models={models}
          modelsLoading={modelsLoading}
          refreshing={refreshing}
          disconnecting={disconnecting}
          savingAccountId={savingAccountId}
          accountDrafts={accountDrafts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefreshToken={handleRefreshOAuthToken}
          onUpdateAccountDraft={updateAccountDraft}
          onActivateAccount={handleActivateAccount}
          onSaveAccount={handleSaveAccount}
          onToggleAccount={handleToggleAccount}
          onDeleteAccount={handleDeleteAccount}
          deviceCode={deviceCode}
          deviceStatus={deviceStatus}
          deviceError={deviceError}
          onStartDeviceCodeFlow={startDeviceCodeFlow}
        />
      )}

      {tab === "api" && <ApiSettingsTab t={t} localeTag={localeTag} apiState={apiState} />}

      {tab === "data" && <DataSettingsTab t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
}
