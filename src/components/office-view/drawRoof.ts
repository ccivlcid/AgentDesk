import { Container, Graphics, Text, TextStyle } from "pixi.js";

interface DrawRoofParams {
  stage: Container;
  floorW: number;
  roofH: number;
  isDark: boolean;
  companyName?: string;  // optional custom company name for roof sign
}

/** Returns the antenna LED Graphics for external blink animation */
export function drawRoof({ stage, floorW, roofH, isDark, companyName }: DrawRoofParams): Graphics {
  const roof = new Container();

  // ── 1. Roof surface ───────────────────────────────────────────────
  const roofColor  = isDark ? 0x0d1220 : 0x8a9aae;
  const roofColor2 = isDark ? 0x111826 : 0x96a6ba;
  const bg = new Graphics();
  bg.rect(0, 0, floorW, roofH).fill(roofColor);
  // Concrete panel seams (horizontal)
  for (let y = 4; y < roofH - 4; y += 8) {
    bg.rect(0, y, floorW, 1).fill({ color: roofColor2, alpha: 0.18 });
  }
  // Amber bottom border — penthouse boundary
  bg.rect(0, roofH - 3, floorW, 3).fill(0xf59e0b);
  bg.rect(0, roofH - 3, floorW, 1).fill({ color: 0xfffbe0, alpha: 0.35 }); // highlight
  roof.addChild(bg);

  // ── 2. Parapet wall (raised edge strip, top) ───────────────────────
  const parapet = new Graphics();
  parapet.rect(0, 0, floorW, 5).fill(isDark ? 0x141e30 : 0x9aacbe);
  parapet.rect(0, 0, floorW, 1).fill({ color: isDark ? 0x2a3c58 : 0xb0c0d0, alpha: 0.9 });
  parapet.rect(0, 5, floorW, 1).fill({ color: 0x000000, alpha: 0.4 }); // parapet shadow
  roof.addChild(parapet);

  // ── 3. HVAC units (pixel boxes) ──────────────────────────────────
  const hvacG = new Graphics();
  const hvacColor  = isDark ? 0x1a2438 : 0x8090a0;
  const hvacColor2 = isDark ? 0x222e46 : 0x98a8b8;
  // Left HVAC unit
  hvacG.rect(30, 7, 28, 16).fill(hvacColor);
  hvacG.rect(30, 7, 28, 16).stroke({ width: 0.8, color: isDark ? 0x283850 : 0xa0b0c0, alpha: 0.9 });
  hvacG.rect(30, 7, 28, 3).fill(hvacColor2);   // top face
  hvacG.rect(30, 7, 1, 16).fill({ color: isDark ? 0x304a6a : 0xb0c0d0, alpha: 0.6 }); // left hi
  // HVAC vents (horizontal bars)
  for (let vi = 0; vi < 3; vi++) {
    hvacG.rect(33, 12 + vi * 3, 22, 1).fill({ color: isDark ? 0x101828 : 0x6a7a8a, alpha: 0.9 });
  }
  // Right HVAC unit
  hvacG.rect(floorW - 58, 7, 28, 16).fill(hvacColor);
  hvacG.rect(floorW - 58, 7, 28, 16).stroke({ width: 0.8, color: isDark ? 0x283850 : 0xa0b0c0, alpha: 0.9 });
  hvacG.rect(floorW - 58, 7, 28, 3).fill(hvacColor2);
  hvacG.rect(floorW - 58, 7, 1, 16).fill({ color: isDark ? 0x304a6a : 0xb0c0d0, alpha: 0.6 });
  for (let vi = 0; vi < 3; vi++) {
    hvacG.rect(floorW - 55, 12 + vi * 3, 22, 1).fill({ color: isDark ? 0x101828 : 0x6a7a8a, alpha: 0.9 });
  }
  roof.addChild(hvacG);

  // ── 4. Water tower (right-centre area) ───────────────────────────
  const wtX = floorW - 100;
  const wtG = new Graphics();
  // Legs (4 pixel posts)
  for (let li = 0; li < 4; li++) {
    wtG.rect(wtX + 4 + li * 6, 8, 2, 16).fill({ color: isDark ? 0x1c2a3e : 0x7a8a9a, alpha: 0.9 });
  }
  // Tank body
  wtG.rect(wtX + 2, 5, 24, 14).fill(isDark ? 0x1a2438 : 0x8898a8);
  wtG.rect(wtX + 2, 5, 24, 14).stroke({ width: 0.8, color: isDark ? 0x283850 : 0xa0b0c0, alpha: 0.9 });
  wtG.rect(wtX + 2, 5, 24, 3).fill(isDark ? 0x222e46 : 0x98a8b8);  // top
  wtG.rect(wtX + 2, 5, 1, 14).fill({ color: isDark ? 0x304a6a : 0xb0c0d0, alpha: 0.6 }); // left hi
  wtG.rect(wtX + 10, 5, 8, 5).fill(isDark ? 0x0c1220 : 0x6a7a8a); // opening
  roof.addChild(wtG);

  // ── 5. Signal tower (centre) ──────────────────────────────────────
  const cx = floorW / 2;
  const towerG = new Graphics();
  // Base platform
  towerG.rect(cx - 10, 14, 20, 3).fill(isDark ? 0x1c2840 : 0x8898a8);
  towerG.rect(cx - 10, 14, 20, 1).fill({ color: isDark ? 0x2a3c58 : 0xa8b8c8, alpha: 0.8 });
  // Mast
  towerG.rect(cx - 1, 4, 2, 14).fill(isDark ? 0x28385a : 0x8090a0);
  towerG.rect(cx, 4, 1, 14).fill({ color: isDark ? 0x3a5070 : 0xa0b0c0, alpha: 0.7 }); // hi
  // Signal rings
  for (let ri = 0; ri < 3; ri++) {
    const rad = 6 + ri * 5;
    const alpha = 0.55 - ri * 0.12;
    towerG.arc(cx, 6, rad, -Math.PI * 0.72, -Math.PI * 0.28)
      .stroke({ width: 1.2, color: 0xf59e0b, alpha });
  }
  roof.addChild(towerG);

  // ── 6. Company sign (left side, terminal style) ───────────────────
  const signBg = new Graphics();
  signBg.rect(6, 7, 118, 14).fill({ color: 0x000000, alpha: isDark ? 0.82 : 0.55 });
  signBg.rect(6, 7, 2, 14).fill({ color: 0xf59e0b, alpha: 0.9 });   // amber left bar
  signBg.rect(6, 7, 118, 1).fill({ color: 0xf59e0b, alpha: 0.3 });  // top rule
  signBg.rect(6, 20, 118, 1).fill({ color: 0xf59e0b, alpha: 0.5 }); // bottom rule
  roof.addChild(signBg);
  const signName = companyName?.trim() ? companyName.trim().toUpperCase() : "AGENTDESK";
  const sign = new Text({
    text: `[ ${signName} // MISSION CTRL ]`,
    style: new TextStyle({ fontSize: 6, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 1 }),
  });
  sign.anchor.set(0, 0.5);
  sign.position.set(13, 13);
  roof.addChild(sign);

  // ── 7. Antenna with guy wires (far right) ─────────────────────────
  const antX = floorW - 20;
  const antG = new Graphics();
  // Mast
  antG.rect(antX, 0, 2, roofH - 3).fill({ color: isDark ? 0x5a6070 : 0x7a8490, alpha: 0.85 });
  antG.rect(antX + 1, 0, 1, roofH - 3).fill({ color: isDark ? 0x788090 : 0x9aaab8, alpha: 0.5 });
  // Guy wires
  antG.moveTo(antX + 1, 2).lineTo(antX - 18, roofH - 4).stroke({ width: 0.8, color: isDark ? 0x3a4858 : 0x7a8898, alpha: 0.55 });
  antG.moveTo(antX + 1, 2).lineTo(antX + 14, roofH - 4).stroke({ width: 0.8, color: isDark ? 0x3a4858 : 0x7a8898, alpha: 0.55 });
  // Cross arms
  antG.rect(antX - 5, 8, 12, 1).fill({ color: isDark ? 0x4a5a70 : 0x8898a8, alpha: 0.8 });
  antG.rect(antX - 3, 14, 8, 1).fill({ color: isDark ? 0x4a5a70 : 0x8898a8, alpha: 0.7 });
  roof.addChild(antG);

  // LED blink (tip of antenna) — animated externally
  const antennaLed = new Graphics();
  antennaLed.circle(antX + 1, 3, 2.8).fill({ color: 0xef4444, alpha: 0.95 });
  antennaLed.circle(antX + 1, 3, 4.5).fill({ color: 0xef4444, alpha: 0.2 }); // glow
  roof.addChild(antennaLed);

  stage.addChild(roof);
  return antennaLed;
}
