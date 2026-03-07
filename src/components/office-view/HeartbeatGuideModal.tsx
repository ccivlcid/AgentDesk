import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { UiLanguage } from "../../i18n";

interface HeartbeatGuideModalProps {
  language: UiLanguage;
  onClose: () => void;
}

function pick(lang: UiLanguage, m: { ko: string; en: string; ja?: string; zh?: string }): string {
  const key = lang === "ko" ? "ko" : lang === "ja" ? "ja" : lang === "zh" ? "zh" : "en";
  return m[key] ?? m.en;
}

export default function HeartbeatGuideModal({ language, onClose }: HeartbeatGuideModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const t = (m: { ko: string; en: string; ja?: string; zh?: string }) => pick(language, m);

  const steps = [
    t({
      ko: "직원 살펴보기(Heartbeat)는 선택한 직원의 프로젝트·태스크 상태를 주기적으로 자동으로 확인하는 기능입니다. 따로 지시하지 않아도 이상이 있으면 알림을 보냅니다.",
      en: "Heartbeat automatically checks on projects and tasks for selected staff at set intervals. You get notified when something needs attention, without having to ask.",
      ja: "社員の様子(Heartbeat)は、選択した社員のプロジェクト・タスクの状態を定期的に自動確認する機能です。異常があれば通知されます。",
      zh: "员工动态(Heartbeat)会定期自动查看所选员工的项目与任务状态。有问题时会通知您，无需另行指示。",
    }),
    t({
      ko: "오피스 팩을 선택한 뒤, '살펴볼 직원 추가'에서 이 팩에 속한 직원을 선택하면 해당 직원이 살펴보기 대상에 포함됩니다. 간격(분)과 확인 항목(정체 태스크, 차단 태스크, 연속 실패, 대기 결정)을 설정할 수 있습니다.",
      en: "After choosing an office pack, use 'Add to monitor' to select staff in that pack. You can set the interval (minutes) and which items to check: stale tasks, blocked tasks, consecutive failures, pending decisions.",
      ja: "オフィスパックを選んだあと、「様子を見る社員を追加」でそのパックの社員を選ぶと対象になります。間隔(分)と確認項目を設定できます。",
      zh: "选择办公包后，在「添加监测对象」中选择该包下的员工即可纳入。可设置间隔(分钟)和确认项。",
    }),
    t({
      ko: "상태가 정상이면 로그만 남고 알림은 가지 않습니다. 문제가 발견되면 알림 센터와 CEO 메신저로 알림이 전송됩니다. '실행' 버튼으로 수동 확인을 즉시 실행할 수 있습니다.",
      en: "When status is normal, only logs are recorded and no notification is sent. When issues are found, alerts go to the notification center and CEO messenger. Use 'Run' to trigger a check manually.",
      ja: "状態が正常の場合はログのみで通知は送られません。問題があれば通知センターとCEOメッセンジャーに送信されます。「実行」で手動確認できます。",
      zh: "状态正常时仅记录日志不发送通知。发现问题时会向通知中心和CEO messenger发送提醒。可用「运行」手动执行确认。",
    }),
  ];

  const tip = t({
    ko: "현재 보이는 직원 목록과 살펴보기 대상은 선택한 오피스 팩에 따라 달라집니다. 팩을 바꾸면 해당 팩의 직원만 표시됩니다.",
    en: "The staff list and monitored list depend on the selected office pack. Changing the pack shows only that pack's staff.",
    ja: "表示される社員リストと対象は、選択したオフィスパックで変わります。",
    zh: "显示的员工列表和监测对象随所选办公包变化。",
  });

  const modal = (
    <div
      className="fixed inset-0 z-[2300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="heartbeat-guide-title"
    >
      <div
        className="relative w-full max-w-2xl min-w-0 max-h-[90vh] flex flex-col overflow-hidden"
        style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center" style={{ borderRadius: "2px", background: "rgba(244,63,94,0.15)", color: "rgb(253,164,175)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </span>
              <div>
                <h3 id="heartbeat-guide-title" className="text-base font-semibold font-mono tracking-tight" style={{ color: "var(--th-text-heading)" }}>
                  {t({ ko: "직원 살펴보기 가이드", en: "Heartbeat Guide", ja: "社員の様子ガイド", zh: "员工动态指南" })}
                </h3>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "직원 살펴보기 기능 설명 및 사용 방법", en: "What Heartbeat does and how to use it", ja: "社員の様子の説明と使い方", zh: "员工动态功能说明与用法" })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[var(--th-bg-surface-hover)]"
              style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
              aria-label={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-5">
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 group">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ borderRadius: "50%", background: "rgba(244,63,94,0.8)", color: "#fff" }}>
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 my-1 bg-rose-500/30" />
                  )}
                </div>
                <div className={`text-sm leading-relaxed font-mono ${i < steps.length - 1 ? "pb-4" : "pb-1"}`} style={{ color: "var(--th-text-secondary)" }}>
                  {step}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 px-4 py-3 flex gap-2.5" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
            <span className="text-amber-400 text-sm flex-shrink-0 mt-px">💡</span>
            <p className="text-xs text-amber-200/90 leading-relaxed">{tip}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 flex justify-end" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono transition-colors hover:bg-[var(--th-bg-surface-hover)]"
            style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", border: "1px solid var(--th-border)" }}
          >
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
