import type { I18nContextValue } from "../../i18n";
import type { Agent } from "../../types";
import { CLI_LABELS, oauthAccountLabel } from "../agent-detail/constants";
import { CLI_SELECT_STYLE_WIDE } from "./cliSelectStyles";
import type { UseAgentDetailCliStateResult } from "./useAgentDetailCliState";

interface Props {
  t: I18nContextValue["t"];
  cli: UseAgentDetailCliStateResult;
}

export function AgentDetailCliEditorStandard({ t, cli }: Props) {
  const {
    selectedCli,
    setSelectedCli,
    selectedOAuthAccountId,
    setSelectedOAuthAccountId,
    selectedCliModel,
    setSelectedCliModel,
    selectedCliReasoningLevel,
    setSelectedCliReasoningLevel,
    savingCli,
    oauthLoading,
    cliModelsLoading,
    activeOAuthAccounts,
    requiresOAuthAccount,
    requiresApiProvider,
    supportsCliModelOverride,
    selectedCliModelOptions,
    canSaveCli,
    handleSaveCli,
    handleCancelCliEdit,
  } = cli;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>🔧</span>
      <select
        value={selectedCli}
        onChange={(event) => {
          setSelectedCli(event.target.value as Agent["cli_provider"]);
          setSelectedCliModel("");
          setSelectedCliReasoningLevel("");
        }}
        className="text-xs outline-none"
        style={CLI_SELECT_STYLE_WIDE}
      >
        {Object.entries(CLI_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {requiresOAuthAccount &&
        (oauthLoading ? (
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "계정 로딩...",
              en: "Loading accounts...",
              ja: "アカウント読み込み中...",
              zh: "正在加载账号...",
            })}
          </span>
        ) : activeOAuthAccounts.length > 0 ? (
          <select
            value={selectedOAuthAccountId}
            onChange={(event) => setSelectedOAuthAccountId(event.target.value)}
            className="text-xs outline-none max-w-[170px]"
            style={CLI_SELECT_STYLE_WIDE}
          >
            {activeOAuthAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {oauthAccountLabel(account)}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-amber-300">
            {t({
              ko: "활성 OAuth 계정 없음",
              en: "No active OAuth account",
              ja: "有効な OAuth アカウントなし",
              zh: "没有可用的 OAuth 账号",
            })}
          </span>
        ))}
      {requiresApiProvider && (
        <span className="text-[10px] text-amber-300">
          {t({
            ko: "⚙️ 설정 > API 탭에서 모델을 배정하세요",
            en: "⚙️ Assign models in Settings > API tab",
            ja: "⚙️ 設定 > API タブでモデルを割り当ててください",
            zh: "⚙️ 请在设置 > API 标签页中分配模型",
          })}
        </span>
      )}
      {supportsCliModelOverride &&
        (cliModelsLoading ? (
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "모델 로딩...",
              en: "Loading models...",
              ja: "モデル読み込み中...",
              zh: "正在加载模型...",
            })}
          </span>
        ) : selectedCliModelOptions.length > 0 ? (
          <>
            <select
              value={selectedCliModel}
              onChange={(event) => {
                setSelectedCliModel(event.target.value);
              }}
              className="text-xs outline-none max-w-[210px]"
              style={CLI_SELECT_STYLE_WIDE}
            >
              <option value="">
                {t({
                  ko: "기본값(설정창 모델)",
                  en: "Default (Settings model)",
                  ja: "デフォルト（設定モデル）",
                  zh: "默认（设置中的模型）",
                })}
              </option>
              {selectedCliModelOptions.map((model) => (
                <option key={model.slug} value={model.slug}>
                  {model.displayName || model.slug}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "알바생 모델은 설정창 값을 따릅니다",
                en: "Sub-agent model follows Settings",
                ja: "サブエージェントモデルは設定値を使用",
                zh: "子代理模型沿用设置值",
              })}
            </span>
          </>
        ) : (
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "모델 목록이 없습니다",
              en: "No model list available",
              ja: "モデル一覧がありません",
              zh: "暂无模型列表",
            })}
          </span>
        ))}
      <button
        type="button"
        disabled={savingCli || !canSaveCli}
        onClick={() => {
          void handleSaveCli();
        }}
        className="text-[10px] px-1.5 py-0.5 font-mono transition-colors disabled:opacity-50"
        style={{
          borderRadius: 0,
          background: "rgba(251,191,36,0.15)",
          color: "var(--th-accent)",
          border: "1px solid rgba(251,191,36,0.35)",
        }}
      >
        {savingCli ? "..." : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
      </button>
      <button
        type="button"
        onClick={handleCancelCliEdit}
        className="text-[10px] px-1.5 py-0.5 font-mono transition-colors"
        style={{
          borderRadius: 0,
          border: "1px solid var(--th-border)",
          background: "transparent",
          color: "var(--th-text-secondary)",
        }}
      >
        {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
      </button>
    </div>
  );
}
