import { AnimatedSprite, Container, Graphics, Text, TextStyle, type Texture } from "pixi.js";
import type { MutableRefObject } from "react";
import type { Agent } from "../../types";
import {
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
  BASEMENT_H,
  FLOOR_W,
  WALL_W,
  ELEVATOR_W,
  FLOOR_ROOM_H,
  TARGET_CHAR_H,
} from "./model";
import { hashStr } from "./drawing-core";
import type { ElevatorTickState } from "./elevatorTick";

const SHAFT_X       = FLOOR_W - ELEVATOR_W - WALL_W;
const ELEV_ENTRY_X  = SHAFT_X - 8;
const VISITOR_SPEED = 0.9;
const VISIT_TICKS   = 300;
const FADE_TICKS    = 20;
export const MAX_VISITORS    = 3;
export const SPAWN_INTERVAL  = 320;
const CEO_VISIT_CHANCE = 0.20;

export const VISITOR_PHRASES = [
  "Hello!", "Report?", "Meeting?", "Quick call?",
  "Review?", "Status?", "Update!", "Good work!",
  "Request!", "How's it?", "Help?", "Check in.",
  "Plan?", "Demo?", "Sync?", "Approve?",
];

type VisitorPhase =
  | "walk_to_elev"
  | "fading_out"
  | "in_elev"
  | "fading_in"
  | "walk_to_dest"
  | "at_dest"
  | "walk_back_to_elev"
  | "fading_out_return"
  | "in_elev_return"
  | "fading_in_return"
  | "walk_home"
  | "done";

export interface VisitorAgent {
  container:       Container;
  /** Direct reference to the AnimatedSprite for speed control */
  animSprite:      AnimatedSprite | null;
  phase:           VisitorPhase;
  x:               number;
  y:               number;
  homeX:           number;
  homeY:           number;
  homeFloor:       number;
  destFloor:       number;
  destX:           number;
  destY:           number;
  fadeTick:        number;
  waitTick:        number;
  elevTravelTicks: number;
  currentElevTick: number;
  agentId:         string;
  chatBubble:      Container | null;
  phraseIdx:       number;
}

export interface VisitorTickState {
  visitors:      VisitorAgent[];
  spawnCooldown: number;
  /** Active phrase pool — defaults to VISITOR_PHRASES, overrideable via CEO greetings */
  phrasePool:    string[];
}

export function createVisitorTickState(): VisitorTickState {
  return { visitors: [], spawnCooldown: 120, phrasePool: VISITOR_PHRASES };
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function floorMidY(floorIdx: number, nFloors: number): number {
  if (floorIdx === 0) return ROOF_H + PENTHOUSE_H * 0.62;
  if (floorIdx <= nFloors) {
    return ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + (floorIdx - 1) * FLOOR_TOTAL_H + FLOOR_ROOM_H * 0.50;
  }
  return ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H + BASEMENT_H * 0.50;
}

function agentFloor(agentY: number, nFloors: number): number {
  const confBottom    = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H;
  if (agentY < confBottom) return 0;
  const basementStart = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
  if (agentY >= basementStart) return nFloors + 1;
  return Math.min(nFloors, Math.max(1, Math.floor((agentY - confBottom) / FLOOR_TOTAL_H) + 1));
}

// ── Sprite builder ────────────────────────────────────────────────────────────

/**
 * Build a visitor container using the SAME PNG sheet as the desk agent.
 * Returns [container, animSprite | null].
 * Direction: uses `R` frames → naturally faces right, flip scaleX for left.
 * Fallback: `D` frames with same flip logic.
 * Last resort: pixel silhouette (only if textures haven't loaded yet).
 */
function buildVisitorSprite(
  shortName: string,
  destLabel: string,
  spriteNum: number,
  textures: Record<string, Texture>,
): [Container, AnimatedSprite | null] {

  const outer = new Container();

  // Inner body — scaleX flipped for walk direction
  const bodyC = new Container();
  bodyC.name  = "body";

  // Try direction frames: prefer R (natural rightward walk), fallback D
  const getFrames = (dir: string): Texture[] => {
    const frames: Texture[] = [];
    for (let f = 1; f <= 3; f++) {
      const t = textures[`${spriteNum}-${dir}-${f}`];
      if (t) frames.push(t);
    }
    return frames;
  };

  let frames = getFrames("R");
  if (frames.length === 0) frames = getFrames("D");

  let animSprite: AnimatedSprite | null = null;

  if (frames.length > 0) {
    // ── Real PNG sprite — exactly matches desk agent ──────────────
    animSprite = new AnimatedSprite(frames.length > 1 ? frames : [frames[0]]);
    animSprite.anchor.set(0.5, 1);
    const spriteScale = TARGET_CHAR_H / animSprite.texture.height;
    animSprite.scale.set(spriteScale);
    animSprite.tint          = 0xd8e8ff;   // same cool-blue as desk agents
    animSprite.animationSpeed = 0.18;
    animSprite.play();
    bodyC.addChild(animSprite);
  } else {
    // ── Pixel silhouette fallback (textures not yet loaded) ───────
    const g = new Graphics();
    const hw = TARGET_CHAR_H * 0.14;
    const hh = TARGET_CHAR_H * 0.15;
    // Head
    g.circle(0, -TARGET_CHAR_H * 0.85, hh).fill({ color: 0x2a3a56, alpha: 1 });
    g.circle(0, -TARGET_CHAR_H * 0.85, hh).stroke({ width: 0.8, color: 0xf59e0b, alpha: 0.7 });
    // Body
    g.rect(-hw, -TARGET_CHAR_H * 0.6, hw * 2, TARGET_CHAR_H * 0.38).fill({ color: 0x1e2c44, alpha: 1 });
    // Legs
    g.rect(-hw, -TARGET_CHAR_H * 0.22, hw * 0.9, TARGET_CHAR_H * 0.22).fill({ color: 0x18243a, alpha: 1 });
    g.rect(hw * 0.1, -TARGET_CHAR_H * 0.22, hw * 0.9, TARGET_CHAR_H * 0.22).fill({ color: 0x18243a, alpha: 1 });
    bodyC.addChild(g);
  }

  outer.addChild(bodyC);

  // ── Name tag (amber badge, above head) ────────────────────────────
  const nameTagY = -(TARGET_CHAR_H + 12);
  const nameTxt  = new Text({
    text: shortName,
    style: new TextStyle({ fontSize: 5, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 0.5 }),
  });
  nameTxt.anchor.set(0.5, 0.5);
  const ntW  = nameTxt.width + 8;
  const ntBg = new Graphics();
  // Tag body
  ntBg.rect(-ntW / 2, nameTagY - 4, ntW, 9).fill({ color: 0x030608, alpha: 0.9 });
  ntBg.rect(-ntW / 2, nameTagY - 4, ntW, 9).stroke({ width: 0.8, color: 0xf59e0b, alpha: 0.6 });
  // Left accent bar
  ntBg.rect(-ntW / 2, nameTagY - 4, 2, 9).fill({ color: 0xf59e0b, alpha: 0.8 });
  outer.addChild(ntBg);
  nameTxt.position.set(1, nameTagY);
  outer.addChild(nameTxt);

  // ── Destination floor badge (small, below name tag) ────────────────
  const floorBadgeTxt = new Text({
    text: `▶${destLabel}`,
    style: new TextStyle({ fontSize: 4, fill: 0x22cc88, fontFamily: "monospace", letterSpacing: 0.5 }),
  });
  floorBadgeTxt.anchor.set(0.5, 0.5);
  floorBadgeTxt.position.set(0, nameTagY + 8);
  outer.addChild(floorBadgeTxt);

  return [outer, animSprite];
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function makeChatBubble(phrase: string): Container {
  const c     = new Container();
  const bText = new Text({
    text:  phrase,
    style: new TextStyle({ fontSize: 6, fill: 0x22cc88, fontFamily: "monospace" }),
  });
  bText.anchor.set(0.5, 1);
  const bw  = Math.min(bText.width + 10, 80);
  const bh  = bText.height + 6;
  const top = -bh;

  const bg = new Graphics();
  bg.rect(-bw / 2, top, bw, bh).fill({ color: 0x04080e, alpha: 0.94 });
  bg.rect(-bw / 2, top, bw, bh).stroke({ width: 0.8, color: 0xf59e0b, alpha: 0.75 });
  // Amber left bar
  bg.rect(-bw / 2, top, 2, bh).fill({ color: 0xf59e0b, alpha: 0.7 });
  // Tail
  bg.rect(-1, top + bh, 2, 4).fill({ color: 0xf59e0b, alpha: 0.7 });

  bText.position.set(1, top + bh - 2);
  c.addChild(bg);
  c.addChild(bText);
  return c;
}

// ── Spawn ─────────────────────────────────────────────────────────────────────

export function spawnVisitor(
  state:          VisitorTickState,
  visitorLayer:   Container,
  agents:         Agent[],
  agentPosRef:    MutableRefObject<Map<string, { x: number; y: number }>>,
  nFloors:        number,
  _isDark:        boolean,
  onSelectAgent?: (agent: Agent) => void,
  textures?:      Record<string, Texture>,
  spriteMap?:     Map<string, number>,
): void {
  if (state.visitors.length >= MAX_VISITORS) return;

  const candidates = agents.filter(
    (a) => a.status !== "offline" && a.status !== "break" &&
           !state.visitors.some((v) => v.agentId === a.id),
  );
  if (candidates.length === 0) return;

  const agent = candidates[Math.floor(Math.random() * candidates.length)];
  const pos   = agentPosRef.current.get(agent.id);
  if (!pos) return;

  const homeFloor = agentFloor(pos.y, nFloors);
  if (homeFloor === nFloors + 1) return;

  let destFloor: number;
  if (Math.random() < CEO_VISIT_CHANCE) {
    destFloor = 0;
  } else {
    const others = Array.from({ length: nFloors + 1 }, (_, i) => i).filter((f) => f !== homeFloor);
    if (others.length === 0) return;
    destFloor = others[Math.floor(Math.random() * others.length)];
  }

  const destMidY       = floorMidY(destFloor, nFloors);
  const destX          = WALL_W + 32 + Math.random() * (SHAFT_X - WALL_W - 64);
  const travelDist     = Math.abs(floorMidY(homeFloor, nFloors) - destMidY);
  const elevTravelTicks = Math.max(50, Math.ceil(travelDist / 1.4));

  const shortName = (agent.name.split(" ")[0] ?? agent.name).slice(0, 8);
  const destLabel = destFloor === 0 ? "CEO" : `F${destFloor}`;
  const spriteNum = spriteMap?.get(agent.id) ?? (hashStr(agent.id) % 13) + 1;

  const [container, animSprite] = buildVisitorSprite(shortName, destLabel, spriteNum, textures ?? {});
  container.position.set(pos.x, pos.y);
  container.alpha       = 1;
  container.eventMode   = "static";
  container.cursor      = "pointer";
  if (onSelectAgent) container.on("pointerdown", () => onSelectAgent(agent));
  visitorLayer.addChild(container);

  state.visitors.push({
    container,
    animSprite,
    phase:            "walk_to_elev",
    x:                pos.x,
    y:                pos.y,
    homeX:            pos.x,
    homeY:            pos.y,
    homeFloor,
    destFloor,
    destX,
    destY:            destMidY,
    fadeTick:         0,
    waitTick:         0,
    elevTravelTicks,
    currentElevTick:  0,
    agentId:          agent.id,
    chatBubble:       null,
    phraseIdx:        Math.floor(Math.random() * state.phrasePool.length),
  });
}

// ── Per-tick update ───────────────────────────────────────────────────────────

export function updateVisitorAgents(
  state:            VisitorTickState,
  elevatorStateRef: MutableRefObject<ElevatorTickState>,
  nFloors:          number,
  tick?:            number,
): void {
  for (let i = state.visitors.length - 1; i >= 0; i--) {
    const v = state.visitors[i];

    switch (v.phase) {
      case "walk_to_elev": {
        const dx = ELEV_ENTRY_X - v.x;
        if (Math.abs(dx) <= VISITOR_SPEED + 1) {
          v.x = ELEV_ENTRY_X;
          v.phase = "fading_out";
          v.fadeTick = 0;
          elevatorStateRef.current.targetFloorIndex = v.homeFloor;
          elevatorStateRef.current.idleTicks = 0;
        } else {
          v.x += Math.sign(dx) * VISITOR_SPEED;
        }
        break;
      }

      case "fading_out": {
        v.fadeTick++;
        v.container.alpha = Math.max(0, 1 - v.fadeTick / FADE_TICKS);
        if (v.fadeTick >= FADE_TICKS) {
          v.phase = "in_elev";
          v.currentElevTick = 0;
          elevatorStateRef.current.targetFloorIndex = v.destFloor;
          elevatorStateRef.current.idleTicks = 0;
        }
        break;
      }

      case "in_elev": {
        v.currentElevTick++;
        if (v.currentElevTick >= v.elevTravelTicks) {
          v.x = ELEV_ENTRY_X;
          v.y = v.destY;
          v.phase = "fading_in";
          v.fadeTick = 0;
        }
        break;
      }

      case "fading_in": {
        v.fadeTick++;
        v.container.alpha = Math.min(1, v.fadeTick / FADE_TICKS);
        v.container.position.set(v.x, v.y);
        if (v.fadeTick >= FADE_TICKS) v.phase = "walk_to_dest";
        break;
      }

      case "walk_to_dest": {
        const dx = v.destX - v.x;
        if (Math.abs(dx) <= VISITOR_SPEED + 1) {
          v.x = v.destX;
          v.phase = "at_dest";
          v.waitTick = 0;
          // Switch to slow idle animation at desk
          if (v.animSprite && !v.animSprite.destroyed) {
            v.animSprite.animationSpeed = 0.04;
          }
        } else {
          v.x += Math.sign(dx) * VISITOR_SPEED;
        }
        break;
      }

      case "at_dest": {
        v.waitTick++;
        if (v.waitTick === 24 || (v.waitTick > 24 && v.waitTick % 90 === 0)) {
          if (v.chatBubble && !v.chatBubble.destroyed) {
            v.container.removeChild(v.chatBubble);
            v.chatBubble.destroy({ children: true });
          }
          v.phraseIdx = (v.phraseIdx + 1) % state.phrasePool.length;
          const bubble = makeChatBubble(state.phrasePool[v.phraseIdx] ?? "Hi!");
          // Position above name tag
          bubble.position.set(0, -(TARGET_CHAR_H + 28));
          v.container.addChild(bubble);
          v.chatBubble = bubble;
        }
        if (v.chatBubble && !v.chatBubble.destroyed) {
          const remaining = VISIT_TICKS - v.waitTick;
          if (remaining < 60) v.chatBubble.alpha = remaining / 60;
        }
        if (v.waitTick >= VISIT_TICKS) {
          if (v.chatBubble && !v.chatBubble.destroyed) {
            v.container.removeChild(v.chatBubble);
            v.chatBubble.destroy({ children: true });
            v.chatBubble = null;
          }
          v.phase = "walk_back_to_elev";
          // Restore walking animation speed
          if (v.animSprite && !v.animSprite.destroyed) {
            v.animSprite.animationSpeed = 0.18;
          }
        }
        break;
      }

      case "walk_back_to_elev": {
        const dx = ELEV_ENTRY_X - v.x;
        if (Math.abs(dx) <= VISITOR_SPEED + 1) {
          v.x = ELEV_ENTRY_X;
          v.phase = "fading_out_return";
          v.fadeTick = 0;
          elevatorStateRef.current.targetFloorIndex = v.destFloor;
          elevatorStateRef.current.idleTicks = 0;
        } else {
          v.x += Math.sign(dx) * VISITOR_SPEED;
        }
        break;
      }

      case "fading_out_return": {
        v.fadeTick++;
        v.container.alpha = Math.max(0, 1 - v.fadeTick / FADE_TICKS);
        if (v.fadeTick >= FADE_TICKS) {
          v.phase = "in_elev_return";
          v.currentElevTick = 0;
          elevatorStateRef.current.targetFloorIndex = v.homeFloor;
          elevatorStateRef.current.idleTicks = 0;
        }
        break;
      }

      case "in_elev_return": {
        v.currentElevTick++;
        if (v.currentElevTick >= v.elevTravelTicks) {
          v.x = ELEV_ENTRY_X;
          v.y = v.homeY;
          v.phase = "fading_in_return";
          v.fadeTick = 0;
        }
        break;
      }

      case "fading_in_return": {
        v.fadeTick++;
        v.container.alpha = Math.min(1, v.fadeTick / FADE_TICKS);
        v.container.position.set(v.x, v.y);
        if (v.fadeTick >= FADE_TICKS) v.phase = "walk_home";
        break;
      }

      case "walk_home": {
        const dx = v.homeX - v.x;
        if (Math.abs(dx) <= VISITOR_SPEED + 1) {
          v.x = v.homeX;
          v.phase = "done";
        } else {
          v.x += Math.sign(dx) * VISITOR_SPEED;
        }
        break;
      }

      case "done": {
        if (v.chatBubble && !v.chatBubble.destroyed) {
          v.chatBubble.destroy({ children: true });
          v.chatBubble = null;
        }
        if (!v.container.destroyed) {
          v.container.parent?.removeChild(v.container);
          v.container.destroy({ children: true });
        }
        state.visitors.splice(i, 1);
        continue;
      }
    }

    // ── Sync position + walk/idle animation ──────────────────────────
    const isWalking =
      v.phase === "walk_to_elev" ||
      v.phase === "walk_to_dest" ||
      v.phase === "walk_back_to_elev" ||
      v.phase === "walk_home";

    const isVisible = isWalking || v.phase === "at_dest";

    if (isVisible) {
      const t      = (tick ?? 0) + v.agentId.charCodeAt(0) * 7;
      const bobAmp = v.phase === "at_dest" ? 0.5 : 1.0;
      const bobSpd = v.phase === "at_dest" ? 0.025 : 0.10;
      const bobY   = Math.sin(t * bobSpd) * bobAmp;
      v.container.position.set(v.x, v.y + bobY);
      v.container.alpha = 1;

      // ── Direction flip (bodyC named "body") ──────────────────────
      let walkingLeft = false;
      if (v.phase === "walk_to_elev" || v.phase === "walk_back_to_elev") {
        walkingLeft = v.x > ELEV_ENTRY_X;
      } else if (v.phase === "walk_to_dest") {
        walkingLeft = v.x > v.destX;
      } else if (v.phase === "walk_home") {
        walkingLeft = v.x > v.homeX;
      }
      const body = v.container.children.find((ch) => ch.name === "body") as Container | undefined;
      if (body) body.scale.x = walkingLeft ? -1 : 1;
    }
  }
}
