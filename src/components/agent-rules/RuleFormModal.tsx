import { useState, useEffect, useRef } from "react";
import type { AgentRule, AgentRuleCategory, Agent, Department } from "../../types";
import type { CreateAgentRuleInput, UpdateAgentRuleInput } from "../../api/agent-rules";
import { RULE_CATEGORIES, categoryLabel, type TFunction } from "./model";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, FormField, useToast } from "../ui";

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
  const { showToast } = useToast();
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

  const selectStyle: React.CSSProperties = {
    borderRadius: "2px",
    background: "var(--th-input-bg)",
    border: "1px solid var(--th-input-border)",
    color: "var(--th-text-secondary)",
  };

  return (
    <Modal open={show} onClose={onClose} width="md">
      <ModalHeader onClose={onClose}>
        {isEditing
          ? t({ ko: "룰 수정", en: "Edit Rule", ja: "ルール編集", zh: "编辑规则" })
          : t({ ko: "새 룰 추가", en: "Add New Rule", ja: "新しいルール追加", zh: "添加新规则" })}
      </ModalHeader>

      <ModalBody className="space-y-4">
        <FormField
          label={t({ ko: "룰 제목 (영문)", en: "Rule Title (EN)", ja: "ルールタイトル（英語）", zh: "规则标题（英文）" })}
          required
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({
              ko: "예: Always write tests first",
              en: "e.g. Always write tests first",
              ja: "例: Always write tests first",
              zh: "例如: Always write tests first",
            })}
          />
        </FormField>

        <FormField
          label={t({ ko: "룰 제목 (한국어)", en: "Rule Title (KO)", ja: "ルールタイトル（韓国語）", zh: "规则标题（韩文）" })}
        >
          <Input
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder={t({
              ko: "예: 항상 테스트를 먼저 작성",
              en: "e.g. 항상 테스트를 먼저 작성",
              ja: "例: 항상 테스트를 먼저 작성",
              zh: "例如: 항상 테스트를 먼저 작성",
            })}
          />
        </FormField>

        <FormField label={t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" })}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t({
              ko: "이 룰이 왜 필요한지 간단히 설명해주세요",
              en: "Briefly explain why this rule is needed",
              ja: "このルールが必要な理由を簡単に説明してください",
              zh: "简要说明此规则的必要性",
            })}
          />
        </FormField>

        <div>
          <FormField
            label={t({ ko: "룰 내용", en: "Rule Content", ja: "ルール内容", zh: "规则内容" })}
            required
          >
            <Textarea
              value={ruleContent}
              onChange={(e) => setRuleContent(e.target.value)}
              rows={4}
              style={{ fontFamily: "var(--th-font-mono)" }}
              placeholder={t({
                ko: "에이전트에게 전달될 실제 규칙 텍스트를 입력하세요",
                en: "Enter the actual rule text that will be delivered to agents",
                ja: "エージェントに伝えられる実際のルールテキストを入力してください",
                zh: "输入将传达给代理的实际规则文本",
              })}
            />
          </FormField>
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
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                {t({ ko: "파일에서 불러오기", en: "Load from file", ja: "ファイルから読込", zh: "从文件加载" })}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.markdown,.json,.yaml,.yml,.toml,.xml,.csv,.rule,.prompt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 512_000) {
                    showToast(t({
                      ko: "파일 크기가 너무 큽니다 (최대 512KB)",
                      en: "File too large (max 512KB)",
                      ja: "ファイルサイズが大きすぎます（最大512KB）",
                      zh: "文件过大（最大512KB）",
                    }), "warning");
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
                <span className="text-[10px] truncate max-w-[140px]" style={{ color: "var(--th-attr-elite)" }}>
                  {fileName}
                </span>
              )}
            </div>
          </div>
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
          <FormField label={t({ ko: "카테고리", en: "Category", ja: "カテゴリ", zh: "分类" })}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AgentRuleCategory)}
              className="w-full px-3 py-2 text-sm outline-none"
              style={selectStyle}
            >
              {RULE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat, t)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={`${t({ ko: "우선순위", en: "Priority", ja: "優先順位", zh: "优先级" })} (1-100)`}>
            <Input
              type="number"
              min={1}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value) || 50)))}
            />
          </FormField>
        </div>

        {/* Error */}
        {error && (
          <div className="text-[11px] px-3 py-2" style={{ borderRadius: "2px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", color: "var(--th-danger-text)" }}>
            {error}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting
            ? t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
            : isEditing
              ? t({ ko: "룰 수정", en: "Update Rule", ja: "ルール更新", zh: "更新规则" })
              : t({ ko: "룰 추가", en: "Add Rule", ja: "ルール追加", zh: "添加规则" })}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
