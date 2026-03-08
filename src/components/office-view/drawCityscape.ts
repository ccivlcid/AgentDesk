import { Container, Graphics, Text, TextStyle } from "./pixi-compat";

interface DrawCityscapeParams {
  stage: Container;
  sceneW: number;
  sceneH: number;
  towerX: number;
  towerW: number;
  skyH: number;
  groundH: number;
  towerH: number;
  isDark: boolean;
}

/** Draw pixel-art cityscape background: sky, stars, buildings, trees, ground. */
export function drawCityscape({
  stage,
  sceneW,
  sceneH,
  towerX,
  towerW,
  skyH,
  groundH,
  towerH,
  isDark,
}: DrawCityscapeParams): void {
  const towerBottom = skyH + towerH;

  // ── Full-scene background fill (prevents transparent gaps) ──
  const bgFill = new Graphics();
  bgFill.rect(0, 0, sceneW, sceneH).fill(isDark ? 0x060a14 : 0x1a2744);
  stage.addChild(bgFill);

  // ── Sky gradient ────────────────────────────────────────────
  const skyEnd = skyH + towerH * 0.3;
  const skyG = new Graphics();
  // Dark navy gradient (approximated with 3 bands)
  const skyColors = isDark
    ? [0x060a14, 0x0a0e1a, 0x0e1424]
    : [0x1a2744, 0x223352, 0x2d3a5c];
  const bandH = skyEnd / 3;
  skyColors.forEach((color, i) => {
    skyG.rect(0, i * bandH, sceneW, bandH + 1).fill(color);
  });
  stage.addChild(skyG);

  // ── Stars (small pixel dots, only in dark mode) ─────────────
  if (isDark) {
    const starsG = new Graphics();
    const starCount = Math.floor(sceneW / 20);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.random() * sceneW;
      const sy = Math.random() * (skyH + towerH * 0.15);
      const size = Math.random() > 0.85 ? 2 : 1;
      const alpha = 0.3 + Math.random() * 0.5;
      starsG.rect(sx, sy, size, size).fill({ color: 0xffffff, alpha });
    }
    // Moon (simple crescent)
    const moonX = towerX > sceneW / 2 ? sceneW * 0.15 : sceneW * 0.85;
    starsG.circle(moonX, skyH * 0.35, 8).fill({ color: 0xe8e0c8, alpha: 0.7 });
    starsG.circle(moonX + 3, skyH * 0.35 - 1, 7).fill(skyColors[0]); // crescent shadow
    stage.addChild(starsG);
  }

  // ── Distant buildings (behind tower, both sides) ────────────
  const distG = new Graphics();
  const distColor = isDark ? 0x0d1117 : 0x2a3450;
  const distBuildings = generateBuildings(sceneW, towerX, towerW, towerBottom, 0.25, 0.55);
  for (const b of distBuildings) {
    distG.rect(b.x, b.y, b.w, b.h).fill(distColor);
    // Windows: tiny amber dots
    drawBuildingWindows(distG, b, isDark ? 0xf59e0b : 0xd4a040, 0.15, 6);
  }
  stage.addChild(distG);

  // ── Near buildings (closer, larger, brighter) ───────────────
  const nearG = new Graphics();
  const nearColor = isDark ? 0x161b22 : 0x3a4560;
  const nearBuildings = generateBuildings(sceneW, towerX, towerW, towerBottom, 0.45, 0.75);
  for (const b of nearBuildings) {
    nearG.rect(b.x, b.y, b.w, b.h).fill(nearColor);
    // Roof accent line
    nearG.rect(b.x, b.y, b.w, 2).fill({ color: 0x21262d, alpha: 0.8 });
    drawBuildingWindows(nearG, b, isDark ? 0xf5c842 : 0xb08830, 0.3, 5);
  }
  stage.addChild(nearG);

  // ── Trees (near ground level, both sides of tower) ──────────
  const treesG = new Graphics();
  const treeColor = isDark ? 0x0f2318 : 0x2d6a3f;
  const trunkColor = isDark ? 0x1a1510 : 0x4a3520;
  const treeZones = [
    { start: 8, end: towerX - 8 },
    { start: towerX + towerW + 8, end: sceneW - 8 },
  ];
  for (const zone of treeZones) {
    const zoneW = zone.end - zone.start;
    const treeCount = Math.max(1, Math.floor(zoneW / 32));
    for (let i = 0; i < treeCount; i++) {
      const tx = zone.start + (i + 0.5) * (zoneW / treeCount) + (Math.random() - 0.5) * 8;
      const treeH = 16 + Math.random() * 12;
      const groundY = towerBottom;
      // Trunk
      treesG.rect(tx - 1.5, groundY - treeH * 0.4, 3, treeH * 0.4).fill(trunkColor);
      // Canopy (triangle)
      treesG.moveTo(tx, groundY - treeH)
        .lineTo(tx - 6 - Math.random() * 3, groundY - treeH * 0.35)
        .lineTo(tx + 6 + Math.random() * 3, groundY - treeH * 0.35)
        .fill(treeColor);
      // Second layer
      treesG.moveTo(tx, groundY - treeH * 0.85)
        .lineTo(tx - 5, groundY - treeH * 0.2)
        .lineTo(tx + 5, groundY - treeH * 0.2)
        .fill({ color: treeColor, alpha: 0.85 });
    }
  }
  stage.addChild(treesG);

  // ── Ground ──────────────────────────────────────────────────
  const groundG = new Graphics();
  // Sidewalk
  groundG.rect(0, towerBottom, sceneW, 6).fill(isDark ? 0x1c2128 : 0x4a5060);
  // Road
  groundG.rect(0, towerBottom + 6, sceneW, groundH - 6).fill(isDark ? 0x0f1218 : 0x2c3040);
  // Center dashed line
  const lineY = towerBottom + groundH * 0.5;
  for (let lx = 0; lx < sceneW; lx += 16) {
    groundG.rect(lx, lineY, 8, 1).fill({ color: 0xf59e0b, alpha: 0.4 });
  }
  // Curb edge
  groundG.rect(0, towerBottom + 5, sceneW, 1).fill({ color: 0xf59e0b, alpha: 0.15 });
  stage.addChild(groundG);

  // ── Underground (below road) ────────────────────────────────
  const underG = new Graphics();
  underG.rect(0, towerBottom + groundH - 4, sceneW, 8).fill(isDark ? 0x0a0c10 : 0x1a2030);
  stage.addChild(underG);
}

// ── Helpers ──────────────────────────────────────────────────

interface BuildingRect { x: number; y: number; w: number; h: number }

/** Generate building silhouettes on both sides of the tower. */
function generateBuildings(
  sceneW: number,
  towerX: number,
  towerW: number,
  groundY: number,
  minHeightRatio: number,
  maxHeightRatio: number,
): BuildingRect[] {
  const buildings: BuildingRect[] = [];
  const margin = 6;

  // Left side buildings
  const leftEnd = towerX - margin;
  if (leftEnd > 30) {
    const count = Math.max(1, Math.floor(leftEnd / 50));
    for (let i = 0; i < count; i++) {
      const w = 20 + Math.random() * 30;
      const x = margin + (i * (leftEnd - margin)) / count;
      const h = (groundY * (minHeightRatio + Math.random() * (maxHeightRatio - minHeightRatio)));
      buildings.push({ x, y: groundY - h, w: Math.min(w, leftEnd - x - 4), h });
    }
  }

  // Right side buildings
  const rightStart = towerX + towerW + margin;
  const rightEnd = sceneW - margin;
  if (rightEnd - rightStart > 30) {
    const count = Math.max(1, Math.floor((rightEnd - rightStart) / 50));
    for (let i = 0; i < count; i++) {
      const w = 20 + Math.random() * 30;
      const x = rightStart + (i * (rightEnd - rightStart)) / count;
      const h = (groundY * (minHeightRatio + Math.random() * (maxHeightRatio - minHeightRatio)));
      buildings.push({ x, y: groundY - h, w: Math.min(w, rightEnd - x - 4), h });
    }
  }

  return buildings;
}

/** Draw tiny window dots on a building rectangle. */
function drawBuildingWindows(
  g: Graphics,
  b: BuildingRect,
  windowColor: number,
  litProbability: number,
  spacing: number,
): void {
  for (let wy = b.y + 4; wy < b.y + b.h - 3; wy += spacing) {
    for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += spacing) {
      if (Math.random() < litProbability) {
        g.rect(wx, wy, 2, 2).fill({ color: windowColor, alpha: 0.4 + Math.random() * 0.4 });
      }
    }
  }
}
