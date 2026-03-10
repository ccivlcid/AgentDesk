import { useState, useRef } from "react";
import type { Category } from "../../types";
import CategorySelectStep from "./CategorySelectStep";

interface ProjectCreateModalProps {
  categories: Category[];
  onConfirm: (params: { name: string; categoryId: string | null; project_path: string; core_goal?: string }) => void;
  onClose: () => void;
}

type Step = "category" | "info";

export default function ProjectCreateModal({ categories, onConfirm, onClose }: ProjectCreateModalProps) {
  const [step, setStep] = useState<Step>("category");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [coreGoal, setCoreGoal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => setStep("info"), 300);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const canConfirm = projectName.trim() && projectPath.trim();

  const handleConfirm = () => {
    setSubmitted(true);
    if (!canConfirm) return;
    setBusy(true);
    onConfirm({
      name: projectName.trim(),
      categoryId: selectedCategoryId,
      project_path: projectPath.trim(),
      core_goal: coreGoal.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[540px] max-h-[90vh] flex flex-col bg-[var(--th-bg-base)] border border-[var(--th-border)] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--th-border)]">
          <div>
            <h2 className="text-sm font-semibold">새 프로젝트</h2>
            <p className="text-xs text-[var(--th-text-muted)] mt-0.5">
              {step === "category" ? "Step 1 · 프로젝트 유형 선택" : "Step 2 · 기본 정보 입력"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l12 12M4 16L16 4" />
            </svg>
          </button>
        </div>

        {/* Step progress */}
        <div className="flex gap-1 px-5 pt-4">
          {(["category", "info"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={[
                "h-1 flex-1 rounded-full transition-colors",
                i === 0
                  ? "bg-[var(--th-accent)]"
                  : step === "info"
                    ? "bg-[var(--th-accent)]"
                    : "bg-[var(--th-border)]",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "category" ? (
            <>
              <p className="text-xs text-[var(--th-text-muted)] mb-3">
                프로젝트 유형을 선택하면 목표·리스크·검토 단계 템플릿이 자동으로 설정돼요.
                나중에 변경할 수 있어요.
              </p>
              <CategorySelectStep
                categories={categories}
                selectedId={selectedCategoryId}
                onSelect={handleCategorySelect}
              />
            </>
          ) : (
            <div className="space-y-4">
              {/* 선택된 카테고리 뱃지 */}
              {selectedCategory && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded border text-xs"
                  style={{
                    borderColor: `${selectedCategory.color}44`,
                    backgroundColor: `${selectedCategory.color}11`,
                    color: selectedCategory.color,
                  }}
                >
                  <span className="font-semibold">
                    {selectedCategory.name_ko ?? selectedCategory.name}
                  </span>
                  <span className="text-[var(--th-text-muted)]">유형으로 시작해요</span>
                </div>
              )}

              {/* 프로젝트 이름 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  프로젝트 이름 <span style={{ color: "var(--th-error, #ef4444)" }}>*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && handleConfirm()}
                  placeholder="예: 2026 Q2 마케팅 캠페인"
                  className="w-full px-3 py-2 text-sm bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded outline-none focus:border-[var(--th-accent)] transition-colors"
                  style={submitted && !projectName.trim() ? { borderColor: "var(--th-error, #ef4444)" } : {}}
                />
                {submitted && !projectName.trim() && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--th-error, #ef4444)" }}>
                    프로젝트 이름을 입력해주세요.
                  </p>
                )}
              </div>

              {/* 프로젝트 경로 — 필수 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  프로젝트 경로 <span style={{ color: "var(--th-error, #ef4444)" }}>*</span>
                </label>
                <p className="text-[10px] text-[var(--th-text-muted)] mb-1.5">
                  AI 에이전트가 실행될 로컬 폴더 경로입니다. 없으면 자동으로 생성됩니다.
                </p>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && handleConfirm()}
                  placeholder="예: /Users/me/projects/my-app  또는  C:\Projects\my-app"
                  className="w-full px-3 py-2 text-sm font-mono bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded outline-none focus:border-[var(--th-accent)] transition-colors"
                  style={submitted && !projectPath.trim() ? { borderColor: "var(--th-error, #ef4444)" } : {}}
                />
                {submitted && !projectPath.trim() && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--th-error, #ef4444)" }}>
                    프로젝트 경로는 필수입니다.
                  </p>
                )}
              </div>

              {/* 핵심 목표 — 선택 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  핵심 목표 <span style={{ color: "var(--th-text-muted)" }}>(선택)</span>
                </label>
                <input
                  type="text"
                  value={coreGoal}
                  onChange={(e) => setCoreGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && handleConfirm()}
                  placeholder="예: 2026년 Q2 출시를 위한 신규 기능 개발"
                  className="w-full px-3 py-2 text-sm bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded outline-none focus:border-[var(--th-accent)] transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--th-border)]">
          {step === "info" ? (
            <button
              onClick={() => setStep("category")}
              className="text-xs text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
            >
              ← 뒤로
            </button>
          ) : (
            <button
              onClick={() => { setSelectedCategoryId(null); setStep("info"); }}
              className="text-xs text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
            >
              유형 없이 시작하기
            </button>
          )}

          {step === "category" ? (
            <button
              onClick={() => setStep("info")}
              className="px-4 py-1.5 text-xs font-medium bg-[var(--th-accent)] text-white rounded hover:opacity-90 transition-opacity"
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="px-4 py-1.5 text-xs font-medium bg-[var(--th-accent)] text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {busy ? "생성 중…" : "프로젝트 만들기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
