interface CategoryBadgeProps {
  label: string;
  color?: string;
  icon?: string;
}

export default function CategoryBadge({ label, color, icon }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
      style={{
        backgroundColor: color ? `${color}22` : "var(--th-bg-accent)",
        color: color ?? "var(--th-text-muted)",
        border: `1px solid ${color ? `${color}44` : "var(--th-border)"}`,
      }}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {label}
    </span>
  );
}
