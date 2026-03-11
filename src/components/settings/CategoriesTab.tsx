import { useCallback, useEffect, useState } from "react";
import type { Category } from "../../types";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories-dashboard";
import CategoryCard from "../category-editor/CategoryCard";
import CategoryFormModal from "../category-editor/CategoryFormModal";
import { useConfirm } from "../ui/ConfirmDialog";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function CategoriesTab() {
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
    const ok = await confirm({ title: "카테고리 삭제", message: "이 카테고리를 삭제할까요?", variant: "danger", confirmLabel: "삭제" });
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
    <div style={{ ...mono, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── 터미널 헤더 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "10px 16px", background: "var(--th-bg-elevated)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-muted)" }}>ls project-types/ --all</span>
        <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5 }}>
          {loading ? "loading…" : `${categories.length} types · ${customCats.length} custom · ${globalCats.length} global`}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 48, marginBottom: 2, background: "var(--th-bg-surface)", borderLeft: "3px solid var(--th-border)", opacity: 0.4 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── CUSTOM 섹션 ── */}
          <div style={{ borderBottom: "1px solid var(--th-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "var(--th-bg-primary)" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)" }}>
                CUSTOM
              </span>
              <span style={{ fontSize: "9px", color: "var(--th-border)" }}>
                ─────────────────────────────────────────────
              </span>
              <span style={{ fontSize: "9px", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", padding: "1px 6px", border: "1px solid var(--th-border)" }}>
                {customCats.length}
              </span>
              <button
                onClick={openCreate}
                style={{
                  ...mono,
                  marginLeft: "auto",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  border: "1px solid var(--th-accent)",
                  background: "rgba(245,158,11,0.08)",
                  color: "var(--th-accent)",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                + NEW TYPE
              </button>
            </div>

            {customCats.length === 0 ? (
              <div style={{ padding: "16px", fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.5 }}>
                — no custom types yet —
              </div>
            ) : (
              customCats.map((cat) => (
                <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* ── GLOBAL 섹션 ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "var(--th-bg-primary)" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)" }}>
                GLOBAL
              </span>
              <span style={{ fontSize: "9px", color: "var(--th-border)" }}>
                ─────────────────────────────────────────────
              </span>
              <span style={{ fontSize: "9px", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", padding: "1px 6px", border: "1px solid var(--th-border)" }}>
                {globalCats.length}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5 }}>
                read-only · copy to edit
              </span>
            </div>

            {globalCats.map((cat) => (
              <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>

          {/* ── footer ── */}
          <div style={{ borderTop: "1px solid var(--th-border)", padding: "6px 16px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5 }}>
              $ total {categories.length} entries
            </span>
          </div>
        </>
      )}

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
