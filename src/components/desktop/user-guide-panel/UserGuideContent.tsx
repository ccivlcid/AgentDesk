import type { Chapter } from "./types";
import { MONO_FONT, KBD_STYLE } from "./constants";
import { CalloutBox } from "./CalloutBox";
import { FeatureGrid } from "./FeatureGrid";

interface UserGuideContentProps {
  chapter: Chapter;
}

export function UserGuideContent({ chapter }: UserGuideContentProps) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: `${chapter.color}18`,
          border: `1px solid ${chapter.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          {chapter.icon}
        </div>
        <h2 style={{
          margin: 0, fontSize: 15, fontWeight: 700,
          color: "var(--th-text-heading)", fontFamily: MONO_FONT,
        }}>
          {chapter.title}
        </h2>
      </div>

      {chapter.sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: chapter.color, flexShrink: 0 }} />
            <h3 style={{
              margin: 0, fontSize: 12, fontWeight: 600,
              letterSpacing: "0.01em",
              color: "var(--th-text-primary)", fontFamily: MONO_FONT,
            }}>
              {sec.heading}
            </h3>
          </div>

          {sec.keys && sec.keys.length > 0 && (
            <div style={{
              border: "1px solid var(--th-border)",
              borderRadius: 7, overflow: "hidden",
              marginBottom: sec.body ? 12 : 0,
            }}>
              {sec.keys.map(({ keys, desc }, ki) => (
                <div key={ki} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 12px", gap: 12,
                  background: ki % 2 === 0 ? "transparent" : "var(--th-hover-overlay-subtle)",
                  borderBottom: ki < (sec.keys?.length ?? 0) - 1 ? "1px solid var(--th-border)" : "none",
                }}>
                  <span style={{ fontSize: 11, color: "var(--th-text-secondary)", fontFamily: MONO_FONT, flex: 1, minWidth: 0 }}>{desc}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {keys.map((k, i) => (
                      <span key={i}>
                        <kbd style={KBD_STYLE}>{k}</kbd>
                        {i < keys.length - 1 && (
                          <span style={{ fontFamily: MONO_FONT, fontSize: 10, color: "var(--th-text-muted)", margin: "0 2px" }}>+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sec.features && <FeatureGrid features={sec.features} />}

          {sec.body && (
            <p style={{
              margin: 0, fontSize: 12, lineHeight: 1.75,
              color: "var(--th-text-secondary)",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              whiteSpace: "pre-line",
            }}>
              {sec.body}
            </p>
          )}

          {sec.callout && <CalloutBox {...sec.callout} />}
        </div>
      ))}
    </div>
  );
}
