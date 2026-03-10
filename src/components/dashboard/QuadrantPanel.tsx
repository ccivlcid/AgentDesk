import type { ReactNode } from "react";

interface QuadrantPanelProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  accentColor?: string;
  emptyText: string;
  emptyGuide?: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  isEmpty: boolean;
}

export default function QuadrantPanel({
  title,
  subtitle,
  icon,
  accentColor = "var(--th-accent)",
  emptyText,
  emptyGuide,
  addLabel,
  onAdd,
  children,
  isEmpty,
}: QuadrantPanelProps) {
  return (
    <div className="flex flex-col border border-[var(--th-border)] rounded bg-[var(--th-bg-surface)] overflow-hidden min-h-0">
      {/* 헤더 */}
      <div
        className="flex items-start gap-2 px-3 py-2.5 border-b border-[var(--th-border)] flex-shrink-0"
        style={{ borderLeftWidth: "3px", borderLeftStyle: "solid", borderLeftColor: accentColor }}
      >
        {icon && (
          <span className="flex-shrink-0 mt-0.5 text-base leading-none" style={{ color: accentColor }}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div
            className="text-[13px] font-semibold leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {title}
          </div>
          <div className="text-[11px] text-[var(--th-text-muted)] mt-0.5">{subtitle}</div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center h-full py-8 px-4 text-center mx-2 my-2 rounded"
            style={{ border: "1px dashed var(--th-border)" }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: "var(--th-text)" }}>{emptyText}</div>
            {emptyGuide && (
              <div className="text-[11px] text-[var(--th-text-muted)] mb-3 leading-snug">{emptyGuide}</div>
            )}
            <button
              onClick={onAdd}
              className="text-xs px-4 py-1.5 rounded hover:opacity-90 transition-opacity font-medium"
              style={{ background: accentColor, color: "#fff" }}
            >
              + {addLabel}
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">{children}</div>
        )}
      </div>

      {/* 추가 버튼 (항목이 있을 때) */}
      {!isEmpty && (
        <div className="px-2 pb-2 flex-shrink-0">
          <button
            onClick={onAdd}
            className="w-full text-[11px] py-1.5 rounded transition-colors"
            style={{
              border: "1px dashed var(--th-border)",
              color: "var(--th-text-muted)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor;
              (e.currentTarget as HTMLButtonElement).style.color = accentColor;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)";
            }}
          >
            + {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}
