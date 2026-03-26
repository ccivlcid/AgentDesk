import { CLI_PROVIDERS } from "../constants";
import type { FormData } from "../types";

export function AgentFormModalCliBlock({
  tr,
  form,
  setForm,
}: {
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  return (
    <>
      <div className="mb-4">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: "#6B7280" }}>
          {tr("CLI 도구", "CLI Provider")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CLI_PROVIDERS.map((p) => {
            const active = form.cli_provider === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, cli_provider: p })}
                className="px-2.5 py-1.5 text-[11px] font-mono border transition-all"
                style={{
                  borderRadius: 6,
                  ...(active
                    ? { background: "#EBF5FF", color: "#3B82F6", borderColor: "#BFDBFE" }
                    : { borderColor: "#E5E7EB", color: "#9CA3AF" }),
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {["claude", "cursor", "codex", "gemini"].includes(form.cli_provider) && (
        <div className="mb-4">
          <label className="block text-xs mb-1.5 font-medium" style={{ color: "#6B7280" }}>
            {tr("기획 회의 단계", "Planning Phase")}
          </label>
          <button
            type="button"
            onClick={() => setForm({ ...form, enable_planning_phase: form.enable_planning_phase === 0 ? 1 : 0 })}
            className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 border transition-all"
            style={{
              borderRadius: 6,
              ...(form.enable_planning_phase !== 0
                ? { background: "#EBF5FF", color: "#3B82F6", borderColor: "#BFDBFE" }
                : { borderColor: "#E5E7EB", color: "#9CA3AF" }),
            }}
          >
            <span style={{ fontSize: 10 }}>{form.enable_planning_phase !== 0 ? "●" : "○"}</span>
            {form.enable_planning_phase !== 0
              ? tr("활성화 — 실행 전 플래닝 에이전트 자동 실행", "Enabled — auto-run planning agent before CLI")
              : tr("비활성화 — CLI 바로 실행", "Disabled — open CLI immediately")}
          </button>
        </div>
      )}
    </>
  );
}
