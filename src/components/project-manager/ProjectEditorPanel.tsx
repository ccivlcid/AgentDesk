import type { Dispatch, SetStateAction } from "react";
import { isApiRequestError, pickProjectPathNative, type ProjectDetailResponse } from "../../api";
import { WORKFLOW_PACK_KEYS, type Agent, type AssignmentMode, type Department, type Project, type WorkflowPackKey } from "../../types";
import type {
  FormFeedback,
  ManualAssignmentWarning,
  MissingPathPrompt,
  ProjectI18nTranslate,
  ProjectManualSelectionStats,
} from "./types";
import ManualAssignmentSelector from "./ManualAssignmentSelector";

interface ProjectEditorPanelProps {
  t: ProjectI18nTranslate;
  language: string;
  isCreating: boolean;
  editingProjectId: string | null;
  selectedProject: Project | null;
  detail: ProjectDetailResponse | null;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  projectPath: string;
  setProjectPath: Dispatch<SetStateAction<string>>;
  coreGoal: string;
  setCoreGoal: Dispatch<SetStateAction<string>>;
  saving: boolean;
  canSave: boolean;
  pathToolsVisible: boolean;
  pathSuggestionsOpen: boolean;
  setPathSuggestionsOpen: Dispatch<SetStateAction<boolean>>;
  pathSuggestionsLoading: boolean;
  pathSuggestions: string[];
  missingPathPrompt: MissingPathPrompt | null;
  setMissingPathPrompt: Dispatch<SetStateAction<MissingPathPrompt | null>>;
  pathApiUnsupported: boolean;
  setPathApiUnsupported: Dispatch<SetStateAction<boolean>>;
  nativePathPicking: boolean;
  setNativePathPicking: Dispatch<SetStateAction<boolean>>;
  nativePickerUnsupported: boolean;
  setNativePickerUnsupported: Dispatch<SetStateAction<boolean>>;
  setManualPathPickerOpen: Dispatch<SetStateAction<boolean>>;
  loadManualPathEntries: (targetPath?: string) => Promise<void>;
  unsupportedPathApiMessage: string;
  resolvePathHelperErrorMessage: (err: unknown, fallback: { ko: string; en: string; ja: string; zh: string }) => string;
  formFeedback: FormFeedback | null;
  setFormFeedback: Dispatch<SetStateAction<FormFeedback | null>>;
  defaultPackKey: WorkflowPackKey;
  setDefaultPackKey: Dispatch<SetStateAction<WorkflowPackKey>>;
  assignmentMode: AssignmentMode;
  setAssignmentMode: Dispatch<SetStateAction<AssignmentMode>>;
  setManualAssignmentWarning: Dispatch<SetStateAction<ManualAssignmentWarning | null>>;
  manualSelectionStats: ProjectManualSelectionStats;
  selectedAgentIds: Set<string>;
  setSelectedAgentIds: Dispatch<SetStateAction<Set<string>>>;
  agentFilterDept: string;
  setAgentFilterDept: Dispatch<SetStateAction<string>>;
  agents: Agent[];
  departments: Department[];
  spriteMap: Map<string, number>;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEditSelected: () => void;
  onDelete: () => void;
}

function packLabel(t: ProjectI18nTranslate, key: WorkflowPackKey): string {
  const labels: Record<WorkflowPackKey, { ko: string; en: string; ja: string; zh: string }> = {
    development: { ko: "개발", en: "Development", ja: "開発", zh: "开发" },
    novel: { ko: "소설", en: "Novel", ja: "小説", zh: "小说" },
    report: { ko: "보고서", en: "Report", ja: "レポート", zh: "报告" },
    video_preprod: { ko: "영상기획", en: "Video Preprod", ja: "映像企画", zh: "视频策划" },
    web_research_report: { ko: "웹서치+리포트", en: "Web Research", ja: "Web調査", zh: "网页调研" },
    roleplay: { ko: "롤플레이", en: "Roleplay", ja: "ロールプレイ", zh: "角色扮演" },
    asset_management: { ko: "자산운용", en: "Asset Management", ja: "資産運用", zh: "资产管理" },
  };
  return t(labels[key] ?? { ko: key, en: key, ja: key, zh: key });
}

export default function ProjectEditorPanel({
  t,
  language,
  isCreating,
  editingProjectId,
  selectedProject,
  detail,
  name,
  setName,
  projectPath,
  setProjectPath,
  coreGoal,
  setCoreGoal,
  saving,
  canSave,
  pathToolsVisible,
  pathSuggestionsOpen,
  setPathSuggestionsOpen,
  pathSuggestionsLoading,
  pathSuggestions,
  missingPathPrompt,
  setMissingPathPrompt,
  pathApiUnsupported,
  setPathApiUnsupported,
  nativePathPicking,
  setNativePathPicking,
  nativePickerUnsupported,
  setNativePickerUnsupported,
  setManualPathPickerOpen,
  loadManualPathEntries,
  unsupportedPathApiMessage,
  resolvePathHelperErrorMessage,
  formFeedback,
  setFormFeedback,
  defaultPackKey,
  setDefaultPackKey,
  assignmentMode,
  setAssignmentMode,
  setManualAssignmentWarning,
  manualSelectionStats,
  selectedAgentIds,
  setSelectedAgentIds,
  agentFilterDept,
  setAgentFilterDept,
  agents,
  departments,
  spriteMap,
  onSave,
  onCancelEdit,
  onStartEditSelected,
  onDelete,
}: ProjectEditorPanelProps) {
  return (
    <div className="min-w-0 space-y-3 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-surface)" }}>
      <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({ ko: "프로젝트 이름", en: "Project Name", ja: "プロジェクト名", zh: "项目名称" })}
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFormFeedback(null);
          }}
          disabled={!isCreating && !editingProjectId}
          className="mt-1 w-full px-3 py-2 text-xs font-mono outline-none"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
        />
      </label>
      <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({ ko: "프로젝트 경로", en: "Project Path", ja: "プロジェクトパス", zh: "项目路径" })}
        <input
          type="text"
          value={projectPath}
          onChange={(e) => {
            setProjectPath(e.target.value);
            setMissingPathPrompt(null);
            setFormFeedback(null);
          }}
          disabled={!isCreating && !editingProjectId}
          className="mt-1 w-full px-3 py-2 text-xs font-mono outline-none"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
        />
      </label>
      {pathToolsVisible && (
        <div className="space-y-2">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pathApiUnsupported}
              onClick={() => {
                setFormFeedback(null);
                setManualPathPickerOpen(true);
                void loadManualPathEntries(projectPath.trim() || undefined);
              }}
              className="px-2.5 py-1 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
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
              onClick={() => {
                setFormFeedback(null);
                setPathSuggestionsOpen((prev) => !prev);
              }}
              className="px-2.5 py-1 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {pathSuggestionsOpen
                ? t({ ko: "자동 경로찾기 닫기", en: "Close Auto Finder", ja: "自動候補を閉じる", zh: "关闭自动查找" })
                : t({ ko: "자동 경로찾기", en: "Auto Path Finder", ja: "自動パス検索", zh: "自动路径查找" })}
            </button>
            <button
              type="button"
              disabled={nativePathPicking}
              onClick={async () => {
                setNativePickerUnsupported(false);
                setNativePathPicking(true);
                try {
                  const picked = await pickProjectPathNative();
                  if (picked.cancelled || !picked.path) return;
                  setProjectPath(picked.path);
                  setMissingPathPrompt(null);
                  setPathSuggestionsOpen(false);
                  setFormFeedback(null);
                } catch (err) {
                  console.error("Failed to open native path picker:", err);
                  if (isApiRequestError(err) && err.status === 404) {
                    setPathApiUnsupported(true);
                    setFormFeedback({ tone: "info", message: unsupportedPathApiMessage });
                  } else {
                    const message = resolvePathHelperErrorMessage(err, {
                      ko: "운영체제 폴더 선택기를 열지 못했습니다.",
                      en: "Failed to open OS folder picker.",
                      ja: "OSフォルダ選択を開けませんでした。",
                      zh: "无法打开系统文件夹选择器。",
                    });
                    if (
                      isApiRequestError(err) &&
                      (err.code === "native_picker_unavailable" || err.code === "native_picker_failed")
                    ) {
                      setNativePickerUnsupported(true);
                      setManualPathPickerOpen(true);
                      await loadManualPathEntries(projectPath.trim() || undefined);
                      setFormFeedback({ tone: "info", message });
                    } else {
                      setFormFeedback({ tone: "error", message });
                    }
                  }
                } finally {
                  setNativePathPicking(false);
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
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
                  : t({ ko: "수동 경로찾기", en: "Manual Path Finder", ja: "手動パス選択", zh: "手动路径选择" })}
            </button>
          </div>
          {pathSuggestionsOpen && (
            <div className="max-h-40 overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
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
                    onClick={() => {
                      setProjectPath(candidate);
                      setMissingPathPrompt(null);
                      setPathSuggestionsOpen(false);
                      setFormFeedback(null);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-mono transition"
                    style={{ color: "var(--th-text-primary)" }}
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
                ko: "해당 경로가 아직 존재하지 않습니다. 저장 시 생성 여부를 확인합니다.",
                en: "This path does not exist yet. Save will ask whether to create it.",
                ja: "このパスはまだ存在しません。保存時に作成確認を行います。",
                zh: "该路径尚不存在，保存时会先确认是否创建。",
              })}
            </p>
          )}
        </div>
      )}
      {formFeedback && (
        <div
          className="px-3 py-2 text-xs font-mono"
          style={{
            borderRadius: "2px",
            border: formFeedback.tone === "error" ? "1px solid rgba(244,63,94,0.6)" : "1px solid rgba(6,182,212,0.5)",
            background: formFeedback.tone === "error" ? "rgba(244,63,94,0.1)" : "rgba(6,182,212,0.1)",
            color: formFeedback.tone === "error" ? "#fda4af" : "#67e8f9",
          }}
        >
          {formFeedback.message}
        </div>
      )}
      <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({ ko: "핵심 목표", en: "Core Goal", ja: "コア目標", zh: "核心目标" })}
        <textarea
          rows={5}
          value={coreGoal}
          onChange={(e) => {
            setCoreGoal(e.target.value);
            setFormFeedback(null);
          }}
          disabled={!isCreating && !editingProjectId}
          className="mt-1 w-full resize-none px-3 py-2 text-xs font-mono outline-none"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
        />
      </label>

      <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({ ko: "오피스 팩", en: "Office Pack", ja: "オフィスパック", zh: "办公包" })}
        <select
          value={defaultPackKey}
          onChange={(e) => setDefaultPackKey(e.target.value as WorkflowPackKey)}
          disabled={!isCreating && !editingProjectId}
          className="mt-1 w-full px-3 py-2 text-xs font-mono outline-none"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
        >
          {WORKFLOW_PACK_KEYS.map((key) => (
            <option key={key} value={key}>
              {packLabel(t, key)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "이 프로젝트에서 생성되는 태스크의 오피스 팩을 설정합니다",
            en: "Sets the office pack for tasks created in this project",
            ja: "このプロジェクトで作成されるタスクのオフィスパックを設定します",
            zh: "设置在此项目中创建的任务的办公包",
          })}
        </span>
      </label>

      <ManualAssignmentSelector
        t={t}
        language={language}
        isCreating={isCreating}
        editingProjectId={editingProjectId}
        assignmentMode={assignmentMode}
        setAssignmentMode={setAssignmentMode}
        setManualAssignmentWarning={setManualAssignmentWarning}
        manualSelectionStats={manualSelectionStats}
        selectedAgentIds={selectedAgentIds}
        setSelectedAgentIds={setSelectedAgentIds}
        agentFilterDept={agentFilterDept}
        setAgentFilterDept={setAgentFilterDept}
        departments={departments}
        agents={agents}
        spriteMap={spriteMap}
        detail={detail}
        selectedProject={selectedProject}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        {(isCreating || !!editingProjectId) && (
          <button
            type="button"
            onClick={() => {
              onSave();
            }}
            disabled={!canSave || saving}
            className="px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider disabled:opacity-40"
            style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            {editingProjectId
              ? t({ ko: "수정 저장", en: "Save", ja: "保存", zh: "保存" })
              : t({ ko: "프로젝트 등록", en: "Create", ja: "作成", zh: "创建" })}
          </button>
        )}
        {(isCreating || !!editingProjectId) && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3 py-1.5 text-xs font-mono"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
        )}
        <button
          type="button"
          onClick={onStartEditSelected}
          disabled={!selectedProject || isCreating || !!editingProjectId}
          className="px-3 py-1.5 text-xs font-mono disabled:opacity-40"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
        >
          {t({ ko: "선택 프로젝트 편집", en: "Edit Selected", ja: "選択編集", zh: "编辑选中项" })}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!selectedProject}
          className="px-3 py-1.5 text-xs font-mono disabled:opacity-40"
          style={{ borderRadius: "2px", border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5", background: "transparent" }}
        >
          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
        </button>
      </div>
    </div>
  );
}
