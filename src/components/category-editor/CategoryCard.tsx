import type { Category } from "../../types";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export default function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const label = category.name_ko ?? category.name;
  const isGlobal = category.owner_scope === "global";

  return (
    <div
      className="group"
      style={{
        ...mono,
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: "1px solid var(--th-border)",
        borderLeft: `3px solid ${category.color ?? "var(--th-border)"}`,
        background: "var(--th-bg-primary)",
        transition: "background 0.1s",
        cursor: "default",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-primary)"; }}
    >
      {/* 아이콘 (긴 라벨일 때 한 줄 유지) */}
      <div
        style={{
          width: 44,
          minWidth: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 4px",
          fontSize: "11px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={category.icon || undefined}
      >
        {category.icon || "📁"}
      </div>

      {/* 이름 + slug */}
      <div style={{ width: 160, flexShrink: 0, padding: "10px 8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--th-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </div>
        <div style={{ fontSize: "9px", color: category.color ?? "var(--th-text-muted)", marginTop: 2, opacity: 0.8 }}>
          {category.slug ?? category.name}
        </div>
      </div>

      {/* 설명 */}
      <div style={{ flex: 1, minWidth: 0, padding: "10px 8px" }}>
        {category.description ? (
          <span style={{ fontSize: "10px", color: "var(--th-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {category.description}
          </span>
        ) : (
          <span style={{ fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.3 }}>—</span>
        )}
      </div>

      {/* 메타 배지들 (한 줄 유지) */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: "8px", padding: "1px 5px", border: `1px solid ${category.color ?? "var(--th-border)"}44`, color: category.color ?? "var(--th-text-muted)", background: `${category.color ?? "#888"}11`, letterSpacing: "0.06em" }}>
          {isGlobal ? "GLOBAL" : "CUSTOM"}
        </span>
        <span style={{ fontSize: "8px", color: "var(--th-text-muted)", opacity: 0.5 }}>
          v{category.version}
        </span>
        {category.is_template === 1 && (
          <span style={{ fontSize: "8px", padding: "1px 5px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", opacity: 0.6 }}>
            TPL
          </span>
        )}
      </div>

      {/* 액션 버튼 */}
      <div
        className="opacity-0 group-hover:opacity-100"
        style={{ flexShrink: 0, display: "flex", gap: 0, transition: "opacity 0.1s", borderLeft: "1px solid var(--th-border)" }}
      >
        <button
          onClick={() => onEdit(category)}
          title="편집"
          style={{
            ...mono,
            fontSize: "9px",
            fontWeight: 700,
            padding: "0 12px",
            height: "100%",
            minHeight: 44,
            background: "none",
            border: "none",
            borderRight: "1px solid var(--th-border)",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; e.currentTarget.style.background = "rgba(245,158,11,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.background = "none"; }}
        >
          EDIT
        </button>
        {!isGlobal && (
          <button
            onClick={() => onDelete(category.id)}
            title="삭제"
            style={{
              ...mono,
              fontSize: "9px",
              fontWeight: 700,
              padding: "0 12px",
              height: "100%",
              minHeight: 44,
              background: "none",
              border: "none",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.background = "none"; }}
          >
            DEL
          </button>
        )}
      </div>
    </div>
  );
}
