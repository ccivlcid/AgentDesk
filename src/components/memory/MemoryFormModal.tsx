import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MemoryEntry, MemoryCategory, Agent, Department } from "../../types";
import type { CreateMemoryInput, UpdateMemoryInput } from "../../api/memory";
import { MEMORY_CATEGORIES, categoryLabel, type TFunction } from "./model";

interface MemoryFormModalProps {
  t: TFunction;
  show: boolean;
  editingEntry: MemoryEntry | null;
  agents: Agent[];
  departments: Department[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: CreateMemoryInput) => void;
  onUpdate: (id: string, input: UpdateMemoryInput) => void;
}

export default function MemoryFormModal({
  t,
  show,
  editingEntry,
  agents,
  departments,
  submitting,
  error,
  onClose,
  onCreate,
  onUpdate,
}: MemoryFormModalProps) {
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("context");
  const [priority, setPriority] = useState(50);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingEntry;

  useEffect(() => {
    if (editingEntry) {
      setTitle(editingEntry.title);
      setTitleKo(editingEntry.title_ko);
      setTitleJa(editingEntry.title_ja);
      setTitleZh(editingEntry.title_zh);
      setDescription(editingEntry.description);
      setContent(editingEntry.content);
      setCategory(editingEntry.category);
      setPriority(editingEntry.priority);
    } else {
      setTitle("");
      setTitleKo("");
      setTitleJa("");
      setTitleZh("");
      setDescription("");
      setContent("");
      setCategory("context");
      setPriority(50);
      setFileName("");
    }
  }, [editingEntry, show]);

  if (!show) return null;

  const canSubmit = title.trim() && content.trim();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;

    const base = {
      title: title.trim(),
      title_ko: titleKo.trim(),
      title_ja: titleJa.trim(),
      title_zh: titleZh.trim(),
      description: description.trim(),
      content: content.trim(),
      category,
      scope_type: "global" as const,
      scope_id: undefined,
      priority,
    };

    if (isEditing) {
      onUpdate(editingEntry.id, base);
    } else {
      onCreate(base);
    }
  };

  return createPortal(
    <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="skills-learn-modal-card w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isEditing
                ? t({ ko: "\uBA54\uBAA8\uB9AC \uC218\uC815", en: "Edit Memory", ja: "\u30E1\u30E2\u30EA\u7DE8\u96C6", zh: "\u7F16\u8F91\u5185\u5B58" })
                : t({ ko: "\uC0C8 \uBA54\uBAA8\uB9AC \uCD94\uAC00", en: "Add New Memory", ja: "\u65B0\u3057\u3044\u30E1\u30E2\u30EA\u8FFD\u52A0", zh: "\u6DFB\u52A0\u65B0\u5185\u5B58" })}
            </h3>
            <div className="mt-1 text-xs text-slate-400">
              {t({
                ko: "메모리 제목과 내용을 입력하세요",
                en: "Enter memory title and content",
                ja: "メモリのタイトルと内容を入力してください",
                zh: "输入内存标题和内容",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 transition-all"
          >
            {t({ ko: "\uB2EB\uAE30", en: "Close", ja: "\u9589\u3058\u308B", zh: "\u5173\u95ED" })}
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t({ ko: "\uBA54\uBAA8\uB9AC \uC81C\uBAA9 (\uC601\uBB38)", en: "Memory Title (EN)", ja: "\u30E1\u30E2\u30EA\u30BF\u30A4\u30C8\u30EB\uFF08\u82F1\u8A9E\uFF09", zh: "\u5185\u5B58\u6807\u9898\uFF08\u82F1\u6587\uFF09" })} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({
                ko: "\uC608: Project Architecture Overview",
                en: "e.g. Project Architecture Overview",
                ja: "\u4F8B: Project Architecture Overview",
                zh: "\u4F8B\u5982: Project Architecture Overview",
              })}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25"
            />
          </div>

          {/* Title KO */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t({ ko: "\uBA54\uBAA8\uB9AC \uC81C\uBAA9 (\uD55C\uAD6D\uC5B4)", en: "Memory Title (KO)", ja: "\u30E1\u30E2\u30EA\u30BF\u30A4\u30C8\u30EB\uFF08\u97D3\u56FD\u8A9E\uFF09", zh: "\u5185\u5B58\u6807\u9898\uFF08\u97E9\u6587\uFF09" })}
            </label>
            <input
              type="text"
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              placeholder={t({
                ko: "\uC608: \uD504\uB85C\uC81D\uD2B8 \uC544\uD0A4\uD14D\uCC98 \uAC1C\uC694",
                en: "e.g. \uD504\uB85C\uC81D\uD2B8 \uC544\uD0A4\uD14D\uCC98 \uAC1C\uC694",
                ja: "\u4F8B: \uD504\uB85C\uC81D\uD2B8 \uC544\uD0A4\uD14D\uCC98 \uAC1C\uC694",
                zh: "\u4F8B\u5982: \uD504\uB85C\uC81D\uD2B8 \uC544\uD0A4\uD14D\uCC98 \uAC1C\uC694",
              })}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t({ ko: "\uC124\uBA85", en: "Description", ja: "\u8AAC\u660E", zh: "\u63CF\u8FF0" })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t({
                ko: "\uC774 \uBA54\uBAA8\uB9AC\uAC00 \uC65C \uD544\uC694\uD55C\uC9C0 \uAC04\uB2E8\uD788 \uC124\uBA85\uD574\uC8FC\uC138\uC694",
                en: "Briefly explain why this memory is needed",
                ja: "\u3053\u306E\u30E1\u30E2\u30EA\u304C\u5FC5\u8981\u306A\u7406\u7531\u3092\u7C21\u5358\u306B\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044",
                zh: "\u7B80\u8981\u8BF4\u660E\u6B64\u5185\u5B58\u7684\u5FC5\u8981\u6027",
              })}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 resize-none"
            />
          </div>

          {/* Memory Content */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t({ ko: "\uBA54\uBAA8\uB9AC \uB0B4\uC6A9", en: "Memory Content", ja: "\u30E1\u30E2\u30EA\u5185\u5BB9", zh: "\u5185\u5B58\u5185\u5BB9" })} *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={t({
                ko: "\uC5D0\uC774\uC804\uD2B8\uC5D0\uAC8C \uC804\uB2EC\uB420 \uBA54\uBAA8\uB9AC \uB0B4\uC6A9\uC744 \uB9C8\uD06C\uB2E4\uC6B4\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694",
                en: "Enter memory content in markdown format to be delivered to agents",
                ja: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u306B\u4F1D\u3048\u3089\u308C\u308B\u30E1\u30E2\u30EA\u5185\u5BB9\u3092\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
                zh: "\u4EE5 Markdown \u683C\u5F0F\u8F93\u5165\u5C06\u4F20\u8FBE\u7ED9\u4EE3\u7406\u7684\u5185\u5B58\u5185\u5BB9",
              })}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 resize-none font-mono"
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[10px] text-slate-500">
                {t({
                  ko: "\uC774 \uD14D\uC2A4\uD2B8\uAC00 \uC5D0\uC774\uC804\uD2B8 \uCEE8\uD14D\uC2A4\uD2B8\uC5D0 \uC8FC\uC785\uB429\uB2C8\uB2E4",
                  en: "This text will be injected into agent context",
                  ja: "\u3053\u306E\u30C6\u30AD\u30B9\u30C8\u304C\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306B\u6CE8\u5165\u3055\u308C\u307E\u3059",
                  zh: "\u6B64\u6587\u672C\u5C06\u6CE8\u5165\u5230\u4EE3\u7406\u4E0A\u4E0B\u6587\u4E2D",
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-slate-800/60 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/60 transition-all"
                >
                  {t({ ko: "\uD30C\uC77C\uC5D0\uC11C \uBD88\uB7EC\uC624\uAE30", en: "Load from file", ja: "\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u8AAD\u8FBC", zh: "\u4ECE\u6587\u4EF6\u52A0\u8F7D" })}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown,.json,.yaml,.yml,.toml,.xml,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_048_576) {
                      alert(t({
                        ko: "\uD30C\uC77C \uD06C\uAE30\uAC00 \uB108\uBB34 \uD07D\uB2C8\uB2E4 (\uCD5C\uB300 1MB)",
                        en: "File too large (max 1MB)",
                        ja: "\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3059\u304E\u307E\u3059\uFF08\u6700\u59271MB\uFF09",
                        zh: "\u6587\u4EF6\u8FC7\u5927\uFF08\u6700\u59271MB\uFF09",
                      }));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result;
                      if (typeof text === "string") {
                        setContent(text);
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
            {fileName && content && (
              <div className="mt-2 rounded-lg border border-slate-700/50 bg-slate-900/60 p-2 max-h-24 overflow-y-auto">
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                  {content.slice(0, 500)}
                  {content.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>

          {/* Category + Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t({ ko: "\uCE74\uD14C\uACE0\uB9AC", en: "Category", ja: "\u30AB\u30C6\u30B4\u30EA", zh: "\u5206\u7C7B" })}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50"
              >
                {MEMORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat, t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t({ ko: "\uC6B0\uC120\uC21C\uC704", en: "Priority", ja: "\u512A\u5148\u9806\u4F4D", zh: "\u4F18\u5148\u7EA7" })} (1-100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value) || 50)))}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all"
            >
              {t({ ko: "\uCDE8\uC18C", en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB", zh: "\u53D6\u6D88" })}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`px-4 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 ${
                !canSubmit
                  ? "cursor-not-allowed border-slate-700 text-slate-600"
                  : "border-violet-500/50 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
              }`}
            >
              {submitting ? (
                <>
                  <span className="animate-spin w-3 h-3 border border-violet-400 border-t-transparent rounded-full" />
                  {t({ ko: "\uC800\uC7A5\uC911...", en: "Saving...", ja: "\u4FDD\u5B58\u4E2D...", zh: "\u4FDD\u5B58\u4E2D..." })}
                </>
              ) : isEditing ? (
                t({ ko: "\uBA54\uBAA8\uB9AC \uC218\uC815", en: "Update Memory", ja: "\u30E1\u30E2\u30EA\u66F4\u65B0", zh: "\u66F4\u65B0\u5185\u5B58" })
              ) : (
                t({ ko: "\uBA54\uBAA8\uB9AC \uCD94\uAC00", en: "Add Memory", ja: "\u30E1\u30E2\u30EA\u8FFD\u52A0", zh: "\u6DFB\u52A0\u5185\u5B58" })
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
