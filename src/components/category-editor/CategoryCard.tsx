import type { Category } from "../../types";
import { useI18n } from "../../i18n";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const { t } = useI18n();
  const label = category.name_ko ?? category.name;
  const isGlobal = category.owner_scope === "global";
  const slug = category.slug ?? category.name;
  const color = category.color ?? "var(--th-text-muted)";

  return (
    <div
      className="group transition-colors duration-150"
      style={{
        ...mono,
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: "1px solid var(--th-border)",
        borderLeft: `3px solid ${color}`,
        background: "var(--th-bg-panel)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--th-hover-bg)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--th-bg-panel)";
      }}
    >
      {/* 짧은 식별자 배지 (slug) — 직각, 카테고리 색 일관 */}
      <div
        style={{
          width: 72,
          minWidth: 72,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "10px 10px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "3px 6px",
            border: `1px solid ${color}50`,
            background: `${color}18`,
            color,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
          title={slug}
        >
          {slug}
        </span>
      </div>

      {/* 한글 이름 + 설명 영역 */}
      <div style={{ width: 180, flexShrink: 0, padding: "10px 12px", minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--th-text-heading)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--th-text-muted)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {category.name}
        </div>
      </div>

      {/* 설명 */}
      <div style={{ flex: 1, minWidth: 0, padding: "10px 12px" }}>
        {category.description ? (
          <span
            style={{
              fontSize: "11px",
              color: "var(--th-text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {category.description}
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--th-text-muted)", opacity: 0.4 }}>—</span>
        )}
      </div>

      {/* 메타 배지 (GLOBAL/CUSTOM · v · TPL) — 직각, 통일 스타일 */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 600,
            padding: "2px 5px",
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {isGlobal ? "GLOBAL" : "CUSTOM"}
        </span>
        <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.7 }}>
          v{category.version}
        </span>
        {category.is_template === 1 && (
          <span
            style={{
              fontSize: "9px",
              padding: "2px 5px",
              border: "1px solid var(--th-border)",
              color: "var(--th-text-muted)",
              opacity: 0.7,
            }}
          >
            TPL
          </span>
        )}
      </div>

      {/* 액션 버튼 */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ flexShrink: 0, display: "flex", gap: 0, borderLeft: "1px solid var(--th-border)" }}
      >
        <button
          type="button"
          onClick={() => onEdit(category)}
          title={t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
          style={{
            ...mono,
            fontSize: "10px",
            fontWeight: 600,
            padding: "0 12px",
            minHeight: 48,
            background: "none",
            border: "none",
            borderRight: "1px solid var(--th-border)",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            letterSpacing: "0.05em",
            transition: "color 0.1s, background 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--th-accent)";
            e.currentTarget.style.background = "var(--th-accent-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--th-text-muted)";
            e.currentTarget.style.background = "none";
          }}
        >
          EDIT
        </button>
        {!isGlobal && (
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
            style={{
              ...mono,
              fontSize: "10px",
              fontWeight: 600,
              padding: "0 12px",
              minHeight: 48,
              background: "none",
              border: "none",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "color 0.1s, background 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--th-red)";
              e.currentTarget.style.background = "rgba(248,81,73,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--th-text-muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            DEL
          </button>
        )}
      </div>
    </div>
  );
}
