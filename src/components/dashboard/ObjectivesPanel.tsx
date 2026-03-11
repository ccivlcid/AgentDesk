import { useState } from "react";
import type { ProjectObjective } from "../../types";
import { objectivesApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface ObjectivesPanelProps {
  projectId: string;
  objectives: ProjectObjective[];
  onUpdate: (v: ProjectObjective[]) => void;
}

const STATUS_COLOR: Record<ProjectObjective["status"], string> = {
  active: "#3b82f6",
  completed: "#3fb950",
  cancelled: "#6b7280",
};

const ICON = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="3" />
    <path d="M10 3V1M10 19v-2M3 10H1M19 10h-2" />
  </svg>
);

export default function ObjectivesPanel({ projectId, objectives, onUpdate }: ObjectivesPanelProps) {
  const [addingTitle, setAddingTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [progressDraft, setProgressDraft] = useState("");

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

  const handleProgressSave = async (obj: ProjectObjective) => {
    const val = Math.min(100, Math.max(0, parseInt(progressDraft, 10) || 0));
    const updated = await objectivesApi.update(projectId, obj.id, { progress: val });
    onUpdate(objectives.map((o) => (o.id === obj.id ? updated : o)));
    setEditingProgress(null);
  };

  const handleDelete = async (id: string) => {
    await objectivesApi.delete(projectId, id);
    onUpdate(objectives.filter((o) => o.id !== id));
  };

  return (
    <QuadrantPanel
      title="목표"
      subtitle="프로젝트가 달성해야 할 목표"
      icon={ICON}
      accentColor="#3b82f6"
      emptyText="아직 목표가 없어요."
      emptyGuide={"목표를 추가해 프로젝트 방향을 잡아보세요.\n예: 'Q2까지 앱 출시 완료', '사용자 1,000명 달성'"}
      addLabel="첫 번째 목표 추가하기"
      onAdd={() => setShowInput(true)}
      isEmpty={objectives.length === 0 && !showInput}
      helpText={"목표는 프로젝트가 완료됐을 때 무엇을 달성했는지를 나타냅니다.\n\n예시:\n• Q2까지 앱 출시 완료\n• 사용자 만족도 90% 달성\n• 오픈베타 사용자 1,000명 확보\n\n사용법:\n• 왼쪽 동그라미 클릭 → 완료 표시\n• 진행률(%) 클릭 → 수정\n• 항목에 마우스 올리기 → 삭제 버튼"}
    >
      {objectives.map((obj) => {
        const color = STATUS_COLOR[obj.status];
        const progress = obj.progress ?? 0;
        const done = obj.status === "completed";
        return (
          <div
            key={obj.id}
            className="group rounded px-2.5 py-2"
            style={{
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              opacity: obj.status === "cancelled" ? 0.5 : 1,
            }}
          >
            {/* 목표명 + 진행률 */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <button
                  onClick={() => void handleStatusToggle(obj)}
                  className="flex-shrink-0 mt-0.5 w-3 h-3 rounded-full border-2 transition-colors"
                  style={{
                    borderColor: color,
                    backgroundColor: done ? color : "transparent",
                  }}
                  title={done ? "완료됨 (클릭해서 되돌리기)" : "클릭해서 완료 표시"}
                />
                <span
                  className={`text-xs leading-snug flex-1 min-w-0 ${done ? "line-through text-[var(--th-text-muted)]" : ""}`}
                >
                  {obj.title}
                </span>
              </div>
              {/* 진행률 — 클릭해서 편집 */}
              {editingProgress === obj.id ? (
                <input
                  autoFocus
                  type="number"
                  min={0}
                  max={100}
                  value={progressDraft}
                  onChange={(e) => setProgressDraft(e.target.value)}
                  onBlur={() => void handleProgressSave(obj)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleProgressSave(obj);
                    if (e.key === "Escape") setEditingProgress(null);
                  }}
                  className="w-10 text-[10px] text-right px-1 rounded outline-none font-mono"
                  style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}
                />
              ) : (
                <button
                  onClick={() => { setEditingProgress(obj.id); setProgressDraft(String(progress)); }}
                  className="flex-shrink-0 text-[10px] font-mono tabular-nums transition-opacity"
                  style={{ color: done ? "#3fb950" : "#3b82f6" }}
                  title="클릭해서 진행률 수정"
                >
                  {progress}%
                </button>
              )}
              {/* 삭제 */}
              <button
                onClick={() => void handleDelete(obj.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                style={{ color: "var(--th-text-muted)" }}
              >
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l12 12M4 16L16 4" />
                </svg>
              </button>
            </div>

            {/* 진행 바 */}
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 4, background: "var(--th-bg-elevated)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: done ? "#3fb950" : "#3b82f6" }}
              />
            </div>
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
            placeholder="목표를 입력하세요"
            className="flex-1 text-xs px-2 py-1.5 rounded outline-none"
            style={{ background: "var(--th-bg-base)", border: "1px solid var(--th-border)" }}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded font-medium disabled:opacity-40"
            style={{ background: "#3b82f6", color: "#fff" }}
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
