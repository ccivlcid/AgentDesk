import type { ManualAssignmentWarning, ProjectI18nTranslate, ProjectManualSelectionStats } from "./types";

interface ManualAssignmentWarningDialogProps {
  warning: ManualAssignmentWarning | null;
  stats: ProjectManualSelectionStats;
  t: ProjectI18nTranslate;
  onCancel: () => void;
  onConfirm: (warning: ManualAssignmentWarning) => void;
}

export default function ManualAssignmentWarningDialog({
  warning,
  stats,
  t,
  onCancel,
  onConfirm,
}: ManualAssignmentWarningDialogProps) {
  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[61] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{ borderRadius: "4px", border: "1px solid rgba(245,158,11,0.4)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-amber-500/30 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-accent)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "수동 배정 확인", en: "Manual Assignment Check", ja: "手動割り当て確認", zh: "手动分配确认" })}
          </h3>
        </div>
        <div className="space-y-2 px-4 py-4">
          <p className="text-xs font-mono" style={{ color: "var(--th-text-primary)" }}>
            {warning.reason === "no_agents"
              ? t({
                  ko: "직원이 선택되지 않았습니다. 이 상태로 저장하면 수동 모드 안전장치에 따라 팀장이 직접(단독) 실행할 수 있습니다. 계속 저장할까요?",
                  en: "No agents are selected. If you save now, the manual-mode safeguard may let team leaders execute tasks directly. Continue?",
                  ja: "エージェントが選択されていません。このまま保存すると実行時にチームリーダーが直接対応する可能性があります。続行しますか？",
                  zh: "当前未选择员工。若继续保存，运行时可能由组长直接执行。是否继续？",
                })
              : t({
                  ko: "팀장만 선택되어 있습니다. 하위 직원이 없으므로 수동 모드 안전장치에 따라 팀장이 직접(단독) 실행할 수 있습니다. 계속 저장할까요?",
                  en: "Only team leaders are selected. Without subordinates, the manual-mode safeguard may let team leaders execute tasks directly. Continue?",
                  ja: "チームリーダーのみ選択されています。サブ担当がいない場合、実行時にチームリーダーが直接対応する可能性があります。続行しますか？",
                  zh: "当前仅选择了组长。若无下属成员，运行时可能由组长直接执行。是否继续？",
                })}
          </p>
          <div className="px-3 py-2 text-[11px] font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}>
            <p>
              {t({ ko: "선택 요약", en: "Selection Summary", ja: "選択サマリー", zh: "选择摘要" })}: {stats.total}
            </p>
            <p>
              {t({ ko: "팀장", en: "Leaders", ja: "リーダー", zh: "组长" })}: {stats.leaders} ·{" "}
              {t({ ko: "하위 직원", en: "Subordinates", ja: "サブ担当", zh: "下属成员" })}: {stats.subordinates}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(warning)}
            className="px-3 py-1.5 text-xs font-semibold font-mono uppercase transition"
            style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            {t({ ko: "계속 저장", en: "Save Anyway", ja: "そのまま保存", zh: "仍然保存" })}
          </button>
        </div>
      </div>
    </div>
  );
}
