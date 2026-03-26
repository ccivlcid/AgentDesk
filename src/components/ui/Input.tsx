import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const mono = "var(--th-font-mono)";

const INPUT_INLINE: React.CSSProperties = {
  padding: "6px 10px",
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 0,
  color: "#111827",
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
          ...(error ? { borderColor: "#FECACA" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#FECACA" : "#E5E7EB";
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
          ...(error ? { borderColor: "#FECACA" } : {}),
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#FECACA" : "#E5E7EB";
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
