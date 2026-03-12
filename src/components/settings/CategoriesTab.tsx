import { useCallback, useEffect, useState } from "react";
import type { Category } from "../../types";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories-dashboard";
import CategoryCard from "../category-editor/CategoryCard";
import CategoryFormModal from "../category-editor/CategoryFormModal";
import { useConfirm } from "../ui/ConfirmDialog";
import { useI18n } from "../../i18n";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function CategoriesTab() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCategories();
      setCategories(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: { name: string; name_ko: string; description: string; icon: string; color: string }) => {
    await createCategory(data);
    await load();
  };

  const handleEdit = async (data: { name: string; name_ko: string; description: string; icon: string; color: string }) => {
    if (!editing) return;
    await updateCategory(editing.id, data);
    await load();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t({ ko: "카테고리 삭제", en: "Delete Category", ja: "カテゴリ削除", zh: "删除类别" }),
      message: t({ ko: "이 카테고리를 삭제할까요?", en: "Delete this category?", ja: "このカテゴリを削除しますか？", zh: "确定删除此类别吗？" }),
      variant: "danger",
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
    });
    if (!ok) return;
    await deleteCategory(id);
    await load();
  };

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const globalCats = categories.filter((c) => c.owner_scope === "global");
  const customCats = categories.filter((c) => c.owner_scope !== "global");

  return (
    <div
      style={{
        ...mono,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* ── 터미널 헤더 (macOS) ── */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* macOS 트래픽 라이트 (●●●) */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ff5f57" }} aria-hidden />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} aria-hidden />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} aria-hidden />
        </div>
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>ls project-types/ --all</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--th-text-muted)",
            background: "var(--th-bg-surface)",
            padding: "2px 8px",
            borderRadius: 6,
            border: "1px solid var(--th-border)",
          }}
        >
          {loading ? "…" : `${categories.length} types · ${customCats.length} custom · ${globalCats.length} global`}
        </span>
      </div>

      {/* 본문 (설정과 동일 패딩) */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--th-bg-primary)", padding: "20px 18px 24px" }}>
      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 52,
                marginBottom: 8,
                borderRadius: 8,
                background: "var(--th-bg-surface)",
                borderLeft: "3px solid var(--th-border)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* ── // CUSTOM ── */}
          <div style={{ borderBottom: "1px solid var(--th-border)", marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 0",
                background: "transparent",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--th-text-muted)",
                  fontFamily: "var(--th-font-mono)",
                }}
              >
                // CUSTOM
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--th-text-muted)",
                  background: "var(--th-bg-surface)",
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid var(--th-border)",
                }}
              >
                {customCats.length}
              </span>
              <button
                type="button"
                onClick={openCreate}
                style={{
                  ...mono,
                  marginLeft: "auto",
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--th-accent-border)",
                  background: "var(--th-accent-glow)",
                  color: "var(--th-accent)",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                className="hover:!bg-[var(--th-accent)] hover:!text-black hover:!border-[var(--th-accent)]"
              >
                + {t({ ko: "새 타입", en: "NEW TYPE", ja: "新規タイプ", zh: "新建类型" })}
              </button>
            </div>

            {customCats.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  fontSize: "11px",
                  color: "var(--th-text-muted)",
                  textAlign: "center",
                  borderBottom: "1px solid var(--th-border)",
                }}
              >
                {t({ ko: "— 커스텀 타입 없음 —", en: "— no custom types yet —", ja: "— カスタムタイプなし —", zh: "— 暂无自定义类型 —" })}
              </div>
            ) : (
              customCats.map((cat) => (
                <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* ── // GLOBAL ── */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                background: "var(--th-bg-base)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--th-text-muted)",
                  fontFamily: "var(--th-font-mono)",
                }}
              >
                // GLOBAL
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--th-text-muted)",
                  background: "var(--th-bg-surface)",
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid var(--th-border)",
                }}
              >
                {globalCats.length}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)" }}>
                {t({ ko: "읽기 전용 · 복사 후 편집", en: "read-only · copy to edit", ja: "読み取り専用 · コピーして編集", zh: "只读 · 复制后编辑" })}
              </span>
            </div>

            {globalCats.map((cat) => (
              <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>

          {/* ── footer ── */}
          <div
            style={{
              borderTop: "1px solid var(--th-border)",
              padding: "8px 0 0",
              marginTop: 16,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "10px" }}>$</span>
            <span style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>
              {t({ ko: `총 ${categories.length}개`, en: `total ${categories.length} entries`, ja: `合計 ${categories.length} 件`, zh: `共 ${categories.length} 条` })}
            </span>
          </div>
        </>
      )}
      </div>

      {showModal && (
        <CategoryFormModal
          initial={editing}
          onConfirm={editing ? handleEdit : handleCreate}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
