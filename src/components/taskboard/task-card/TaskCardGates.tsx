import { evaluateTaskGate } from "../../../api/pipeline-gates";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardGatesProps {
  state: TaskCardState;
}

export function TaskCardGates({ state }: TaskCardGatesProps) {
  const {
    t,
    locale,
    task,
    showGates,
    setShowGates,
    gateResults,
    loadGates,
  } = state;

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--th-border)" }}>
      <button
        type="button"
        onClick={() => setShowGates((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] transition-colors"
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>🔒</span>
        {t({ ko: "파이프라인 게이트", en: "Pipeline Gates", ja: "パイプラインゲート", zh: "管道门" })}
        {gateResults.length > 0 && (() => {
          const passed = gateResults.filter((g) => g.status === "passed" || g.status === "skipped").length;
          const failed = gateResults.filter((g) => g.status === "failed").length;
          return (
            <span className={`px-1.5 text-[10px] font-mono ${
              failed > 0 ? "bg-red-500/20 text-red-400" :
              passed === gateResults.length ? "bg-emerald-500/20 text-emerald-400" :
              "bg-amber-500/20 text-amber-400"
            }`} style={{ borderRadius: 6 }}>
              {passed}/{gateResults.length}
            </span>
          );
        })()}
        <span className="ml-0.5">{showGates ? "▲" : "▼"}</span>
      </button>

      {showGates && (
        <div className="mt-2 space-y-1">
          {gateResults.length === 0 && (
            <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "게이트 없음", en: "No gates configured", ja: "ゲートなし", zh: "无门控" })}
            </p>
          )}
          {gateResults.map((gate) => {
            const statusIcon = gate.status === "passed" ? "✓" :
              gate.status === "failed" ? "✗" :
              gate.status === "skipped" ? "↷" : "·";
            const isManual = gate.gate_type === "manual";
            const isPending = gate.status === "pending";
            return (
              <div
                key={gate.gate_id}
                className="flex items-center justify-between gap-2 border px-2 py-1"
                style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)", borderRadius: 6 }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-xs">{statusIcon}</span>
                  <span className="truncate text-[11px]" style={{ color: "var(--th-text-primary)" }}>
                    {locale === "ko" && gate.gate_label_ko ? gate.gate_label_ko : gate.gate_label}
                  </span>
                  {isManual && (
                    <span className="px-1 text-[9px] font-mono" style={{ background: "var(--th-accent-glow)", color: "var(--th-text-accent)", borderRadius: 6 }}>
                      {t({ ko: "수동", en: "Manual", ja: "手動", zh: "手动" })}
                    </span>
                  )}
                  {gate.sla_minutes && (
                    <span className="text-[9px]" style={{ color: "var(--th-text-muted)" }}>
                      SLA {gate.sla_minutes}m
                    </span>
                  )}
                </div>
                {isManual && isPending && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await evaluateTaskGate(task.id, gate.gate_id, { status: "passed" });
                        await loadGates();
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                      style={{ borderRadius: 6 }}
                    >
                      {t({ ko: "승인", en: "Pass", ja: "承認", zh: "通过" })}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await evaluateTaskGate(task.id, gate.gate_id, { status: "failed" });
                        await loadGates();
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      style={{ borderRadius: 6 }}
                    >
                      {t({ ko: "반려", en: "Fail", ja: "却下", zh: "拒绝" })}
                    </button>
                  </div>
                )}
                {gate.note && (
                  <span className="truncate text-[9px]" style={{ color: "var(--th-text-muted)" }} title={gate.note}>
                    {gate.note.slice(0, 30)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
