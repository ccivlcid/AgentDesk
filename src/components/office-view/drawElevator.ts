import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { ELEVATOR_W, ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, BASEMENT_H } from "./model";

// Car metrics — must stay in sync with elevatorTick.ts
export const EL_CAR_W = ELEVATOR_W - 8;        // 32px
export const EL_CAR_H = 28;
export const EL_CAR_X_OFFSET = 4;              // from shaftX
export const EL_PILLAR_W = 3;
export const EL_HALF_DOOR = (EL_CAR_W - EL_PILLAR_W * 2) / 2; // 13
export const EL_DOOR_Y = 3;
export const EL_DOOR_H = EL_CAR_H - 6;         // 22

interface DrawElevatorShaftParams {
  stage: Container;
  shaftX: number;      // left edge of elevator shaft
  shaftTopY: number;   // top of shaft (= ROOF_H, below roof)
  totalH: number;      // full canvas height
  nFloors: number;     // number of department floors
  isDark: boolean;
}

export interface ElevatorVisuals {
  /** Animated container — move `.y` to animate the car vertically */
  carContainer: Container;
  /** Floor label Text inside the car container */
  floorDisplay: Text;
  /** Door panels Graphics — redrawn each tick when animating */
  doorG: Graphics;
  /** Initial carContainer.y (penthouse level) */
  initialCarY: number;
  /** shaft left-edge X, useful for ticker */
  shaftX: number;
  /** Floor indicator LEDs — index 0=penthouse, 1..N=depts, N+1=basement */
  floorLeds: Graphics[];
}

/** Draws the elevator shaft and returns refs for animation. */
export function drawElevatorShaft({
  stage,
  shaftX,
  shaftTopY,
  totalH,
  nFloors,
}: DrawElevatorShaftParams): ElevatorVisuals {
  const shaftH = totalH - shaftTopY;
  const carX   = shaftX + EL_CAR_X_OFFSET;
  const carW   = EL_CAR_W;
  const carH   = EL_CAR_H;
  const dZoneX = carX + EL_PILLAR_W;            // door zone left edge (global X)
  const dZoneW = carW - EL_PILLAR_W * 2;        // 26px door zone
  const shaft  = new Container();

  // ── 1. Shaft pit (near-black void with subtle centre glow) ───────
  const bg = new Graphics();
  bg.rect(shaftX, shaftTopY, ELEVATOR_W, shaftH).fill(0x010409);
  bg.rect(shaftX + 6, shaftTopY, ELEVATOR_W - 12, shaftH).fill({ color: 0x080e1a, alpha: 0.55 });
  shaft.addChild(bg);

  // ── 2. I-beam guide rails (3 px each, with highlight/shadow) ─────
  const RAIL_L = shaftX + 1;
  const RAIL_R = shaftX + ELEVATOR_W - 4;
  const rails = new Graphics();
  // Left rail body
  rails.rect(RAIL_L,     shaftTopY, 3, shaftH).fill(0x151e2c);
  rails.rect(RAIL_L + 1, shaftTopY, 1, shaftH).fill({ color: 0x28385a, alpha: 0.9 }); // face
  rails.rect(RAIL_L,     shaftTopY, 1, shaftH).fill({ color: 0x0c1220, alpha: 1 });   // shadow
  // Right rail body
  rails.rect(RAIL_R,     shaftTopY, 3, shaftH).fill(0x151e2c);
  rails.rect(RAIL_R + 1, shaftTopY, 1, shaftH).fill({ color: 0x28385a, alpha: 0.9 });
  rails.rect(RAIL_R + 2, shaftTopY, 1, shaftH).fill({ color: 0x0c1220, alpha: 1 });
  // Centre cable (subtle)
  rails.rect(shaftX + ELEVATOR_W / 2, shaftTopY, 1, shaftH).fill({ color: 0x202a3e, alpha: 0.6 });
  shaft.addChild(rails);

  // ── 3. Pulley assembly at shaft top ──────────────────────────────
  const pCX = shaftX + ELEVATOR_W / 2;
  const pulley = new Graphics();
  pulley.rect(pCX - 9, shaftTopY, 18, 4).fill(0x1c2840);
  pulley.rect(pCX - 9, shaftTopY, 18, 1).fill({ color: 0x2e4466, alpha: 0.8 });
  pulley.circle(pCX, shaftTopY + 6, 5).fill(0x1c2840);
  pulley.circle(pCX, shaftTopY + 6, 5).stroke({ width: 1, color: 0x2e4466, alpha: 0.9 });
  pulley.circle(pCX, shaftTopY + 6, 2).fill(0x2e4466);
  shaft.addChild(pulley);

  // ── 4. Floor markers (steel cross-beams + rail notch brackets) ───
  const markerG = new Graphics();
  const markerYs: number[] = [shaftTopY + PENTHOUSE_H];
  for (let i = 0; i <= nFloors; i++) {
    markerYs.push(shaftTopY + PENTHOUSE_H + CONFERENCE_FLOOR_H + i * FLOOR_TOTAL_H);
  }
  for (const my of markerYs) {
    // Steel cross-beam
    markerG.rect(shaftX + 2, my - 1, ELEVATOR_W - 4, 2).fill(0x1c2838);
    markerG.rect(shaftX + 2, my - 1, ELEVATOR_W - 4, 1).fill({ color: 0x273650, alpha: 0.6 });
    // Left rail notch bracket
    markerG.rect(RAIL_L - 1, my - 3, 5, 6).fill(0x1e2a3e);
    markerG.rect(RAIL_L - 1, my - 3, 1, 6).fill({ color: 0x314866, alpha: 0.6 });
    // Right rail notch bracket
    markerG.rect(RAIL_R - 1, my - 3, 5, 6).fill(0x1e2a3e);
    markerG.rect(RAIL_R + 3, my - 3, 1, 6).fill({ color: 0x314866, alpha: 0.6 });
  }
  shaft.addChild(markerG);

  // ── 5. Button panel (recessed, right side of shaft) ───────────────
  const buttonLabels = ["P", ...Array.from({ length: nFloors }, (_, i) => `${i + 1}`), "B"];
  const btnPanelX  = shaftX + ELEVATOR_W - 9;
  const btnSpacing = Math.max(9, Math.min(13, (shaftH - 20) / (buttonLabels.length + 1)));
  const panelBodyH = buttonLabels.length * btnSpacing + 10;
  const panelBodyY = shaftTopY + 14;
  const floorLeds: Graphics[] = [];

  // Panel surround
  const panelG = new Graphics();
  panelG.rect(btnPanelX - 1, panelBodyY - 3, 9, panelBodyH + 6).fill(0x0c1220);
  panelG.rect(btnPanelX,     panelBodyY,     7, panelBodyH).fill(0x08101c);
  panelG.rect(btnPanelX,     panelBodyY,     1, panelBodyH).fill({ color: 0x1c2c48, alpha: 0.7 });
  panelG.rect(btnPanelX,     panelBodyY,     7, 1).fill({ color: 0x1c2c48, alpha: 0.7 });
  shaft.addChild(panelG);

  buttonLabels.forEach((_label, i) => {
    const btnCY  = panelBodyY + 5 + i * btnSpacing;
    const active = i === 0;
    const dot    = new Graphics();
    dot.rect(btnPanelX + 1, btnCY - 3, 5, 6).fill({ color: active ? 0x1a1206 : 0x0c1220, alpha: 1 });
    dot.circle(btnPanelX + 3.5, btnCY, 1.8).fill({ color: active ? 0xf59e0b : 0x1c2840, alpha: 1 });
    if (active) dot.circle(btnPanelX + 3.5, btnCY, 3).fill({ color: 0xf59e0b, alpha: 0.22 });
    shaft.addChild(dot);
    floorLeds.push(dot);
  });

  // ── 6. Elevator car ───────────────────────────────────────────────
  const initialCarY = shaftTopY + PENTHOUSE_H / 2 - carH / 2;
  const carContainer = new Container();
  carContainer.position.set(0, initialCarY);

  // Drop shadow
  const shadowG = new Graphics();
  shadowG.rect(carX + 2, carH, carW - 4, 4).fill({ color: 0x000000, alpha: 0.55 });
  carContainer.addChild(shadowG);

  const carG = new Graphics();
  // Body
  carG.rect(carX, 0, carW, carH).fill(0x101820);
  // Ceiling panel
  carG.rect(carX, 0, carW, 4).fill(0x1c2840);
  carG.rect(carX, 0, carW, 1).fill({ color: 0xf59e0b, alpha: 0.5 });   // amber top accent
  // Floor platform
  carG.rect(carX, carH - 4, carW, 4).fill(0x1c2840);
  carG.rect(carX, carH - 5, carW, 1).fill({ color: 0xf59e0b, alpha: 0.65 }); // amber floor accent
  // Left pillar
  carG.rect(carX, 0, EL_PILLAR_W, carH).fill(0x1a2438);
  carG.rect(carX, 0, 1, carH).fill({ color: 0x2e4466, alpha: 0.8 });   // highlight
  // Right pillar
  carG.rect(carX + carW - EL_PILLAR_W, 0, EL_PILLAR_W, carH).fill(0x1a2438);
  carG.rect(carX + carW - 1, 0, 1, carH).fill({ color: 0x0c1220, alpha: 0.9 }); // shadow
  // Pillar rivets
  for (let ry = 7; ry < carH - 7; ry += 7) {
    carG.rect(carX + 1, ry, 1, 1).fill({ color: 0x3a506e, alpha: 0.9 });
    carG.rect(carX + carW - 2, ry, 1, 1).fill({ color: 0x3a506e, alpha: 0.9 });
  }
  // Cable bracket at top
  carG.rect(carX + carW / 2 - 5, -7, 10, 7).fill(0x1c2840);
  carG.rect(carX + carW / 2 - 3, -11, 6, 5).fill(0x222e44);
  carG.rect(carX + carW / 2 - 5, -8, 10, 1).fill({ color: 0x2e4466, alpha: 0.8 });
  carG.rect(carX + carW / 2 - 0.5, -48, 1, 42).fill({ color: 0x202e46, alpha: 0.8 });
  // Interior ceiling light
  carG.rect(dZoneX + 1, 1, dZoneW - 2, 2).fill({ color: 0xfff4b0, alpha: 0.7 });
  carContainer.addChild(carG);

  // ── Door panels (initial: closed) ────────────────────────────────
  const doorG = new Graphics();
  // Left panel
  doorG.rect(dZoneX, EL_DOOR_Y, EL_HALF_DOOR, EL_DOOR_H).fill(0x182238);
  for (let ry = EL_DOOR_Y + 4; ry < EL_DOOR_Y + EL_DOOR_H - 4; ry += 6) {
    doorG.rect(dZoneX + 1, ry, EL_HALF_DOOR - 2, 1).fill({ color: 0x1e2c48, alpha: 0.9 });
  }
  doorG.rect(dZoneX + EL_HALF_DOOR - 1, EL_DOOR_Y, 1, EL_DOOR_H).fill({ color: 0x0e1828, alpha: 0.7 });
  // Right panel
  doorG.rect(dZoneX + EL_HALF_DOOR, EL_DOOR_Y, EL_HALF_DOOR, EL_DOOR_H).fill(0x182238);
  for (let ry = EL_DOOR_Y + 4; ry < EL_DOOR_Y + EL_DOOR_H - 4; ry += 6) {
    doorG.rect(dZoneX + EL_HALF_DOOR + 1, ry, EL_HALF_DOOR - 2, 1).fill({ color: 0x1e2c48, alpha: 0.9 });
  }
  // Centre seam (amber)
  doorG.rect(dZoneX + EL_HALF_DOOR - 0.5, EL_DOOR_Y, 1, EL_DOOR_H).fill({ color: 0xf59e0b, alpha: 0.5 });
  carContainer.addChild(doorG);

  // ── Floor display panel (above car) ──────────────────────────────
  const displayW = ELEVATOR_W - 6;
  const displayX = shaftX + 3;
  const displayBg = new Graphics();
  displayBg.rect(displayX, -15, displayW, 14).fill(0x040810);
  displayBg.rect(displayX, -15, displayW, 14).stroke({ width: 0.8, color: 0x1a2c48, alpha: 0.9 });
  displayBg.rect(displayX + 1, -2, displayW - 2, 1).fill({ color: 0xf59e0b, alpha: 0.5 });
  carContainer.addChild(displayBg);

  const floorDisplay = new Text({
    text: "P",
    style: new TextStyle({ fontSize: 7, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace" }),
  });
  floorDisplay.anchor.set(0.5, 0.5);
  floorDisplay.position.set(shaftX + ELEVATOR_W / 2, -9);
  carContainer.addChild(floorDisplay);

  shaft.addChild(carContainer);

  // ── 7. Shaft borders ──────────────────────────────────────────────
  const border = new Graphics();
  border.rect(shaftX,                    shaftTopY, 1, shaftH).fill({ color: 0x1c2c42, alpha: 0.9 });
  border.rect(shaftX + ELEVATOR_W - 1,   shaftTopY, 1, shaftH).fill({ color: 0x0e1828, alpha: 0.8 });
  border.rect(shaftX,                    shaftTopY, ELEVATOR_W, 1).fill({ color: 0x1c2c42, alpha: 0.7 });
  shaft.addChild(border);

  stage.addChild(shaft);
  return { carContainer, floorDisplay, doorG, initialCarY, shaftX, floorLeds };
}

/** Calculates the elevator shaft X position from FLOOR_W constants. */
export function getElevatorShaftX(floorW: number, elevatorW: number, wallW: number): number {
  return floorW - elevatorW - wallW;
}
