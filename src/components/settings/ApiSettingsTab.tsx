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
    apiDeleting,
    apiToggling,
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

  const mono = "var(--th-font-mono)";
  const inputStyle: React.CSSProperties = { borderRadius: 12, border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#111827", transition: "all 0.2s" };

  return (
    <>
      <section className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
                <line x1="6" y1="6" x2="6" y2="6" />
                <line x1="6" y1="18" x2="6" y2="18" />
              </svg>
            </div>
            <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151" }}>
              {t({ ko: "API 프로바이더 설정", en: "API Providers", ja: "APIプロバイダー", zh: "API提供商" })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadApiProviders()}
              disabled={apiProvidersLoading}
              className="p-2 transition-all hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            {!apiAddMode && (
              <button
                onClick={() => {
                  setApiAddMode(true);
                  setApiEditingId(null);
                  setApiForm(DEFAULT_API_FORM);
                }}
                className="text-xs px-4 py-1.5 font-bold font-mono transition-all hover:brightness-110 active:scale-95"
                style={{ borderRadius: 12, background: "#3B82F6", color: "#FFFFFF", boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)" }}
              >
                + {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
          <p className="text-xs leading-relaxed text-blue-700 font-medium">
            {t({
              ko: "• 로컬 모델(Ollama), 프론티어 모델(OpenAI, Anthropic 등)의 API를 등록하세요.",
              en: "• Register APIs for local models (Ollama) or frontier models (OpenAI, Anthropic).",
              ja: "• ローカルモデル (Ollama) やフロンティアモデルの API を登録します。",
              zh: "• 注册本地模型 (Ollama) 或前沿模型的 API。",
            })}
          </p>
        </div>

        {apiAddMode && (
          <div className="space-y-5 p-6 transition-all hover:shadow-sm" style={{ borderRadius: 24, border: "1px solid #BFDBFE", background: "#FFFFFF" }}>
            <div className="flex items-center gap-2 text-blue-600">
              <span className="text-xs font-black font-mono uppercase tracking-widest">
                {apiEditingId ? "// edit provider" : "// add new provider"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div style={{ fontFamily: mono, fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>
                  {t({ ko: "API 유형 (Type)", en: "Type", ja: "タイプ", zh: "类型" })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(API_TYPE_PRESETS) as [keyof typeof API_TYPE_PRESETS, { label: string; base_url: string }][]).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setApiForm((prev) => ({ ...prev, type: key, base_url: preset.base_url || prev.base_url, name: prev.name || preset.label }))}
                      className="px-3 py-1.5 text-[11px] font-bold transition-all"
                      style={{
                        borderRadius: 10,
                        border: "1px solid",
                        borderColor: apiForm.type === key ? "#3B82F6" : "#E5E7EB",
                        background: apiForm.type === key ? "#EBF5FF" : "#FFFFFF",
                        color: apiForm.type === key ? "#2563EB" : "#6B7280",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div style={{ fontFamily: mono, fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>{t({ ko: "이름 (Name)", en: "Name", ja: "名前", zh: "名称" })}</div>
                  <input
                    type="text"
                    value={apiForm.name}
                    onChange={(e) => setApiForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. My OpenAI"
                    className="w-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  />
                </div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>Base URL</div>
                  <input
                    type="text"
                    value={apiForm.base_url}
                    onChange={(e) => setApiForm((prev) => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 text-sm font-mono focus:outline-none transition-all"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontFamily: mono, fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>
                  API Key {apiForm.type === "ollama" && <span className="lowercase font-medium opacity-60">(usually none for local)</span>}
                </div>
                <input
                  type="password"
                  value={apiForm.api_key}
                  onChange={(e) => setApiForm((prev) => ({ ...prev, api_key: e.target.value }))}
                  placeholder={apiEditingId ? t({ ko: "변경하려면 입력", en: "Enter to change", ja: "変更する場合は入力", zh: "输入以更改" }) : "sk-..."}
                  className="w-full px-4 py-2.5 text-sm font-mono focus:outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setApiAddMode(false); setApiEditingId(null); setApiForm(DEFAULT_API_FORM); }}
                className="px-5 py-2 text-xs font-bold transition-all hover:bg-gray-100"
                style={{ borderRadius: 12, color: "#6B7280" }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                onClick={() => void handleApiProviderSave()}
                disabled={apiSaving || !apiForm.name.trim() || !apiForm.base_url.trim()}
                className="px-6 py-2 text-xs font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                style={{ borderRadius: 12, background: "#3B82F6", color: "#FFFFFF", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)" }}
              >
                {apiSaving ? "..." : apiEditingId ? t({ ko: "수정 ↵", en: "Update ↵", ja: "更新 ↵", zh: "更新 ↵" }) : t({ ko: "등록 ↵", en: "Register ↵", ja: "登録 ↵", zh: "注册 ↵" })}
              </button>
            </div>
          </div>
        )}

        {apiProvidersLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-dashed border-gray-200">
            <svg className="animate-spin text-blue-500" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><circle cx="12" cy="12" r="10" strokeOpacity={0.1}/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Loading providers...</span>
          </div>
        ) : apiProviders.length === 0 && !apiAddMode ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 opacity-50">
            <p className="text-xs font-bold text-gray-400">{t({ ko: "등록된 API 프로바이더가 없습니다.", en: "No providers registered.", ja: "登録済みのプロバイダーはありません.", zh: "暂无 API 提供商." })}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiProviders.map((provider) => {
              const testResult = apiTestResult[provider.id];
              const isExpanded = apiModelsExpanded[provider.id];
              return (
                <div key={provider.id} className="p-5 transition-all hover:shadow-sm" style={{ borderRadius: 20, border: "1px solid #E5E7EB", background: provider.enabled ? "#FFFFFF" : "#F9FAFB", opacity: provider.enabled ? 1 : 0.7 }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${provider.enabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-gray-300"}`} />
                      <span className="text-sm font-bold text-gray-900 truncate">{provider.name}</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 tracking-tighter">{provider.type}</span>
                      {provider.has_api_key && <span className="text-blue-500 text-xs">◆</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => void handleApiProviderTest(provider.id)} disabled={apiTesting === provider.id} className="p-2 transition-all hover:bg-cyan-50 rounded-xl text-cyan-600 border border-cyan-100" title="Test Connection">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                      </button>
                      <button onClick={() => handleApiEditStart(provider)} className="p-2 transition-all hover:bg-gray-100 rounded-xl text-gray-500 border border-gray-200">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => void handleApiProviderToggle(provider.id, provider.enabled)} disabled={apiToggling === provider.id} className={`p-2 transition-all rounded-xl border ${provider.enabled ? "hover:bg-amber-50 text-amber-600 border-amber-100" : "hover:bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
                      </button>
                      <button onClick={() => void handleApiProviderDelete(provider.id)} disabled={apiDeleting === provider.id} className="p-2 transition-all hover:bg-red-50 rounded-xl text-red-600 border border-red-100">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-gray-400 truncate pl-5.5">{provider.base_url}</div>

                  {testResult && (
                    <div className={`mt-3 px-4 py-2.5 rounded-xl text-[11px] font-bold font-mono border ${testResult.ok ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                      {testResult.ok ? "✓ SUCCESS: " : "✗ ERROR: "}{testResult.msg}
                    </div>
                  )}

                  {provider.models_cache && provider.models_cache.length > 0 && (
                    <div className="mt-3 pl-5.5">
                      <button onClick={() => setApiModelsExpanded((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))} className="flex items-center gap-2 text-[11px] font-bold text-gray-500 hover:text-blue-600 transition-colors">
                        <span className="w-4 h-4 flex items-center justify-center bg-gray-100 rounded-md text-[8px]">{isExpanded ? "▼" : "▶"}</span>
                        {t({ ko: "모델 캐시", en: "Models", ja: "モデル", zh: "模型" })} ({provider.models_cache.length})
                        {provider.models_cached_at && <span className="opacity-40 font-normal">· {new Date(provider.models_cached_at).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}</span>}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-200/50">
                          {provider.models_cache.map((model) => (
                            <div key={model} className="flex items-center justify-between py-1.5 px-2 group/model">
                              <span className="text-[11px] font-mono text-gray-600 truncate">{model}</span>
                              <button onClick={() => void handleApiModelAssign(provider.id, model)} className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-600 text-white rounded-md opacity-0 group-hover/model:opacity-100 transition-all shadow-sm">
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
