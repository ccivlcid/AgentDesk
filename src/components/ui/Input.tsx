import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const mono = "var(--th-font-mono)";

const INPUT_INLINE: React.CSSProperties = {
  padding: "6px 10px",
  background: "var(--th-input-bg)",
  border: "1px solid var(--th-input-border)",
  borderRadius: 0,
  color: "var(--th-text-primary)",
  fontFamily: mono,
  fontSize: "12px",
  outline: "none",
  width: "100%",
  transition: "border-color 0.1s",
};

/* ── Input ── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`block ${className}`}
        style={{
          ...INPUT_INLINE,
          ...(error ? { borderColor: "var(--th-danger-border)" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--th-accent)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--th-danger-border)" : "var(--th-input-border)";
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
        className={`block resize-none ${className}`}
        style={{
          ...INPUT_INLINE,
          lineHeight: 1.6,
          ...(error ? { borderColor: "var(--th-danger-border)" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--th-accent)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "var(--th-danger-border)" : "var(--th-input-border)";
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
