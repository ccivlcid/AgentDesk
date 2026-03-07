import { useMemo, useState } from "react";
import type { Task } from "../../types";
import { useI18n } from "../../i18n";
import { HIDEABLE_STATUSES, isHideableStatus, taskStatusLabel, type HideableStatus } from "./constants";

interface BulkHideModalProps {
  tasks: Task[];
  hiddenTaskIds: Set<string>;
  onClose: () => void;
  onApply: (statuses: HideableStatus[]) => void;
}

export default function BulkHideModal({ tasks, hiddenTaskIds, onClose, onApply }: BulkHideModalProps) {
  const { t } = useI18n();

  const availableCounts = useMemo(() => {
    const counts: Record<HideableStatus, number> = {
      done: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const task of tasks) {
      if (!isHideableStatus(task.status) || hiddenTaskIds.has(task.id)) continue;
      counts[task.status] += 1;
    }
    return counts;
  }, [tasks, hiddenTaskIds]);

  const [selected, setSelected] = useState<Record<HideableStatus, boolean>>({
    done: availableCounts.done > 0,
    pending: availableCounts.pending > 0,
    cancelled: availableCounts.cancelled > 0,
  });

  const selectedStatuses = useMemo(
    () => HIDEABLE_STATUSES.filter((status) => selected[status] && availableCounts[status] > 0),
    [selected, availableCounts],
  );

  const hideTargetCount = useMemo(
    () => selectedStatuses.reduce((count, status) => count + availableCounts[status], 0),
    [selectedStatuses, availableCounts],
  );

  const statusRows = useMemo(
    () =>
      HIDEABLE_STATUSES.map((status) => ({
        status,
        label: taskStatusLabel(status, t),
        count: availableCounts[status],
      })),
    [availableCounts, t],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm p-5 shadow-2xl" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {t({
              ko: "숨길 상태 선택",
              en: "Select statuses to hide",
              ja: "非表示にする状態を選択",
              zh: "选择要隐藏的状态",
            })}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 transition"
            style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "transparent" }}
            title={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs leading-relaxed font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "완료/보류/취소 중 선택한 상태의 업무를 한 번에 숨깁니다.",
            en: "Hide all tasks in the selected done/pending/cancelled statuses at once.",
            ja: "選択した完了/保留/キャンセル状態のタスクを一括で非表示にします。",
            zh: "一次性隐藏所选完成/待处理/已取消状态的任务。",
          })}
        </p>

        <div className="space-y-2">
          {statusRows.map(({ status, label, count }) => (
            <label
              key={status}
              className="flex cursor-pointer items-center justify-between px-3 py-2"
              style={count > 0
                ? { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }
                : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-muted)", cursor: "not-allowed" }}
            >
              <span className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected[status]}
                  disabled={count <= 0}
                  onChange={() => {
                    setSelected((prev) => ({ ...prev, [status]: !prev[status] }));
                  }}
                  className="h-3.5 w-3.5"
                  style={{ accentColor: "var(--th-accent)" }}
                />
                {label}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-secondary)" }}>{count}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={() => onApply(selectedStatuses)}
            disabled={hideTargetCount <= 0}
            className="px-3 py-1.5 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
          >
            {t({ ko: "숨김 적용", en: "Apply hide", ja: "非表示適用", zh: "应用隐藏" })} ({hideTargetCount})
          </button>
        </div>
      </div>
    </div>
  );
}
