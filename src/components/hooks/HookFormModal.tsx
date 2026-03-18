import { useState, useEffect, useRef } from "react";
import { useToast } from "../ui";
import FloatingWindow from "../skills-library/FloatingWindow";
import type { HookEntry, HookEventType, HookScopeType, Agent, Department } from "../../types";
import type { CreateHookInput, UpdateHookInput } from "../../api/hooks";
import {
  HOOK_EVENT_TYPES,
  eventTypeLabel,
  EVENT_TYPE_ICONS,
  type TFunction,
} from "./model";

interface HookFormModalProps {
  t: TFunction;
  show: boolean;
  editingHook: HookEntry | null;
  agents: Agent[];
  departments: Department[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: CreateHookInput) => void;
  onUpdate: (id: string, input: UpdateHookInput) => void;
  /** When set, locks scope to "project" and hides the scope selector */
  defaultProjectId?: string;
}

export default function HookFormModal({
  t,
  show,
  editingHook,
  agents,
  departments,
  submitting,
  error,
  onClose,
  defaultProjectId,
  onCreate,
  onUpdate,
}: HookFormModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [description, setDescription] = useState("");
  const [command, setCommand] = useState("");
  const [eventType, setEventType] = useState<HookEventType>("pre-task");
  const [scopeType, setScopeType] = useState<HookScopeType>("global");
  const [scopeId, setScopeId] = useState<string>("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [priority, setPriority] = useState(50);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingHook;

  useEffect(() => {
    if (editingHook) {
      setTitle(editingHook.title);
      setTitleKo(editingHook.title_ko);
      setTitleJa(editingHook.title_ja);
      setTitleZh(editingHook.title_zh);
      setDescription(editingHook.description);
      setCommand(editingHook.command);
      setEventType(editingHook.event_type);
      setScopeType(editingHook.scope_type);
      setScopeId(editingHook.scope_id ?? "");
      setWorkingDirectory(editingHook.working_directory);
      setTimeoutMs(editingHook.timeout_ms);
      setPriority(editingHook.priority);
    } else {
      setTitle("");
      setTitleKo("");
      setTitleJa("");
      setTitleZh("");
      setDescription("");
      setCommand("");
      setEventType("pre-task");
      setScopeType(defaultProjectId ? "project" : "global");
      setScopeId(defaultProjectId ?? "");
      setWorkingDirectory("");
      setTimeoutMs(30000);
      setPriority(50);
      setFileName("");
    }
  }, [editingHook, show, defaultProjectId]);

  if (!show) return null;

  const canSubmit = title.trim() && command.trim();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;

    const effectiveScopeType = defaultProjectId ? "project" : scopeType;
    const effectiveScopeId   = defaultProjectId ?? (scopeType !== "global" && scopeId ? scopeId : undefined);

    const trimmed = title.trim();
    const base = {
      title: trimmed,
      title_ko: titleKo.trim() || trimmed,
      title_ja: titleJa.trim() || trimmed,
      title_zh: titleZh.trim() || trimmed,
      description: description.trim(),
      command: command.trim(),
      event_type: eventType,
      working_directory: workingDirectory.trim(),
      timeout_ms: timeoutMs,
      scope_type: effectiveScopeType as HookScopeType,
      scope_id: effectiveScopeId,
      priority,
    };

    if (isEditing) {
      onUpdate(editingHook.id, base);
    } else {
      onCreate(base);
    }
  };

  const modalTitle = isEditing
    ? t({ ko: "훅 수정", en: "Edit Hook", ja: "フック編集", zh: "编辑钩子" })
    : t({ ko: "새 훅 추가", en: "Add New Hook", ja: "新しいフック追加", zh: "添加新钩子" });

  return (
    <FloatingWindow
      title={modalTitle}
      subtitle={t({ ko: "이벤트 타입·범위·명령어를 설정하세요", en: "Set event type, scope, and command", ja: "イベントタイプ・スコープ・コマンドを設定", zh: "设置事件类型、范围与命令" })}
      onClose={onClose}
      defaultWidth={520}
    >
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "훅 제목", en: "Hook Title", ja: "フックタイトル", zh: "钩子标题" })} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({
                ko: "예: 태스크 전 린팅 실행",
                en: "e.g. Run linting before task",
                ja: "例: タスク前にリントを実行",
                zh: "例如: 任务前运行 lint",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uC124\uBA85", en: "Description", ja: "\u8AAC\u660E", zh: "\u63CF\u8FF0" })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t({
                ko: "\uC774 \uD6C5\uC774 \uC5B4\uB5A4 \uC791\uC5C5\uC744 \uC218\uD589\uD558\uB294\uC9C0 \uAC04\uB2E8\uD788 \uC124\uBA85\uD574\uC8FC\uC138\uC694",
                en: "Briefly explain what this hook does",
                ja: "\u3053\u306E\u30D5\u30C3\u30AF\u304C\u4F55\u3092\u884C\u3046\u304B\u7C21\u5358\u306B\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044",
                zh: "\u7B80\u8981\u8BF4\u660E\u6B64\u94A9\u5B50\u7684\u4F5C\u7528",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Command */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uBA85\uB839\uC5B4", en: "Command", ja: "\u30B3\u30DE\u30F3\u30C9", zh: "\u547D\u4EE4" })} *
            </label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              rows={4}
              placeholder={t({
                ko: "\uC2E4\uD589\uD560 \uC258 \uBA85\uB839\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694",
                en: "Enter the shell command to execute",
                ja: "\u5B9F\u884C\u3059\u308B\u30B7\u30A7\u30EB\u30B3\u30DE\u30F3\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
                zh: "\u8F93\u5165\u8981\u6267\u884C\u7684shell\u547D\u4EE4",
              })}
              className="w-full px-3 py-2 text-sm text-green-300 focus:outline-none resize-none font-mono"
              style={{ borderRadius: 0, background: "var(--th-terminal-bg)", border: "1px solid var(--th-border)" }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "\uC774 \uBA85\uB839\uC5B4\uAC00 \uD0DC\uC2A4\uD06C \uB77C\uC774\uD504\uC0AC\uC774\uD074 \uD6C5\uC73C\uB85C \uC2E4\uD589\uB429\uB2C8\uB2E4",
                  en: "This command will be executed as a task lifecycle hook",
                  ja: "\u3053\u306E\u30B3\u30DE\u30F3\u30C9\u304C\u30BF\u30B9\u30AF\u30E9\u30A4\u30D5\u30B5\u30A4\u30AF\u30EB\u30D5\u30C3\u30AF\u3068\u3057\u3066\u5B9F\u884C\u3055\u308C\u307E\u3059",
                  zh: "\u6B64\u547D\u4EE4\u5C06\u4F5C\u4E3A\u4EFB\u52A1\u751F\u547D\u5468\u671F\u94A9\u5B50\u6267\u884C",
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono transition-all"
                  style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
                >
                  {t({ ko: "\uD30C\uC77C\uC5D0\uC11C \uBD88\uB7EC\uC624\uAE30", en: "Load from file", ja: "\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u8AAD\u8FBC", zh: "\u4ECE\u6587\u4EF6\u52A0\u8F7D" })}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sh,.bash,.bat,.ps1,.py,.js,.ts,.cmd,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 512_000) {
                      showToast(t({
                        ko: "\uD30C\uC77C \uD06C\uAE30\uAC00 \uB108\uBB34 \uD07D\uB2C8\uB2E4 (\uCD5C\uB300 512KB)",
                        en: "File too large (max 512KB)",
                        ja: "\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF08\u6700\u5927512KB\uFF09",
                        zh: "\u6587\u4EF6\u8FC7\u5927\uFF08\u6700\u5927512KB\uFF09",
                      }), "warning");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result;
                      if (typeof text === "string") {
                        setCommand(text);
                        setFileName(file.name);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                {fileName && (
                  <span className="text-[10px] text-emerald-300 truncate max-w-[140px]">
                    {fileName}
                  </span>
                )}
              </div>
            </div>
            {/* File content preview when loaded from file */}
            {fileName && command && (
              <div className="mt-2 p-2 max-h-24 overflow-y-auto" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
                <pre className="text-[10px] text-green-300/70 whitespace-pre-wrap break-all font-mono">
                  {command.slice(0, 500)}
                  {command.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>

          {/* Scope Type */}
          {defaultProjectId ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 0 }}>
              <span>📋</span>
              <span style={{ color: "var(--th-accent)" }}>
                {t({ ko: "프로젝트 훅 (범위 고정)", en: "Project hook (scope locked)", ja: "プロジェクトフック（スコープ固定）", zh: "项目钩子（范围锁定）" })}
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "범위 (Scope)", en: "Scope", ja: "スコープ", zh: "范围" })}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {([
                  { value: "global",        icon: "🌐", label: { ko: "글로벌",   en: "Global",   ja: "グローバル", zh: "全局"   } },
                  { value: "project",       icon: "📋", label: { ko: "프로젝트", en: "Project",   ja: "プロジェクト", zh: "项目" } },
                  { value: "agent",         icon: "🤖", label: { ko: "에이전트", en: "Agent",     ja: "エージェント", zh: "代理" } },
                  { value: "department",    icon: "🏢", label: { ko: "부서",     en: "Department", ja: "部署",       zh: "部门" } },
                  { value: "workflow_pack", icon: "📦", label: { ko: "워크플로", en: "Workflow",  ja: "ワークフロー", zh: "工作流" } },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setScopeType(opt.value as HookScopeType);
                      if (opt.value === "global") setScopeId("");
                    }}
                    className="px-2.5 py-1.5 text-xs font-mono border transition-all"
                    style={{
                      borderRadius: 0,
                      background: scopeType === opt.value ? "rgba(245,158,11,0.15)" : "var(--th-bg-surface-hover)",
                      color: scopeType === opt.value ? "var(--th-accent)" : "var(--th-text-muted)",
                      border: scopeType === opt.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--th-border)",
                    }}
                  >
                    {opt.icon} {t(opt.label)}
                  </button>
                ))}
              </div>
              {/* Scope ID input for non-global */}
              {scopeType !== "global" && (
                <input
                  type="text"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder={
                    scopeType === "project" ? t({ ko: "프로젝트 ID", en: "Project ID", ja: "プロジェクトID", zh: "项目ID" }) :
                    scopeType === "agent" ? t({ ko: "에이전트 ID", en: "Agent ID", ja: "エージェントID", zh: "代理ID" }) :
                    scopeType === "department" ? t({ ko: "부서 ID", en: "Department ID", ja: "部署ID", zh: "部门ID" }) :
                    t({ ko: "워크플로 팩 키", en: "Workflow Pack Key", ja: "ワークフローパックキー", zh: "工作流包键" })
                  }
                  className="w-full px-3 py-2 text-sm focus:outline-none font-mono"
                  style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
                />
              )}
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uC774\uBCA4\uD2B8 \uD0C0\uC785", en: "Event Type", ja: "\u30A4\u30D9\u30F3\u30C8\u30BF\u30A4\u30D7", zh: "\u4E8B\u4EF6\u7C7B\u578B" })}
            </label>
            <div className="flex flex-wrap gap-2">
              {HOOK_EVENT_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setEventType(et)}
                  className={`px-3 py-1.5 text-xs font-medium font-mono border transition-all ${
                    eventType === et
                      ? "border-amber-500/40"
                      : "border-[var(--th-border)] hover:bg-[var(--th-bg-surface-hover)]"
                  }`}
                  style={{
                    borderRadius: 0,
                    background: eventType === et ? "rgba(245,158,11,0.15)" : "var(--th-bg-surface-hover)",
                    color: eventType === et ? "var(--th-accent)" : "var(--th-text-muted)",
                  }}
                >
                  {EVENT_TYPE_ICONS[et]} {eventTypeLabel(et, t)}
                </button>
              ))}
            </div>
          </div>

          {/* Working Directory + Timeout Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "\uC791\uC5C5 \uB514\uB809\uD1A0\uB9AC", en: "Working Directory", ja: "\u4F5C\u696D\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA", zh: "\u5DE5\u4F5C\u76EE\u5F55" })}
              </label>
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="/home/user/project"
                className="w-full px-3 py-2 text-sm focus:outline-none font-mono"
              style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "\uD0C0\uC784\uC544\uC6C3 (ms)", en: "Timeout (ms)", ja: "\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8 (ms)", zh: "\u8D85\u65F6 (ms)" })} (1000-300000)
              </label>
              <input
                type="number"
                min={1000}
                max={300000}
                step={1000}
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Math.max(1000, Math.min(300000, Number(e.target.value) || 30000)))}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
              />
              <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                = {(timeoutMs / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uC6B0\uC120\uC21C\uC704", en: "Priority", ja: "\u512A\u5148\u9806\u4F4D", zh: "\u4F18\u5148\u7EA7" })} (1-100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value) || 50)))}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: 0, background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-2" style={{ borderRadius: 0 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-mono transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "\uCDE8\uC18C", en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB", zh: "\u53D6\u6D88" })}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                !canSubmit ? "cursor-not-allowed opacity-40" : ""
              }`}
              style={{
                borderRadius: 0,
                background: !canSubmit ? "var(--th-bg-surface-hover)" : "var(--th-accent)",
                color: !canSubmit ? "var(--th-text-muted)" : "var(--th-accent-text)",
                border: "none",
              }}
            >
              {submitting ? (
                <>
                  <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "var(--th-accent-text)", borderTopColor: "transparent" }} />
                  {t({ ko: "\uC800\uC7A5\uC911...", en: "Saving...", ja: "\u4FDD\u5B58\u4E2D...", zh: "\u4FDD\u5B58\u4E2D..." })}
                </>
              ) : isEditing ? (
                t({ ko: "\uD6C5 \uC218\uC815", en: "Update Hook", ja: "\u30D5\u30C3\u30AF\u66F4\u65B0", zh: "\u66F4\u65B0\u94A9\u5B50" })
              ) : (
                t({ ko: "\uD6C5 \uCD94\uAC00", en: "Add Hook", ja: "\u30D5\u30C3\u30AF\u8FFD\u52A0", zh: "\u6DFB\u52A0\u94A9\u5B50" })
              )}
            </button>
          </div>
        </div>
    </FloatingWindow>
  );
}
