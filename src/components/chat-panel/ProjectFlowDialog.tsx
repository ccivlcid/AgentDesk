import type { Project } from "../../types";

type ProjectFlowStep = "choose" | "existing" | "new" | "confirm";

type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

interface ProjectFlowDialogProps {
  open: boolean;
  step: ProjectFlowStep;
  isDirectivePending: boolean;
  pendingContent: string;
  projectLoading: boolean;
  projectItems: Project[];
  selectedProject: Project | null;
  existingProjectInput: string;
  existingProjectError: string;
  newProjectName: string;
  newProjectPath: string;
  newProjectGoal: string;
  projectSaving: boolean;
  canCreateProject: boolean;
  tr: Tr;
  onClose: () => void;
  onChooseExisting: () => void;
  onChooseNew: () => void;
  onBackToChoose: () => void;
  onSelectExistingProject: (project: Project, index: number) => void;
  onExistingProjectInputChange: (value: string) => void;
  onApplyExistingProjectSelection: () => void;
  onNewProjectNameChange: (value: string) => void;
  onNewProjectPathChange: (value: string) => void;
  onNewProjectGoalChange: (value: string) => void;
  onCreateProject: () => void;
  onConfirm: () => void;
}

export default function ProjectFlowDialog({
  open,
  step,
  isDirectivePending,
  pendingContent,
  projectLoading,
  projectItems,
  selectedProject,
  existingProjectInput,
  existingProjectError,
  newProjectName,
  newProjectPath,
  newProjectGoal,
  projectSaving,
  canCreateProject,
  tr,
  onClose,
  onChooseExisting,
  onChooseNew,
  onBackToChoose,
  onSelectExistingProject,
  onExistingProjectInputChange,
  onApplyExistingProjectSelection,
  onNewProjectNameChange,
  onNewProjectPathChange,
  onNewProjectGoalChange,
  onCreateProject,
  onConfirm,
}: ProjectFlowDialogProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md shadow-2xl" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <h3 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {tr("프로젝트 분기", "Project Branch", "プロジェクト分岐", "项目分支")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs font-mono transition"
            style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm">
          {step === "choose" && (
            <>
              <p className="font-mono" style={{ color: "var(--th-text-secondary)" }}>
                {tr(
                  "기존 프로젝트인가요? 신규 프로젝트인가요?",
                  "Is this an existing project or a new project?",
                  "既存プロジェクトですか？新規プロジェクトですか？",
                  "这是已有项目还是新项目？",
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onChooseExisting}
                  className="flex-1 px-3 py-2 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
                >
                  {tr("기존 프로젝트", "Existing Project", "既存プロジェクト", "已有项目")}
                </button>
                <button
                  type="button"
                  onClick={onChooseNew}
                  className="flex-1 px-3 py-2 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.15)", color: "rgb(167,243,208)" }}
                >
                  {tr("신규 프로젝트", "New Project", "新規プロジェクト", "新项目")}
                </button>
              </div>
            </>
          )}

          {step === "existing" && (
            <>
              <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "최근 프로젝트 10개를 보여드립니다. 번호(1-10) 또는 프로젝트명을 입력하세요.",
                  "Showing 10 recent projects. Enter a number (1-10) or project name.",
                  "最新プロジェクト10件を表示します。番号(1-10)またはプロジェクト名を入力してください。",
                  "显示最近 10 个项目。请输入编号(1-10)或项目名称。",
                )}
              </p>
              {projectLoading ? (
                <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {tr("불러오는 중...", "Loading...", "読み込み中...", "加载中...")}
                </p>
              ) : projectItems.length === 0 ? (
                <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {tr("프로젝트가 없습니다", "No projects", "プロジェクトなし", "暂无项目")}
                </p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {projectItems.map((project, idx) => (
                    <div key={project.id} className="p-2" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                      <p className="text-xs font-mono" style={{ color: "var(--th-text-primary)" }}>
                        <span className="mr-1" style={{ color: "var(--th-accent)" }}>{idx + 1}.</span>
                        {project.name}
                      </p>
                      <p className="truncate text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{project.project_path}</p>
                      <button
                        type="button"
                        onClick={() => onSelectExistingProject(project, idx)}
                        className="mt-2 px-2 py-1 text-[11px] font-mono transition"
                        style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)" }}
                      >
                        {tr("선택", "Select", "選択", "选择")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={existingProjectInput}
                  onChange={(e) => onExistingProjectInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onApplyExistingProjectSelection();
                    }
                  }}
                  placeholder={tr(
                    "예: 1 또는 프로젝트명",
                    "e.g. 1 or project name",
                    "例: 1 またはプロジェクト名",
                    "例如：1 或项目名",
                  )}
                  className="w-full px-2 py-1.5 text-xs outline-none font-mono"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                />
                {existingProjectError && <p className="text-[11px] font-mono" style={{ color: "rgb(253,164,175)" }}>{existingProjectError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onApplyExistingProjectSelection}
                    className="flex-1 px-2 py-1.5 text-[11px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)" }}
                  >
                    {tr("입력값으로 선택", "Select from input", "入力値で選択", "按输入选择")}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToChoose}
                    className="px-2 py-1.5 text-[11px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
                  >
                    {tr("뒤로", "Back", "戻る", "返回")}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "new" && (
            <>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => onNewProjectNameChange(e.target.value)}
                placeholder={tr("프로젝트 이름", "Project name", "プロジェクト名", "项目名称")}
                className="w-full px-3 py-2 text-xs outline-none font-mono"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => onNewProjectPathChange(e.target.value)}
                placeholder={tr("프로젝트 경로", "Project path", "プロジェクトパス", "项目路径")}
                className="w-full px-3 py-2 text-xs outline-none font-mono"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
              <textarea
                rows={3}
                value={newProjectGoal}
                onChange={(e) => onNewProjectGoalChange(e.target.value)}
                readOnly={isDirectivePending}
                placeholder={tr("핵심 목표", "Core goal", "コア目標", "核心目标")}
                className="w-full resize-none px-3 py-2 text-xs outline-none font-mono"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
              {isDirectivePending && (
                <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {tr(
                    "$ 업무지시 내용이 신규 프로젝트의 핵심 목표로 자동 반영됩니다.",
                    "The $ directive text is automatically used as the new project core goal.",
                    "$業務指示の内容が新規プロジェクトのコア目標として自動反映されます。",
                    "$ 指令内容会自动作为新项目核心目标。",
                  )}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCreateProject}
                  disabled={!canCreateProject || projectSaving}
                  className="flex-1 px-3 py-2 text-xs font-mono transition disabled:opacity-40"
                  style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.15)", color: "rgb(167,243,208)" }}
                >
                  {projectSaving
                    ? tr("등록 중...", "Creating...", "作成中...", "创建中...")
                    : tr("등록 후 선택", "Create & Select", "作成して選択", "创建并选择")}
                </button>
                <button
                  type="button"
                  onClick={onBackToChoose}
                  className="px-3 py-2 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
                >
                  {tr("뒤로", "Back", "戻る", "返回")}
                </button>
              </div>
            </>
          )}

          {step === "confirm" && selectedProject && (
            <>
              <div className="p-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                <p className="text-xs font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{selectedProject.name}</p>
                <p className="mt-1 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{selectedProject.project_path}</p>
                <p className="mt-1 text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{selectedProject.core_goal}</p>
                {selectedProject.assignment_mode === "manual" && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "rgb(196,181,253)" }}>
                    <span className="inline-block h-2 w-2" style={{ borderRadius: "50%", background: "rgb(167,139,250)" }}></span>
                    {tr(
                      `직접 선택 모드 — 지정된 ${selectedProject.assigned_agent_ids?.length ?? 0}명의 직원이 작업합니다`,
                      `Manual mode — ${selectedProject.assigned_agent_ids?.length ?? 0} assigned agents will work on this`,
                      `手動モード — ${selectedProject.assigned_agent_ids?.length ?? 0}名の指定エージェントが作業します`,
                      `手动模式 — ${selectedProject.assigned_agent_ids?.length ?? 0}名指定员工将执行此任务`,
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 text-[11px] font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)", color: "var(--th-text-secondary)" }}>
                <p className="font-semibold" style={{ color: "var(--th-accent)" }}>{tr("라운드 목표", "Round Goal", "ラウンド目標", "回合目标")}</p>
                <p className="mt-1 leading-relaxed">
                  {tr(
                    `프로젝트 핵심목표(${selectedProject.core_goal})를 기준으로 이번 요청(${pendingContent})을 실행 가능한 산출물로 완수`,
                    `Execute this round with project core goal (${selectedProject.core_goal}) and current request (${pendingContent}).`,
                    `プロジェクト目標(${selectedProject.core_goal})と今回依頼(${pendingContent})を基準に実行可能な成果物を完了します。`,
                    `以项目核心目标（${selectedProject.core_goal}）和本次请求（${pendingContent}）为基础完成本轮可执行产出。`,
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 px-3 py-2 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
                >
                  {tr("선택 후 전송", "Select & Send", "選択して送信", "选择并发送")}
                </button>
                <button
                  type="button"
                  onClick={onBackToChoose}
                  className="px-3 py-2 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
                >
                  {tr("다시 선택", "Re-select", "再選択", "重新选择")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
