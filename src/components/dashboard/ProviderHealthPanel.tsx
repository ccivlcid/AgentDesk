import { useCallback, useEffect, useState } from "react";
import { getCliStatus, getApiProviders, testApiProvider } from "../../api";
import type { ApiProvider } from "../../api";
import type { CliStatusMap } from "../../types";
import { useI18n } from "../../i18n";

const CLI_PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini",
  opencode: "OpenCode",
  copilot: "GitHub Copilot",
  antigravity: "Antigravity",
  cursor: "Cursor",
  ollama: "Ollama",
};

const CLI_SHOWN: string[] = ["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "ollama"];

type TestResult = { ok: boolean; msg: string };

export default function ProviderHealthPanel() {
  const { t } = useI18n();
  const [cliStatus, setCliStatus] = useState<CliStatusMap | null>(null);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [cli, providers] = await Promise.all([
        getCliStatus(refresh),
        getApiProviders(),
      ]);
      setCliStatus(cli);
      setApiProviders(providers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleTestOne = useCallback(async (id: string) => {
    setTesting(id);
    setTestResults((prev) => ({ ...prev, [id]: { ok: false, msg: "…" } }));
    try {
      const result = await testApiProvider(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: result.ok
          ? { ok: true, msg: `${result.model_count ?? 0} models` }
          : { ok: false, msg: result.error?.slice(0, 80) || `HTTP ${result.status}` },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, msg: err instanceof Error ? err.message.slice(0, 80) : "error" },
      }));
    } finally {
      setTesting(null);
    }
  }, []);

  const handleTestAll = useCallback(async () => {
    const enabled = apiProviders.filter((p) => p.enabled);
    if (enabled.length === 0) return;
    setTestingAll(true);
    for (const p of enabled) {
      setTesting(p.id);
      try {
        const result = await testApiProvider(p.id);
        setTestResults((prev) => ({
          ...prev,
          [p.id]: result.ok
            ? { ok: true, msg: `${result.model_count ?? 0} models` }
            : { ok: false, msg: result.error?.slice(0, 80) || `HTTP ${result.status}` },
        }));
      } catch (err) {
        setTestResults((prev) => ({
          ...prev,
          [p.id]: { ok: false, msg: err instanceof Error ? err.message.slice(0, 80) : "error" },
        }));
      }
    }
    setTesting(null);
    setTestingAll(false);
  }, [apiProviders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6" style={{ color: "var(--th-text-muted)" }}>
        <span className="text-xs font-mono animate-pulse">{tr("프로바이더 상태 로딩 중...", "Loading provider status...")}</span>
      </div>
    );
  }

  const cliRows = CLI_SHOWN.map((key) => ({
    key,
    label: CLI_PROVIDER_LABELS[key] ?? key,
    status: cliStatus?.[key as keyof CliStatusMap],
  })).filter((row) => row.status);

  const enabledApiCount = apiProviders.filter((p) => p.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="px-2.5 py-1 text-[10px] font-mono border transition hover:opacity-80 disabled:opacity-50"
          style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
        >
          {refreshing ? tr("새로고침 중...", "Refreshing...") : `↺ ${tr("CLI 새로고침", "Refresh CLI")}`}
        </button>
        {enabledApiCount > 0 && (
          <button
            onClick={() => void handleTestAll()}
            disabled={testingAll || !!testing}
            className="px-2.5 py-1 text-[10px] font-mono border transition hover:opacity-80 disabled:opacity-50"
            style={{ borderRadius: "2px", borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.08)", color: "var(--th-accent)" }}
          >
            {testingAll ? tr("테스트 중...", "Testing...") : tr("API 전체 테스트", "Test All APIs")}
          </button>
        )}
      </div>

      {/* CLI Providers */}
      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          CLI Providers
        </div>
        <div className="space-y-px">
          {cliRows.length === 0 ? (
            <div className="text-xs font-mono py-2" style={{ color: "var(--th-text-muted)" }}>
              {tr("CLI 프로바이더 없음", "No CLI providers")}
            </div>
          ) : (
            cliRows.map(({ key, label, status }) => {
              if (!status) return null;
              const isOk = status.installed && status.authenticated;
              const isPartial = status.installed && !status.authenticated;
              const dotColor = isOk ? "rgb(52,211,153)" : isPartial ? "var(--th-accent)" : "var(--th-text-muted)";
              const statusLabel = isOk
                ? tr("인증됨", "Authenticated")
                : isPartial
                  ? tr("미인증", "Not authenticated")
                  : tr("미설치", "Not installed");
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-3 py-1.5"
                  style={{ borderLeft: `2px solid ${dotColor}`, background: "var(--th-bg-surface)" }}
                >
                  <span className="flex-1 text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>
                    {label}
                  </span>
                  {status.version && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      v{status.version}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5"
                    style={{
                      borderRadius: "2px",
                      background: isOk ? "rgba(52,211,153,0.1)" : isPartial ? "rgba(251,191,36,0.1)" : "var(--th-bg-elevated)",
                      color: dotColor,
                      border: `1px solid ${isOk ? "rgba(52,211,153,0.3)" : isPartial ? "rgba(251,191,36,0.3)" : "var(--th-border)"}`,
                    }}
                  >
                    {statusLabel}
                  </span>
                  {!isOk && status.authHint && (
                    <span className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: "var(--th-text-muted)" }} title={status.authHint}>
                      {status.authHint}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* API Providers */}
      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          API Providers ({apiProviders.length})
        </div>
        {apiProviders.length === 0 ? (
          <div className="text-xs font-mono py-2" style={{ color: "var(--th-text-muted)" }}>
            {tr("API 프로바이더 없음 — 설정에서 추가하세요", "No API providers — add one in Settings")}
          </div>
        ) : (
          <div className="space-y-px">
            {apiProviders.map((provider) => {
              const result = testResults[provider.id];
              const isTesting = testing === provider.id;
              const dotColor = !provider.enabled
                ? "var(--th-text-muted)"
                : result
                  ? result.ok ? "rgb(52,211,153)" : "rgb(253,164,175)"
                  : "var(--th-border)";

              return (
                <div
                  key={provider.id}
                  className="flex items-center gap-3 px-3 py-1.5"
                  style={{
                    borderLeft: `2px solid ${dotColor}`,
                    background: "var(--th-bg-surface)",
                    opacity: provider.enabled ? 1 : 0.5,
                  }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-secondary)" }}>
                      {provider.name}
                    </span>
                    <span className="ml-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {provider.type}
                    </span>
                  </span>
                  {provider.models_cache.length > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {provider.models_cache.length} models
                    </span>
                  )}
                  {result && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 truncate max-w-[140px]"
                      style={{
                        borderRadius: "2px",
                        background: result.ok ? "rgba(52,211,153,0.1)" : "rgba(253,164,175,0.1)",
                        color: result.ok ? "rgb(52,211,153)" : "rgb(253,164,175)",
                        border: `1px solid ${result.ok ? "rgba(52,211,153,0.3)" : "rgba(253,164,175,0.3)"}`,
                      }}
                      title={result.msg}
                    >
                      {result.ok ? `✓ ${result.msg}` : `✗ ${result.msg}`}
                    </span>
                  )}
                  {provider.enabled && (
                    <button
                      onClick={() => void handleTestOne(provider.id)}
                      disabled={isTesting || testingAll}
                      className="text-[10px] font-mono border px-2 py-0.5 transition hover:opacity-80 disabled:opacity-50"
                      style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-elevated)" }}
                    >
                      {isTesting ? "…" : tr("테스트", "Test")}
                    </button>
                  )}
                  {!provider.enabled && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      DISABLED
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
