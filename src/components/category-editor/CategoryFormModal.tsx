import { useEffect, useState } from "react";
import type { Category } from "../../types";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "../ui";

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
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} width="sm">
      <ModalHeader onClose={onClose}>
        {isEdit ? "카테고리 편집" : "새 카테고리"}
      </ModalHeader>

      <ModalBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 아이콘 + 색상 */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div>
              <label style={labelStyle}>아이콘</label>
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
              <label style={labelStyle}>색상</label>
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
            <label style={labelStyle}>이름 (영문)</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Product Launch"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>이름 (한국어)</label>
            <input
              type="text"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 제품 출시"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="카테고리 설명 (선택)"
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
            <span style={{ color }}>{nameKo || name || "미리보기"}</span>
          </div>

          {error && (
            <p style={{ fontSize: "10px", color: "var(--th-danger-text, #fb7185)" }}>{error}</p>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!name.trim() || saving}
        >
          {saving ? "저장 중…" : isEdit ? "저장" : "만들기"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
