import type { ReactNode } from "react";
import { DesktopWindowStack, type DesktopWindowStackProps } from "./DesktopWindowStack";
import { DesktopProjectCtxMenu, type DesktopProjectCtxMenuProps } from "./DesktopProjectCtxMenu";
import { DesktopOverlays, type DesktopOverlaysProps } from "./DesktopOverlays";

export interface DesktopOverlayBlockProps {
  windowStackProps: DesktopWindowStackProps;
  projectCtxMenu: DesktopProjectCtxMenuProps["projectCtxMenu"] | null;
  projectCtxMenuProps: Omit<DesktopProjectCtxMenuProps, "projectCtxMenu">;
  overlayProps: DesktopOverlaysProps;
  children?: ReactNode;
}

export function DesktopOverlayBlock({
  windowStackProps,
  projectCtxMenu,
  projectCtxMenuProps,
  overlayProps,
  children,
}: DesktopOverlayBlockProps) {
  return (
    <>
      <DesktopWindowStack {...windowStackProps} />
      {projectCtxMenu && <DesktopProjectCtxMenu projectCtxMenu={projectCtxMenu} {...projectCtxMenuProps} />}
      <DesktopOverlays {...overlayProps}>{children}</DesktopOverlays>
    </>
  );
}
