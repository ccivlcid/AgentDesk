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
    <div className="relative" style={{ fontFamily: "var(--th-font-mono)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-none border border-[var(--th-border)] bg-transparent
                   px-2.5 py-1.5 text-left
                   hover:border-[var(--th-border-strong)] hover:bg-[var(--th-hover-bg)]
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--th-accent)]"
        style={{ transition: "border-color 0.15s, background 0.15s" }}
      >
        {/* 프로젝트 아이콘 — CLI 스타일 직각 */}
        <span
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-none"
          style={{
            backgroundColor: currentCategory ? `${currentCategory.color}20` : "var(--th-bg-surface)",
            border: `1px solid ${currentCategory ? `${currentCategory.color}50` : "var(--th-border)"}`,
            color: currentCategory?.color ?? "var(--th-text-muted)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="16" height="13" rx="0" />
            <path d="M2 8h16" />
          </svg>
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {currentProject ? (
            <>
              <span
                className="min-w-0 truncate text-[11px] font-semibold leading-tight"
                style={{ color: "var(--th-text-heading)" }}
              >
                {currentProject.name}
              </span>
              {currentCategory && (
                <span className="flex-shrink-0">
                  <CategoryBadge
                    label={currentCategory.name_ko ?? currentCategory.name}
                    color={currentCategory.color}
                  />
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              프로젝트 선택
            </span>
          )}
        </div>

        {/* 드롭다운 시질 — 직각 */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--th-text-muted)" }}
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
