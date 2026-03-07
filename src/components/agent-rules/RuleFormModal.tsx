import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { AgentRule, AgentRuleCategory, Agent, Department } from "../../types";
import type { CreateAgentRuleInput, UpdateAgentRuleInput } from "../../api/agent-rules";
import {
  RULE_CATEGORIES,
  categoryLabel,
  type TFunction,
} from "./model";

interface RuleFormModalProps {
  t: TFunction;
  show: boolean;
  editingRule: AgentRule | null;
  agents: Agent[];
  departments: Department[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: CreateAgentRuleInput) => void;
  onUpdate: (id: string, input: UpdateAgentRuleInput) => void;
}

export default function RuleFormModal({
  t,
  show,
  editingRule,
  agents,
  departments,
  submitting,
  error,
  onClose,
  onCreate,
  onUpdate,
}: RuleFormModalProps) {
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [description, setDescription] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [category, setCategory] = useState<AgentRuleCategory>("general");
  const [priority, setPriority] = useState(50);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingRule;

  useEffect(() => {
    if (editingRule) {
      setTitle(editingRule.title);
      setTitleKo(editingRule.title_ko);
      setTitleJa(editingRule.title_ja);
      setTitleZh(editingRule.title_zh);
      setDescription(editingRule.description);
      setRuleContent(editingRule.rule_content);
      setCategory(editingRule.category);
      setPriority(editingRule.priority);
    } else {
      setTitle("");
      setTitleKo("");
      setTitleJa("");
      setTitleZh("");
      setDescription("");
      setRuleContent("");
      setCategory("general");
      setPriority(50);
      setFileName("");
    }
  }, [editingRule, show]);

  if (!show) return null;

  const canSubmit = title.trim() && ruleContent.trim();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;

    const base = {
      title: title.trim(),
      title_ko: titleKo.trim(),
      title_ja: titleJa.trim(),
      title_zh: titleZh.trim(),
      description: description.trim(),
      rule_content: ruleContent.trim(),
      category,
      scope_type: "global" as const,
      priority,
    };

    if (isEditing) {
      onUpdate(editingRule.id, base);
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
                ? t({ ko: "룰 수정", en: "Edit Rule", ja: "ルール編集", zh: "编辑规则" })
                : t({ ko: "새 룰 추가", en: "Add New Rule", ja: "新しいルール追加", zh: "添加新规则" })}
            </h3>
            <div className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "룰 제목과 내용을 입력하세요",
                en: "Enter rule title and content",
                ja: "ルールのタイトルと内容を入力してください",
                zh: "输入规则标题和内容",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-2.5 py-1 text-xs font-mono transition-all"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "룰 제목 (영문)", en: "Rule Title (EN)", ja: "ルールタイトル（英語）", zh: "规则标题（英文）" })} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({
                ko: "예: Always write tests first",
                en: "e.g. Always write tests first",
                ja: "例: Always write tests first",
                zh: "例如: Always write tests first",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Title KO */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "룰 제목 (한국어)", en: "Rule Title (KO)", ja: "ルールタイトル（韓国語）", zh: "规则标题（韩文）" })}
            </label>
            <input
              type="text"
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              placeholder={t({
                ko: "예: 항상 테스트를 먼저 작성",
                en: "e.g. 항상 테스트를 먼저 작성",
                ja: "例: 항상 테스트를 먼저 작성",
                zh: "例如: 항상 테스트를 먼저 작성",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t({
                ko: "이 룰이 왜 필요한지 간단히 설명해주세요",
                en: "Briefly explain why this rule is needed",
                ja: "このルールが必要な理由を簡単に説明してください",
                zh: "简要说明此规则的必要性",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
          </div>

          {/* Rule Content */}
          <div>
            <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "룰 내용", en: "Rule Content", ja: "ルール内容", zh: "规则内容" })} *
            </label>
            <textarea
              value={ruleContent}
              onChange={(e) => setRuleContent(e.target.value)}
              rows={4}
              placeholder={t({
                ko: "에이전트에게 전달될 실제 규칙 텍스트를 입력하세요",
                en: "Enter the actual rule text that will be delivered to agents",
                ja: "エージェントに伝えられる実際のルールテキストを入力してください",
                zh: "输入将传达给代理的实际规则文本",
              })}
              className="w-full px-3 py-2 text-sm focus:outline-none resize-none font-mono"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "이 텍스트가 에이전트 프롬프트에 주입됩니다",
                  en: "This text will be injected into agent prompts",
                  ja: "このテキストがエージェントのプロンプトに注入されます",
                  zh: "此文本将注入到代理提示中",
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono transition-all"
                  style={{ borderRadius: "2px", background: "var(--th-bg-surface-hover)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
                >
                  {t({ ko: "파일에서 불러오기", en: "Load from file", ja: "ファイルから読込", zh: "从文件加载" })}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown,.json,.yaml,.yml,.toml,.xml,.csv,.rule,.prompt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 512_000) {
                      alert(t({
                        ko: "파일 크기가 너무 큽니다 (최대 512KB)",
                        en: "File too large (max 512KB)",
                        ja: "ファイルサイズが大きすぎます（最大512KB）",
                        zh: "文件过大（最大512KB）",
                      }));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result;
                      if (typeof text === "string") {
                        setRuleContent(text);
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
            {fileName && ruleContent && (
              <div className="mt-2 p-2 max-h-24 overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
                <pre className="text-[10px] whitespace-pre-wrap break-all font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {ruleContent.slice(0, 500)}
                  {ruleContent.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>

          {/* Category + Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "카테고리", en: "Category", ja: "カテゴリ", zh: "分类" })}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AgentRuleCategory)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ borderRadius: "2px", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
              >
                {RULE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat, t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "우선순위", en: "Priority", ja: "優先順位", zh: "优先级" })} (1-100)
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
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
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
                  {t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })}
                </>
              ) : isEditing ? (
                t({ ko: "룰 수정", en: "Update Rule", ja: "ルール更新", zh: "更新规则" })
              ) : (
                t({ ko: "룰 추가", en: "Add Rule", ja: "ルール追加", zh: "添加规则" })
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
