import { useEffect, useState } from "react";
import type { Category } from "../../types";

interface CategoryFormModalProps {
  initial?: Category | null;
  onConfirm: (data: { name: string; name_ko: string; description: string; icon: string; color: string }) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
const PRESET_ICONS = ["🚀", "💼", "🎨", "📊", "🔬", "⚙️", "🌐", "📱", "🏗️", "🎯"];

export default function CategoryFormModal({ initial, onConfirm, onClose }: CategoryFormModalProps) {
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [nameKo, setNameKo] = useState(initial?.name_ko ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📁");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-lg shadow-xl p-5 flex flex-col gap-4"
        style={{ backgroundColor: "var(--th-bg-primary)", border: "1px solid var(--th-border)" }}
      >
        <h3 className="text-sm font-bold">
          {isEdit ? "카테고리 편집" : "새 카테고리"}
        </h3>

        {/* 아이콘 + 색상 선택 */}
        <div className="flex gap-3 items-start">
          <div>
            <label className="text-[10px] text-[var(--th-text-muted)] font-mono block mb-1">아이콘</label>
            <div className="flex flex-wrap gap-1 w-36">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-7 h-7 text-sm rounded flex items-center justify-center transition-colors ${
                    icon === ic ? "bg-[var(--th-bg-elevated)] ring-1 ring-[var(--th-accent)]" : "hover:bg-[var(--th-bg-elevated)]"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[var(--th-text-muted)] font-mono block mb-1">색상</label>
            <div className="flex flex-wrap gap-1 w-24">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 w-full text-[10px] px-2 py-1 rounded border font-mono"
              style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text)" }}
              placeholder="#6366f1"
            />
          </div>
        </div>

        {/* 이름 필드 */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-[var(--th-text-muted)] font-mono block mb-1">이름 (영문)</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Product Launch"
              className="w-full px-3 py-2 text-sm rounded border"
              style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text)", outline: "none" }}
            />
          </div>

          <div>
            <label className="text-[10px] text-[var(--th-text-muted)] font-mono block mb-1">이름 (한국어)</label>
            <input
              type="text"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 제품 출시"
              className="w-full px-3 py-2 text-sm rounded border"
              style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text)", outline: "none" }}
            />
          </div>

          <div>
            <label className="text-[10px] text-[var(--th-text-muted)] font-mono block mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="카테고리 설명 (선택)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded border resize-none"
              style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text)", outline: "none" }}
            />
          </div>
        </div>

        {/* 미리보기 */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded text-xs"
          style={{ backgroundColor: `${color}11`, border: `1px solid ${color}33` }}
        >
          <span className="text-base">{icon}</span>
          <span style={{ color }}>{nameKo || name || "미리보기"}</span>
        </div>

        {error && <p className="text-[10px] text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs border border-[var(--th-border)] rounded text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="flex-1 py-2 text-xs rounded text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            {saving ? "저장 중…" : isEdit ? "저장" : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
