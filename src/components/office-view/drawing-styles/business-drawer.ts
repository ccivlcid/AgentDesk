/* ================================================================== */
/*  Business Drawer — Modern minimal style (SVG-based)                 */
/* ================================================================== */

import { createSvgDrawer } from "./svg-drawer-base";

export const businessDrawer = createSvgDrawer(
  "/assets/themes/business",
  { hour: 0x404858, minute: 0x8890a0, second: 0xcc3333 },
  {
    monitorX: 10,
    monitorY: -18,
    monitorW: 28,
    monitorH: 18,
    deskSpriteH: 36,
    clockRadius: 7,
    rugAlpha: 0.15,
  },
);
