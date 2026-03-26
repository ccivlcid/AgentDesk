import { useState, useEffect, useRef } from "react";
import type { AgentRule, AgentRuleCategory, AgentRuleScopeType } from "../../types";
import type { CreateAgentRuleInput, UpdateAgentRuleInput } from "../../api/agent-rules";
import { RULE_CATEGORIES, categoryLabel, type TFunction } from "./model";
import FloatingWindow from "../skills-library/FloatingWindow";

interface RuleFormModalProps {
  t: TFunction;
  show: boolean;
  editingRule: AgentRule | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: CreateAgentRuleInput) => void;
  onUpdate: (id: string, input: UpdateAgentRuleInput) => void;
  scopeOverride?: { scope_type: AgentRuleScopeType; scope_id?: string };
}

export default function RuleFormModal({
  t,
  show,
  editingRule,
  submitting,
  error,
  onClose,
  onCreate,
  onUpdate,
  scopeOverride,
}: RuleFormModalProps) {
  const [title, setTitle] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState<AgentRuleCategory>("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingRule;

  useEffect(() => {
    if (editingRule) {
      setTitle(editingRule.title);
      setRuleContent(editingRule.rule_content);
      setCategory(editingRule.category);
      setFileName("");
    } else {
      setTitle("");
      setRuleContent("");
      setCategory("general");
      setFileName("");
    }
  }, [editingRule, show]);

  if (!show) return null;

  const canSubmit = title.trim() && ruleContent.trim();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;
    const base = {
      title: title.trim(),
      title_ko: "",
      title_ja: "",
      title_zh: "",
      description: "",
      rule_content: ruleContent.trim(),
      category,
      scope_type: scopeOverride?.scope_type ?? ("global" as const),
      scope_id: scopeOverride?.scope_id,
      priority: 50,
    };
    if (isEditing) {
      onUpdate(editingRule.id, base);
    } else {
      onCreate(base);
    }
  };

  return (
    <FloatingWindow
      title={isEditing
        ? t({ ko: "룰 수정", en: "Edit Rule", ja: "ルール編集", zh: "编辑规则" })
        : t({ ko: "새 룰 추가", en: "Add New Rule", ja: "新しいルール追加", zh: "添加新规则" })}
      subtitle={t({
        ko: "규칙 제목과 md 파일을 첨부하세요",
        en: "Enter a title and attach an md file",
        ja: "タイトルを入力してmdファイルを添付してください",
        zh: "输入标题并附加md文件",
      })}
      onClose={onClose}
      disableClose={submitting}
      defaultWidth={480}
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "제목", en: "Title", ja: "タイトル", zh: "标题" })} *
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
            className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
          />
        </div>

        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "카테고리", en: "Category", ja: "カテゴリ", zh: "分类" })}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AgentRuleCategory)}
            className="w-full px-3 py-2 text-sm font-mono outline-none"
            style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
          >
            {RULE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat, t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "규칙 파일", en: "Rule File", ja: "ルールファイル", zh: "规则文件" })} *
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition"
              style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
            >
              <span>📎</span>
              {t({ ko: "파일 선택", en: "Choose File", ja: "ファイル選択", zh: "选择文件" })}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.markdown,.rule,.prompt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const text = ev.target?.result;
                  if (typeof text === "string") setRuleContent(text);
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
              className="hidden"
            />
            {fileName && (
              <span className="text-xs font-mono truncate max-w-[200px]" style={{ color: "var(--th-text-primary)" }}>
                📄 {fileName}
              </span>
            )}
          </div>
          {ruleContent && (
            <div className="mt-2 p-2 max-h-32 overflow-y-auto" style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all" style={{ color: "var(--th-text-muted)" }}>
                {ruleContent.slice(0, 500)}
                {ruleContent.length > 500 && "..."}
              </pre>
            </div>
          )}
        </div>

        {error && (
          <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: 8, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pb-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-mono transition"
            style={{ borderRadius: 8, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-4 py-1.5 text-xs font-mono border transition flex items-center gap-1.5"
            style={!canSubmit
              ? { borderRadius: 8, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "not-allowed" }
              : { borderRadius: 8, border: "1px solid var(--th-accent-focus)", background: "var(--th-accent-bg)", color: "var(--th-text-primary)" }}
          >
            {submitting ? (
              <>
                <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
                {t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })}
              </>
            ) : isEditing
              ? t({ ko: "룰 수정", en: "Update Rule", ja: "ルール更新", zh: "更新规则" })
              : t({ ko: "룰 추가", en: "Add Rule", ja: "ルール追加", zh: "添加规则" })}
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
}
