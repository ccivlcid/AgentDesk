import type { I18nContextValue } from "../../i18n";
import type { Agent } from "../../types";
import { CLI_LABELS } from "../agent-detail/constants";
import { CLI_SELECT_STYLE_COMPACT } from "./cliSelectStyles";
import type { UseAgentDetailCliStateResult } from "./useAgentDetailCliState";

interface Props {
  t: I18nContextValue["t"];
  cli: UseAgentDetailCliStateResult;
}

export function AgentDetailCliEditorCodex({ t, cli }: Props) {
  const {
    selectedCli,
    setSelectedCli,
    selectedCliModel,
    setSelectedCliModel,
    selectedCliReasoningLevel,
    setSelectedCliReasoningLevel,
    savingCli,
    cliModelsLoading,
    selectedCliModelOptions,
    codexReasoningOptions,
    canSaveCli,
    getReasoningDescription,
    handleSaveCli,
    handleCancelCliEdit,
  } = cli;

  return (
    <div className="space-y-1">
      <div className="flex w-full min-w-0 items-center gap-1 pb-0.5">
        <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        <select
          value={selectedCli}
          onChange={(event) => {
            setSelectedCli(event.target.value as Agent["cli_provider"]);
            setSelectedCliModel("");
            setSelectedCliReasoningLevel("");
          }}
          className="w-[94px] shrink-0 text-xs outline-none"
          style={CLI_SELECT_STYLE_COMPACT}
        >
          {Object.entries(CLI_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {cliModelsLoading ? (
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
                const nextModel = event.target.value;
                setSelectedCliModel(nextModel);
                const nextMeta = selectedCliModelOptions.find((m) => m.slug === nextModel);
                setSelectedCliReasoningLevel(nextMeta?.defaultReasoningLevel || "");
              }}
              className="w-0 min-w-0 flex-1 text-xs outline-none"
              style={CLI_SELECT_STYLE_COMPACT}
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
            {codexReasoningOptions.length > 0 && (
              <select
                value={selectedCliReasoningLevel}
                onChange={(event) => setSelectedCliReasoningLevel(event.target.value)}
                className="w-0 min-w-0 flex-1 text-xs outline-none"
                style={CLI_SELECT_STYLE_COMPACT}
              >
                <option value="">
                  {t({
                    ko: "기본값(설정창 추론)",
                    en: "Default (Settings reasoning)",
                    ja: "デフォルト（設定推論）",
                    zh: "默认（设置中的推理）",
                  })}
                </option>
                {codexReasoningOptions.map((level) => (
                  <option key={level.effort} value={level.effort}>
                    {level.effort}
                    {getReasoningDescription(level.effort, level.description)
                      ? ` (${getReasoningDescription(level.effort, level.description)})`
                      : ""}
                  </option>
                ))}
              </select>
            )}
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
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={savingCli || !canSaveCli}
          onClick={() => {
            void handleSaveCli();
          }}
          className="text-[10px] px-1.5 py-0.5 font-mono font-bold uppercase transition-colors disabled:opacity-50"
          style={{ borderRadius: 8, background: "var(--th-accent)", color: "var(--th-bg-elevated)" }}
        >
          {savingCli ? "..." : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
        </button>
        <button
          type="button"
          onClick={handleCancelCliEdit}
          className="text-[10px] px-1.5 py-0.5 font-mono transition-colors"
          style={{
            borderRadius: 8,
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-secondary)",
          }}
        >
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </button>
      </div>
    </div>
  );
}
