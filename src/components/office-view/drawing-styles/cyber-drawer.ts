/* ================================================================== */
/*  Cyber Drawer — Futuristic neon style (SVG-based)                   */
/* ================================================================== */

import { createSvgDrawer } from "./svg-drawer-base";

export const cyberDrawer = createSvgDrawer(
  "/assets/themes/cyber",
  { hour: 0x00ddff, minute: 0xff44aa, second: 0x44ff88 },
  {
    monitorX: 9,
    monitorY: -20,
    monitorW: 30,
    monitorH: 20,
    deskSpriteH: 36,
    clockRadius: 7,
    rugAlpha: 0.08,
  },
);
