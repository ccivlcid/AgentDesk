import type { ReactNode } from "react";

const mono = "var(--th-font-mono)";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  suffix?: string;
  children: ReactNode;
}

/**
 * Shared form field wrapper — Modern Terminal CLI style.
 * Label: `// field-name` pattern (mono, muted, uppercase).
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
      {/* // field-name label */}
      <label
        className="flex items-center gap-1.5 mb-1.5"
        style={{ fontFamily: mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9CA3AF" }}
      >
        <span style={{ opacity: 0.6 }}>//</span>
        <span>{label}</span>
        {required && (
          <span style={{ color: "#3B82F6", fontWeight: 700 }} aria-hidden="true">*</span>
        )}
        {suffix && (
          <span style={{ fontWeight: 400, opacity: 0.6, textTransform: "none" as const }}>
            {suffix}
          </span>
        )}
      </label>

      {hint && (
        <p className="mb-1.5 text-[11px]" style={{ fontFamily: mono, color: "#9CA3AF", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}

      {children}

      {error && (
        <p
          className="mt-1 text-[11px]"
          style={{ fontFamily: mono, color: "var(--th-danger-text, #f85149)", letterSpacing: "0.02em" }}
          role="alert"
        >
          ✗ {error}
        </p>
      )}
    </div>
  );
}
