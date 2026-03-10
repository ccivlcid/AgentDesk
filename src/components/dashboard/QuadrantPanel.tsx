import type { ReactNode } from "react";

interface QuadrantPanelProps {
  title: string;
  subtitle: string;
  accentColor?: string;
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  isEmpty: boolean;
}

export default function QuadrantPanel({
  title,
  subtitle,
  accentColor = "var(--th-accent)",
  emptyText,
  addLabel,
  onAdd,
  children,
  isEmpty,
}: QuadrantPanelProps) {
  return (
    <div className="flex flex-col border border-[var(--th-border)] rounded bg-[var(--th-bg-surface)] overflow-hidden min-h-0">
      {/* 헤더 */}
      <div
        className="px-3 py-2.5 border-b border-[var(--th-border)]"
        style={{ borderLeftWidth: "3px", borderLeftStyle: "solid", borderLeftColor: accentColor }}
      >
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[10px] text-[var(--th-text-muted)] mt-0.5">{subtitle}</div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-6 px-4 text-center">
            <div className="text-[11px] text-[var(--th-text-muted)] mb-3">{emptyText}</div>
            <button
              onClick={onAdd}
              className="text-[11px] px-3 py-1 border border-dashed border-[var(--th-border)]
                         text-[var(--th-text-muted)] hover:border-[var(--th-accent)]
                         hover:text-[var(--th-accent)] rounded transition-colors"
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
        <div className="px-2 pb-2">
          <button
            onClick={onAdd}
            className="w-full text-[10px] text-[var(--th-text-muted)] hover:text-[var(--th-accent)]
                       py-1 border border-dashed border-[var(--th-border)]
                       hover:border-[var(--th-accent)] rounded transition-colors"
          >
            + {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}
