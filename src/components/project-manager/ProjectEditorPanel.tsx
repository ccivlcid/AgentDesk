import { useState, type Dispatch, type SetStateAction } from "react";
import { isApiRequestError, pickProjectPathNative, type ProjectDetailResponse } from "../../api";
import { useUiStore } from "../../store/uiStore";
import type { ProjectTemplate, ProjectSource } from "../../api/organization-projects";
import { type Agent, type AssignmentMode, type Department, type Project } from "../../types";
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
  showFigmaField: boolean;
  figmaConnected: boolean | null;
  figmaUrl: string;
  setFigmaUrl: Dispatch<SetStateAction<string>>;
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
  defaultPackKey: string;
  setDefaultPackKey: Dispatch<SetStateAction<string>>;
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
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEditSelected: () => void;
  onDelete: () => void;
  templates?: ProjectTemplate[];
  onApplyTemplate?: (template: ProjectTemplate) => void;
  sources?: ProjectSource[];
  sourcesLoading?: boolean;
  allProjects?: Array<{ id: string; name: string; category_id?: string | null }>;
  onAddSource?: (sourceProjectId: string) => Promise<void>;
  onRemoveSource?: (sourceId: string) => Promise<void>;
}

// ── ProjectSourcesSection ────────────────────────────────────────────────────

interface ProjectSourcesSectionProps {
  t: ProjectI18nTranslate;
  isEditing: boolean;
  projectId: string | null;
  sources: ProjectSource[];
  sourcesLoading: boolean;
  allProjects: Array<{ id: string; name: string; category_id?: string | null }>;
  onAddSource: (sourceProjectId: string) => Promise<void>;
  onRemoveSource: (sourceId: string) => Promise<void>;
}

function ProjectSourcesSection({
  t,
  isEditing,
  projectId,
  sources,
  sourcesLoading,
  allProjects,
  onAddSource,
  onRemoveSource,
}: ProjectSourcesSectionProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const linkedIds = new Set(sources.map((s) => s.source_project_id));
  const available = allProjects.filter(
    (p) => p.id !== projectId && !linkedIds.has(p.id),
  );
  const filtered = searchQ.trim()
    ? available.filter((p) => p.name.toLowerCase().includes(searchQ.toLowerCase()))
    : available;

  async function handleAdd(sourceProjectId: string) {
    setAddingId(sourceProjectId);
    setAddError(null);
    try {
      await onAddSource(sourceProjectId);
      setDropdownOpen(false);
      setSearchQ("");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "circular_reference") {
        setAddError(t({ ko: "순환 참조: 소스 프로젝트가 이미 이 프로젝트를 참조 중입니다.", en: "Circular reference: source already links back to this project.", ja: "循環参照: ソースが既にこのプロジェクトを参照しています。", zh: "循环引用：来源已引用此项目。" }));
      } else if (code === "max_sources_reached") {
        setAddError(t({ ko: "최대 5개까지 연결 가능합니다.", en: "Max 5 sources allowed.", ja: "最大5つまで接続可能です。", zh: "最多连接5个。" }));
      } else {
        setAddError(t({ ko: "추가 실패.", en: "Failed to add.", ja: "追加失敗。", zh: "添加失败。" }));
      }
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(sourceId: string) {
    setRemovingId(sourceId);
    try {
      await onRemoveSource(sourceId);
    } finally {
      setRemovingId(null);
    }
  }

  const maxReached = sources.length >= 5;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono uppercase tracking-[0.1em]" style={{ color: "var(--th-text-muted)", letterSpacing: "0.1em" }}>
          {t({ ko: "소스 프로젝트", en: "Sources", ja: "ソース", zh: "来源" })}
        </span>
        {sources.length > 0 && (
          <span className="text-[9px] font-mono" style={{ color: "var(--th-accent)" }}>
            {t({ ko: `${sources.length}개 연결됨`, en: `${sources.length} linked`, ja: `${sources.length}個接続中`, zh: `已连接${sources.length}个` })}
          </span>
        )}
      </div>

      {sourcesLoading ? (
        <div className="space-y-1">
          {[0, 1].map((i) => (
            <div key={i} className="h-5 w-full" style={{ background: "var(--th-bg-elevated)", opacity: 0.3 }} />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="px-3 py-3 text-[10px] font-mono" style={{ border: "1px dashed #E5E7EB", color: "var(--th-text-muted)" }}>
          <p>$ ls sources/</p>
          <p style={{ opacity: 0.6 }}>(empty)</p>
          <p className="mt-1.5">
            {t({ ko: "완료된 프로젝트를 소스로 연결하면 에이전트가 해당 결과물을 참고합니다.", en: "Link completed projects as sources so agents can reference their deliverables.", ja: "完了済みプロジェクトをソースに繋ぐとエージェントが成果物を参照します。", zh: "将已完成项目连接为来源，代理将参考其交付物。" })}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {sources.map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-2 px-2.5 py-1.5"
              style={{ border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", borderRadius: 8 }}
            >
              {/* Category dot */}
              <span
                className="shrink-0"
                style={{ width: 8, height: 8, borderRadius: "50%", background: src.source_category_color ?? "var(--th-text-muted)" }}
              />
              {/* Category badge */}
              {src.source_category_name && (
                <span className="shrink-0 text-[9px] font-mono" style={{ color: src.source_category_color ?? "var(--th-text-muted)" }}>
                  [{src.source_category_name}]
                </span>
              )}
              {/* Name */}
              <span className="flex-1 min-w-0 text-[11px] font-mono truncate" style={{ color: "var(--th-text-primary)" }}>
                {src.source_project_name}
              </span>
              {/* Deliverable count */}
              <span className="shrink-0 text-[9px] font-mono" style={{ color: src.checked_count > 0 ? "var(--th-accent)" : "var(--th-text-muted)" }}>
                {src.checked_count > 0
                  ? t({ ko: `결과물 ${src.checked_count} ✓`, en: `${src.checked_count} ✓`, ja: `成果物 ${src.checked_count} ✓`, zh: `${src.checked_count} ✓` })
                  : t({ ko: `결과물 0/${src.total_count}`, en: `0/${src.total_count}`, ja: `0/${src.total_count}`, zh: `0/${src.total_count}` })}
              </span>
              {/* Remove button — editing only */}
              {isEditing && (
                <button
                  type="button"
                  disabled={removingId === src.id}
                  onClick={() => void handleRemove(src.id)}
                  className="shrink-0 text-[11px] font-mono px-1 transition"
                  style={{ color: "var(--th-text-muted)", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8 }}
                  title={t({ ko: "소스 제거", en: "Remove source", ja: "ソース削除", zh: "移除来源" })}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button — editing only */}
      {isEditing && (
        <div className="relative">
          <button
            type="button"
            disabled={maxReached}
            onClick={() => { setDropdownOpen(!dropdownOpen); setSearchQ(""); setAddError(null); }}
            className="w-full px-2.5 py-1.5 text-[11px] font-mono text-left transition"
            style={{
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              background: "transparent",
              color: maxReached ? "var(--th-text-muted)" : "var(--th-text-secondary)",
              opacity: maxReached ? 0.4 : 1,
              cursor: maxReached ? "not-allowed" : "pointer",
            }}
            title={maxReached ? t({ ko: "최대 5개까지 연결 가능합니다", en: "Max 5 sources allowed", ja: "最大5つまで", zh: "最多5个" }) : undefined}
          >
            + {t({ ko: "소스 프로젝트 추가...", en: "Add source project...", ja: "ソース追加...", zh: "添加来源项目..." })}
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 top-full z-50 w-full"
              style={{ border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", maxHeight: 200, overflowY: "auto", borderRadius: 8 }}
            >
              <div className="sticky top-0" style={{ background: "var(--th-bg-elevated)", borderBottom: "1px solid #E5E7EB" }}>
                <input
                  autoFocus
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={t({ ko: "프로젝트 검색...", en: "Search projects...", ja: "プロジェクト検索...", zh: "搜索项目..." })}
                  className="w-full px-2.5 py-1.5 text-[10px] font-mono outline-none"
                  style={{ border: "none", background: "transparent", color: "var(--th-text-primary)" }}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="px-2.5 py-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "추가 가능한 프로젝트 없음", en: "No projects available", ja: "追加可能なプロジェクトなし", zh: "没有可用项目" })}
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={addingId === p.id}
                    onClick={() => void handleAdd(p.id)}
                    className="w-full px-2.5 py-1.5 text-left text-[11px] font-mono transition"
                    style={{ borderBottom: "1px solid #E5E7EB", background: "transparent", color: "var(--th-text-primary)", cursor: "pointer" }}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {addError && (
        <p className="text-[9px] font-mono" style={{ color: "var(--th-danger-text, #f85149)" }}>
          {addError}
        </p>
      )}
    </div>
  );
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
  showFigmaField,
  figmaConnected,
  figmaUrl,
  setFigmaUrl,
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
  onSave,
  onCancelEdit,
  onStartEditSelected,
  onDelete,
  templates = [],
  onApplyTemplate,
  sources = [],
  sourcesLoading = false,
  allProjects = [],
  onAddSource,
  onRemoveSource,
}: ProjectEditorPanelProps) {
  const { openWindow } = useUiStore();
  return (
    <div className="min-w-0 space-y-3 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 8, background: "var(--th-bg-surface)" }}>
      {isCreating && templates.length > 0 && onApplyTemplate && (
        <div>
          <p className="mb-1.5 text-[11px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "템플릿으로 시작", en: "Start from Template", ja: "テンプレートから開始", zh: "从模板开始" })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onApplyTemplate(tpl)}
                title={tpl.description ?? tpl.name}
                className="px-2.5 py-1 text-[11px] font-mono font-medium transition"
                style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}
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
          style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
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
          style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
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
              style={{ borderRadius: 8, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
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
              style={{ borderRadius: 8, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
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
              style={{ borderRadius: 8, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
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
            <div className="max-h-40 overflow-y-auto" style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)" }}>
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
            borderRadius: 8,
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
          style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
        />
      </label>
      {showFigmaField && (
        figmaConnected === false ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs font-mono" style={{ border: "1px solid rgba(242,78,30,0.4)", background: "rgba(242,78,30,0.06)", borderRadius: 8 }}>
            <span style={{ color: "var(--th-text-secondary)" }}>
              {t({ ko: "Figma가 연결되지 않았습니다.", en: "Figma is not connected.", ja: "Figmaが接続されていません。", zh: "Figma 未连接。" })}
            </span>
            <button
              type="button"
              onClick={() => openWindow("settings")}
              className="shrink-0 px-2.5 py-1 text-[11px] font-semibold transition"
              style={{ borderRadius: 8, border: "1px solid rgba(242,78,30,0.5)", color: "#f24e1e", background: "transparent", cursor: "pointer" }}
            >
              {t({ ko: "설정에서 연결 →", en: "Connect in Settings →", ja: "設定で接続 →", zh: "前往设置连接 →" })}
            </button>
          </div>
        ) : figmaConnected === true ? (
          <label className="block text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5.333 16A2.667 2.667 0 0 1 5.333 10.667H8V16H5.333Z" fill="#0ACF83"/>
                <path d="M2.667 8A2.667 2.667 0 0 1 5.333 5.333H8V10.667H5.333A2.667 2.667 0 0 1 2.667 8Z" fill="#A259FF"/>
                <path d="M2.667 2.667A2.667 2.667 0 0 1 5.333 0H8V5.333H5.333A2.667 2.667 0 0 1 2.667 2.667Z" fill="#F24E1E"/>
                <path d="M8 0H10.667A2.667 2.667 0 0 1 10.667 5.333H8V0Z" fill="#FF7262"/>
                <path d="M13.333 8A2.667 2.667 0 1 1 8 8a2.667 2.667 0 0 1 5.333 0Z" fill="#1ABCFE"/>
              </svg>
              {t({ ko: "Figma 디자인 URL", en: "Figma Design URL", ja: "Figma デザイン URL", zh: "Figma 设计 URL" })}
              <span style={{ color: "var(--th-text-disabled, #9CA3AF)", opacity: 0.6 }}>
                {t({ ko: "(선택)", en: "(optional)", ja: "(任意)", zh: "(选填)" })}
              </span>
            </span>
            <input
              type="text"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              disabled={!isCreating && !editingProjectId}
              placeholder="https://www.figma.com/design/..."
              className="mt-1 w-full px-3 py-2 text-xs font-mono outline-none"
              style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
            />
            <span className="mt-0.5 block text-[10px]" style={{ color: "var(--th-text-muted)", opacity: 0.7 }}>
              {t({
                ko: "프로젝트 전체 기본값 — 태스크별 URL로 덮어쓰기 가능",
                en: "Project-wide default — can be overridden per task",
                ja: "プロジェクト全体のデフォルト — タスクごとに上書き可能",
                zh: "项目默认值 — 可在任务级별 覆盖",
              })}
            </span>
          </label>
        ) : (
          <div className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "Figma 연결 상태 확인 중…", en: "Checking Figma connection…", ja: "Figma接続確認中…", zh: "检查 Figma 连接中…" })}
          </div>
        )
      )}

      {/* Sources section — show when project is selected (not creating new) */}
      {!isCreating && onAddSource && onRemoveSource && (
        <ProjectSourcesSection
          t={t}
          isEditing={!!editingProjectId}
          projectId={selectedProject?.id ?? null}
          sources={sources}
          sourcesLoading={sourcesLoading}
          allProjects={allProjects}
          onAddSource={onAddSource}
          onRemoveSource={onRemoveSource}
        />
      )}

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
            style={{ borderRadius: 8, background: "var(--th-accent)", color: "var(--th-bg-elevated)" }}
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
            style={{ borderRadius: 8, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
        )}
        <button
          type="button"
          onClick={onStartEditSelected}
          disabled={!selectedProject || isCreating || !!editingProjectId}
          className="px-3 py-1.5 text-xs font-mono disabled:opacity-40"
          style={{ borderRadius: 8, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
        >
          {t({ ko: "선택 프로젝트 편집", en: "Edit Selected", ja: "選択編集", zh: "编辑选中项" })}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!selectedProject}
          className="px-3 py-1.5 text-xs font-mono disabled:opacity-40"
          style={{ borderRadius: 8, border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5", background: "transparent" }}
        >
          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
        </button>
      </div>
    </div>
  );
}
