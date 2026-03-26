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
    border: "1px solid #BFDBFE",
    color: "var(--th-accent)",
    fontWeight: 600,
  },
  secondary: {
    background: "transparent",
    border: "1px solid #D1D5DB",
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
    border: "1px solid #FECACA",
    color: "var(--th-danger-text)",
    fontWeight: 500,
  },
};

const HOVER_CLASS: Record<ButtonVariant, string> = {
  primary: "hover:!bg-[#3B82F6] hover:!text-black hover:!border-[#3B82F6]",
  secondary: "hover:!bg-[#F3F4F6] hover:!text-[#111827] hover:!border-[#D1D5DB]",
  ghost: "hover:!bg-[#F3F4F6] hover:!text-[#6B7280]",
  danger: "hover:!bg-[#FEF2F2] hover:!border-[#FECACA]",
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
          borderRadius: 8,
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
