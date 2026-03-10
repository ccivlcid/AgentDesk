import { useState } from "react";
import type { ProjectGate } from "../../types";
import { gatesApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface GatesPanelProps {
  projectId: string;
  gates: ProjectGate[];
  onUpdate: (v: ProjectGate[]) => void;
}

/* spec §6-5 상태 아이콘/색상 */
const STATUS_CONFIG: Record<ProjectGate["status"], { label: string; color: string; icon: string }> = {
  pending:     { label: "대기 중",  color: "#6e7681", icon: "○" },
  in_progress: { label: "진행 중",  color: "#f59e0b", icon: "▶" },
  passed:      { label: "완료",     color: "#3fb950", icon: "✓" },
  failed:      { label: "실패",     color: "#f85149", icon: "✕" },
};

const STATUS_CYCLE: Record<ProjectGate["status"], ProjectGate["status"]> = {
  pending: "in_progress",
  in_progress: "passed",
  passed: "pending",
  failed: "pending",
};

const ICON = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l2 2 4-4" />
    <rect x="3" y="3" width="14" height="14" rx="2" />
  </svg>
);

function formatDate(ts: number | null): string | null {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
      icon={ICON}
      accentColor="#8b5cf6"
      emptyText="아직 검토 단계가 없어요."
      emptyGuide="완료 전 확인해야 할 체크포인트를 추가해보세요."
      addLabel="검토 단계 추가하기"
      onAdd={() => setShowInput(true)}
      isEmpty={gates.length === 0 && !showInput}
    >
      {gates.map((gate) => {
        const cfg = STATUS_CONFIG[gate.status];
        const dueDate = formatDate(gate.due_date);
        const isPassed = gate.status === "passed";
        return (
          <div
            key={gate.id}
            className="group flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[var(--th-bg-elevated)] transition-colors"
          >
            {/* 상태 아이콘 — 클릭해서 순환 */}
            <button
              onClick={() => void handleStatusCycle(gate)}
              className="flex-shrink-0 w-5 text-center text-sm leading-none transition-colors font-mono"
              style={{ color: cfg.color }}
              title={`${cfg.label} → 클릭해서 변경`}
            >
              {cfg.icon}
            </button>

            {/* 제목 + due_date */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs leading-snug ${isPassed ? "line-through text-[var(--th-text-muted)]" : ""}`}
              >
                {gate.title}
              </span>
              {dueDate && !isPassed && (
                <span className="ml-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {dueDate}
                </span>
              )}
            </div>

            {/* 상태 라벨 (hover) */}
            <span
              className="hidden group-hover:inline text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
              style={{ background: `${cfg.color}22`, color: cfg.color }}
            >
              {cfg.label}
            </span>

            {/* 삭제 */}
            <button
              onClick={() => void handleDelete(gate.id)}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
              style={{ color: "var(--th-text-muted)" }}
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M4 16L16 4" />
              </svg>
            </button>
          </div>
        );
      })}

      {showInput && (
        <div className="flex gap-1 px-1 py-1">
          <input
            autoFocus
            type="text"
            value={addingTitle}
            onChange={(e) => setAddingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
              if (e.key === "Escape") { setShowInput(false); setAddingTitle(""); }
            }}
            placeholder="검토 단계명을 입력하세요"
            className="flex-1 text-xs px-2 py-1.5 rounded outline-none"
            style={{ background: "var(--th-bg-base)", border: "1px solid var(--th-border)" }}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded font-medium disabled:opacity-40"
            style={{ background: "#8b5cf6", color: "#fff" }}
          >
            추가
          </button>
          <button
            onClick={() => { setShowInput(false); setAddingTitle(""); }}
            className="text-[10px] px-2 py-1.5 rounded"
            style={{ color: "var(--th-text-muted)" }}
          >
            취소
          </button>
        </div>
      )}
    </QuadrantPanel>
  );
}
