import { useEffect, useState } from "react";
import type { Category } from "../../types";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "../ui";
import { useI18n } from "../../i18n";

interface CategoryFormModalProps {
  initial?: Category | null;
  onConfirm: (data: { name: string; name_ko: string; description: string; icon: string; color: string }) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
const PRESET_ICONS = ["🚀", "💼", "🎨", "📊", "🔬", "⚙️", "🌐", "📱", "🏗️", "🎯"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: "13px",
  borderRadius: 0,
  border: "1px solid var(--th-border)",
  background: "var(--th-bg-surface)",
  color: "var(--th-text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontFamily: "var(--th-font-mono)",
  color: "var(--th-text-muted)",
  marginBottom: "4px",
};

export default function CategoryFormModal({ initial, onConfirm, onClose }: CategoryFormModalProps) {
  const { t } = useI18n();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [nameKo, setNameKo] = useState(initial?.name_ko ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📁");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ name: name.trim(), name_ko: nameKo.trim(), description: description.trim(), icon, color });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t({ ko: "저장 실패", en: "Save failed", ja: "保存失敗", zh: "保存失败" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} width="sm">
      <ModalHeader onClose={onClose}>
        {isEdit ? t({ ko: "카테고리 편집", en: "Edit Category", ja: "カテゴリ編集", zh: "编辑分类" }) : t({ ko: "새 카테고리", en: "New Category", ja: "新しいカテゴリ", zh: "新建分类" })}
      </ModalHeader>

      <ModalBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 아이콘 + 색상 */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div>
              <label style={labelStyle}>{t({ ko: "아이콘", en: "Icon", ja: "アイコン", zh: "图标" })}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", width: "144px" }}>
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    style={{
                      width: "28px",
                      height: "28px",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 0,
                      border: icon === ic ? "1px solid var(--th-accent)" : "1px solid var(--th-border)",
                      background: icon === ic ? "var(--th-bg-elevated)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t({ ko: "색상", en: "Color", ja: "カラー", zh: "颜色" })}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", width: "96px" }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: color === c ? "2px solid white" : "2px solid transparent",
                      outline: color === c ? `2px solid ${c}` : "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ ...inputStyle, marginTop: "6px", fontSize: "10px" }}
                placeholder="#6366f1"
              />
            </div>
          </div>

          {/* 이름 필드 */}
          <div>
            <label style={labelStyle}>{t({ ko: "이름 (영문)", en: "Name (English)", ja: "名前 (英語)", zh: "名称 (英文)" })}</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Launch"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t({ ko: "이름 (한국어)", en: "Name (Korean)", ja: "名前 (韓国語)", zh: "名称 (韩文)" })}</label>
            <input
              type="text"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder={t({ ko: "예: 제품 출시", en: "e.g. 제품 출시", ja: "例: 제품 출시", zh: "例如: 제품 출시" })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" })}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t({ ko: "카테고리 설명 (선택)", en: "Category description (optional)", ja: "カテゴリの説明 (任意)", zh: "分类描述 (可选)" })}
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* 미리보기 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: 0,
              backgroundColor: `${color}11`,
              border: `1px solid ${color}33`,
              fontSize: "12px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{icon}</span>
            <span style={{ color }}>{nameKo || name || t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}</span>
          </div>

          {error && (
            <p style={{ fontSize: "10px", color: "var(--th-danger-text, #fb7185)" }}>{error}</p>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>{t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!name.trim() || saving}
        >
          {saving ? t({ ko: "저장 중…", en: "Saving…", ja: "保存中…", zh: "保存中…" }) : isEdit ? t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" }) : t({ ko: "만들기", en: "Create", ja: "作成", zh: "创建" })}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
