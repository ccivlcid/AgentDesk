import { useState, useEffect } from "react";
import { useI18n } from "../../i18n";
import { getTaskDiff, mergeTask, discardTask, type TaskDiffResult } from "../../api";
import DiffModal from "../taskboard/DiffModal";

interface GitSectionProps {
  taskId: string;
  sectionOpen: boolean;
  onToggleSection: () => void;
}

export default function GitSection({ taskId, sectionOpen, onToggleSection }: GitSectionProps) {
  const { t } = useI18n();
  const [diff, setDiff] = useState<TaskDiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [merging, setMerging] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    getTaskDiff(taskId)
      .then(setDiff)
      .catch(() => setDiff(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500 animate-pulse">
        {t({ ko: "Git 정보 로딩중...", en: "Loading Git info...", ja: "Git情報を読み込み中...", zh: "加载Git信息..." })}
      </div>
    );
  }

  if (!diff || !diff.ok || !diff.hasWorktree) {
    return null;
  }

  // Parse stat for summary
  const statLines = (diff.stat || "").trim().split("\n");
  const summaryLine = statLines[statLines.length - 1] || "";

  const handleMerge = async () => {
    setMerging(true);
    setActionMsg(null);
    try {
      const result = await mergeTask(taskId);
      setActionMsg(
        result.ok
          ? t({ ko: "병합 완료", en: "Merged successfully", ja: "マージ完了", zh: "合并成功" })
          : result.message || "Merge failed",
      );
    } catch (e) {
      setActionMsg(String(e));
    } finally {
      setMerging(false);
    }
  };

  const handleDiscard = async () => {
    const confirmed = window.confirm(
      t({
        ko: "정말 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        en: "Are you sure you want to discard? This cannot be undone.",
        ja: "本当に破棄しますか？この操作は元に戻せません。",
        zh: "确定要丢弃吗？此操作无法撤销。",
      }),
    );
    if (!confirmed) return;
    setDiscarding(true);
    setActionMsg(null);
    try {
      const result = await discardTask(taskId);
      setActionMsg(
        result.ok
          ? t({ ko: "폐기 완료", en: "Discarded", ja: "破棄完了", zh: "已丢弃" })
          : result.message || "Discard failed",
      );
    } catch (e) {
      setActionMsg(String(e));
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 overflow-hidden">
        <button
          type="button"
          onClick={onToggleSection}
          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800/40 transition"
        >
          <span className="text-[11px] font-medium text-slate-400">
            {t({ ko: "Git 변경사항", en: "Git Changes", ja: "Git変更", zh: "Git变更" })}
          </span>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-slate-500 transition-transform ${sectionOpen ? "rotate-180" : ""}`}>
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>
        {sectionOpen && (
          <div className="border-t border-slate-700/40 px-3 py-2 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-blue-300">{diff.branchName || "unknown"}</span>
              <span className="text-slate-500">{summaryLine}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(true)}
                className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-300 hover:bg-blue-500/20 transition"
              >
                {t({ ko: "Diff 보기", en: "View Diff", ja: "Diff表示", zh: "查看Diff" })}
              </button>
              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={merging}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
              >
                {merging
                  ? t({ ko: "병합중...", en: "Merging...", ja: "マージ中...", zh: "合并中..." })
                  : t({ ko: "병합", en: "Merge", ja: "マージ", zh: "合并" })}
              </button>
              <button
                type="button"
                onClick={() => void handleDiscard()}
                disabled={discarding}
                className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
              >
                {discarding
                  ? t({ ko: "폐기중...", en: "Discarding...", ja: "破棄中...", zh: "丢弃中..." })
                  : t({ ko: "폐기", en: "Discard", ja: "破棄", zh: "丢弃" })}
              </button>
            </div>

            {actionMsg && (
              <div className="text-[11px] text-slate-400">{actionMsg}</div>
            )}
          </div>
        )}
      </div>

      {showDiff && <DiffModal taskId={taskId} onClose={() => setShowDiff(false)} />}
    </>
  );
}
