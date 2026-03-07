import { getPersonaById } from "../../data/personas";

interface PersonaBadgeProps {
  personaId: string;
  size?: "sm" | "md";
}

export function PersonaBadge({ personaId, size = "sm" }: PersonaBadgeProps) {
  const persona = getPersonaById(personaId);
  if (!persona) return null;

  const px = size === "sm" ? "px-1.5 py-px" : "px-2 py-0.5";
  const fontSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase ${px} ${fontSize}`}
      style={{
        border: `1px solid ${persona.color}50`,
        borderRadius: "2px",
        background: `${persona.color}12`,
        color: persona.color,
        letterSpacing: "0.04em",
      }}
      title={persona.name}
    >
      {persona.badge}
    </span>
  );
}
