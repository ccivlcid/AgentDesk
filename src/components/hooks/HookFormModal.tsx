import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { HookEntry, HookEventType, Agent, Department } from "../../types";
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
  onCreate,
  onUpdate,
}: HookFormModalProps) {
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [description, setDescription] = useState("");
  const [command, setCommand] = useState("");
  const [eventType, setEventType] = useState<HookEventType>("pre-task");
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
      setWorkingDirectory("");
      setTimeoutMs(30000);
      setPriority(50);
      setFileName("");
    }
  }, [editingHook, show]);

  if (!show) return null;

  const canSubmit = title.trim() && command.trim();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;

    const base = {
      title: title.trim(),
      title_ko: titleKo.trim(),
      title_ja: titleJa.trim(),
      title_zh: titleZh.trim(),
      description: description.trim(),
      command: command.trim(),
      event_type: eventType,
      working_directory: workingDirectory.trim(),
      timeout_ms: timeoutMs,
      scope_type: "global" as const,
      scope_id: undefined,
      priority,
    };

    if (isEditing) {
      onUpdate(editingHook.id, base);
    } else {
      onCreate(base);
    }
  };

  return createPortal(
    <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="skills-learn-modal-card w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div>
            <h3 className="text-base font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
              {isEditing
                ? t({ ko: "\uD6C5 \uC218\uC815", en: "Edit Hook", ja: "\u30D5\u30C3\u30AF\u7DE8\u96C6", zh: "\u7F16\u8F91\u94A9\u5B50" })
                : t({ ko: "\uC0C8 \uD6C5 \uCD94\uAC00", en: "Add New Hook", ja: "\u65B0\u3057\u3044\u30D5\u30C3\u30AF\u8FFD\u52A0", zh: "\u6DFB\u52A0\u65B0\u94A9\u5B50" })}
            </h3>
            <div className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "\uD6C5 \uC81C\uBAA9\uACFC \uBA85\uB839\uC5B4\uB97C \uC785\uB825\uD558\uACE0 \uC801\uC6A9 \uBC94\uC704\uB97C \uC124\uC815\uD558\uC138\uC694",
                en: "Enter hook title and command",
                ja: "\u30D5\u30C3\u30AF\u306E\u30BF\u30A4\u30C8\u30EB\u3068\u30B3\u30DE\u30F3\u30C9\u3092\u5165\u529B\u3057\u3001\u9069\u7528\u7BC4\u56F2\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044",
                zh: "\u8F93\u5165\u94A9\u5B50\u6807\u9898\u548C\u547D\u4EE4\uFF0C\u7136\u540E\u8BBE\u7F6E\u9002\u7528\u8303\u56F4",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-2.5 py-1 text-xs font-mono transition-all"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "\uB2EB\uAE30", en: "Close", ja: "\u9589\u3058\u308B", zh: "\u5173\u95ED" })}
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uD6C5 \uC81C\uBAA9 (\uC601\uBB38)", en: "Hook Title (EN)", ja: "\u30D5\u30C3\u30AF\u30BF\u30A4\u30C8\u30EB\uFF08\u82F1\u8A9E\uFF09", zh: "\u94A9\u5B50\u6807\u9898\uFF08\u82F1\u6587\uFF09" })} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({
                ko: "\uC608: Run linting before task",
                en: "e.g. Run linting before task",
                ja: "\u4F8B: Run linting before task",
                zh: "\u4F8B\u5982: Run linting before task",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Title KO */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "\uD6C5 \uC81C\uBAA9 (\uD55C\uAD6D\uC5B4)", en: "Hook Title (KO)", ja: "\u30D5\u30C3\u30AF\u30BF\u30A4\u30C8\u30EB\uFF08\u97D3\u56FD\u8A9E\uFF09", zh: "\u94A9\u5B50\u6807\u9898\uFF08\u97E9\u6587\uFF09" })}
            </label>
            <input
              type="text"
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              placeholder={t({
                ko: "\uC608: \uD0DC\uC2A4\uD06C \uC804 \uB9B0\uD305 \uC2E4\uD589",
                en: "e.g. \uD0DC\uC2A4\uD06C \uC804 \uB9B0\uD305 \uC2E4\uD589",
                ja: "\u4F8B: \uD0DC\uC2A4\uD06C \uC804 \uB9B0\uD305 \uC2E4\uD589",
                zh: "\u4F8B\u5982: \uD0DC\uC2A4\uD06C \uC804 \uB9B0\uD305 \uC2E4\uD589",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
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
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
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
              style={{ borderRadius: "2px", background: "var(--th-terminal-bg)", border: "1px solid var(--th-border)" }}
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
                  style={{ borderRadius: "2px", background: "var(--th-bg-surface-hover)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
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
                      alert(t({
                        ko: "\uD30C\uC77C \uD06C\uAE30\uAC00 \uB108\uBB34 \uD07D\uB2C8\uB2E4 (\uCD5C\uB300 512KB)",
                        en: "File too large (max 512KB)",
                        ja: "\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF08\u6700\u5927512KB\uFF09",
                        zh: "\u6587\u4EF6\u8FC7\u5927\uFF08\u6700\u5927512KB\uFF09",
                      }));
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
              <div className="mt-2 p-2 max-h-24 overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
                <pre className="text-[10px] text-green-300/70 whitespace-pre-wrap break-all font-mono">
                  {command.slice(0, 500)}
                  {command.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>

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
                    borderRadius: "2px",
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
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
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
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
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
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-2" style={{ borderRadius: "2px" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-mono transition-all"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
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
                borderRadius: "2px",
                background: !canSubmit ? "var(--th-bg-surface-hover)" : "var(--th-accent)",
                color: !canSubmit ? "var(--th-text-muted)" : "#000",
                border: "none",
              }}
            >
              {submitting ? (
                <>
                  <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "#000", borderTopColor: "transparent" }} />
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
      </div>
    </div>,
    document.body,
  );
}
