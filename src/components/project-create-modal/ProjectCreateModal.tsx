import { useEffect, useState, useRef } from "react";
import type { Category } from "../../types";
import CategorySelectStep from "./CategorySelectStep";

interface ProjectCreateModalProps {
  categories: Category[];
  onConfirm: (params: { name: string; categoryId: string | null; project_path: string; core_goal?: string }) => void;
  onClose: () => void;
}

type Step = "category" | "info";

function parseSchema(schema: string): string[] {
  try {
    const parsed = JSON.parse(schema);
    if (Array.isArray(parsed)) {
      return parsed
        .slice(0, 3)
        .map((item: Record<string, string>) => item.name ?? item.title ?? item.label ?? "")
        .filter(Boolean);
    }
  } catch { /* ignore */ }
  return [];
}

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

  // Auto-generate project_path from name
  useEffect(() => {
    if (!projectName.trim()) {
      setProjectPath("");
      return;
    }
    const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
    setProjectPath(`~/projects/${safeName}`);
  }, [projectName]);

  const canConfirm = projectName.trim().length > 0 && projectPath.trim().length > 0;

  const handleConfirm = () => {
    setSubmitted(true);
    if (!canConfirm) return;
    setBusy(true);
    onConfirm({
      name: projectName.trim(),
      categoryId: selectedCategoryId,
      project_path: projectPath.trim(),
      core_goal: coreGoal.trim() || (selectedCategory ? `${selectedCategory.name_ko ?? selectedCategory.name} 프로젝트` : undefined),
    });
  };

  /* 자동 포함 항목 요약 */
  const autoIncludeItems: { icon: string; label: string }[] = [];
  if (selectedCategory) {
    const gates = parseSchema(selectedCategory.gate_schema);
    const deliverables = parseSchema(selectedCategory.deliverable_schema);
    const kpis = parseSchema(selectedCategory.kpi_schema);
    if (gates.length > 0) {
      autoIncludeItems.push({ icon: "✓", label: `검토 단계 ${gates.length}개 (${gates.join(", ")})` });
    }
    if (deliverables.length > 0) {
      autoIncludeItems.push({ icon: "✓", label: `결과물 목록 (${deliverables.join(", ")})` });
    }
    if (kpis.length > 0) {
      autoIncludeItems.push({ icon: "✓", label: `성과 지표 ${kpis.length}개` });
    }
    if (autoIncludeItems.length === 0) {
      autoIncludeItems.push({ icon: "✓", label: "유형에 맞는 목표·검토 단계·결과물 양식" });
    }
    autoIncludeItems.push({ icon: "ℹ", label: "나중에 원하는 대로 수정할 수 있어요." });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[560px] max-h-[90vh] flex flex-col bg-[var(--th-bg-base)] border border-[var(--th-border)] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--th-border)]">
          <h2 className="text-sm font-semibold">새 프로젝트</h2>
          <button
            onClick={onClose}
            className="text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l12 12M4 16L16 4" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-1 text-[11px]">
          <span className={step === "category" ? "font-semibold text-[var(--th-accent)]" : "text-[var(--th-text-muted)]"}>
            ① 유형 선택
          </span>
          <span className="text-[var(--th-border)]">────</span>
          <span className={step === "info" ? "font-semibold text-[var(--th-accent)]" : "text-[var(--th-text-muted)]"}>
            ② 기본 정보
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "category" ? (
            <>
              <p className="text-xs text-[var(--th-text-muted)] mb-1">어떤 종류의 프로젝트인가요?</p>
              <p className="text-[11px] text-[var(--th-text-muted)] mb-3">
                유형에 맞는 목표·체크포인트·결과물 양식이 자동 설정됩니다.
              </p>
              <CategorySelectStep
                categories={categories}
                selectedId={selectedCategoryId}
                onSelect={handleCategorySelect}
              />
            </>
          ) : (
            <div className="space-y-4">
              {/* 선택된 카테고리 */}
              {selectedCategory ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded border text-xs"
                  style={{
                    borderColor: `${selectedCategory.color}44`,
                    backgroundColor: `${selectedCategory.color}11`,
                  }}
                >
                  <span className="font-semibold" style={{ color: selectedCategory.color }}>
                    선택한 유형: {selectedCategory.name_ko ?? selectedCategory.name}
                  </span>
                  <button
                    onClick={() => setStep("category")}
                    className="ml-auto text-[10px] underline text-[var(--th-text-muted)] hover:text-[var(--th-text)]"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--th-border)] text-xs text-[var(--th-text-muted)]">
                  유형 없이 시작
                  <button
                    onClick={() => setStep("category")}
                    className="ml-auto text-[10px] underline hover:text-[var(--th-text)]"
                  >
                    변경
                  </button>
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
                  placeholder="예: 쇼핑몰 앱 개발 2026"
                  className="w-full px-3 py-2 text-sm bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded outline-none focus:border-[var(--th-accent)] transition-colors"
                  style={submitted && !projectName.trim() ? { borderColor: "var(--th-error, #ef4444)" } : {}}
                />
                {submitted && !projectName.trim() && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--th-error, #ef4444)" }}>
                    프로젝트 이름을 입력해주세요.
                  </p>
                )}
              </div>

              {/* 프로젝트 경로 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  프로젝트 경로 <span style={{ color: "var(--th-error, #ef4444)" }}>*</span>
                </label>
                <p className="text-[10px] text-[var(--th-text-muted)] mb-1.5">
                  AI 에이전트가 실행될 로컬 폴더 경로입니다.
                </p>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/me/projects/my-app"
                  className="w-full px-3 py-2 text-sm bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded outline-none focus:border-[var(--th-accent)] transition-colors font-mono"
                  style={submitted && !projectPath.trim() ? { borderColor: "var(--th-error, #ef4444)" } : {}}
                />
                {submitted && !projectPath.trim() && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--th-error, #ef4444)" }}>
                    프로젝트 경로는 필수입니다.
                  </p>
                )}
              </div>

              {/* 한 줄 목표 */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  한 줄 목표 <span className="text-[var(--th-text-muted)] font-normal">(선택)</span>
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

              {/* 자동 포함 항목 요약 */}
              {selectedCategory && autoIncludeItems.length > 0 && (
                <div
                  className="rounded px-3 py-2.5 text-xs space-y-1"
                  style={{
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <p className="font-medium text-[11px] mb-1.5" style={{ color: "var(--th-text-muted)" }}>
                    이 유형에는 다음이 자동 포함됩니다
                  </p>
                  {autoIncludeItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5" style={{ color: "var(--th-text-muted)" }}>
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
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
              ← 이전
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
            <div className="flex items-center gap-3">
              {!selectedCategoryId && (
                <span className="text-[10px] text-[var(--th-text-muted)]">유형을 선택해야 다음으로 갈 수 있어요</span>
              )}
              <button
                onClick={() => setStep("info")}
                disabled={!selectedCategoryId}
                className="px-4 py-1.5 text-xs font-medium bg-[var(--th-accent)] text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                다음 →
              </button>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={busy || !canConfirm}
              className="px-4 py-1.5 text-xs font-medium bg-[var(--th-accent)] text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {busy ? "생성 중…" : "시작!"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
