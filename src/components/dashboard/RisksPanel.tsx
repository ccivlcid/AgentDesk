import { useState } from "react";
import type { ProjectRisk } from "../../types";
import { risksApi } from "../../api/categories-dashboard";
import QuadrantPanel from "./QuadrantPanel";

interface RisksPanelProps {
  projectId: string;
  risks: ProjectRisk[];
  onUpdate: (v: ProjectRisk[]) => void;
}

const SEVERITY_CONFIG: Record<ProjectRisk["severity"], { label: string; color: string }> = {
  high:   { label: "높음", color: "#ef4444" },
  medium: { label: "보통", color: "#f59e0b" },
  low:    { label: "낮음", color: "#3b82f6" },
};

const ICON = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L2 17h16L10 2z" />
    <path d="M10 8v4M10 14h.01" />
  </svg>
);

export default function RisksPanel({ projectId, risks, onUpdate }: RisksPanelProps) {
  const [addingTitle, setAddingTitle] = useState("");
  const [addingSeverity, setAddingSeverity] = useState<ProjectRisk["severity"]>("medium");
  const [showInput, setShowInput] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const title = addingTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const created = await risksApi.create(projectId, { title, severity: addingSeverity });
      onUpdate([...risks, created]);
      setAddingTitle("");
      setShowInput(false);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusToggle = async (risk: ProjectRisk) => {
    const nextStatus: ProjectRisk["status"] = risk.status === "open" ? "mitigated" : "open";
    const updated = await risksApi.update(projectId, risk.id, { status: nextStatus });
    onUpdate(risks.map((r) => (r.id === risk.id ? updated : r)));
  };

  const handleDelete = async (id: string) => {
    await risksApi.delete(projectId, id);
    onUpdate(risks.filter((r) => r.id !== id));
  };

  const activeRisks = risks.filter((r) => r.status === "open");
  const mitigatedRisks = risks.filter((r) => r.status !== "open");

  return (
    <QuadrantPanel
      title="리스크"
      subtitle="프로젝트를 위협하는 위험 요소"
      icon={ICON}
      accentColor="#ef4444"
      emptyText="아직 리스크가 없어요."
      emptyGuide={"위험 요소를 미리 파악해두세요.\n예: '핵심 인력 이탈', 'API 응답 지연', '예산 초과'"}
      addLabel="리스크 추가하기"
      onAdd={() => setShowInput(true)}
      isEmpty={risks.length === 0 && !showInput}
      helpText={"리스크는 프로젝트 성공을 방해할 수 있는\n위험 요소를 미리 파악하고 추적합니다.\n\n예시:\n• 핵심 인력 이탈 위험 (높음)\n• 외부 API 불안정 (보통)\n• 일정 지연 가능성 (보통)\n• 예산 초과 우려 (높음)\n\n사용법:\n• 심각도(높음/보통/낮음) 선택 후 추가\n• '해결' 클릭 → 해결된 항목으로 이동\n• 항목에 마우스 올리기 → 버튼 표시"}
    >
      {activeRisks.map((risk) => {
        const sev = SEVERITY_CONFIG[risk.severity];
        return (
          <div
            key={risk.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[var(--th-bg-elevated)] group"
          >
            <span
              className="flex-shrink-0 mt-0.5 text-[9px] font-bold px-1 py-0.5 rounded leading-none"
              style={{ backgroundColor: `${sev.color}22`, color: sev.color }}
            >
              {sev.label}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-xs leading-snug">{risk.title}</span>
              {risk.owner && (
                <span className="ml-1 text-[9px] text-[var(--th-text-muted)]">@{risk.owner}</span>
              )}
            </span>
            <button
              onClick={() => void handleStatusToggle(risk)}
              className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--th-text-muted)] hover:text-[var(--th-accent)] transition-opacity whitespace-nowrap"
            >
              해결
            </button>
            <button
              onClick={() => void handleDelete(risk.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--th-text-muted)] hover:text-red-400 transition-opacity"
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M4 16L16 4" />
              </svg>
            </button>
          </div>
        );
      })}

      {mitigatedRisks.length > 0 && (
        <div className="px-2 pt-1 text-[9px] text-[var(--th-text-muted)] uppercase tracking-wider">
          해결됨 ({mitigatedRisks.length})
        </div>
      )}
      {mitigatedRisks.map((risk) => (
        <div
          key={risk.id}
          className="flex items-start gap-2 px-2 py-1 rounded opacity-50 group"
        >
          <span className="flex-1 text-xs line-through leading-snug">{risk.title}</span>
          <button
            onClick={() => void handleDelete(risk.id)}
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
          <select
            value={addingSeverity}
            onChange={(e) => setAddingSeverity(e.target.value as ProjectRisk["severity"])}
            className="text-xs px-1 py-1 bg-[var(--th-bg-base)] border border-[var(--th-border)] rounded outline-none"
          >
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
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
            placeholder="리스크를 입력하세요"
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
