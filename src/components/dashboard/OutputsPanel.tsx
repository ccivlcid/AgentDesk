import { useState } from "react";
import type { ProjectOutput } from "../../types";
import { outputsApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface OutputsPanelProps {
  projectId: string;
  outputs: ProjectOutput[];
  onUpdate: (v: ProjectOutput[]) => void;
}

const TYPE_CONFIG: Record<ProjectOutput["type"], { label: string; icon: string }> = {
  document: { label: "문서", icon: "📄" },
  spec:     { label: "스펙", icon: "📋" },
  report:   { label: "보고서", icon: "📊" },
  other:    { label: "기타", icon: "📁" },
};

const STATUS_CONFIG: Record<ProjectOutput["status"], { label: string; color: string }> = {
  pending:     { label: "대기", color: "#6b7280" },
  in_progress: { label: "진행", color: "#3b82f6" },
  done:        { label: "완료", color: "#10b981" },
};

const STATUS_CYCLE: Record<ProjectOutput["status"], ProjectOutput["status"]> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

export default function OutputsPanel({ projectId, outputs, onUpdate }: OutputsPanelProps) {
  const [addingTitle, setAddingTitle] = useState("");
  const [addingType, setAddingType] = useState<ProjectOutput["type"]>("document");
  const [showInput, setShowInput] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const title = addingTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const created = await outputsApi.create(projectId, { title, type: addingType });
      onUpdate([...outputs, created]);
      setAddingTitle("");
      setShowInput(false);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusCycle = async (output: ProjectOutput) => {
    const nextStatus = STATUS_CYCLE[output.status];
    const updated = await outputsApi.update(projectId, output.id, { status: nextStatus });
    onUpdate(outputs.map((o) => (o.id === output.id ? updated : o)));
  };

  const handleDelete = async (id: string) => {
    await outputsApi.delete(projectId, id);
    onUpdate(outputs.filter((o) => o.id !== id));
  };

  return (
    <QuadrantPanel
      title="산출물"
      subtitle="프로젝트가 만들어낼 결과물 목록"
      accentColor="#10b981"
      emptyText="아직 산출물이 없어요"
      addLabel="산출물 추가"
      onAdd={() => setShowInput(true)}
      isEmpty={outputs.length === 0 && !showInput}
    >
      {outputs.map((output) => {
        const typeCfg = TYPE_CONFIG[output.type];
        const statusCfg = STATUS_CONFIG[output.status];
        return (
          <div
            key={output.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--th-bg-elevated)] group"
          >
            <span className="flex-shrink-0 text-sm">{typeCfg.icon}</span>
            <span
              className={`flex-1 text-xs leading-snug truncate ${output.status === "done" ? "line-through text-[var(--th-text-muted)]" : ""}`}
            >
              {output.title}
            </span>
            <button
              onClick={() => void handleStatusCycle(output)}
              className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded transition-colors"
              style={{ backgroundColor: `${statusCfg.color}22`, color: statusCfg.color }}
            >
              {statusCfg.label}
            </button>
            <button
              onClick={() => void handleDelete(output.id)}
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
          <select
            value={addingType}
            onChange={(e) => setAddingType(e.target.value as ProjectOutput["type"])}
            className="text-xs px-1 py-1 bg-[var(--th-bg-base)] border border-[var(--th-border)] rounded outline-none"
          >
            <option value="document">문서</option>
            <option value="spec">스펙</option>
            <option value="report">보고서</option>
            <option value="other">기타</option>
          </select>
          <input
            autoFocus
            type="text"
            value={addingTitle}
            onChange={(e) => setAddingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
              if (e.key === "Escape") { setShowInput(false); setAddingTitle(""); }
            }}
            placeholder="산출물 이름을 입력하세요"
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
