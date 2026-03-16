import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const mono = "var(--th-font-mono)";

const SIZE_PADDING: Record<ButtonSize, string> = {
  sm: "3px 10px",
  md: "5px 14px",
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--th-accent-glow)",
    border: "1px solid var(--th-accent-border)",
    color: "var(--th-accent)",
    fontWeight: 600,
  },
  secondary: {
    background: "transparent",
    border: "1px solid var(--th-border-strong)",
    color: "var(--th-text-secondary)",
    fontWeight: 500,
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--th-text-muted)",
    fontWeight: 400,
  },
  danger: {
    background: "transparent",
    border: "1px solid var(--th-danger-border)",
    color: "var(--th-danger-text)",
    fontWeight: 500,
  },
};

const HOVER_CLASS: Record<ButtonVariant, string> = {
  primary: "hover:!bg-[var(--th-accent)] hover:!text-black hover:!border-[var(--th-accent)]",
  secondary: "hover:!bg-[var(--th-hover-bg)] hover:!text-[var(--th-text)] hover:!border-[var(--th-border-strong)]",
  ghost: "hover:!bg-[var(--th-hover-bg)] hover:!text-[var(--th-text-secondary)]",
  danger: "hover:!bg-[var(--th-danger-bg)] hover:!border-[var(--th-danger-border)]",
};

/**
 * Shared button — Modern Terminal CLI bracket style.
 * Font: mono, uppercase, no border-radius.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${HOVER_CLASS[variant]} ${className}`}
        style={{
          borderRadius: 0,
          fontFamily: mono,
          fontSize: "11px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: SIZE_PADDING[size],
          cursor: "pointer",
          ...VARIANT_STYLES[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
