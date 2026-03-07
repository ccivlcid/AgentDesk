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
      <div className="px-3 py-2 text-[11px] font-mono animate-pulse" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}>
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
      <div className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <button
          type="button"
          onClick={onToggleSection}
          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--th-bg-surface-hover)] transition"
        >
          <span className="text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "Git 변경사항", en: "Git Changes", ja: "Git変更", zh: "Git变更" })}
          </span>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${sectionOpen ? "rotate-180" : ""}`}
            style={{ color: "var(--th-text-muted)" }}>
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>
        {sectionOpen && (
          <div className="px-3 py-2 space-y-2" style={{ borderTop: "1px solid var(--th-border)" }}>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span style={{ color: "var(--th-accent)" }}>{diff.branchName || "unknown"}</span>
              <span style={{ color: "var(--th-text-muted)" }}>{summaryLine}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(true)}
                className="px-2.5 py-1 text-[11px] font-mono transition"
                style={{ borderRadius: "2px", border: "1px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.1)", color: "rgb(196,181,253)" }}
              >
                {t({ ko: "Diff 보기", en: "View Diff", ja: "Diff表示", zh: "查看Diff" })}
              </button>
              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={merging}
                className="px-2.5 py-1 text-[11px] font-mono transition disabled:opacity-50"
                style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)", color: "rgb(167,243,208)" }}
              >
                {merging
                  ? t({ ko: "병합중...", en: "Merging...", ja: "マージ中...", zh: "合并中..." })
                  : t({ ko: "병합", en: "Merge", ja: "マージ", zh: "합并" })}
              </button>
              <button
                type="button"
                onClick={() => void handleDiscard()}
                disabled={discarding}
                className="px-2.5 py-1 text-[11px] font-mono transition disabled:opacity-50"
                style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}
              >
                {discarding
                  ? t({ ko: "폐기중...", en: "Discarding...", ja: "破棄中...", zh: "丢弃中..." })
                  : t({ ko: "폐기", en: "Discard", ja: "破棄", zh: "丢弃" })}
              </button>
            </div>

            {actionMsg && (
              <div className="text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{actionMsg}</div>
            )}
          </div>
        )}
      </div>

      {showDiff && <DiffModal taskId={taskId} onClose={() => setShowDiff(false)} />}
    </>
  );
}
