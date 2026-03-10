import type { Category } from "../../types";
import CategoryBadge from "../project-selector/CategoryBadge";

interface ProjectNameStepProps {
  name: string;
  onChange: (name: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  selectedCategory: Category | null;
  busy?: boolean;
}

export default function ProjectNameStep({
  name,
  onChange,
  onConfirm,
  onBack,
  selectedCategory,
  busy = false,
}: ProjectNameStepProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 max-w-md mx-auto w-full">
      <h2 className="text-base font-bold mb-1">프로젝트 이름을 정해요</h2>
      <p className="text-xs text-[var(--th-text-muted)] mb-6 text-center">
        나중에 언제든 변경할 수 있어요.
      </p>

      {selectedCategory && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded border w-full"
          style={{
            borderColor: `${selectedCategory.color}44`,
            backgroundColor: `${selectedCategory.color}11`,
          }}
        >
          <CategoryBadge
            label={selectedCategory.name_ko ?? selectedCategory.name}
            color={selectedCategory.color}
          />
          <span className="text-xs text-[var(--th-text-muted)]">유형으로 시작해요</span>
        </div>
      )}

      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !busy && name.trim() && onConfirm()}
        placeholder="예: 2026 Q2 마케팅 캠페인"
        className="w-full px-4 py-2.5 text-sm bg-[var(--th-bg-surface)] border border-[var(--th-border)]
                   rounded outline-none focus:border-[var(--th-accent)] transition-colors mb-4"
      />

      <div className="flex items-center gap-3 w-full">
        <button
          onClick={onBack}
          className="flex-1 py-2 text-xs border border-[var(--th-border)] rounded
                     text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
        >
          ← 뒤로
        </button>
        <button
          onClick={onConfirm}
          disabled={!name.trim() || busy}
          className="flex-2 flex-grow py-2 text-xs bg-[var(--th-accent)] text-white rounded
                     hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {busy ? "생성 중…" : "프로젝트 만들기 →"}
        </button>
      </div>
    </div>
  );
}
