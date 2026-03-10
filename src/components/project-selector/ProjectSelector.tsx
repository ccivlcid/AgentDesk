import { useState } from "react";
import type { Category, Project } from "../../types";
import CategoryBadge from "./CategoryBadge";
import ProjectDropdown from "./ProjectDropdown";

interface ProjectSelectorProps {
  currentProject: Project | null;
  projects: Project[];
  categories: Category[];
  onSelect: (projectId: string) => void;
  onCreateNew: () => void;
  collapsed?: boolean;
}

export default function ProjectSelector({
  currentProject,
  projects,
  categories,
  onSelect,
  onCreateNew,
  collapsed = false,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentCategory = currentProject?.category_id
    ? categories.find((c) => c.id === currentProject.category_id)
    : undefined;

  if (collapsed) {
    return (
      <button
        onClick={onCreateNew}
        title="프로젝트"
        className="w-8 h-8 flex items-center justify-center rounded
                   bg-[var(--th-bg-surface)] hover:bg-[var(--th-bg-elevated)]
                   border border-[var(--th-border)] transition-colors mx-auto"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="16" height="13" rx="1.5" />
          <path d="M2 8h16" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 px-2 py-2 rounded
                   hover:bg-[var(--th-bg-surface)] transition-colors text-left"
      >
        {/* 프로젝트 아이콘 */}
        <span className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5"
          style={{
            backgroundColor: currentCategory ? `${currentCategory.color}22` : "var(--th-bg-surface)",
            color: currentCategory?.color ?? "var(--th-text-muted)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="16" height="13" rx="1.5" />
            <path d="M2 8h16" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          {currentProject ? (
            <>
              <div className="text-xs font-semibold truncate leading-snug">
                {currentProject.name}
              </div>
              {currentCategory && (
                <div className="mt-0.5">
                  <CategoryBadge
                    label={currentCategory.name_ko ?? currentCategory.name}
                    color={currentCategory.color}
                  />
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-[var(--th-text-muted)]">프로젝트 선택</span>
          )}
        </div>

        {/* 드롭다운 화살표 */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`flex-shrink-0 mt-1 text-[var(--th-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ProjectDropdown
          projects={projects}
          categories={categories}
          currentProjectId={currentProject?.id ?? null}
          onSelect={onSelect}
          onCreateNew={onCreateNew}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
