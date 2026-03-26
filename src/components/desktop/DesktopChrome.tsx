import type React from "react";
import MenuBar from "./MenuBar";
import { DesktopIconArea, type DesktopIconAreaProps } from "./DesktopIconArea";
import Dock from "./Dock";
import ToastContainer from "./ToastContainer";
import AppSwitcher from "./AppSwitcher";
import SnapPreviewOverlay from "./SnapPreviewOverlay";
import SnapFillSuggestion from "./SnapFillSuggestion";

export interface DesktopChromeProps {
  setCtxMenu: (v: { x: number; y: number } | null) => void;
  onDesktopClick: (e: React.MouseEvent) => void;
  onDesktopMouseDown: (e: React.MouseEvent) => void;
  onDesktopMouseMove: (e: React.MouseEvent) => void;
  onDesktopMouseUp: (e: React.MouseEvent) => void;
  menuBarProps: React.ComponentProps<typeof MenuBar>;
  iconAreaProps: DesktopIconAreaProps;
  dockProps: React.ComponentProps<typeof Dock>;
  children: React.ReactNode;
}

export function DesktopChrome({
  setCtxMenu,
  onDesktopClick,
  onDesktopMouseDown,
  onDesktopMouseMove,
  onDesktopMouseUp,
  menuBarProps,
  iconAreaProps,
  dockProps,
  children,
}: DesktopChromeProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--th-bg-primary)",
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
        transition: "background 0.4s ease",
      }}
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement).closest("[data-no-ctx]");
        if (tag) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={onDesktopClick}
      onMouseDown={onDesktopMouseDown}
      onMouseMove={onDesktopMouseMove}
      onMouseUp={onDesktopMouseUp}
    >
      <MenuBar {...menuBarProps} />
      <ToastContainer />
      <AppSwitcher />
      <SnapPreviewOverlay />
      <SnapFillSuggestion />
      <DesktopIconArea {...iconAreaProps} />
      <Dock {...dockProps} />
      {children}
    </div>
  );
}
