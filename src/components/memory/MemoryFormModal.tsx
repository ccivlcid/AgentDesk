import { useState, useEffect, useRef } from "react";
import type { MemoryEntry, MemoryCategory, MemoryScopeType, Agent, Department } from "../../types";
import type { CreateMemoryInput, UpdateMemoryInput } from "../../api/memory";
import { MEMORY_CATEGORIES, categoryLabel, type TFunction } from "./model";
import { useToast } from "../ui";
import FloatingWindow from "../skills-library/FloatingWindow";

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
  scopeOverride?: { scope_type: MemoryScopeType; scope_id?: string };
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
  scopeOverride,
}: MemoryFormModalProps) {
  const { showToast } = useToast();
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
      scope_type: scopeOverride?.scope_type ?? ("global" as const),
      scope_id: scopeOverride?.scope_id,
      priority,
    };

    if (isEditing) {
      onUpdate(editingEntry.id, base);
    } else {
      onCreate(base);
    }
  };

  if (!show) return null;

  return (
    <FloatingWindow
      title={isEditing
        ? t({ ko: "메모리 수정", en: "Edit Memory", ja: "メモリ編集", zh: "编辑内存" })
        : t({ ko: "새 메모리 추가", en: "Add New Memory", ja: "新しいメモリ追加", zh: "添加新内存" })}
      subtitle={t({
        ko: "제목과 내용을 입력하거나 파일을 첨부하세요",
        en: "Enter a title and content, or attach a file",
        ja: "タイトルと内容を入力するかファイルを添付してください",
        zh: "输入标题和内容，或附加文件",
      })}
      onClose={onClose}
      disableClose={submitting}
      defaultWidth={500}
    >
      <div className="space-y-4 px-5 py-4">
        {/* Title EN */}
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "제목 (영문)", en: "Title (EN)", ja: "タイトル（英語）", zh: "标题（英文）" })} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({
              ko: "예: Project Architecture Overview",
              en: "e.g. Project Architecture Overview",
              ja: "例: Project Architecture Overview",
              zh: "例如: Project Architecture Overview",
            })}
            className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          />
        </div>

        {/* Title KO */}
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "제목 (한국어)", en: "Title (KO)", ja: "タイトル（韓国語）", zh: "标题（韩文）" })}
          </label>
          <input
            type="text"
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder={t({
              ko: "예: 프로젝트 아키텍처 개요",
              en: "e.g. 프로젝트 아키텍처 개요",
              ja: "例: 프로젝트 아키텍처 개요",
              zh: "例如: 프로젝트 아키텍처 개요",
            })}
            className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" })}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t({
              ko: "이 메모리가 왜 필요한지 간단히 설명해주세요",
              en: "Briefly explain why this memory is needed",
              ja: "このメモリが必要な理由を簡単に説明してください",
              zh: "简要说明此内存的必要性",
            })}
            className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "메모리 내용", en: "Memory Content", ja: "メモリ内容", zh: "内存内容" })} *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={t({
              ko: "에이전트에게 전달될 메모리 내용을 마크다운으로 입력하세요",
              en: "Enter memory content in markdown format to be delivered to agents",
              ja: "エージェントに伝えられるメモリ内容をマークダウンで入力してください",
              zh: "以 Markdown 格式输入将传达给代理的内存内容",
            })}
            className="w-full px-3 py-2 text-sm focus:outline-none resize-none font-mono"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "에이전트 컨텍스트에 주입됩니다",
                en: "Will be injected into agent context",
                ja: "エージェントのコンテキストに注入されます",
                zh: "将注入到代理上下文中",
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono transition-all"
                style={{ borderRadius: 0, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
              >
                {t({ ko: "파일에서 불러오기", en: "Load from file", ja: "ファイルから読込", zh: "从文件加载" })}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.markdown,.json,.yaml,.yml,.toml,.xml,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1_048_576) {
                    showToast(t({
                      ko: "파일 크기가 너무 큽니다 (최대 1MB)",
                      en: "File too large (max 1MB)",
                      ja: "ファイルサイズが大きすぎます（最大1MB）",
                      zh: "文件过大（最大1MB）",
                    }), "warning");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result;
                    if (typeof text === "string") { setContent(text); setFileName(file.name); }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              {fileName && (
                <span className="text-[10px] font-mono truncate max-w-[140px]" style={{ color: "var(--th-text-primary)" }}>
                  📄 {fileName}
                </span>
              )}
            </div>
          </div>
          {fileName && content && (
            <div className="mt-2 p-2 max-h-24 overflow-y-auto" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
              <pre className="text-[10px] whitespace-pre-wrap break-all font-mono" style={{ color: "var(--th-text-muted)" }}>
                {content.slice(0, 500)}{content.length > 500 && "..."}
              </pre>
            </div>
          )}
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "카테고리", en: "Category", ja: "カテゴリ", zh: "分类" })}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="w-full px-3 py-2 text-sm font-mono outline-none"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
            >
              {MEMORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{categoryLabel(cat, t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "우선순위", en: "Priority", ja: "優先順位", zh: "优先级" })} (1-100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value) || 50)))}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: 0, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pb-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-mono transition"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-4 py-1.5 text-xs font-mono border transition flex items-center gap-1.5"
            style={!canSubmit
              ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "not-allowed" }
              : { borderRadius: 0, border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-text-primary)" }}
          >
            {submitting ? (
              <>
                <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
                {t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })}
              </>
            ) : isEditing
              ? t({ ko: "메모리 수정", en: "Update Memory", ja: "メモリ更新", zh: "更新内存" })
              : t({ ko: "메모리 추가", en: "Add Memory", ja: "メモリ追加", zh: "添加内存" })}
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
}
