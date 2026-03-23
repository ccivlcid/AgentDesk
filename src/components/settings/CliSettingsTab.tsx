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
        fontSize: "10px",
        color: "#4B5563",
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        padding: "8px 12px",
        maxHeight: 120,
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        margin: "8px 0 0 0",
        borderRadius: 8,
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
  const mono = "var(--th-font-mono)";

  return (
    <section
      className="space-y-6"
      style={{ borderRadius: 24, background: "transparent" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2.5}>
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151" }}>
            {t({ ko: "CLI 도구 상태", en: "CLI Tool Status", ja: "CLIツール状態", zh: "CLI工具状态" })}
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

      {cliStatus ? (
        <div className="space-y-4">
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
                  className="p-5 space-y-4 transition-all hover:shadow-sm"
                  style={{ borderRadius: 20, background: "#FFFFFF", border: "1px solid #E5E7EB" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0">
                      {info?.icon ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900">{info?.label ?? provider}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">
                        {status.version ??
                          (status.installed
                            ? t({ ko: "버전 확인 불가", en: "Version unknown", ja: "バージョン不明", zh: "版本未知" })
                            : t({ ko: "미설치", en: "Not installed", ja: "未インストール", zh: "未安装" }))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="text-[10px] font-black uppercase px-2 py-1 tracking-tighter"
                        style={{
                          borderRadius: 8,
                          background: status.installed ? "#ECFDF5" : "#F3F4F6",
                          color: status.installed ? "#059669" : "#6B7280",
                        }}
                      >
                        {status.installed
                          ? t({ ko: "INSTALLED", en: "Installed", ja: "インストール済み", zh: "已安装" })
                          : t({ ko: "MISSING", en: "Not installed", ja: "未インストール", zh: "未安装" })}
                      </span>
                      {status.installed && (
                        <span
                          className="text-[10px] font-black uppercase px-2 py-1 tracking-tighter"
                          style={{
                            borderRadius: 8,
                            background: status.authenticated ? "#FFFBEB" : "#FEF2F2",
                            color: status.authenticated ? "#D97706" : "#DC2626",
                          }}
                        >
                          {status.authenticated
                            ? t({ ko: "AUTH OK", en: "Authenticated", ja: "認証済み", zh: "已认证" })
                            : t({ ko: "AUTH REQ", en: "Not Authenticated", ja: "未認証", zh: "未认证" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {!status.installed && (() => {
                    const job = installJobs[provider];
                    const isRunning = job?.status === "running";
                    const isDone = job?.status === "success" || job?.status === "failed";
                    return (
                      <div className="pl-0 sm:pl-16 space-y-2">
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() => onInstall(provider)}
                          className="text-xs font-bold px-4 py-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                          style={{
                            borderRadius: 12,
                            background: "#3B82F6",
                            color: "#FFFFFF",
                            boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                          }}
                        >
                          {isRunning
                            ? t({ ko: "설치 중...", en: "Installing...", ja: "インストール中...", zh: "安装中..." })
                            : t({ ko: "npm 패키지 설치", en: "npm install tool", ja: "npmインストール", zh: "npm安装" })}
                        </button>
                        {isDone && job?.status === "failed" && (
                          <div className="text-xs font-bold text-red-600 pl-1">
                            ✗ {t({ ko: "설치 실패", en: "Install failed", ja: "インストール失敗", zh: "安装失败" })}
                          </div>
                        )}
                        {isDone && job?.status === "success" && (
                          <div className="text-xs font-bold text-emerald-600 pl-1">
                            ✓ {t({ ko: "설치 완료", en: "Installed!", ja: "インストール完了!", zh: "安装完成!" })}
                          </div>
                        )}
                        {job && job.logs.length > 0 && (
                          <InstallLogPanel logs={job.logs} />
                        )}
                      </div>
                    );
                  })()}

                  {showModelSection && (
                    <div className="space-y-3 pl-0 sm:pl-16 pt-2 border-t border-gray-50">
                      <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <span className="shrink-0 text-[11px] font-black uppercase text-gray-400 tracking-widest sm:w-20">
                          {t({ ko: "모델", en: "Model", ja: "モデル", zh: "模型" })}
                        </span>
                        {cliModelsLoading ? (
                          <span className="text-xs font-mono animate-pulse text-blue-500">
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
                            className="w-full min-w-0 px-3 py-2 text-xs font-mono focus:outline-none sm:flex-1 transition-all"
                            style={{ borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#111827" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                          >
                            <option value="">{t({ ko: "기본값 (Default)", en: "Default", ja: "デフォルト", zh: "默认" })}</option>
                            {modelList.map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.displayName || m.slug}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-mono text-gray-400 italic">
                            {t({ ko: "모델 목록 없음", en: "No models available", ja: "モデル一覧なし", zh: "无模型列表" })}
                          </span>
                        )}
                      </div>

                      {provider === "codex" && reasoningLevels && reasoningLevels.length > 0 && (
                        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                          <span className="shrink-0 text-[11px] font-black uppercase text-gray-400 tracking-widest sm:w-20">
                            {t({ ko: "추론", en: "REASONING", ja: "推論", zh: "推理" })}
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
                            className="w-full min-w-0 px-3 py-2 text-xs font-mono focus:outline-none sm:flex-1 transition-all"
                            style={{ borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#111827" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
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
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="text-sm font-bold text-gray-400 animate-pulse">
            {t({ ko: "CLI 상태 정보를 불러오는 중...", en: "Loading CLI status...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        </div>
      )}

      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <p className="text-xs leading-relaxed text-blue-700" style={{ fontFamily: mono }}>
          {t({
            ko: "• 각 에이전트의 CLI 도구는 에이전트 매니저에서 변경할 수 있습니다.\n• Copilot/Antigravity 모델 설정은 OAuth 탭을 이용해 주세요.",
            en: "• Change each agent's CLI tool in Agent Manager.\n• Configure Copilot/Antigravity models in the OAuth tab.",
            ja: "• 各エージェントの CLI ツールはエージェントマネージャーで変更可能です。\n• Copilot/Antigravity のモデル設定は OAuth タブで行ってください。",
            zh: "• 每个代理的 CLI 工具可在代理管理器中修改。\n• Copilot/Antigravity 模型请在 OAuth 页签配置。",
          })}
        </p>
      </div>
    </section>
  );
}
