import type { KeyboardEvent, RefObject } from "react";
import type { Agent, Department, Project } from "../../../types";
import AgentSelect from "../../AgentSelect";
import {
  TASK_TYPE_OPTIONS,
  priorityIcon,
  priorityLabel,
  taskTypeLabel,
  type MissingPathPrompt,
  type TFunction,
} from "../constants";

interface PrioritySectionProps {
  priority: number;
  t: TFunction;
  onPriorityChange: (priority: number) => void;
}

export function PrioritySection({ priority, t, onPriorityChange }: PrioritySectionProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
        {t({ ko: "우선순위", en: "Priority", ja: "優先度", zh: "优先级" })}: {priorityIcon(priority)}{" "}
        {priorityLabel(priority, t)} ({priority}/5)
      </label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onPriorityChange(star)}
            className="flex-1 py-2 text-base transition hover:opacity-80"
            style={{
              borderRadius: "2px",
              background: star <= priority ? "rgba(245,158,11,0.85)" : "var(--th-bg-primary)",
              color: star <= priority ? "#000" : "var(--th-text-muted)",
              border: `1px solid ${star <= priority ? "rgba(245,158,11,0.6)" : "var(--th-border)"}`,
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

interface AssigneeSectionProps {
  agents: Agent[];
  departments: Department[];
  departmentId: string;
  assignAgentId: string;
  t: TFunction;
  onAssignAgentChange: (agentId: string) => void;
}

export function AssigneeSection({
  agents,
  departments,
  departmentId,
  assignAgentId,
  t,
  onAssignAgentChange,
}: AssigneeSectionProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
        {t({ ko: "담당 에이전트", en: "Assignee", ja: "担当エージェント", zh: "负责人" })}
      </label>
      <AgentSelect
        agents={agents}
        departments={departments}
        value={assignAgentId}
        onChange={(value) => onAssignAgentChange(value)}
        placeholder={t({
          ko: "-- 미배정 --",
          en: "-- Unassigned --",
          ja: "-- 未割り当て --",
          zh: "-- 未分配 --",
        })}
        size="md"
      />
      {departmentId && agents.length === 0 && (
        <p className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "해당 부서에 에이전트가 없습니다.",
            en: "No agents are available in this department.",
            ja: "この部署にはエージェントがいません。",
            zh: "该部门暂无可用代理。",
          })}
        </p>
      )}
    </div>
  );
}

interface ProjectSectionProps {
  t: TFunction;
  projectPickerRef: RefObject<HTMLDivElement | null>;
  projectQuery: string;
  projectDropdownOpen: boolean;
  projectActiveIndex: number;
  projectsLoading: boolean;
  filteredProjects: Project[];
  selectedProject: Project | null;
  projects: Project[];
  createNewProjectMode: boolean;
  newProjectPath: string;
  pathApiUnsupported: boolean;
  pathSuggestionsOpen: boolean;
  pathSuggestionsLoading: boolean;
  pathSuggestions: string[];
  missingPathPrompt: MissingPathPrompt | null;
  nativePathPicking: boolean;
  nativePickerUnsupported: boolean;
  onProjectQueryChange: (value: string) => void;
  onProjectInputFocus: () => void;
  onProjectInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleProjectDropdown: () => void;
  onSelectProject: (project: Project | null) => void;
  onProjectHover: (projectId: string) => void;
  onEnableCreateNewProject: () => void;
  onNewProjectPathChange: (value: string) => void;
  onOpenManualPathBrowser: () => void;
  onTogglePathSuggestions: () => void;
  onPickNativePath: () => void;
  onSelectPathSuggestion: (path: string) => void;
}

export function ProjectSection({
  t,
  projectPickerRef,
  projectQuery,
  projectDropdownOpen,
  projectActiveIndex,
  projectsLoading,
  filteredProjects,
  selectedProject,
  projects,
  createNewProjectMode,
  newProjectPath,
  pathApiUnsupported,
  pathSuggestionsOpen,
  pathSuggestionsLoading,
  pathSuggestions,
  missingPathPrompt,
  nativePathPicking,
  nativePickerUnsupported,
  onProjectQueryChange,
  onProjectInputFocus,
  onProjectInputKeyDown,
  onToggleProjectDropdown,
  onSelectProject,
  onProjectHover,
  onEnableCreateNewProject,
  onNewProjectPathChange,
  onOpenManualPathBrowser,
  onTogglePathSuggestions,
  onPickNativePath,
  onSelectPathSuggestion,
}: ProjectSectionProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
        {t({ ko: "프로젝트명", en: "Project Name", ja: "プロジェクト名", zh: "项目名" })}
      </label>
      <div className="relative" ref={projectPickerRef}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectQuery}
            onChange={(event) => onProjectQueryChange(event.target.value)}
            onFocus={onProjectInputFocus}
            onKeyDown={onProjectInputKeyDown}
            placeholder={t({
              ko: "프로젝트 이름 또는 경로 입력",
              en: "Type project name or path",
              ja: "プロジェクト名またはパスを入力",
              zh: "输入项目名称或路径",
            })}
            className="w-full border outline-none transition"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
          />
          <button
            type="button"
            onClick={onToggleProjectDropdown}
            className="border px-2.5 py-2 text-xs font-mono transition hover:opacity-80"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-secondary)" }}
            title={t({
              ko: "프로젝트 목록 토글",
              en: "Toggle project list",
              ja: "プロジェクト一覧の切替",
              zh: "切换项目列表",
            })}
          >
            {projectDropdownOpen ? "▲" : "▼"}
          </button>
        </div>

        {projectDropdownOpen && (
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto border" style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-surface)" }}>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelectProject(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-mono transition hover:opacity-80"
              style={{ borderBottom: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
            >
              {t({
                ko: "-- 프로젝트 미지정 --",
                en: "-- No project --",
                ja: "-- プロジェクトなし --",
                zh: "-- 无项目 --",
              })}
            </button>
            {projectsLoading ? (
              <div className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "프로젝트 불러오는 중...",
                  en: "Loading projects...",
                  ja: "プロジェクトを読み込み中...",
                  zh: "正在加载项目...",
                })}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>
                <p className="pr-2">
                  {t({
                    ko: "신규 프로젝트로 생성할까요?",
                    en: "Create as a new project?",
                    ja: "新規プロジェクトとして作成しますか？",
                    zh: "要创建为新项目吗？",
                  })}
                </p>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onEnableCreateNewProject();
                  }}
                  className="ml-auto shrink-0 border px-3 py-1.5 text-xs font-semibold font-mono transition hover:opacity-80"
                  style={{ borderRadius: "2px", borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                >
                  {t({ ko: "예", en: "Yes", ja: "はい", zh: "是" })}
                </button>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelectProject(project);
                  }}
                  onMouseEnter={() => onProjectHover(project.id)}
                  className="w-full px-3 py-2 text-left transition hover:opacity-80"
                  style={{
                    background: projectActiveIndex >= 0 && filteredProjects[projectActiveIndex]?.id === project.id
                      ? "var(--th-bg-surface-hover)"
                      : selectedProject?.id === project.id
                        ? "var(--th-bg-surface)"
                        : "transparent",
                  }}
                >
                  <div className="truncate text-xs font-mono" style={{ color: "var(--th-text-primary)" }}>{project.name}</div>
                  <div className="truncate text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{project.project_path}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedProject && <p className="mt-1 break-all text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{selectedProject.project_path}</p>}

      {createNewProjectMode && !selectedProject && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "신규 프로젝트 경로",
              en: "New project path",
              ja: "新規プロジェクトパス",
              zh: "新项目路径",
            })}
          </label>
          <input
            type="text"
            value={newProjectPath}
            onChange={(event) => onNewProjectPathChange(event.target.value)}
            placeholder="/absolute/path/to/project"
            className="w-full border outline-none transition"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: "0.8125rem", padding: "0.4rem 0.625rem" }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pathApiUnsupported}
              onClick={onOpenManualPathBrowser}
              className="border px-2.5 py-1 text-xs font-semibold font-mono transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)" }}
            >
              {t({
                ko: "앱 내 폴더 탐색",
                en: "In-App Folder Browser",
                ja: "アプリ内フォルダ閲覧",
                zh: "应用内文件夹浏览",
              })}
            </button>
            <button
              type="button"
              disabled={pathApiUnsupported}
              onClick={onTogglePathSuggestions}
              className="border px-2.5 py-1 text-xs font-semibold font-mono transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)" }}
            >
              {pathSuggestionsOpen
                ? t({
                    ko: "자동 경로찾기 닫기",
                    en: "Close Auto Finder",
                    ja: "自動候補を閉じる",
                    zh: "关闭自动查找",
                  })
                : t({ ko: "자동 경로찾기", en: "Auto Path Finder", ja: "自動パス検索", zh: "自动路径查找" })}
            </button>
            <button
              type="button"
              disabled={nativePathPicking}
              onClick={onPickNativePath}
              className="border px-2.5 py-1 text-xs font-semibold font-mono transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-primary)" }}
            >
              {nativePathPicking
                ? t({
                    ko: "수동 경로찾기 여는 중...",
                    en: "Opening Manual Picker...",
                    ja: "手動パス選択を開いています...",
                    zh: "正在打开手动路径选择...",
                  })
                : nativePickerUnsupported
                  ? t({
                      ko: "수동 경로찾기(사용불가)",
                      en: "Manual Path Finder (Unavailable)",
                      ja: "手動パス選択（利用不可）",
                      zh: "手动路径选择（不可用）",
                    })
                  : t({
                      ko: "수동 경로찾기",
                      en: "Manual Path Finder",
                      ja: "手動パス選択",
                      zh: "手动路径选择",
                    })}
            </button>
          </div>
          {pathSuggestionsOpen && (
            <div className="max-h-40 overflow-y-auto border" style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-primary)" }}>
              {pathSuggestionsLoading ? (
                <p className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({
                    ko: "경로 후보를 불러오는 중...",
                    en: "Loading path suggestions...",
                    ja: "パス候補を読み込み中...",
                    zh: "正在加载路径候选...",
                  })}
                </p>
              ) : pathSuggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({
                    ko: "추천 경로가 없습니다. 직접 입력해주세요.",
                    en: "No suggested path. Enter one manually.",
                    ja: "候補パスがありません。手入力してください。",
                    zh: "没有推荐路径，请手动输入。",
                  })}
                </p>
              ) : (
                pathSuggestions.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => onSelectPathSuggestion(candidate)}
                    className="w-full px-3 py-2 text-left text-xs font-mono transition hover:opacity-80"
                    style={{ color: "var(--th-text-secondary)" }}
                  >
                    {candidate}
                  </button>
                ))
              )}
            </div>
          )}
          {missingPathPrompt && (
            <p className="text-xs text-amber-300">
              {t({
                ko: "해당 경로가 아직 존재하지 않습니다. 생성 확인 후 진행됩니다.",
                en: "This path does not exist yet. Creation confirmation will be requested.",
                ja: "このパスはまだ存在しません。作成確認後に続行されます。",
                zh: "该路径当前不存在，提交时会先请求创建确认。",
              })}
            </p>
          )}
          <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "설명 항목 내용이 신규 프로젝트의 핵심 목표(core_goal)로 저장됩니다.",
              en: "Description will be saved as the new project core goal.",
              ja: "説明欄の内容が新規プロジェクトのコア目標として保存されます。",
              zh: "说明内容会保存为新项目的核心目标。",
            })}
          </p>
        </div>
      )}

      {!projectsLoading && projects.length === 0 && (
        <p className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "등록된 프로젝트가 없습니다. 프로젝트 관리에서 먼저 생성해주세요.",
            en: "No registered project. Create one first in Project Manager.",
            ja: "登録済みプロジェクトがありません。先にプロジェクト管理で作成してください。",
            zh: "暂无已注册项目。请先在项目管理中创建。",
          })}
        </p>
      )}
    </div>
  );
}
