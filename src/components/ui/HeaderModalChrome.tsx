import type { ReactNode } from "react";

const mono = "var(--th-font-mono)";

export interface HeaderModalChromeProps {
  /** 타이틀 (설정 언어로 번역된 문자열) */
  title: string;
  /** 시질: "//" 섹션 스타일, "$" 프롬프트 스타일 */
  sigil?: "//" | "$";
  /** 헤더 오른쪽 액션 (새로고침, 배지 등) */
  rightSlot?: ReactNode;
  onClose: () => void;
  /** macOS 스타일: 트래픽 라이트 + 둥근 헤더 */
  macOSStyle?: boolean;
}

/**
 * 헤더에서 여는 모달/패널 공통 헤더 바.
 * macOS 스타일 시 트래픽 라이트(빨·노·초), 둥근 모서리 적용.
 */
export default function HeaderModalChrome({
  title,
  sigil = "//",
  rightSlot,
  onClose,
  macOSStyle = true,
}: HeaderModalChromeProps) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 py-2.5 pl-3 pr-4"
      style={{
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        fontFamily: mono,
        borderTopLeftRadius: macOSStyle ? 10 : 0,
        borderTopRightRadius: macOSStyle ? 10 : 0,
      }}
    >
      {/* macOS 트래픽 라이트 */}
      {macOSStyle && (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-3 w-3 flex-shrink-0 rounded-full border-0 transition-opacity hover:opacity-90"
            style={{ background: "#ff5f57" }}
          />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!macOSStyle && (
          <span
            style={{
              color: "var(--th-accent)",
              fontWeight: 700,
              fontSize: "11px",
              flexShrink: 0,
            }}
          >
            {sigil}
          </span>
        )}
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--th-text-heading)",
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {rightSlot}
        {!macOSStyle && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              border: "1px solid var(--th-border)",
              background: "transparent",
              borderRadius: 0,
              fontFamily: mono,
              fontSize: "12px",
              color: "var(--th-text-muted)",
              cursor: "pointer",
            }}
            className="hover:!text-[var(--th-text)] hover:!border-[var(--th-border-strong)] hover:!bg-[var(--th-hover-bg)]"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
