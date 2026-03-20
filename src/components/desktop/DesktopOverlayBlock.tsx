import type { ReactNode } from "react";
import { DesktopWindowStack, type DesktopWindowStackProps } from "./DesktopWindowStack";
import { DesktopProjectCtxMenu, type DesktopProjectCtxMenuProps } from "./DesktopProjectCtxMenu";
import { DesktopFeatureCtxMenu, type DesktopFeatureCtxMenuProps } from "./DesktopFeatureCtxMenu";
import { DesktopOverlays, type DesktopOverlaysProps } from "./DesktopOverlays";

export interface DesktopOverlayBlockProps {
  windowStackProps: DesktopWindowStackProps;
  projectCtxMenu: DesktopProjectCtxMenuProps["projectCtxMenu"] | null;
  projectCtxMenuProps: Omit<DesktopProjectCtxMenuProps, "projectCtxMenu">;
  cfCtxMenu: DesktopFeatureCtxMenuProps["cfCtxMenu"] | null;
  cfCtxMenuProps: Omit<DesktopFeatureCtxMenuProps, "cfCtxMenu">;
  overlayProps: DesktopOverlaysProps;
  children?: ReactNode;
}

export function DesktopOverlayBlock({
  windowStackProps,
  projectCtxMenu,
  projectCtxMenuProps,
  cfCtxMenu,
  cfCtxMenuProps,
  overlayProps,
  children,
}: DesktopOverlayBlockProps) {
  return (
    <>
      <DesktopWindowStack {...windowStackProps} />
      {projectCtxMenu && <DesktopProjectCtxMenu projectCtxMenu={projectCtxMenu} {...projectCtxMenuProps} />}
      {cfCtxMenu && <DesktopFeatureCtxMenu cfCtxMenu={cfCtxMenu} {...cfCtxMenuProps} />}
      <DesktopOverlays {...overlayProps}>{children}</DesktopOverlays>
    </>
  );
}
