interface CategoryBadgeProps {
  label: string;
  color?: string;
  icon?: string;
}

export default function CategoryBadge({ label, color, icon }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={{
        fontFamily: "var(--th-font-mono)",
        backgroundColor: color ? `${color}18` : "#F9FAFB",
        color: color ?? "#9CA3AF",
        border: `1px solid ${color ? `${color}40` : "#E5E7EB"}`,
      }}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {label}
    </span>
  );
}
