import { useCallback, useEffect, useState } from "react";
import type { Category } from "../../types";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories-dashboard";
import CategoryCard from "../category-editor/CategoryCard";
import CategoryFormModal from "../category-editor/CategoryFormModal";

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

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
    if (!confirm("이 카테고리를 삭제할까요?")) return;
    await deleteCategory(id);
    await load();
  };

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const globalCats = categories.filter((c) => c.owner_scope === "global");
  const customCats = categories.filter((c) => c.owner_scope !== "global");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">프로젝트 유형 관리</h3>
          <p className="text-[10px] text-[var(--th-text-muted)] mt-0.5">
            프로젝트를 만들 때 사용하는 유형을 정의합니다.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--th-accent)" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + 새 유형 만들기
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded border border-[var(--th-border)] animate-pulse bg-[var(--th-bg-surface)]" />
          ))}
        </div>
      ) : (
        <>
          {customCats.length > 0 && (
            <section>
              <p className="text-[10px] font-mono text-[var(--th-text-muted)] mb-2 uppercase tracking-wider">내가 만든 유형</p>
              <div className="flex flex-col gap-2">
                {customCats.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-[var(--th-text-muted)] uppercase tracking-wider">기본 제공 유형</p>
              <span className="text-[9px] text-[var(--th-text-muted)]">ⓘ 수정 불가 · 복사해서 수정하세요</span>
            </div>
            <div className="flex flex-col gap-2">
              {globalCats.map((cat) => (
                <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          </section>

          {categories.length === 0 && (
            <div className="py-10 text-center text-xs text-[var(--th-text-muted)]">카테고리가 없습니다.</div>
          )}
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
