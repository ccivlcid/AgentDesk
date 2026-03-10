import { useState } from "react";
import type { ProjectObjective } from "../../types";
import { objectivesApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface ObjectivesPanelProps {
  projectId: string;
  objectives: ProjectObjective[];
  onUpdate: (v: ProjectObjective[]) => void;
}

const STATUS_COLORS: Record<ProjectObjective["status"], string> = {
  active: "#3b82f6",
  completed: "#10b981",
  cancelled: "#6b7280",
};

export default function ObjectivesPanel({ projectId, objectives, onUpdate }: ObjectivesPanelProps) {
  const [addingTitle, setAddingTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const title = addingTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const created = await objectivesApi.create(projectId, { title });
      onUpdate([...objectives, created]);
      setAddingTitle("");
      setShowInput(false);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusToggle = async (obj: ProjectObjective) => {
    const nextStatus: ProjectObjective["status"] = obj.status === "active" ? "completed" : "active";
    const updated = await objectivesApi.update(projectId, obj.id, { status: nextStatus });
    onUpdate(objectives.map((o) => (o.id === obj.id ? updated : o)));
  };

  const handleDelete = async (id: string) => {
    await objectivesApi.delete(projectId, id);
    onUpdate(objectives.filter((o) => o.id !== id));
  };

  return (
    <QuadrantPanel
      title="목표"
      subtitle="프로젝트가 이루려는 것"
      accentColor="#3b82f6"
      emptyText="아직 목표가 없어요."
      emptyGuide="프로젝트가 이루려는 것을 추가해보세요."
      addLabel="첫 번째 목표 추가하기"
      onAdd={() => setShowInput(true)}
      isEmpty={objectives.length === 0 && !showInput}
    >
      {objectives.map((obj) => (
        <div
          key={obj.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[var(--th-bg-elevated)] group"
        >
          <button
            onClick={() => void handleStatusToggle(obj)}
            className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full border-2 transition-colors"
            style={{
              borderColor: STATUS_COLORS[obj.status],
              backgroundColor: obj.status === "completed" ? STATUS_COLORS.completed : "transparent",
            }}
          />
          <span
            className={`flex-1 text-xs leading-snug ${obj.status === "completed" ? "line-through text-[var(--th-text-muted)]" : ""}`}
          >
            {obj.title}
          </span>
          <button
            onClick={() => void handleDelete(obj.id)}
            className="opacity-0 group-hover:opacity-100 text-[var(--th-text-muted)] hover:text-red-400 transition-opacity"
          >
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l12 12M4 16L16 4" />
            </svg>
          </button>
        </div>
      ))}

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
            placeholder="목표를 입력하세요"
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
