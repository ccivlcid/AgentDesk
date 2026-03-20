import { addTaskDependency, removeTaskDependency } from "../../../api/task-dependencies";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardDepsProps {
  state: TaskCardState;
}

export function TaskCardDeps({ state }: TaskCardDepsProps) {
  const {
    t,
    task,
    showDeps,
    setShowDeps,
    depPredecessors,
    depInput,
    setDepInput,
    depError,
    setDepError,
    loadDeps,
  } = state;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDeps((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] transition-colors"
        style={{ color: "var(--th-text-muted)" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        {t({ ko: "선행 태스크", en: "Dependencies", ja: "依存関係", zh: "依赖关系" })}
        {depPredecessors.length > 0 && (
          <span className="bg-amber-500/20 px-1.5 text-[10px] font-mono text-amber-400" style={{ borderRadius: 6 }}>{depPredecessors.length}</span>
        )}
        <span className="ml-0.5">{showDeps ? "▲" : "▼"}</span>
      </button>

      {showDeps && (
        <div className="mt-2 space-y-1.5">
          {depPredecessors.length === 0 && (
            <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "선행 태스크 없음", en: "No dependencies", ja: "依存なし", zh: "无依赖" })}
            </p>
          )}
          {depPredecessors.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between gap-2 border px-2 py-1" style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)", borderRadius: 6 }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium" style={{ color: "var(--th-text-primary)" }}>{dep.title}</p>
                <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{dep.status}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await removeTaskDependency(task.id, dep.id);
                  await loadDeps();
                }}
                className="shrink-0 p-0.5 text-[10px] font-mono text-red-400 hover:text-red-300"
                style={{ borderRadius: 6 }}
              >✕</button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={depInput}
              onChange={(e) => { setDepInput(e.target.value); setDepError(null); }}
              placeholder={t({ ko: "태스크 ID 입력", en: "Enter task ID", ja: "タスクIDを入力", zh: "输入任务ID" })}
              className="flex-1 border px-2 py-1 text-[11px] font-mono outline-none"
              style={{ borderRadius: 6, borderColor: "var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-primary)" }}
            />
            <button
              type="button"
              onClick={async () => {
                const id = depInput.trim();
                if (!id) return;
                const result = await addTaskDependency(task.id, id);
                if (result.ok) {
                  setDepInput("");
                  await loadDeps();
                } else {
                  setDepError(result.error ?? "Error");
                }
              }}
              className="border px-2 py-1 text-[11px] font-mono transition-colors hover:opacity-80"
              style={{ borderRadius: 6, borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
            >+</button>
          </div>
          {depError && <p className="text-[10px] text-red-400">{depError}</p>}
        </div>
      )}
    </>
  );
}
