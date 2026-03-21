import { useRef, useEffect } from "react";
import { CLI_INFO } from "./constants";
import type { CliSettingsTabProps } from "./types";

function InstallLogPanel({ logs }: { logs: string[] }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  return (
    <pre
      ref={ref}
      style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: "9px",
        color: "var(--th-text-muted)",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        padding: "4px 6px",
        maxHeight: 100,
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        margin: 0,
      }}
    >
      {logs.join("\n")}
    </pre>
  );
}

export default function CliSettingsTab({
  t,
  cliStatus,
  cliModels,
  cliModelsLoading,
  form,
  setForm,
  persistSettings,
  onRefresh,
  onInstall,
  installJobs,
}: CliSettingsTabProps) {
  return (
    <section
      className="p-5 sm:p-6 space-y-5"
      style={{ borderRadius: 0, background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px" }}>
          // cli status
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

      {cliStatus ? (
        <div className="space-y-2">
          {Object.entries(cliStatus)
            .filter(([provider]) => !["copilot", "antigravity"].includes(provider))
            .map(([provider, status]) => {
              const info = CLI_INFO[provider];
              const isReady = status.installed && status.authenticated;
              const showModelSection = isReady || (provider === "cursor" && status.installed);
              const modelList = cliModels?.[provider] ?? [];
              const currentModel = form.providerModelConfig?.[provider]?.model || "";
              const currentReasoningLevel = form.providerModelConfig?.[provider]?.reasoningLevel || "";

              const selectedModel = modelList.find((m) => m.slug === currentModel);
              const reasoningLevels = selectedModel?.reasoningLevels;
              const defaultReasoning = selectedModel?.defaultReasoningLevel || "";

              return (
                <div
                  key={provider}
                  className="p-3 space-y-2"
                  style={{ borderRadius: 0, background: "var(--th-bg-primary)", borderColor: "var(--th-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{info?.icon ?? "?"}</span>
                    <div className="flex-1">
                      <div className="text-sm font-mono" style={{ color: "var(--th-text-primary)" }}>{info?.label ?? provider}</div>
                      <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                        {status.version ??
                          (status.installed
                            ? t({
                                ko: "버전 확인 불가",
                                en: "Version unknown",
                                ja: "バージョン不明",
                                zh: "版本未知",
                              })
                            : t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" }))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="text-xs font-mono px-2 py-0.5"
                        style={{
                          borderRadius: 0,
                          background: status.installed ? "rgba(34,197,94,0.12)" : "var(--th-bg-surface-hover)",
                          color: status.installed ? "#4ade80" : "var(--th-text-muted)",
                        }}
                      >
                        {status.installed
                          ? t({ ko: "설치됨", en: "Installed", ja: "インストール済み", zh: "已安装" })
                          : t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" })}
                      </span>
                      {status.installed && (
                        <span
                          className="text-xs font-mono px-2 py-0.5"
                          style={{
                            borderRadius: 0,
                            background: status.authenticated ? "rgba(245,158,11,0.12)" : "rgba(234,179,8,0.12)",
                            color: status.authenticated ? "var(--th-accent)" : "#facc15",
                          }}
                        >
                          {status.authenticated
                            ? t({ ko: "인증됨", en: "Authenticated", ja: "認証済み", zh: "已认证" })
                            : t({ ko: "미인증", en: "Not Authenticated", ja: "未認証", zh: "未认证" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {!status.installed && (() => {
                    const job = installJobs[provider];
                    const isRunning = job?.status === "running";
                    const isDone = job?.status === "success" || job?.status === "failed";
                    return (
                      <div className="pl-0 sm:pl-8 space-y-1">
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() => onInstall(provider)}
                          className="transition-colors hover:opacity-80 disabled:opacity-50"
                          style={{
                            fontFamily: "var(--th-font-mono)",
                            fontSize: "10px",
                            color: isRunning ? "var(--th-text-muted)" : "var(--th-accent)",
                            border: "1px solid var(--th-accent)",
                            padding: "2px 8px",
                            borderRadius: 0,
                            background: "transparent",
                            cursor: isRunning ? "default" : "pointer",
                          }}
                        >
                          {isRunning
                            ? t({ ko: "설치 중...", en: "Installing...", ja: "インストール中...", zh: "安装中..." })
                            : t({ ko: "npm 설치", en: "npm install", ja: "npmインストール", zh: "npm安装" })}
                        </button>
                        {isDone && job?.status === "failed" && (
                          <div className="text-xs font-mono" style={{ color: "#f87171" }}>
                            {t({ ko: "설치 실패", en: "Install failed", ja: "インストール失敗", zh: "安装失败" })}
                          </div>
                        )}
                        {isDone && job?.status === "success" && (
                          <div className="text-xs font-mono" style={{ color: "#4ade80" }}>
                            {t({ ko: "설치 완료", en: "Installed!", ja: "インストール完了!", zh: "安装完成!" })}
                          </div>
                        )}
                        {job && job.logs.length > 0 && (
                          <InstallLogPanel logs={job.logs} />
                        )}
                      </div>
                    );
                  })()}

                  {showModelSection && (
                    <div className="space-y-1.5 pl-0 sm:pl-8">
                      <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <span className="w-auto shrink-0 text-xs font-mono sm:w-20" style={{ color: "var(--th-text-muted)" }}>
                          {t({ ko: "모델:", en: "Model:", ja: "モデル:", zh: "模型:" })}
                        </span>
                        {cliModelsLoading ? (
                          <span className="text-xs font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
                          </span>
                        ) : modelList.length > 0 ? (
                          <select
                            value={currentModel}
                            onChange={(e) => {
                              const newSlug = e.target.value;
                              const newModel = modelList.find((m) => m.slug === newSlug);
                              const prev = form.providerModelConfig?.[provider] || {};
                              const newConfig = {
                                ...form.providerModelConfig,
                                [provider]: {
                                  ...prev,
                                  model: newSlug,
                                  reasoningLevel: newModel?.defaultReasoningLevel || undefined,
                                },
                              };
                              const newForm = { ...form, providerModelConfig: newConfig };
                              setForm(newForm);
                              persistSettings(newForm);
                            }}
                            className="w-full min-w-0 px-2 py-1 text-xs font-mono focus:outline-none sm:flex-1"
                            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          >
                            <option value="">{t({ ko: "기본값", en: "Default", ja: "デフォルト", zh: "默认" })}</option>
                            {modelList.map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.displayName || m.slug}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "모델 목록 없음", en: "No models", ja: "モデル一覧なし", zh: "无模型列表" })}
                          </span>
                        )}
                      </div>

                      {provider === "codex" && reasoningLevels && reasoningLevels.length > 0 && (
                        <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                          <span className="w-auto shrink-0 text-xs font-mono sm:w-20" style={{ color: "var(--th-text-muted)" }}>
                            {t({ ko: "추론 레벨:", en: "Reasoning:", ja: "推論レベル:", zh: "推理级别:" })}
                          </span>
                          <select
                            value={currentReasoningLevel || defaultReasoning}
                            onChange={(e) => {
                              const prev = form.providerModelConfig?.[provider] || { model: "" };
                              const newConfig = {
                                ...form.providerModelConfig,
                                [provider]: { ...prev, reasoningLevel: e.target.value },
                              };
                              const newForm = { ...form, providerModelConfig: newConfig };
                              setForm(newForm);
                              persistSettings(newForm);
                            }}
                            className="w-full min-w-0 px-2 py-1 text-xs font-mono focus:outline-none sm:flex-1"
                          style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          >
                            {reasoningLevels.map((rl) => (
                              <option key={rl.effort} value={rl.effort}>
                                {rl.effort} ({rl.description})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-4 text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </div>
      )}

      <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "각 에이전트의 CLI 도구는 에이전트 매니저에서 에이전트 클릭 후 변경할 수 있습니다. Copilot/Antigravity 모델은 OAuth 탭에서 설정합니다.",
          en: "Each agent's CLI tool can be changed in Agent Manager by clicking an agent. Configure Copilot/Antigravity models in OAuth tab.",
          ja: "各エージェントの CLI ツールはエージェントマネージャーでエージェントをクリックして変更できます。Copilot/Antigravity のモデルは OAuth タブで設定してください。",
          zh: "每个代理的 CLI 工具可在代理管理器中点击代理后修改。Copilot/Antigravity 模型请在 OAuth 页签配置。",
        })}
      </p>
    </section>
  );
}
