import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center font-mono text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "",
  ghost: "",
  danger: "",
};

// We use inline styles for theme variables instead of Tailwind hardcoded colors.
// This ensures light/dark themes work without override hacks.
const VARIANT_INLINE: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--th-accent)",
    color: "#000",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--th-bg-surface)",
    color: "var(--th-text-primary)",
    border: "1px solid var(--th-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--th-text-secondary)",
    border: "1px solid transparent",
  },
  danger: {
    background: "var(--th-danger-bg)",
    color: "var(--th-danger-text)",
    border: "1px solid var(--th-danger-border)",
  },
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1",
  md: "px-4 py-2",
};

/**
 * Shared button primitive.
 *
 * Uses CSS variables exclusively — no Tailwind color classes that need
 * light-mode overrides.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${BASE} ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
        style={{
          borderRadius: 0,
          ...VARIANT_INLINE[variant],
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
