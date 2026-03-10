import type { ReactNode } from "react";

interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Show required asterisk */
  required?: boolean;
  /** Optional hint below the label */
  hint?: string;
  /** Error message (shown below the input) */
  error?: string;
  /** Sub-label like "(optional)" */
  suffix?: string;
  /** The input element(s) */
  children: ReactNode;
}

/**
 * Shared form field wrapper.
 *
 * Provides consistent label, hint, error, and spacing
 * across all form modals.
 */
export default function FormField({
  label,
  required,
  hint,
  error,
  suffix,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--th-text-heading)" }}>
        {label}
        {required && (
          <span style={{ color: "var(--th-danger-text, #ef4444)" }} aria-hidden="true">
            {" *"}
          </span>
        )}
        {suffix && (
          <span className="font-normal ml-1" style={{ color: "var(--th-text-muted)" }}>
            {suffix}
          </span>
        )}
      </label>
      {hint && (
        <p className="text-[11px] mb-1.5" style={{ color: "var(--th-text-muted)" }}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="text-[11px] mt-1" style={{ color: "var(--th-danger-text, #ef4444)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
