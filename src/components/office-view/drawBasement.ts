import type { MutableRefObject } from "react";
import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";
import type { Agent } from "../../types";
import { localeName } from "../../i18n";
import type { CallbackSnapshot, BreakAnimItem } from "./buildScene-types";
import { BASEMENT_H, TARGET_CHAR_H, WALL_W, ELEVATOR_W, FLOOR_W, type RoomTheme, type WallClockVisual } from "./model";
import { BREAK_CHAT_MESSAGES, BREAK_SPOTS, LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  contrastTextColor,
  drawAmbientGlow,
  drawRoomAtmosphere,
  drawTiledFloor,
  hashStr,
} from "./drawing-core";
import type { FurnitureDrawer } from "./drawing-styles";

interface DrawBasementParams {
  stage: Container;
  drawer: FurnitureDrawer;
  textures: Record<string, Texture>;
  agents: Agent[];
  spriteMap: Map<string, number>;
  activeLocale: SupportedLocale;
  breakTheme: RoomTheme;
  isDark: boolean;
  basementY: number;
  cbRef: MutableRefObject<CallbackSnapshot>;
  breakAnimItemsRef: MutableRefObject<BreakAnimItem[]>;
  breakBubblesRef: MutableRefObject<Container[]>;
  breakSteamParticlesRef: MutableRefObject<Container | null>;
  breakRoomRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  agentPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
}

export function drawBasement({
  stage,
  drawer,
  textures,
  agents,
  spriteMap,
  activeLocale,
  breakTheme,
  isDark,
  basementY,
  cbRef,
  breakAnimItemsRef,
  breakBubblesRef,
  breakSteamParticlesRef,
  breakRoomRectRef,
  wallClocksRef,
  agentPosRef,
}: DrawBasementParams): void {
  const breakAgents = agents.filter((a) => a.status === "break");
  breakAnimItemsRef.current = [];
  breakBubblesRef.current = [];

  const bx = WALL_W;                                 // 20
  const bw = FLOOR_W - ELEVATOR_W - WALL_W * 2;     // 300
  const bh = BASEMENT_H;                             // 130
  const bry = basementY;

  breakRoomRectRef.current = { x: bx, y: bry, w: bw, h: bh };
  const breakRoom = new Container();

  // Brick-texture background (alternating bands to simulate brick)
  const brickG = new Graphics();
  const brick1 = isDark ? 0x1c2128 : 0xc8bfb2;
  const brick2 = isDark ? 0x161b22 : 0xd4cbbf;
  for (let row = 0; row < Math.ceil(bh / 8); row++) {
    const offset = (row % 2) * 16;
    for (let col = 0; col < Math.ceil(bw / 32); col++) {
      const bkx = bx + col * 32 + offset;
      brickG.rect(bkx, bry + row * 8, 30, 7).fill(row % 2 === 0 ? brick1 : brick2);
      brickG.rect(bkx, bry + row * 8, 30, 7).stroke({ width: 0.5, color: isDark ? 0x0d1117 : 0x9a8f80, alpha: 0.4 });
    }
  }
  breakRoom.addChild(brickG);

  // PCB grid floor at bottom third
  const floorStartY = bry + bh * 0.65;
  const floorG = new Graphics();
  const fBase = isDark ? 0x0d1117 : 0xccc6bc;
  const fGrid = isDark ? 0x1e2a3a : 0x9a9690;
  floorG.rect(bx, floorStartY, bw, bh - (floorStartY - bry)).fill(fBase);
  const gStep = 10;
  for (let gy = floorStartY; gy <= bry + bh; gy += gStep) {
    floorG.moveTo(bx, gy).lineTo(bx + bw, gy).stroke({ width: 0.5, color: fGrid, alpha: 0.3 });
  }
  for (let gx = bx; gx <= bx + bw; gx += gStep) {
    floorG.moveTo(gx, floorStartY).lineTo(gx, bry + bh).stroke({ width: 0.5, color: fGrid, alpha: 0.3 });
  }
  for (let gy = floorStartY; gy <= bry + bh; gy += gStep) {
    for (let gx = bx; gx <= bx + bw; gx += gStep) {
      floorG.circle(gx, gy, 0.7).fill({ color: fGrid, alpha: 0.5 });
    }
  }
  breakRoom.addChild(floorG);

  drawRoomAtmosphere(breakRoom, bx, bry, bw, bh, breakTheme.wall, breakTheme.accent);

  // Border + amber top separator + amber left bar
  const brBorder = new Graphics();
  brBorder.rect(bx, bry, bw, 2).fill(0xf59e0b);
  brBorder.rect(bx, bry, 3, bh).fill({ color: 0xf59e0b, alpha: 0.4 });
  brBorder.rect(bx, bry, bw, bh).stroke({ width: 1, color: breakTheme.accent, alpha: 0.25 });
  breakRoom.addChild(brBorder);

  // ── Wall structural details (industrial basement) ─────────────────
  const detailG = new Graphics();
  // Ceiling cornice — darker recessed strip
  detailG.rect(bx + 3, bry, bw - 3, 5).fill({ color: blendColor(breakTheme.wall, 0x000000, 0.55), alpha: 0.8 });
  detailG.rect(bx + 3, bry + 5, bw - 3, 1).fill({ color: blendColor(breakTheme.wall, 0xffffff, 0.12), alpha: 0.35 });

  // Exposed pipe run (industrial basement ceiling detail)
  const pipeY = bry + 9;
  detailG.rect(bx + 8, pipeY, bw - 16, 4).fill({ color: isDark ? 0x1e2c3e : 0x6a7888, alpha: 0.9 });
  detailG.rect(bx + 8, pipeY, bw - 16, 1).fill({ color: isDark ? 0x2e4060 : 0x8a9aaa, alpha: 0.6 }); // top hi
  detailG.rect(bx + 8, pipeY + 3, bw - 16, 1).fill({ color: isDark ? 0x0a1218 : 0x4a5868, alpha: 0.8 }); // bottom shadow
  // Pipe brackets every 30px
  for (let px2 = bx + 20; px2 < bx + bw - 10; px2 += 30) {
    detailG.rect(px2 - 2, pipeY - 3, 4, 3).fill({ color: isDark ? 0x283848 : 0x7a8898, alpha: 0.85 });
    detailG.rect(px2 - 1, pipeY - 3, 2, 1).fill({ color: isDark ? 0x3a5068 : 0x9aaabb, alpha: 0.6 });
  }

  // Heavy cable conduit below pipe (power infrastructure)
  const condY = bry + 14;
  detailG.rect(bx + 14, condY, bw - 28, 3).fill({ color: blendColor(breakTheme.wall, 0x000000, 0.6), alpha: 0.75 });
  detailG.rect(bx + 14, condY, bw - 28, 1).fill({ color: blendColor(breakTheme.wall, 0xffffff, 0.1), alpha: 0.35 });
  // Conduit clips every 24px
  for (let cx2 = bx + 26; cx2 < bx + bw - 12; cx2 += 24) {
    detailG.rect(cx2, condY - 1, 4, 6).fill({ color: blendColor(breakTheme.wall, 0xffffff, 0.08), alpha: 0.5 });
  }
  // Amber status LED strip along conduit
  for (let lx2 = bx + 18; lx2 < bx + bw - 16; lx2 += 8) {
    detailG.rect(lx2, condY + 4, 2, 1).fill({ color: breakTheme.accent, alpha: 0.3 });
  }

  // Baseboard — where brick wall meets PCB floor
  const floorJointY = bry + Math.floor(bh * 0.65) - 3;
  detailG.rect(bx + 3, floorJointY, bw - 3, 2).fill({ color: blendColor(breakTheme.wall, 0x000000, 0.6), alpha: 0.85 });
  detailG.rect(bx + 3, floorJointY, bw - 3, 1).fill({ color: breakTheme.accent, alpha: 0.25 }); // amber joint strip
  detailG.rect(bx + 3, floorJointY + 2, bw - 3, 1).fill({ color: blendColor(breakTheme.wall, 0xffffff, 0.1), alpha: 0.3 });
  breakRoom.addChild(detailG);

  drawAmbientGlow(breakRoom, bx + bw / 2, bry + bh / 2, bw * 0.3, breakTheme.accent, 0.05);
  drawer.drawCeilingLight(breakRoom, bx + bw / 3, bry + 6, breakTheme.accent);
  drawer.drawCeilingLight(breakRoom, bx + (bw * 2) / 3, bry + 6, breakTheme.accent);

  // Terminal status bar strip (replaces bunting)
  const statusBar = new Graphics();
  statusBar.rect(bx + 4, bry + 14, bw - 8, 1).fill({ color: breakTheme.accent, alpha: 0.2 });
  breakRoom.addChild(statusBar);

  // Furniture
  const furBaseX = bx + 14;
  drawer.drawCoffeeMachine(breakRoom, furBaseX, bry + 20);
  drawer.drawPlant(breakRoom, furBaseX + 30, bry + 36, 1);
  drawer.drawSofa(breakRoom, furBaseX + 52, bry + 54, 0x1e2a3a);
  drawer.drawCoffeeTable(breakRoom, furBaseX + 138, bry + 56);

  const furRightX = bx + bw - 14;
  drawer.drawVendingMachine(breakRoom, furRightX - 28, bry + 20);
  drawer.drawPlant(breakRoom, furRightX - 38, bry + 36, 2);
  drawer.drawSofa(breakRoom, furRightX - 118, bry + 54, 0x1a2e28);
  drawer.drawHighTable(breakRoom, furRightX - 160, bry + 22);

  drawer.drawPictureFrame(breakRoom, bx + bw / 2 - 10, bry + 14);
  wallClocksRef.current.push(drawer.drawWallClock(breakRoom, bx + bw / 2 + 32, bry + 18));
  drawer.drawTrashCan(breakRoom, furBaseX + 22, bry + bh - 14);
  drawer.drawRug(breakRoom, bx + bw / 2, bry + bh / 2 + 10, bw * 0.5, bh * 0.4, breakTheme.accent);

  // Label — terminal dark bar style
  const brSignBg = new Graphics();
  brSignBg.rect(bx + 4, bry + 16, 130, 13).fill({ color: 0x000000, alpha: isDark ? 0.75 : 0.45 });
  brSignBg.rect(bx + 4, bry + 28, 130, 1).fill({ color: breakTheme.accent, alpha: 0.5 });
  breakRoom.addChild(brSignBg);
  const brSignTxt = new Text({
    text: `SYS.IDLE  //  ${pickLocale(activeLocale, LOCALE_TEXT.breakRoom).toUpperCase()}`,
    style: new TextStyle({
      fontSize: 6,
      fill: breakTheme.accent,
      fontWeight: "bold",
      fontFamily: "monospace",
      letterSpacing: 1,
    }),
  });
  brSignTxt.anchor.set(0, 0.5);
  brSignTxt.position.set(bx + 8, bry + 22);
  breakRoom.addChild(brSignTxt);

  // Steam container
  const steamContainer = new Container();
  breakRoom.addChild(steamContainer);
  breakSteamParticlesRef.current = steamContainer;

  // Break agents
  breakAgents.forEach((agent, index) => {
    const spot = BREAK_SPOTS[index % BREAK_SPOTS.length];
    const seed = hashStr(agent.id);
    const offsetX = (seed % 7) - 3;
    const offsetY = ((seed % 5) - 2) * 0.6;

    const spotX = spot.x >= 0 ? bx + spot.x + offsetX : bx + bw - 16 + spot.x + offsetX;
    const spotY = bry + spot.y + offsetY;

    agentPosRef.current.set(agent.id, { x: spotX, y: spotY });

    const spriteNum = spriteMap.get(agent.id) ?? (seed % 13) + 1;
    const charContainer = new Container();
    charContainer.position.set(spotX, spotY);
    charContainer.eventMode = "static";
    charContainer.cursor = "pointer";
    charContainer.on("pointerdown", () => cbRef.current.onSelectAgent(agent));

    const dirKey = `${spriteNum}-${spot.dir}-1`;
    const fallbackKey = `${spriteNum}-D-1`;
    const texture = textures[dirKey] ?? textures[fallbackKey];

    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set((TARGET_CHAR_H * 0.85) / sprite.texture.height);
      charContainer.addChild(sprite);
    } else {
      const fallback = new Text({ text: agent.avatar_emoji ?? "🤖", style: new TextStyle({ fontSize: 20 }) });
      fallback.anchor.set(0.5, 1);
      charContainer.addChild(fallback);
    }
    breakRoom.addChild(charContainer);

    breakAnimItemsRef.current.push({ sprite: charContainer, baseX: spotX, baseY: spotY });

    const coffee = new Text({ text: "☕", style: new TextStyle({ fontSize: 10 }) });
    coffee.anchor.set(0.5, 0.5);
    coffee.position.set(spotX + 14, spotY - 10);
    breakRoom.addChild(coffee);

    const nameTag = new Text({
      text: localeName(activeLocale, agent),
      style: new TextStyle({ fontSize: 6, fill: breakTheme.accent, fontFamily: "monospace" }),
    });
    nameTag.anchor.set(0.5, 0);
    const ntW = nameTag.width + 6;
    const ntBg = new Graphics();
    ntBg.rect(spotX - ntW / 2, spotY + 2, ntW, 9).fill({ color: 0x000000, alpha: isDark ? 0.7 : 0.5 });
    breakRoom.addChild(ntBg);
    nameTag.position.set(spotX, spotY + 3);
    breakRoom.addChild(nameTag);
  });

  // Chat bubbles
  if (breakAgents.length > 0) {
    const phase = Math.floor(Date.now() / 4000);
    const speakerCount = Math.min(2, breakAgents.length);
    for (let si = 0; si < speakerCount; si++) {
      const speakerIdx = (phase + si) % breakAgents.length;
      const agent = breakAgents[speakerIdx];
      const spot = BREAK_SPOTS[speakerIdx % BREAK_SPOTS.length];
      const seed = hashStr(agent.id);
      const spotX = spot.x >= 0 ? bx + spot.x + ((seed % 7) - 3) : bx + bw - 16 + spot.x + ((seed % 7) - 3);
      const spotY = bry + spot.y + ((seed % 5) - 2) * 0.6;

      const chatPool = BREAK_CHAT_MESSAGES[activeLocale] ?? BREAK_CHAT_MESSAGES.ko;
      const msg = chatPool[(seed + phase) % chatPool.length];
      const bubbleText = new Text({
        text: msg,
        style: new TextStyle({ fontSize: 7, fill: isDark ? 0x88cc88 : 0x44aa44, fontFamily: "monospace" }),
      });
      bubbleText.anchor.set(0.5, 1);
      const bubbleW = bubbleText.width + 10;
      const bubbleH = bubbleText.height + 6;
      const bubbleTop = spotY - TARGET_CHAR_H * 0.85 - bubbleH - 4;

      const bubbleG = new Graphics();
      bubbleG.rect(spotX - bubbleW / 2, bubbleTop, bubbleW, bubbleH).fill({ color: 0x0a0e16, alpha: isDark ? 0.92 : 0.82 });
      bubbleG.rect(spotX - bubbleW / 2, bubbleTop, bubbleW, bubbleH).stroke({
        width: 1, color: breakTheme.accent, alpha: 0.6,
      });
      // Sharp tail
      bubbleG.rect(spotX - 1, bubbleTop + bubbleH, 2, 4).fill({ color: breakTheme.accent, alpha: 0.6 });

      bubbleText.position.set(spotX, bubbleTop + bubbleH - 3);

      const bubbleContainer = new Container();
      bubbleContainer.addChild(bubbleG);
      bubbleContainer.addChild(bubbleText);
      breakRoom.addChild(bubbleContainer);
      breakBubblesRef.current.push(bubbleContainer);
    }
  }

  stage.addChild(breakRoom);
}
