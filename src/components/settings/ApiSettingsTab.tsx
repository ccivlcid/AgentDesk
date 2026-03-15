import { API_TYPE_PRESETS } from "./constants";
import ApiAssignModal from "./ApiAssignModal";
import type { ApiStateBundle, TFunction } from "./types";
import { DEFAULT_API_FORM } from "./useApiProvidersState";

interface ApiSettingsTabProps {
  t: TFunction;
  localeTag: string;
  apiState: ApiStateBundle;
}

export default function ApiSettingsTab({ t, localeTag, apiState }: ApiSettingsTabProps) {
  const {
    apiProviders,
    apiProvidersLoading,
    apiAddMode,
    apiEditingId,
    apiForm,
    apiSaving,
    apiTesting,
    apiTestResult,
    apiModelsExpanded,
    setApiAddMode,
    setApiEditingId,
    setApiForm,
    setApiModelsExpanded,
    loadApiProviders,
    handleApiProviderSave,
    handleApiProviderDelete,
    handleApiProviderTest,
    handleApiProviderToggle,
    handleApiEditStart,
    handleApiModelAssign,
  } = apiState;

  return (
    <>
      <section
        className="space-y-4 p-4 sm:p-5"
        style={{ borderRadius: 0, background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px" }}>
            // api providers
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadApiProviders()}
              disabled={apiProvidersLoading}
              className="transition-colors disabled:opacity-50 hover:opacity-80"
              style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-text-muted)", border: "1px solid var(--th-border)", padding: "2px 6px", borderRadius: 0, background: "var(--th-bg-elevated)" }}
            >
              [↺]
            </button>
            {!apiAddMode && (
              <button
                onClick={() => {
                  setApiAddMode(true);
                  setApiEditingId(null);
                  setApiForm(DEFAULT_API_FORM);
                }}
                className="text-xs px-3 py-1 font-medium font-mono transition-colors"
                style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
              >
                + {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "로컬 모델(Ollama 등), 프론티어 모델(OpenAI, Anthropic 등), 기타 서비스의 API를 등록하여 언어모델에 접근합니다.",
            en: "Register APIs for local models (Ollama, etc.), frontier models (OpenAI, Anthropic, etc.), and other services.",
            ja: "ローカルモデル（Ollama等）、フロンティアモデル（OpenAI, Anthropic等）、その他サービスのAPIを登録します。",
            zh: "注册本地模型（Ollama等）、前沿模型（OpenAI、Anthropic等）及其他服务的API。",
          })}
        </p>

        {apiAddMode && (
          <div className="space-y-3 p-4" style={{ borderRadius: 0, border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-accent)", letterSpacing: "0.1em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px" }}>
              {apiEditingId ? "// edit provider" : "// add provider"}
            </div>

            <div>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                // {t({ ko: "유형", en: "type", ja: "タイプ", zh: "类型" })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  Object.entries(API_TYPE_PRESETS) as [
                    keyof typeof API_TYPE_PRESETS,
                    { label: string; base_url: string },
                  ][]
                )?.map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setApiForm((prev) => ({
                        ...prev,
                        type: key,
                        base_url: preset.base_url || prev.base_url,
                        name: prev.name || preset.label,
                      }));
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono transition-colors"
                    style={{
                      borderRadius: 0,
                      border: apiForm.type === key ? "1px solid var(--th-accent)" : "1px solid var(--th-border)",
                      background: apiForm.type === key ? "rgba(245,158,11,0.1)" : "var(--th-bg-elevated)",
                      color: apiForm.type === key ? "var(--th-accent)" : "var(--th-text-muted)",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                // {t({ ko: "이름", en: "name", ja: "名前", zh: "名称" })}
              </div>
              <input
                type="text"
                value={apiForm.name}
                onChange={(e) => setApiForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t({ ko: "예: My OpenAI", en: "e.g. My OpenAI", ja: "例: My OpenAI", zh: "如: My OpenAI" })}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
            </div>

            <div>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>// base url</div>
              <input
                type="text"
                value={apiForm.base_url}
                onChange={(e) => setApiForm((prev) => ({ ...prev, base_url: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
            </div>

            <div>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                // api key{apiForm.type === "ollama" && (
                  <span style={{ textTransform: "none", letterSpacing: "normal", marginLeft: "4px" }}>
                    ({t({ ko: "로컬은 보통 불필요", en: "usually not needed for local", ja: "ローカルは通常不要", zh: "本地通常不需要" })})
                  </span>
                )}
              </div>
              <input
                type="password"
                value={apiForm.api_key}
                onChange={(e) => setApiForm((prev) => ({ ...prev, api_key: e.target.value }))}
                placeholder={
                  apiEditingId
                    ? t({
                        ko: "변경하려면 입력 (빈칸=유지)",
                        en: "Enter to change (blank=keep)",
                        ja: "変更する場合は入力",
                        zh: "输入以更改（空白=保持）",
                      })
                    : "sk-..."
                }
                className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleApiProviderSave()}
                disabled={apiSaving || !apiForm.name.trim() || !apiForm.base_url.trim()}
                className="px-4 py-2 text-xs font-medium font-mono uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
              >
                {apiSaving
                  ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
                  : apiEditingId
                    ? t({ ko: "수정", en: "Update", ja: "更新", zh: "更新" })
                    : t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
              <button
                onClick={() => {
                  setApiAddMode(false);
                  setApiEditingId(null);
                  setApiForm(DEFAULT_API_FORM);
                }}
                className="px-4 py-2 text-xs font-medium font-mono transition-colors"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-secondary)" }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
            </div>
          </div>
        )}

        {apiProvidersLoading ? (
          <div className="text-xs font-mono animate-pulse py-4 text-center" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        ) : apiProviders.length === 0 && !apiAddMode ? (
          <div className="text-xs font-mono py-6 text-center" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "등록된 API 프로바이더가 없습니다. 위의 + 추가 버튼으로 시작하세요.",
              en: "No API providers registered. Click + Add above to get started.",
              ja: "APIプロバイダーが登録されていません。上の+追加ボタンから始めてください。",
              zh: "没有已注册的API提供商。点击上方的+添加按钮开始。",
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {apiProviders.map((provider) => {
              const testResult = apiTestResult[provider.id];
              const isExpanded = apiModelsExpanded[provider.id];
              return (
                <div
                  key={provider.id}
                  className="p-3 transition-colors"
                  style={{
                    borderRadius: 0,
                    border: "1px solid var(--th-border)",
                    background: provider.enabled ? "var(--th-bg-elevated)" : "var(--th-bg-primary)",
                    opacity: provider.enabled ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2 h-2 flex-shrink-0"
                        style={{ borderRadius: 0, background: provider.enabled ? "#34d399" : "var(--th-text-muted)" }}
                      />
                      <span className="text-sm font-medium font-mono truncate" style={{ color: "var(--th-text-primary)" }}>{provider.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 font-mono uppercase flex-shrink-0" style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)" }}>
                        {provider.type}
                      </span>
                      {provider.has_api_key && <span className="text-[10px] text-emerald-400 flex-shrink-0">🔑</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => void handleApiProviderTest(provider.id)}
                        disabled={apiTesting === provider.id}
                        className="text-[10px] px-2 py-1 font-mono text-cyan-400 transition-colors disabled:opacity-50"
                        style={{ borderRadius: 0, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
                        title={t({ ko: "연결 테스트", en: "Test Connection", ja: "接続テスト", zh: "测试连接" })}
                      >
                        {apiTesting === provider.id ? "..." : t({ ko: "테스트", en: "Test", ja: "テスト", zh: "测试" })}
                      </button>
                      <button
                        onClick={() => handleApiEditStart(provider)}
                        className="text-[10px] px-2 py-1 font-mono transition-colors"
                        style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                      >
                        {t({ ko: "수정", en: "Edit", ja: "編集", zh: "编辑" })}
                      </button>
                      <button
                        onClick={() => void handleApiProviderToggle(provider.id, provider.enabled)}
                        className="text-[10px] px-2 py-1 font-mono transition-colors"
                        style={{
                          borderRadius: 0,
                          background: provider.enabled ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                          border: provider.enabled ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(16,185,129,0.3)",
                          color: provider.enabled ? "#fbbf24" : "#34d399",
                        }}
                      >
                        {provider.enabled
                          ? t({ ko: "비활성화", en: "Disable", ja: "無効化", zh: "禁用" })
                          : t({ ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" })}
                      </button>
                      <button
                        onClick={() => void handleApiProviderDelete(provider.id)}
                        className="text-[10px] px-2 py-1 font-mono text-red-400 transition-colors"
                        style={{ borderRadius: 0, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5 text-[11px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>{provider.base_url}</div>

                  {testResult && (
                    <div
                      className="mt-2 text-[11px] font-mono px-2.5 py-1.5"
                      style={{
                        borderRadius: 0,
                        background: testResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        border: testResult.ok ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
                        color: testResult.ok ? "#4ade80" : "#f87171",
                      }}
                    >
                      {testResult.ok ? "✓ " : "✗ "}
                      {testResult.msg}
                    </div>
                  )}

                  {provider.models_cache && provider.models_cache.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setApiModelsExpanded((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        className="text-[11px] font-mono transition-colors"
                        style={{ color: "var(--th-text-muted)" }}
                      >
                        {isExpanded ? "▼" : "▶"}{" "}
                        {t({ ko: "모델 목록", en: "Models", ja: "モデル一覧", zh: "模型列表" })} (
                        {provider.models_cache.length})
                        {provider.models_cached_at && (
                          <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>
                            ·{" "}
                            {new Date(provider.models_cached_at).toLocaleString(localeTag, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 max-h-48 overflow-y-auto p-2" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
                          {provider.models_cache.map((model) => (
                            <div
                              key={model}
                              className="flex items-center justify-between text-[11px] font-mono py-0.5 group/model px-1 -mx-1"
                              style={{ color: "var(--th-text-muted)" }}
                            >
                              <span className="truncate">{model}</span>
                              <button
                                onClick={() => void handleApiModelAssign(provider.id, model)}
                                className="text-[9px] px-1.5 py-0.5 font-mono text-amber-900 opacity-0 group-hover/model:opacity-100 transition-opacity whitespace-nowrap ml-2"
                                style={{ borderRadius: 0, background: "var(--th-accent)" }}
                                title={t({
                                  ko: "에이전트에 배정",
                                  en: "Assign to agent",
                                  ja: "エージェントに割り当て",
                                  zh: "分配给代理",
                                })}
                              >
                                {t({ ko: "배정", en: "Assign", ja: "割当", zh: "分配" })}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ApiAssignModal t={t} localeTag={localeTag} apiState={apiState} />
    </>
  );
}
