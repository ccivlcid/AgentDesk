import type { Section } from "./types";
import { MONO_FONT } from "./constants";

interface FeatureGridProps {
  features: NonNullable<Section["features"]>;
}

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
      {features.map((f) => (
        <div key={f.label} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "7px 10px",
          background: "var(--th-hover-overlay-subtle)",
          border: "1px solid var(--th-border)",
          borderRadius: 6,
        }}>
          <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: "center", marginTop: 1 }}>{f.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: MONO_FONT, fontSize: 11, fontWeight: 600, color: "var(--th-text-primary)", marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontFamily: MONO_FONT, fontSize: 10, color: "var(--th-text-muted)", lineHeight: 1.4 }}>{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
