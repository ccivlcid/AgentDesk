import { useState } from "react";
import type { ProjectGate } from "../../types";
import { gatesApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface GatesPanelProps {
  projectId: string;
  gates: ProjectGate[];
  onUpdate: (v: ProjectGate[]) => void;
}

const STATUS_CONFIG: Record<ProjectGate["status"], { label: string; color: string; icon: string }> = {
  pending:     { label: "대기", color: "#6b7280", icon: "○" },
  in_progress: { label: "진행", color: "#3b82f6", icon: "◐" },
  passed:      { label: "통과", color: "#10b981", icon: "●" },
  failed:      { label: "실패", color: "#ef4444", icon: "✕" },
};

const STATUS_CYCLE: Record<ProjectGate["status"], ProjectGate["status"]> = {
  pending: "in_progress",
  in_progress: "passed",
  passed: "pending",
  failed: "pending",
};

export default function GatesPanel({ projectId, gates, onUpdate }: GatesPanelProps) {
  const [addingTitle, setAddingTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const title = addingTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const created = await gatesApi.create(projectId, { title });
      onUpdate([...gates, created]);
      setAddingTitle("");
      setShowInput(false);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusCycle = async (gate: ProjectGate) => {
    const nextStatus = STATUS_CYCLE[gate.status];
    const updated = await gatesApi.update(projectId, gate.id, { status: nextStatus });
    onUpdate(gates.map((g) => (g.id === gate.id ? updated : g)));
  };

  const handleDelete = async (id: string) => {
    await gatesApi.delete(projectId, id);
    onUpdate(gates.filter((g) => g.id !== id));
  };

  return (
    <QuadrantPanel
      title="검토 단계"
      subtitle="완료 전 확인해야 할 것"
      accentColor="#8b5cf6"
      emptyText="아직 검토 단계가 없어요."
      emptyGuide="완료 전 확인해야 할 체크포인트를 추가해보세요."
      addLabel="검토 단계 추가하기"
      onAdd={() => setShowInput(true)}
      isEmpty={gates.length === 0 && !showInput}
    >
      {gates.map((gate, i) => {
        const cfg = STATUS_CONFIG[gate.status];
        return (
          <div
            key={gate.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--th-bg-elevated)] group"
          >
            <span className="flex-shrink-0 text-[10px] text-[var(--th-text-muted)] w-4 text-right">
              {i + 1}
            </span>
            <button
              onClick={() => void handleStatusCycle(gate)}
              className="flex-shrink-0 text-sm leading-none transition-colors"
              style={{ color: cfg.color }}
              title={cfg.label}
            >
              {cfg.icon}
            </button>
            <span
              className={`flex-1 text-xs leading-snug ${gate.status === "passed" ? "line-through text-[var(--th-text-muted)]" : ""}`}
            >
              {gate.title}
            </span>
            <span
              className="hidden group-hover:block text-[9px] px-1 rounded flex-shrink-0"
              style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
            >
              {cfg.label}
            </span>
            <button
              onClick={() => void handleDelete(gate.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--th-text-muted)] hover:text-red-400 transition-opacity"
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M4 16L16 4" />
              </svg>
            </button>
          </div>
        );
      })}

      {showInput && (
        <div className="flex gap-1 px-2 py-1">
          <input
            autoFocus
            type="text"
            value={addingTitle}
            onChange={(e) => setAddingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
              if (e.key === "Escape") { setShowInput(false); setAddingTitle(""); }
            }}
            placeholder="단계명을 입력하세요"
            className="flex-1 text-xs px-2 py-1 bg-[var(--th-bg-base)] border border-[var(--th-border)]
                       rounded outline-none focus:border-[var(--th-accent)]"
          />
          <button
            onClick={() => void handleAdd()}
            disabled={busy}
            className="text-[10px] px-2 py-1 bg-[var(--th-accent)] text-white rounded disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}
    </QuadrantPanel>
  );
}
