import type { MutableRefObject } from "react";
import type { Container, Graphics, Text } from "pixi.js";
import { ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, FLOOR_ROOM_H, BASEMENT_H, FLOOR_W, WALL_W, ELEVATOR_W } from "./model";
import { EL_CAR_W, EL_CAR_H, EL_CAR_X_OFFSET, EL_PILLAR_W, EL_HALF_DOOR, EL_DOOR_Y, EL_DOOR_H } from "./drawElevator";

const CAR_H   = EL_CAR_H;
const CAR_W   = EL_CAR_W;
const SHAFT_X = FLOOR_W - ELEVATOR_W - WALL_W;
const CAR_X   = SHAFT_X + EL_CAR_X_OFFSET;
const DOOR_ZONE_X = CAR_X + EL_PILLAR_W;

/** Pixels per tick the car travels */
const ELEVATOR_SPEED = 1.4;
/** Ticks to fully open or fully close the door */
const DOOR_ANIM_TICKS = 22;
/** Ticks door stays fully open */
const DOOR_HOLD_TICKS = 55;
/** Ticks after door closes before picking new target */
const DOOR_CLOSED_TICKS = 80;

export interface ElevatorTickState {
  /** 0=penthouse, 1..N=dept floors, N+1=basement */
  floorIndex: number;
  targetFloorIndex: number;
  /** Current carContainer.y pixel value */
  carY: number;
  /** Counts ticks during door-open hold and post-close idle */
  idleTicks: number;
  /** Door open fraction: 0=closed, 1=fully open */
  doorProgress: number;
  /** Door animation phase */
  doorPhase: "closed" | "opening" | "open" | "closing";
}

/** Returns the carContainer.y for a given logical floor index.
 *  0 = penthouse, 1..N = dept floors, N+1 = basement
 *  CONFERENCE_FLOOR is between penthouse and dept floors (visually) but
 *  the elevator doesn't stop there — it's accessed by stairs only.
 */
export function getFloorCarY(floorIndex: number, nFloors: number): number {
  const shaftTopY = ROOF_H;
  if (floorIndex === 0) {
    return shaftTopY + PENTHOUSE_H / 2 - CAR_H / 2;
  }
  if (floorIndex <= nFloors) {
    return shaftTopY + PENTHOUSE_H + CONFERENCE_FLOOR_H + (floorIndex - 1) * FLOOR_TOTAL_H + FLOOR_ROOM_H / 2 - CAR_H / 2;
  }
  // Basement
  return shaftTopY + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H + BASEMENT_H / 2 - CAR_H / 2;
}

function getFloorLabel(floorIndex: number, nFloors: number): string {
  if (floorIndex === 0) return "P";
  if (floorIndex > nFloors) return "B1";
  return `F${floorIndex}`;
}

export function updateElevatorTick(
  stateRef: MutableRefObject<ElevatorTickState>,
  carContainerRef: MutableRefObject<Container | null>,
  floorDisplayRef: MutableRefObject<Text | null>,
  nFloorsRef: MutableRefObject<number>,
  doorGRef: MutableRefObject<Graphics | null>,
): void {
  const car = carContainerRef.current;
  const display = floorDisplayRef.current;
  if (!car || !display) return;

  const state = stateRef.current;
  const nFloors = nFloorsRef.current;
  const targetY = getFloorCarY(state.targetFloorIndex, nFloors);
  const diff = targetY - state.carY;

  // ── Moving phase ─────────────────────────────────────────────
  if (state.doorPhase === "closed" && Math.abs(diff) > 0.8) {
    const step = Math.min(ELEVATOR_SPEED, Math.abs(diff)) * Math.sign(diff);
    state.carY += step;
    car.y = state.carY;

    // Show direction + destination in transit
    const arrow = diff > 0 ? "v" : "^";  // ↓ or ↑ (monospace safe chars)
    const destLabel = getFloorLabel(state.targetFloorIndex, nFloors);
    display.text = `${arrow}${destLabel}`;
    return;
  }

  // ── Arrived — run door sequence ───────────────────────────────
  if (state.doorPhase === "closed" && Math.abs(diff) <= 0.8) {
    // Snap to floor
    state.carY = targetY;
    car.y = state.carY;
    state.floorIndex = state.targetFloorIndex;
    display.text = getFloorLabel(state.floorIndex, nFloors);
    state.doorPhase = "opening";
    state.doorProgress = 0;
    state.idleTicks = 0;
  }

  if (state.doorPhase === "opening") {
    state.doorProgress = Math.min(1, state.doorProgress + 1 / DOOR_ANIM_TICKS);
    redrawDoor(doorGRef.current, state.doorProgress);
    if (state.doorProgress >= 1) {
      state.doorPhase = "open";
      state.idleTicks = 0;
    }
    return;
  }

  if (state.doorPhase === "open") {
    state.idleTicks++;
    if (state.idleTicks >= DOOR_HOLD_TICKS) {
      state.doorPhase = "closing";
    }
    return;
  }

  if (state.doorPhase === "closing") {
    state.doorProgress = Math.max(0, state.doorProgress - 1 / DOOR_ANIM_TICKS);
    redrawDoor(doorGRef.current, state.doorProgress);
    if (state.doorProgress <= 0) {
      state.doorPhase = "closed";
      state.idleTicks = 0;
    }
    return;
  }

  // Door fully closed after animation — idle then pick new target
  if (state.doorPhase === "closed") {
    state.idleTicks++;
    if (state.idleTicks >= DOOR_CLOSED_TICKS) {
      state.idleTicks = 0;
      const maxFloor = nFloors + 1;
      let next = state.floorIndex;
      for (let attempt = 0; attempt < 8; attempt++) {
        next = Math.floor(Math.random() * (maxFloor + 1));
        if (next !== state.floorIndex) break;
      }
      state.targetFloorIndex = next;
    }
  }
}

/** Redraw door panels at the given open fraction (0=closed, 1=fully open). */
function redrawDoor(doorG: Graphics | null, openFraction: number): void {
  if (!doorG || doorG.destroyed) return;
  doorG.clear();

  // Each panel slides its full half-door width when fully open
  const slideOut   = openFraction * EL_HALF_DOOR;
  const leftVisW   = Math.max(0, EL_HALF_DOOR - slideOut);  // visible width of left panel
  const rightStart = DOOR_ZONE_X + EL_HALF_DOOR + slideOut; // right panel left edge (global X)
  const rightVisW  = Math.max(0, DOOR_ZONE_X + EL_HALF_DOOR * 2 - rightStart);

  // Interior — drawn first, panels paint on top
  if (openFraction > 0.04) {
    const interiorAlpha = Math.min(1, openFraction * 2.5);
    doorG.rect(DOOR_ZONE_X, EL_DOOR_Y, EL_HALF_DOOR * 2, EL_DOOR_H)
      .fill({ color: 0x040810, alpha: interiorAlpha });
    // Interior floor strip
    doorG.rect(DOOR_ZONE_X + 2, EL_DOOR_Y + EL_DOOR_H - 3, EL_HALF_DOOR * 2 - 4, 2)
      .fill({ color: 0x182030, alpha: interiorAlpha });
    // Interior ceiling light
    if (interiorAlpha > 0.4) {
      doorG.rect(DOOR_ZONE_X + 3, EL_DOOR_Y + 1, EL_HALF_DOOR * 2 - 6, 1)
        .fill({ color: 0xfff4b0, alpha: interiorAlpha * 0.55 });
    }
  }

  // Left panel (slides left into pillar)
  if (leftVisW > 0) {
    doorG.rect(DOOR_ZONE_X, EL_DOOR_Y, leftVisW, EL_DOOR_H).fill(0x182238);
    for (let ry = EL_DOOR_Y + 4; ry < EL_DOOR_Y + EL_DOOR_H - 4; ry += 6) {
      if (leftVisW > 2) {
        doorG.rect(DOOR_ZONE_X + 1, ry, leftVisW - 2, 1).fill({ color: 0x1e2c48, alpha: 0.9 });
      }
    }
    // Right edge shadow of left panel
    if (leftVisW > 1) {
      doorG.rect(DOOR_ZONE_X + leftVisW - 1, EL_DOOR_Y, 1, EL_DOOR_H)
        .fill({ color: 0x0e1828, alpha: 0.7 });
    }
  }

  // Right panel (slides right into pillar)
  if (rightVisW > 0) {
    doorG.rect(rightStart, EL_DOOR_Y, rightVisW, EL_DOOR_H).fill(0x182238);
    for (let ry = EL_DOOR_Y + 4; ry < EL_DOOR_Y + EL_DOOR_H - 4; ry += 6) {
      if (rightVisW > 2) {
        doorG.rect(rightStart + 1, ry, rightVisW - 2, 1).fill({ color: 0x1e2c48, alpha: 0.9 });
      }
    }
  }

  // Centre seam — amber glow brightens as door opens
  doorG.rect(DOOR_ZONE_X + EL_HALF_DOOR - 0.5, EL_DOOR_Y, 1, EL_DOOR_H)
    .fill({ color: 0xf59e0b, alpha: 0.38 + openFraction * 0.52 });
}
