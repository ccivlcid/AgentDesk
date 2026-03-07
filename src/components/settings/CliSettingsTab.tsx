import { CLI_INFO } from "./constants";
import type { CliSettingsTabProps } from "./types";

export default function CliSettingsTab({
  t,
  cliStatus,
  cliModels,
  cliModelsLoading,
  form,
  setForm,
  persistSettings,
  onRefresh,
}: CliSettingsTabProps) {
  return (
    <section
      className="p-5 sm:p-6 space-y-5"
      style={{ borderRadius: "4px", background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "CLI 도구 상태", en: "CLI tool status", ja: "CLI ツール状態", zh: "CLI 工具状态" })}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--th-text-secondary)" }}
        >
          {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
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
              const hasSubModel = provider === "claude" || provider === "codex";
              const modelList = cliModels?.[provider] ?? [];
              const currentModel = form.providerModelConfig?.[provider]?.model || "";
              const currentSubModel = form.providerModelConfig?.[provider]?.subModel || "";
              const currentReasoningLevel = form.providerModelConfig?.[provider]?.reasoningLevel || "";

              const selectedModel = modelList.find((m) => m.slug === currentModel);
              const reasoningLevels = selectedModel?.reasoningLevels;
              const defaultReasoning = selectedModel?.defaultReasoningLevel || "";

              return (
                <div
                  key={provider}
                  className="p-3 space-y-2"
                  style={{ borderRadius: "2px", background: "var(--th-bg-primary)", borderColor: "var(--th-border)" }}
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
                          borderRadius: "2px",
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
                            borderRadius: "2px",
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

                  {showModelSection && (
                    <div className="space-y-1.5 pl-0 sm:pl-8">
                      <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <span className="w-auto shrink-0 text-xs font-mono sm:w-20" style={{ color: "var(--th-text-muted)" }}>
                          {hasSubModel
                            ? t({ ko: "메인 모델:", en: "Main model:", ja: "メインモデル:", zh: "主模型:" })
                            : t({ ko: "모델:", en: "Model:", ja: "モデル:", zh: "模型:" })}
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
                            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
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
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                          >
                            {reasoningLevels.map((rl) => (
                              <option key={rl.effort} value={rl.effort}>
                                {rl.effort} ({rl.description})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {hasSubModel && (
                        <>
                          <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                            <span className="w-auto shrink-0 text-xs font-mono sm:w-20" style={{ color: "var(--th-text-muted)" }}>
                              {t({
                                ko: "알바생 모델:",
                                en: "Sub-agent model:",
                                ja: "サブモデル:",
                                zh: "子代理模型:",
                              })}
                            </span>
                            {cliModelsLoading ? (
                              <span className="text-xs font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
                                {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
                              </span>
                            ) : modelList.length > 0 ? (
                              <select
                                value={currentSubModel}
                                onChange={(e) => {
                                  const newSlug = e.target.value;
                                  const newSubModel = modelList.find((m) => m.slug === newSlug);
                                  const prev = form.providerModelConfig?.[provider] || { model: "" };
                                  const newConfig = {
                                    ...form.providerModelConfig,
                                    [provider]: {
                                      ...prev,
                                      subModel: newSlug,
                                      subModelReasoningLevel: newSubModel?.defaultReasoningLevel || undefined,
                                    },
                                  };
                                  const newForm = { ...form, providerModelConfig: newConfig };
                                  setForm(newForm);
                                  persistSettings(newForm);
                                }}
                                className="w-full min-w-0 px-2 py-1 text-xs font-mono focus:outline-none sm:flex-1"
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                              >
                                <option value="">
                                  {t({ ko: "기본값", en: "Default", ja: "デフォルト", zh: "默认" })}
                                </option>
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

                          {(() => {
                            const subSelected = modelList.find((m) => m.slug === currentSubModel);
                            const subLevels = subSelected?.reasoningLevels;
                            const subDefault = subSelected?.defaultReasoningLevel || "";
                            const currentSubRL = form.providerModelConfig?.[provider]?.subModelReasoningLevel || "";
                            if (provider !== "codex" || !subLevels || subLevels.length === 0) return null;
                            return (
                              <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                                <span className="w-auto shrink-0 text-xs font-mono sm:w-20" style={{ color: "var(--th-text-muted)" }}>
                                  {t({ ko: "알바 추론:", en: "Sub reasoning:", ja: "サブ推論:", zh: "子推理:" })}
                                </span>
                                <select
                                  value={currentSubRL || subDefault}
                                  onChange={(e) => {
                                    const prev = form.providerModelConfig?.[provider] || { model: "" };
                                    const newConfig = {
                                      ...form.providerModelConfig,
                                      [provider]: { ...prev, subModelReasoningLevel: e.target.value },
                                    };
                                    const newForm = { ...form, providerModelConfig: newConfig };
                                    setForm(newForm);
                                    persistSettings(newForm);
                                  }}
                                  className="w-full min-w-0 px-2 py-1 text-xs font-mono focus:outline-none sm:flex-1"
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                                >
                                  {subLevels.map((rl) => (
                                    <option key={rl.effort} value={rl.effort}>
                                      {rl.effort} ({rl.description})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </>
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
          ko: "각 에이전트의 CLI 도구는 오피스에서 에이전트 클릭 후 변경할 수 있습니다. Copilot/Antigravity 모델은 OAuth 탭에서 설정합니다.",
          en: "Each agent's CLI tool can be changed in Office by clicking an agent. Configure Copilot/Antigravity models in OAuth tab.",
          ja: "各エージェントの CLI ツールは Office でエージェントをクリックして変更できます。Copilot/Antigravity のモデルは OAuth タブで設定してください。",
          zh: "每个代理的 CLI 工具可在 Office 中点击代理后修改。Copilot/Antigravity 模型请在 OAuth 页签配置。",
        })}
      </p>
    </section>
  );
}
