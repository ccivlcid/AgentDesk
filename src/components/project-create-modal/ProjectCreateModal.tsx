import { useEffect, useState, useRef } from "react";
import type { Category } from "../../types";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, FormField } from "../ui";
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
    <Modal open onClose={onClose} width="md">
      <ModalHeader onClose={onClose}>새 프로젝트</ModalHeader>

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-1 text-[11px]">
        <span className={step === "category" ? "font-semibold" : ""} style={{ color: step === "category" ? "var(--th-accent)" : "var(--th-text-muted)" }}>
          ① 유형 선택
        </span>
        <span style={{ color: "var(--th-border)" }}>────</span>
        <span className={step === "info" ? "font-semibold" : ""} style={{ color: step === "info" ? "var(--th-accent)" : "var(--th-text-muted)" }}>
          ② 기본 정보
        </span>
      </div>

      <ModalBody>
        {step === "category" ? (
          <>
            <p className="text-xs mb-1" style={{ color: "var(--th-text-muted)" }}>어떤 종류의 프로젝트인가요?</p>
            <p className="text-[11px] mb-3" style={{ color: "var(--th-text-muted)" }}>
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
                className="flex items-center gap-2 px-3 py-2 text-xs"
                style={{
                  borderRadius: "2px",
                  border: `1px solid ${selectedCategory.color}44`,
                  background: `${selectedCategory.color}11`,
                }}
              >
                <span className="font-semibold" style={{ color: selectedCategory.color }}>
                  선택한 유형: {selectedCategory.name_ko ?? selectedCategory.name}
                </span>
                <button
                  onClick={() => setStep("category")}
                  className="ml-auto text-[10px] underline transition-colors"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  변경
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 text-xs"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
              >
                유형 없이 시작
                <button
                  onClick={() => setStep("category")}
                  className="ml-auto text-[10px] underline transition-colors"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  변경
                </button>
              </div>
            )}

            <FormField
              label="프로젝트 이름"
              required
              error={submitted && !projectName.trim() ? "프로젝트 이름을 입력해주세요." : undefined}
            >
              <Input
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="예: 쇼핑몰 앱 개발 2026"
                error={submitted && !projectName.trim()}
              />
            </FormField>

            <FormField
              label="프로젝트 경로"
              required
              hint="AI 에이전트가 실행될 로컬 폴더 경로입니다."
              error={submitted && !projectPath.trim() ? "프로젝트 경로는 필수입니다." : undefined}
            >
              <Input
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="/Users/me/projects/my-app"
                mono
                error={submitted && !projectPath.trim()}
              />
            </FormField>

            <FormField label="한 줄 목표" suffix="(선택)">
              <Input
                value={coreGoal}
                onChange={(e) => setCoreGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && handleConfirm()}
                placeholder="예: 2026년 Q2 출시를 위한 신규 기능 개발"
              />
            </FormField>

            {/* 자동 포함 항목 요약 */}
            {selectedCategory && autoIncludeItems.length > 0 && (
              <div
                className="px-3 py-2.5 text-xs space-y-1"
                style={{
                  borderRadius: "2px",
                  background: "var(--th-amber-glow)",
                  border: "1px solid var(--th-border-accent)",
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
      </ModalBody>

      <ModalFooter className="justify-between">
        {step === "info" ? (
          <Button variant="ghost" size="sm" onClick={() => setStep("category")}>
            ← 이전
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCategoryId(null); setStep("info"); }}>
            유형 없이 시작하기
          </Button>
        )}

        {step === "category" ? (
          <div className="flex items-center gap-3">
            {!selectedCategoryId && (
              <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>유형을 선택해야 다음으로 갈 수 있어요</span>
            )}
            <Button variant="primary" size="sm" onClick={() => setStep("info")} disabled={!selectedCategoryId}>
              다음 →
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={busy || !canConfirm}>
            {busy ? "생성 중…" : "시작!"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
