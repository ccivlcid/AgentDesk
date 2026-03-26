import { useEffect, useRef } from "react";
import type { Category, Project } from "../../types";
import CategoryBadge from "./CategoryBadge";

interface ProjectDropdownProps {
  projects: Project[];
  categories: Category[];
  currentProjectId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export default function ProjectDropdown({
  projects,
  categories,
  currentProjectId,
  onSelect,
  onCreateNew,
  onClose,
}: ProjectDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const getCategoryForProject = (project: Project): Category | undefined => {
    if (!project.category_id) return undefined;
    return categories.find((c) => c.id === project.category_id);
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-none
                 border border-[var(--th-border-strong)] bg-[#FFFFFF]"
      style={{ fontFamily: "var(--th-font-mono)" }}
    >
      {/* 프로젝트 목록 */}
      <div className="max-h-48 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="px-3 py-3 text-xs text-[var(--th-text-muted)] text-center">
            프로젝트가 없어요
          </div>
        ) : (
          projects.map((project) => {
            const cat = getCategoryForProject(project);
            const isActive = project.id === currentProjectId;
            return (
              <button
                key={project.id}
                onClick={() => { onSelect(project.id); onClose(); }}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                  isActive
                    ? "bg-[#EBF5FF] text-[var(--th-text-primary)]"
                    : "hover:bg-[var(--th-bg-surface)] text-[var(--th-text-primary)]",
                ].join(" ")}
              >
                <span className="flex-1 truncate font-medium">{project.name}</span>
                {cat && (
                  <CategoryBadge label={cat.name_ko ?? cat.name} color={cat.color} />
                )}
                {isActive && (
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="flex-shrink-0 text-[var(--th-accent)]">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 구분선 + 새 프로젝트 */}
      <div className="border-t border-[var(--th-border)]">
        <button
          onClick={() => { onCreateNew(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--th-accent)]
                     hover:bg-[var(--th-bg-surface)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 4v12M4 10h12" />
          </svg>
          새 프로젝트 만들기
        </button>
      </div>
    </div>
  );
}
