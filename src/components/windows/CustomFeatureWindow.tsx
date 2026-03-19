import { useEffect, useState } from "react";
import type { CustomFeature } from "../../types";
import { getCustomFeature } from "../../api/custom-features";
import CustomFeatureRenderer from "../widget-builder/CustomFeatureRenderer";
import TrafficLights from "../desktop/TrafficLights";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface Props {
  featureId: string;
  onClose: () => void;
}

export default function CustomFeatureWindow({ featureId, onClose }: Props) {
  const [feature, setFeature] = useState<CustomFeature | null>(null);
  const [pos, setPos] = useState(() => ({
    x: Math.max(20, (window.innerWidth - 560) / 2),
    y: Math.max(44, (window.innerHeight - 440) / 3),
  }));
  const [size] = useState({ w: 560, h: 440 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  useEffect(() => {
    getCustomFeature(featureId).then(setFeature).catch(() => {});
  }, [featureId]);

  function handleTitleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragOffset({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
  }

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX - dragOffset.dx, y: e.clientY - dragOffset.dy });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, dragOffset]);

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 300,
        borderRadius: 10,
        border: "1px solid var(--th-border-strong)",
        background: "var(--th-bg-elevated)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 12px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <TrafficLights onClose={onClose} />
        <span style={{ ...mono, fontSize: 11, color: "var(--th-text-heading)", fontWeight: 600 }}>
          {feature?.name ?? "Custom Feature"}
        </span>
        {feature && (
          <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginLeft: "auto", padding: "1px 6px", border: "1px solid var(--th-border)", borderRadius: 3 }}>
            {feature.source === "ai" ? "AI" : "TEMPLATE"}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {feature ? (
          <CustomFeatureRenderer feature={feature} />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
            <span className="animate-pulse">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}
