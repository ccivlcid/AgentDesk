/* ================================================================== */
/*  Retro Drawer — 70s vintage style (SVG-based)                       */
/* ================================================================== */

import { createSvgDrawer } from "./svg-drawer-base";

export const retroDrawer = createSvgDrawer(
  "/assets/themes/retro",
  { hour: 0x5c3a20, minute: 0x8b5e3c, second: 0xe87830 },
  {
    monitorX: 9,
    monitorY: -22,
    monitorW: 30,
    monitorH: 22,
    deskSpriteH: 36,
    clockRadius: 7,
    rugAlpha: 0.25,
  },
);
