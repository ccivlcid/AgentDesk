import { useUiStore } from "../../store/uiStore";

const MENUBAR_H = 44;
const DOCK_H = 88;

export default function SnapPreviewOverlay() {
  const { snapPreview } = useUiStore();
  if (!snapPreview) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const zoneH = typeof window !== "undefined" ? window.innerHeight - MENUBAR_H - DOCK_H : 600;
  const halfH = Math.floor(zoneH / 2);
  const halfW = Math.floor(vw / 2);

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 1800,
    background: "rgba(245,158,11,0.15)",
    border: "1px solid #3B82F6",
    pointerEvents: "none",
    transition: "opacity 0.15s",
  };

  const zones: Record<typeof snapPreview, React.CSSProperties> = {
    left:  { left: 0,      top: MENUBAR_H, width: halfW,  height: zoneH },
    right: { left: halfW,  top: MENUBAR_H, width: halfW,  height: zoneH },
    full:  { left: 0,      top: MENUBAR_H, width: vw,     height: zoneH },
    top:   { left: 0,      top: MENUBAR_H, width: vw,     height: zoneH },
    tl:    { left: 0,      top: MENUBAR_H, width: halfW,  height: halfH },
    tr:    { left: halfW,  top: MENUBAR_H, width: halfW,  height: halfH },
    bl:    { left: 0,      top: MENUBAR_H + halfH, width: halfW, height: halfH },
    br:    { left: halfW,  top: MENUBAR_H + halfH, width: halfW, height: halfH },
  };

  return <div style={{ ...style, ...zones[snapPreview] }} />;
}
