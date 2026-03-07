import type { MutableRefObject } from "react";
import { Container, Graphics, Text, TextStyle, type Texture } from "pixi.js";
import type { Agent, Department, SubAgent, Task } from "../../types";
import { localeName } from "../../i18n";
import type { CallbackSnapshot, AnimItem, SubCloneAnimItem } from "./buildScene-types";
import {
  COLS_PER_ROW,
  DESK_W,
  SLOT_W,
  TARGET_CHAR_H,
  WALL_W,
  ELEVATOR_W,
  FLOOR_W,
  FLOOR_ROOM_H,
  FLOOR_HALLWAY_H,
  type RoomRect,
  type SubCloneBurstParticle,
  type WallClockVisual,
  emitSubCloneSmokeBurst,
} from "./model";
import { DEPT_THEME, LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  contrastTextColor,
  drawAmbientGlow,
  drawRoomAtmosphere,
  drawTiledFloor,
} from "./drawing-core";
import { drawDeskLamp, drawDeskMug, drawDeskFigurine } from "./drawing-furniture-a";
import { renderDeskAgentAndSubClones } from "./buildScene-department-agent";
import { type RoomDecoration, getRoomDecoration, getLightingTint } from "./room-decoration";
import type { FurnitureDrawer } from "./drawing-styles";
import type { FurnitureLayout } from "./furniture-catalog";

// Tower rooms fit exactly 3 agents (COLS_PER_ROW × 1 row)
const MAX_AGENTS_PER_FLOOR = COLS_PER_ROW;

interface DrawFloorParams {
  stage: Container;
  drawer: FurnitureDrawer;
  textures: Record<string, Texture>;
  dept: Department;
  deptIdx: number;
  floorIndex: number;
  floorY: number;
  deptAgents: Agent[];
  allAgents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  unread?: Set<string>;
  customTheme?: { floor1: number; floor2: number; wall: number; accent: number };
  activeLocale: SupportedLocale;
  isDark: boolean;
  spriteMap: Map<string, number>;
  cbRef: MutableRefObject<CallbackSnapshot>;
  roomRectsRef: MutableRefObject<RoomRect[]>;
  agentPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  animItemsRef: MutableRefObject<AnimItem[]>;
  subCloneAnimItemsRef: MutableRefObject<SubCloneAnimItem[]>;
  subCloneBurstParticlesRef: MutableRefObject<SubCloneBurstParticle[]>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  roomDecorations: Record<string, RoomDecoration>;
  furnitureLayouts: FurnitureLayout;
  removedSubBurstsByParent: Map<string, Array<{ x: number; y: number }>>;
  addedWorkingSubIds: Set<string>;
  nextSubSnapshot: Map<string, { parentAgentId: string; x: number; y: number }>;
}

export function drawFloor({
  stage,
  drawer,
  textures,
  dept,
  deptIdx,
  floorIndex,
  floorY,
  deptAgents,
  tasks,
  subAgents,
  unread,
  customTheme,
  activeLocale,
  isDark,
  spriteMap,
  cbRef,
  roomRectsRef,
  agentPosRef,
  animItemsRef,
  subCloneAnimItemsRef,
  subCloneBurstParticlesRef,
  wallClocksRef,
  roomDecorations,
  removedSubBurstsByParent,
  addedWorkingSubIds,
  nextSubSnapshot,
}: DrawFloorParams): void {
  const theme = customTheme ?? DEPT_THEME[dept.id] ?? DEPT_THEME.dev;
  const rx = WALL_W;                                  // 20
  const rw = FLOOR_W - ELEVATOR_W - WALL_W * 2;      // 300
  const rh = FLOOR_ROOM_H;                            // 120
  const ry = floorY;

  const visibleAgents = deptAgents.slice(0, MAX_AGENTS_PER_FLOOR);
  const hasOverflow = deptAgents.length > MAX_AGENTS_PER_FLOOR;

  roomRectsRef.current.push({ dept, x: rx, y: ry, w: rw, h: rh, floorIndex });

  const floor = new Container();

  // Floor tiles
  const floorG = new Graphics();
  drawTiledFloor(floorG, rx, ry, rw, rh, theme.floor1, theme.floor2);
  floor.addChild(floorG);
  drawRoomAtmosphere(floor, rx, ry, rw, rh, theme.wall, theme.accent);

  // ── Room border + structural wall layers ─────────────────────────
  const wallG = new Graphics();
  // Outer border
  wallG.rect(rx, ry, rw, rh).stroke({ width: 1, color: blendColor(theme.wall, theme.accent, 0.3) });
  // Amber left accent bar (load-bearing column look)
  wallG.rect(rx, ry, 3, rh).fill({ color: theme.accent, alpha: 0.55 });
  // Top separator
  wallG.rect(rx, ry, rw, 1).fill({ color: theme.accent, alpha: 0.4 });
  floor.addChild(wallG);

  // ── Pixel wall detail layers ──────────────────────────────────────
  const detailG = new Graphics();

  // Ceiling cornice — dark top strip
  const corniceH = 4;
  detailG.rect(rx + 3, ry, rw - 3, corniceH).fill({ color: blendColor(theme.wall, 0x000000, 0.45), alpha: 0.72 });
  detailG.rect(rx + 3, ry + corniceH, rw - 3, 1).fill({ color: blendColor(theme.wall, 0xffffff, 0.18), alpha: 0.4 });

  // Network cable conduit — horizontal trough just below cornice
  const condY = ry + corniceH + 2;
  const condX1 = rx + 10;
  const condW  = rw - 22;
  detailG.rect(condX1, condY, condW, 3).fill({ color: blendColor(theme.wall, 0x000000, 0.55), alpha: 0.65 });
  detailG.rect(condX1, condY, condW, 1).fill({ color: blendColor(theme.wall, 0xffffff, 0.22), alpha: 0.45 });
  // Conduit clips every 28px
  for (let cx2 = condX1 + 12; cx2 < condX1 + condW - 10; cx2 += 28) {
    detailG.rect(cx2, condY - 1, 4, 5).fill({ color: blendColor(theme.wall, 0xffffff, 0.14), alpha: 0.55 });
  }
  // Indicator LED on conduit (near right end)
  detailG.circle(condX1 + condW - 6, condY + 1.5, 1.5).fill({ color: theme.accent, alpha: 0.55 });

  // Dado rail — horizontal wainscoting at 38% room height
  const dadoY = ry + Math.floor(rh * 0.38);
  detailG.rect(rx + 3, dadoY, rw - 3, 2).fill({ color: blendColor(theme.wall, 0x000000, 0.35), alpha: 0.62 });
  detailG.rect(rx + 3, dadoY, rw - 3, 1).fill({ color: theme.accent, alpha: 0.18 });
  detailG.rect(rx + 3, dadoY + 2, rw - 3, 1).fill({ color: blendColor(theme.wall, 0xffffff, 0.12), alpha: 0.3 });

  // Baseboard — bottom of room
  const baseY = ry + rh - 4;
  detailG.rect(rx + 3, baseY, rw - 3, 4).fill({ color: blendColor(theme.wall, 0x000000, 0.52), alpha: 0.7 });
  detailG.rect(rx + 3, baseY, rw - 3, 1).fill({ color: theme.accent, alpha: 0.12 });

  // Data port panel near elevator side (right side of room)
  const portX = rx + rw - 12;
  const portY = dadoY - 10;
  detailG.rect(portX, portY, 8, 8).fill({ color: blendColor(theme.wall, 0x000000, 0.5), alpha: 0.8 });
  detailG.rect(portX, portY, 8, 8).stroke({ width: 0.6, color: blendColor(theme.wall, 0xffffff, 0.1), alpha: 0.5 });
  detailG.rect(portX + 2, portY + 2, 2, 2).fill({ color: 0x22cc88, alpha: 0.7 });
  detailG.rect(portX + 5, portY + 2, 2, 2).fill({ color: 0xf59e0b, alpha: 0.5 });

  floor.addChild(detailG);

  // Department sign — terminal style: dark bg + monospace label
  const signW = Math.min(96, rw / 2);
  const signBg = new Graphics();
  signBg.rect(rx + 3, ry - 1, signW, 13).fill({ color: 0x000000, alpha: isDark ? 0.7 : 0.55 });
  signBg.rect(rx + 3, ry + 12, signW, 1).fill({ color: theme.accent, alpha: 0.5 });
  signBg.eventMode = "static";
  signBg.cursor = "pointer";
  signBg.on("pointerdown", () => cbRef.current.onSelectDepartment(dept));
  floor.addChild(signBg);

  const signTxt = new Text({
    text: localeName(activeLocale, dept).toUpperCase(),
    style: new TextStyle({ fontSize: 7, fill: theme.accent, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 1 }),
  });
  signTxt.anchor.set(0, 0.5);
  signTxt.position.set(rx + 6, ry + 5);
  floor.addChild(signTxt);

  // Floor number — top-right, monospace
  const floorNumTxt = new Text({
    text: `NODE-${String(floorIndex + 1).padStart(2, "0")}`,
    style: new TextStyle({ fontSize: 6, fill: isDark ? 0x444444 : 0x888888, fontFamily: "monospace" }),
  });
  floorNumTxt.anchor.set(1, 0);
  floorNumTxt.position.set(rx + rw - 4, ry + 3);
  floor.addChild(floorNumTxt);

  // Ambient & lighting
  const decor = getRoomDecoration(roomDecorations, dept.id);
  const lighting = getLightingTint(decor.lighting);
  if (lighting.glowAlpha > 0) {
    drawAmbientGlow(floor, rx + rw / 2, ry + rh / 2, rw * 0.5, lighting.glowColor, lighting.glowAlpha);
  }
  drawAmbientGlow(floor, rx + rw / 2, ry + rh / 2, rw * 0.35, theme.accent, 0.04);

  // Ceiling & wall decorations
  drawer.drawCeilingLight(floor, rx + rw / 2, ry + 10, theme.accent);
  if (decor.wallDecor === "whiteboard") {
    drawer.drawWhiteboard(floor, rx + rw - 50, ry + 14);
  } else if (decor.wallDecor === "poster") {
    // Terminal data poster — dark rect with status bars
    const pG = new Graphics();
    pG.rect(rx + rw - 44, ry + 14, 20, 26).fill({ color: 0x050810, alpha: 0.85 });
    pG.rect(rx + rw - 44, ry + 14, 20, 26).stroke({ width: 0.8, color: theme.accent, alpha: 0.5 });
    pG.rect(rx + rw - 44, ry + 14, 2, 26).fill({ color: theme.accent, alpha: 0.6 });
    // Tiny data bars
    for (let bi = 0; bi < 4; bi++) {
      pG.rect(rx + rw - 41, ry + 17 + bi * 5, (3 + bi * 2), 2).fill({ color: theme.accent, alpha: 0.5 });
    }
    floor.addChild(pG);
  } else if (decor.wallDecor === "picture") {
    drawer.drawPictureFrame(floor, rx + rw - 42, ry + 16);
  }

  drawer.drawBookshelf(floor, rx + 4, ry + 14);
  wallClocksRef.current.push(drawer.drawWallClock(floor, rx + rw - 16, ry + 10));
  drawer.drawWindow(floor, rx + rw / 2 - 10, ry + 10, 20, 14);
  drawer.drawTrashCan(floor, rx + rw - 12, ry + rh - 22);

  if (decor.plantType !== "none") {
    drawer.drawPlant(floor, rx + 6, ry + rh - 12, deptIdx);
    drawer.drawPlant(floor, rx + rw - 14, ry + rh - 12, deptIdx + 1);
  }

  // Rug
  if (visibleAgents.length > 0 && decor.floorDecor === "rug") {
    drawer.drawRug(floor, rx + rw / 2, ry + rh / 2, rw - 40, rh - 24, theme.accent);
  }

  // Agents — centered: 3 × SLOT_W=100 = 300 = rw, so centerPad=0
  const centerPad = (rw - COLS_PER_ROW * SLOT_W) / 2; // 0

  if (visibleAgents.length === 0) {
    const emptyTxt = new Text({
      text: pickLocale(activeLocale, LOCALE_TEXT.noAssignedAgent),
      style: new TextStyle({ fontSize: 9, fill: 0x9a8a7a, fontFamily: "system-ui, sans-serif" }),
    });
    emptyTxt.anchor.set(0.5, 0.5);
    emptyTxt.position.set(rx + rw / 2, ry + rh / 2);
    floor.addChild(emptyTxt);
  }

  visibleAgents.forEach((agent, agentIdx) => {
    const acol = agentIdx % COLS_PER_ROW;
    const ax = rx + centerPad + acol * SLOT_W + SLOT_W / 2;
    const nameY = ry + 22;                     // more ceiling clearance (was 16)
    const charFeetY = nameY + 26 + TARGET_CHAR_H; // was +20; extra room for role tag
    const deskY = charFeetY - 6;

    const isWorking = agent.status === "working";
    const isOffline = agent.status === "offline";
    const isBreak = agent.status === "break";

    agentPosRef.current.set(agent.id, { x: ax, y: deskY });
    drawAgentNameTag(floor, ax, nameY, agent, theme.accent, unread, activeLocale);
    drawer.drawChair(floor, ax, charFeetY - TARGET_CHAR_H * 0.18, theme.accent);

    // Sub-clone despawn bursts
    const removedBursts = removedSubBurstsByParent.get(agent.id);
    if (removedBursts?.length) {
      for (const burst of removedBursts) {
        emitSubCloneSmokeBurst(floor, subCloneBurstParticlesRef.current, burst.x, burst.y, "despawn");
      }
      removedSubBurstsByParent.delete(agent.id);
    }

    if (isBreak) {
      drawer.drawDesk(floor, ax - DESK_W / 2, deskY, false);
      drawBreakAwayTag(floor, ax, charFeetY, activeLocale, theme.accent);
    } else {
      renderDeskAgentAndSubClones({
        room: floor,
        drawer,
        textures,
        spriteMap,
        agent,
        tasks,
        subAgents,
        ax,
        deskY,
        charFeetY,
        isWorking,
        isOffline,
        cbRef,
        animItemsRef,
        subCloneAnimItemsRef,
        subCloneBurstParticlesRef,
        addedWorkingSubIds,
        nextSubSnapshot,
        themeAccent: theme.accent,
      });

      if (decor.deskAccessory !== "default" && decor.deskAccessory !== "none") {
        const ax2 = ax + DESK_W / 2 - 6;
        const ay2 = deskY - 2;
        if (decor.deskAccessory === "lamp") drawDeskLamp(floor, ax2, ay2);
        else if (decor.deskAccessory === "mug") drawDeskMug(floor, ax2, ay2);
        else if (decor.deskAccessory === "figurine") drawDeskFigurine(floor, ax2, ay2, theme.accent);
      }
    }
  });

  // Overflow count
  if (hasOverflow) {
    const overflowTxt = new Text({
      text: `+${deptAgents.length - MAX_AGENTS_PER_FLOOR}`,
      style: new TextStyle({ fontSize: 7, fill: theme.accent, fontWeight: "bold", fontFamily: "monospace" }),
    });
    overflowTxt.anchor.set(1, 1);
    overflowTxt.position.set(rx + rw - 4, ry + rh - 4);
    floor.addChild(overflowTxt);
  }

  stage.addChild(floor);

  // Hallway strip below room
  const hallY    = ry + rh;
  const centerY  = hallY + FLOOR_HALLWAY_H / 2;
  const hallBase = isDark ? 0x10141e : 0x18222e;
  const hallG    = new Graphics();

  // Floor surface
  hallG.rect(rx, hallY, rw, FLOOR_HALLWAY_H).fill(hallBase);
  // Subtle tile grid
  for (let tx = rx; tx < rx + rw; tx += 20) {
    hallG.rect(tx, hallY, 1, FLOOR_HALLWAY_H).fill({ color: isDark ? 0x1a2030 : 0x222e40, alpha: 0.4 });
  }
  // Top separator (amber accent)
  hallG.rect(rx, hallY, rw, 1).fill({ color: 0xf59e0b, alpha: 0.25 });
  // Bottom separator
  hallG.rect(rx, hallY + FLOOR_HALLWAY_H - 1, rw, 1).fill({ color: 0xf59e0b, alpha: 0.45 });

  // Elevator call button on right side (small pixel widget)
  const callBtnX = rx + rw - 9;
  hallG.rect(callBtnX, centerY - 5, 7, 10).fill({ color: isDark ? 0x141e2e : 0x1c2838, alpha: 1 });
  hallG.rect(callBtnX, centerY - 5, 7, 10).stroke({ width: 0.8, color: 0x2a3c56, alpha: 0.9 });
  hallG.circle(callBtnX + 3.5, centerY - 1.5, 1.8).fill({ color: 0xf59e0b, alpha: 0.65 }); // up
  hallG.circle(callBtnX + 3.5, centerY + 2.5, 1.8).fill({ color: 0x1a2c44, alpha: 0.8 }); // down

  // Dashed centre line with directional arrows (→ elevator)
  for (let dx = rx + 8; dx < rx + rw - 28; dx += 16) {
    hallG.rect(dx, centerY, 8, 1).fill({ color: isDark ? 0x2a3850 : 0x334460, alpha: 0.5 });
  }
  // Arrow cluster near elevator end
  for (let ai = 0; ai < 3; ai++) {
    const ax2  = rx + rw - 28 + ai * 5;
    const alpha = 0.18 + ai * 0.14;
    hallG.moveTo(ax2, centerY - 3).lineTo(ax2 + 4, centerY).lineTo(ax2, centerY + 3)
      .stroke({ width: 1, color: 0xf59e0b, alpha });
  }

  // Floor label (left side, small badge)
  const floorNumH = new Text({
    text: `F${floorIndex + 1}`,
    style: new TextStyle({ fontSize: 5, fill: isDark ? 0x3a4c68 : 0x446080, fontFamily: "monospace" }),
  });
  floorNumH.anchor.set(0, 0.5);
  floorNumH.position.set(rx + 4, centerY);

  stage.addChild(hallG);
  stage.addChild(floorNumH);
}

function drawAgentNameTag(
  room: Container,
  ax: number,
  nameY: number,
  agent: Agent,
  accent: number,
  unread: Set<string> | undefined,
  activeLocale: SupportedLocale,
): void {
  // Terminal-style name tag: dark rect + accent border-left + monospace text
  const nameText = new Text({
    text: localeName(activeLocale, agent),
    style: new TextStyle({ fontSize: 7, fill: accent, fontWeight: "bold", fontFamily: "monospace" }),
  });
  nameText.anchor.set(0.5, 0);
  const nameTagW = nameText.width + 8;
  const nameTagBg = new Graphics();
  nameTagBg.rect(ax - nameTagW / 2, nameY, nameTagW, 11).fill({ color: 0x050810, alpha: 0.88 });
  nameTagBg.rect(ax - nameTagW / 2, nameY, 2, 11).fill({ color: accent, alpha: 0.8 });
  room.addChild(nameTagBg);
  nameText.position.set(ax + 1, nameY + 2);
  room.addChild(nameText);

  if (unread?.has(agent.id)) {
    const bangX = ax + nameTagW / 2 + 4;
    const bangBg = new Graphics();
    bangBg.rect(bangX - 3, nameY + 1, 6, 9).fill(0xef4444);
    room.addChild(bangBg);
    const bangTxt = new Text({ text: "!", style: new TextStyle({ fontSize: 7, fill: 0xffffff, fontWeight: "bold", fontFamily: "monospace" }) });
    bangTxt.anchor.set(0.5, 0.5);
    bangTxt.position.set(bangX, nameY + 5);
    room.addChild(bangTxt);
  }

  // Role tag — sharp rect, muted monospace
  const roleText = new Text({
    text: pickLocale(
      activeLocale,
      LOCALE_TEXT.role[agent.role as keyof typeof LOCALE_TEXT.role] ?? { ko: agent.role, en: agent.role, ja: agent.role, zh: agent.role },
    ),
    style: new TextStyle({ fontSize: 5, fill: 0x666688, fontFamily: "monospace" }),
  });
  roleText.anchor.set(0.5, 0.5);
  const roleTagW = roleText.width + 6;
  const roleTagBg = new Graphics();
  roleTagBg.rect(ax - roleTagW / 2, nameY + 12, roleTagW, 8).fill({ color: 0x0a0e1a, alpha: 0.75 });
  roleTagBg.rect(ax - roleTagW / 2, nameY + 19, roleTagW, 1).fill({ color: accent, alpha: 0.35 });
  room.addChild(roleTagBg);
  roleText.position.set(ax, nameY + 16);
  room.addChild(roleText);
}

function drawBreakAwayTag(
  room: Container,
  ax: number,
  charFeetY: number,
  activeLocale: SupportedLocale,
  accent: number,
): void {
  const awayBgColor = blendColor(accent, 0x101826, 0.78);
  const awayTagTxt = new Text({
    text: pickLocale(activeLocale, LOCALE_TEXT.breakRoom),
    style: new TextStyle({ fontSize: 7, fill: contrastTextColor(awayBgColor), fontWeight: "bold", fontFamily: "system-ui, sans-serif" }),
  });
  awayTagTxt.anchor.set(0.5, 0.5);
  const atW = awayTagTxt.width + 10;
  const atH = awayTagTxt.height + 4;
  const awayTagY = charFeetY - TARGET_CHAR_H / 2;
  const atBg = new Graphics();
  atBg.rect(ax - atW / 2, awayTagY - atH / 2, atW, atH).fill({ color: awayBgColor, alpha: 0.9 });
  atBg.rect(ax - atW / 2, awayTagY - atH / 2, 2, atH).fill({ color: accent, alpha: 0.7 });
  room.addChild(atBg);
  awayTagTxt.position.set(ax, awayTagY + 0.5);
  room.addChild(awayTagTxt);
}
