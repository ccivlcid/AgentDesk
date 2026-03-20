import { useUiStore } from "../../store/uiStore";

const MENUBAR_H = 44;
const DOCK_H = 88;

export default function SnapPreviewOverlay() {
  const { snapPreview } = useUiStore();
  if (!snapPreview) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const zoneH = typeof window !== "undefined" ? window.innerHeight - MENUBAR_H - DOCK_H : 600;

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 1800,
    background: "rgba(245,158,11,0.15)",
    border: "1px solid var(--th-accent)",
    pointerEvents: "none",
    transition: "opacity 0.15s",
  };

  if (snapPreview === "left") {
    return (
      <div
        style={{
          ...style,
          left: 0,
          top: MENUBAR_H,
          width: vw / 2,
          height: zoneH,
        }}
      />
    );
  }
  if (snapPreview === "right") {
    return (
      <div
        style={{
          ...style,
          left: vw / 2,
          top: MENUBAR_H,
          width: vw / 2,
          height: zoneH,
        }}
      />
    );
  }
  if (snapPreview === "full" || snapPreview === "top") {
    return (
      <div
        style={{
          ...style,
          left: 0,
          top: MENUBAR_H,
          width: vw,
          height: zoneH,
        }}
      />
    );
  }
  return null;
}
