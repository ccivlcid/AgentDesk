import type { Project } from "../../../types";
import type { ProjectI18nTranslate } from "../types";

export function ProjectInfoSection({
  t,
  selectedProject,
  loadingDetail,
  isCreating,
}: {
  t: ProjectI18nTranslate;
  selectedProject: Project | null;
  loadingDetail: boolean;
  isCreating: boolean;
}) {
  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "프로젝트 정보", en: "Project Info", ja: "プロジェクト情報", zh: "项目信息" })}
        </h4>
        {selectedProject?.github_repo && (
          <a
            href={`https://github.com/${selectedProject.github_repo}`}
            target="_blank"
            rel="noopener noreferrer"
            title={selectedProject.github_repo}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono transition"
            style={{ borderRadius: 0, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)" }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {selectedProject.github_repo}
          </a>
        )}
      </div>
      {loadingDetail ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </p>
      ) : isCreating ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "신규 프로젝트를 입력 중입니다",
            en: "Creating a new project",
            ja: "新規プロジェクトを入力中です",
            zh: "正在输入新项目",
          })}
        </p>
      ) : !selectedProject ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "请选择项目" })}
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-xs">
          <p className="font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
            <span style={{ color: "var(--th-text-muted)" }}>ID:</span> {selectedProject.id}
          </p>
          <p className="break-all font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
            <span style={{ color: "var(--th-text-muted)" }}>Path:</span> {selectedProject.project_path}
          </p>
          <p className="break-all font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>
            <span style={{ color: "var(--th-text-muted)" }}>Goal:</span> {selectedProject.core_goal}
          </p>
        </div>
      )}
    </div>
  );
}
