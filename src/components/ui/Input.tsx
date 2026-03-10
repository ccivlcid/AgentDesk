import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

/* ── Shared focus / base styles ──
 * Uses CSS variables exclusively so light/dark themes work
 * without the [data-theme="light"] override hacks. */

const INPUT_BASE =
  "w-full text-sm outline-none transition-colors font-[var(--th-font-body)]";

const INPUT_INLINE: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--th-input-bg)",
  border: "1px solid var(--th-input-border)",
  borderRadius: "2px",
  color: "var(--th-text-primary)",
};

/* ── Input ── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Show error border */
  error?: boolean;
  /** Use monospace font */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, mono, className = "", style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${INPUT_BASE} ${mono ? "font-mono" : ""} ${className}`}
        style={{
          ...INPUT_INLINE,
          ...(error ? { borderColor: "var(--th-danger-border)" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--th-focus-ring)";
          e.currentTarget.style.boxShadow = "0 0 0 2px var(--th-focus-ring-shadow)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--th-danger-border)" : "var(--th-input-border)";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

/* ── Textarea ── */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`${INPUT_BASE} resize-none ${className}`}
        style={{
          ...INPUT_INLINE,
          ...(error ? { borderColor: "var(--th-danger-border)" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--th-focus-ring)";
          e.currentTarget.style.boxShadow = "0 0 0 2px var(--th-focus-ring-shadow)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--th-danger-border)" : "var(--th-input-border)";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
