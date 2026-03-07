import { Container, Graphics } from "pixi.js";
import { FLOOR_W, WALL_W, ROOF_H, PENTHOUSE_H, FLOOR_TOTAL_H, FLOOR_ROOM_H, BASEMENT_H } from "./model";

export interface ExteriorWindowVisual {
  g: Graphics;
  /** Draw-command X in Graphics local space */
  wx: number;
  /** Draw-command Y in Graphics local space */
  wy: number;
  litColor: number;
  darkColor: number;
  strokeColor: number;
  isLit: boolean;
  /** 0=penthouse, 1..N=dept floors, N+1=basement */
  floorIdx: number;
}

interface DrawExteriorWallsParams {
  stage: Container;
  nFloors: number;
  totalH: number;
  isDark: boolean;
}

/**
 * Draws the left and right exterior building walls with pixel windows.
 * Returns an array of window Graphics for flicker animation.
 */
export function drawExteriorWalls({
  stage,
  nFloors,
  totalH,
  isDark,
}: DrawExteriorWallsParams): ExteriorWindowVisual[] {
  const wallH = totalH - ROOF_H;
  const wallBase   = isDark ? 0x171f2e : 0x8a96a4;  // primary concrete
  const wallPanel  = isDark ? 0x1c2538 : 0x96a2b0;  // panel variant
  const wallShadow = isDark ? 0x0e1520 : 0x788490;  // recessed shadows
  const edgeColor  = isDark ? 0x283850 : 0x7a8898;

  const litColor   = isDark ? 0xfff8d0 : 0xfffae8;
  const darkColor  = isDark ? 0x080e18 : 0x4a5060;
  const frameColor = isDark ? 0x283848 : 0x6a7888;
  const windows: ExteriorWindowVisual[] = [];
  const zones = buildZoneList(nFloors);

  // ── Left wall ────────────────────────────────────────────────────
  const leftWall = new Container();
  const leftBg = new Graphics();
  leftBg.rect(0, ROOF_H, WALL_W, wallH).fill(wallBase);

  // Concrete panel lines (vertical seam at centre, horizontal every ~20px)
  leftBg.rect(WALL_W / 2, ROOF_H, 1, wallH).fill({ color: wallShadow, alpha: 0.35 });
  for (let y = ROOF_H; y < totalH; y += 20) {
    leftBg.rect(0, y, WALL_W, 1).fill({ color: wallPanel, alpha: 0.22 });
    leftBg.rect(0, y + 1, WALL_W, 1).fill({ color: wallShadow, alpha: 0.12 });
  }
  leftWall.addChild(leftBg);

  // Windows — two per zone, larger and properly framed
  for (const zone of zones) {
    for (let wi = 0; wi < 2; wi++) {
      const wx   = wi === 0 ? 2 : 11;
      const wy   = zone.midY - 5;
      const isLit = Math.random() > 0.3;
      const win  = createWindow(wx, wy, isLit, litColor, darkColor, frameColor, zone.floorIdx);
      leftWall.addChild(win.g);
      windows.push(win);
    }
  }

  // AC unit brackets (small boxes between floors, left wall)
  const acG = new Graphics();
  for (let fi = 0; fi < nFloors; fi++) {
    const acY = ROOF_H + PENTHOUSE_H + fi * FLOOR_TOTAL_H + FLOOR_ROOM_H - 10;
    acG.rect(3, acY, 9, 7).fill({ color: isDark ? 0x1a2438 : 0x6a7888, alpha: 0.85 });
    acG.rect(3, acY, 9, 7).stroke({ width: 0.5, color: isDark ? 0x2a3850 : 0x8a98a8, alpha: 0.7 });
    acG.rect(5, acY + 2, 5, 1).fill({ color: isDark ? 0x0c1220 : 0x4a5870, alpha: 0.8 });
    acG.rect(5, acY + 4, 5, 1).fill({ color: isDark ? 0x0c1220 : 0x4a5870, alpha: 0.8 });
  }
  leftWall.addChild(acG);

  // Left inner edge (border between wall and room interior)
  const leftEdge = new Graphics();
  leftEdge.rect(WALL_W - 2, ROOF_H, 2, wallH).fill({ color: edgeColor, alpha: 0.7 });
  leftEdge.rect(WALL_W - 1, ROOF_H, 1, wallH).fill({ color: isDark ? 0x10181e : 0x5a6672, alpha: 0.5 });
  leftWall.addChild(leftEdge);
  stage.addChild(leftWall);

  // ── Right wall ───────────────────────────────────────────────────
  const rightX = FLOOR_W - WALL_W;
  const rightWall = new Container();
  const rightBg = new Graphics();
  rightBg.rect(rightX, ROOF_H, WALL_W, wallH).fill(wallBase);
  rightBg.rect(rightX + WALL_W / 2, ROOF_H, 1, wallH).fill({ color: wallShadow, alpha: 0.35 });
  for (let y = ROOF_H; y < totalH; y += 20) {
    rightBg.rect(rightX, y, WALL_W, 1).fill({ color: wallPanel, alpha: 0.22 });
    rightBg.rect(rightX, y + 1, WALL_W, 1).fill({ color: wallShadow, alpha: 0.12 });
  }
  rightWall.addChild(rightBg);

  for (const zone of zones) {
    for (let wi = 0; wi < 2; wi++) {
      const wx   = rightX + (wi === 0 ? 2 : 11);
      const wy   = zone.midY - 5;
      const isLit = Math.random() > 0.3;
      const win  = createWindow(wx, wy, isLit, litColor, darkColor, frameColor, zone.floorIdx);
      rightWall.addChild(win.g);
      windows.push(win);
    }
  }

  // AC units on right wall
  const acGr = new Graphics();
  for (let fi = 0; fi < nFloors; fi++) {
    const acY = ROOF_H + PENTHOUSE_H + fi * FLOOR_TOTAL_H + FLOOR_ROOM_H - 10;
    acGr.rect(rightX + 8, acY, 9, 7).fill({ color: isDark ? 0x1a2438 : 0x6a7888, alpha: 0.85 });
    acGr.rect(rightX + 8, acY, 9, 7).stroke({ width: 0.5, color: isDark ? 0x2a3850 : 0x8a98a8, alpha: 0.7 });
    acGr.rect(rightX + 10, acY + 2, 5, 1).fill({ color: isDark ? 0x0c1220 : 0x4a5870, alpha: 0.8 });
    acGr.rect(rightX + 10, acY + 4, 5, 1).fill({ color: isDark ? 0x0c1220 : 0x4a5870, alpha: 0.8 });
  }
  rightWall.addChild(acGr);

  // Fire escape (pixel zigzag, more structured)
  const fireEscape = new Graphics();
  const feColor = isDark ? 0x364050 : 0x6a7888;
  for (let fi = 0; fi < zones.length - 1; fi++) {
    const topY = zones[fi].midY + 8;
    const botY = zones[fi + 1].midY - 8;
    const side     = fi % 2 === 0 ? rightX + 1 : rightX + WALL_W - 6;
    const nextSide = fi % 2 === 0 ? rightX + WALL_W - 6 : rightX + 1;
    // Landing platform (3px wide, 1px thick)
    fireEscape.rect(side, topY, WALL_W - 8, 2).fill({ color: feColor, alpha: 0.85 });
    // Handrail posts
    fireEscape.rect(side, topY - 5, 1, 5).fill({ color: feColor, alpha: 0.7 });
    fireEscape.rect(side + WALL_W - 9, topY - 5, 1, 5).fill({ color: feColor, alpha: 0.7 });
    // Diagonal run
    fireEscape.moveTo(side + 1, topY).lineTo(nextSide + 1, botY)
      .stroke({ width: 1, color: feColor, alpha: 0.65 });
  }
  rightWall.addChild(fireEscape);

  // Right outer edge
  const rightEdge = new Graphics();
  rightEdge.rect(rightX, ROOF_H, 2, wallH).fill({ color: edgeColor, alpha: 0.7 });
  rightEdge.rect(rightX, ROOF_H, 1, wallH).fill({ color: isDark ? 0x10181e : 0x5a6672, alpha: 0.5 });
  rightWall.addChild(rightEdge);
  stage.addChild(rightWall);

  return windows;
}

function createWindow(
  wx: number, wy: number,
  isLit: boolean,
  litColor: number, darkColor: number, frameColor: number,
  floorIdx: number,
): ExteriorWindowVisual {
  const g = new Graphics();
  // Window frame (1px around glass)
  g.rect(wx, wy, 6, 8).fill(frameColor);
  // Glass pane
  g.rect(wx + 1, wy + 1, 4, 6).fill(isLit ? litColor : darkColor);
  // Window sill ledge (bottom)
  g.rect(wx - 1, wy + 8, 8, 1).fill({ color: frameColor, alpha: 0.7 });
  // CRT scanline on lit windows
  if (isLit) {
    g.rect(wx + 1, wy + 3, 4, 1).fill({ color: 0xffffff, alpha: 0.18 });
    g.rect(wx + 1, wy + 1, 4, 1).fill({ color: 0xffffff, alpha: 0.25 }); // top reflection
  }
  return { g, wx, wy, litColor, darkColor, strokeColor: frameColor, isLit, floorIdx };
}

/** Build a list of vertical midpoints for each building zone with floor indices. */
function buildZoneList(nFloors: number): Array<{ midY: number; floorIdx: number }> {
  const zones: Array<{ midY: number; floorIdx: number }> = [];
  zones.push({ midY: ROOF_H + PENTHOUSE_H / 2, floorIdx: 0 });
  for (let i = 0; i < nFloors; i++) {
    zones.push({ midY: ROOF_H + PENTHOUSE_H + i * FLOOR_TOTAL_H + FLOOR_ROOM_H / 2, floorIdx: i + 1 });
  }
  zones.push({ midY: ROOF_H + PENTHOUSE_H + nFloors * FLOOR_TOTAL_H + BASEMENT_H / 2, floorIdx: nFloors + 1 });
  return zones;
}
