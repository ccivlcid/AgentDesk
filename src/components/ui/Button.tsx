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
    background: "#EBF5FF",
    border: "1px solid #BFDBFE",
    color: "#3B82F6",
    fontWeight: 600,
  },
  secondary: {
    background: "transparent",
    border: "1px solid #D1D5DB",
    color: "#6B7280",
    fontWeight: 500,
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#9CA3AF",
    fontWeight: 400,
  },
  danger: {
    background: "transparent",
    border: "1px solid #FECACA",
    color: "#DC2626",
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
