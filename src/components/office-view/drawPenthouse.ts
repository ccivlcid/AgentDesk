import type { MutableRefObject } from "react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Agent, Task } from "../../types";
import type { Delivery, RoomTheme, WallClockVisual } from "./model";
import { FLOOR_W, WALL_W, ELEVATOR_W, PENTHOUSE_H } from "./model";
import { LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  drawAmbientGlow,
  drawRoomAtmosphere,
  drawTiledFloor,
} from "./drawing-core";
import { formatPeopleCount, formatTaskCount } from "./drawing-furniture-b";
import type { FurnitureDrawer } from "./drawing-styles";

interface DrawPenthouseParams {
  stage: Container;
  drawer: FurnitureDrawer;
  pentY: number;
  isDark: boolean;
  activeLocale: SupportedLocale;
  ceoTheme: RoomTheme;
  ceoName?: string;      // custom name for nameplate (empty = "CEO")
  ceoTitle?: string;     // custom title for terminal strip (empty = "CEO")
  personaBadge?: string; // persona badge text e.g. "[JOBS]" (empty = hidden)
  activeMeetingTaskId: string | null;
  onOpenActiveMeetingMinutes?: (taskId: string) => void;
  agents: Agent[];
  tasks: Task[];
  deliveriesRef: MutableRefObject<Delivery[]>;
  ceoMeetingSeatsRef: MutableRefObject<Array<{ x: number; y: number }>>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  ceoOfficeRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
}

export function drawPenthouse({
  stage,
  drawer,
  pentY,
  isDark,
  activeLocale,
  ceoTheme,
  ceoName,
  ceoTitle,
  personaBadge,
  activeMeetingTaskId,
  onOpenActiveMeetingMinutes,
  agents,
  tasks,
  deliveriesRef,
  ceoMeetingSeatsRef,
  wallClocksRef,
  ceoOfficeRectRef,
}: DrawPenthouseParams): void {
  const stripLabel = ceoTitle?.trim() || "CEO";
  const plateName = ceoName?.trim() || ceoTitle?.trim() || "CEO";
  // Interior dims (exclude elevator shaft, keep left/right wall)
  const px = WALL_W;                                    // 20
  const pw = FLOOR_W - ELEVATOR_W - WALL_W * 2;        // 300
  const ph = PENTHOUSE_H;                               // 160

  ceoOfficeRectRef.current = { x: px, y: pentY, w: pw, h: ph };

  const pLayer = new Container();

  // Floor & atmosphere
  const floorG = new Graphics();
  drawTiledFloor(floorG, px, pentY, pw, ph, ceoTheme.floor1, ceoTheme.floor2);
  pLayer.addChild(floorG);
  drawRoomAtmosphere(pLayer, px, pentY, pw, ph, ceoTheme.wall, ceoTheme.accent);
  drawAmbientGlow(pLayer, px + pw / 2, pentY + ph / 2, pw * 0.4, ceoTheme.accent, 0.07);

  // ── Room border + structural detail ──────────────────────────────
  const border = new Graphics();
  border.rect(px, pentY, pw, ph).stroke({ width: 1, color: blendColor(ceoTheme.wall, ceoTheme.accent, 0.4) });
  border.rect(px, pentY + ph - 2, pw, 2).fill(0xf59e0b);
  // Amber accent bar (left, thicker for CEO status)
  border.rect(px, pentY, 4, ph).fill({ color: 0xf59e0b, alpha: 0.65 });
  pLayer.addChild(border);

  // ── Wall detail layers (CEO premium version) ─────────────────────
  const pDetail = new Graphics();
  // Ceiling cornice
  pDetail.rect(px + 4, pentY, pw - 4, 5).fill({ color: blendColor(ceoTheme.wall, 0x000000, 0.4), alpha: 0.75 });
  pDetail.rect(px + 4, pentY + 5, pw - 4, 1).fill({ color: blendColor(ceoTheme.wall, 0xffffff, 0.2), alpha: 0.45 });
  // Double cable conduit (executive floor = more infrastructure)
  const pCondY = pentY + 7;
  pDetail.rect(px + 12, pCondY, pw - 26, 3).fill({ color: blendColor(ceoTheme.wall, 0x000000, 0.5), alpha: 0.65 });
  pDetail.rect(px + 12, pCondY, pw - 26, 1).fill({ color: blendColor(ceoTheme.wall, 0xffffff, 0.2), alpha: 0.4 });
  pDetail.rect(px + 12, pCondY + 4, pw - 26, 2).fill({ color: blendColor(ceoTheme.wall, 0x000000, 0.4), alpha: 0.5 });
  for (let cxi = px + 24; cxi < px + pw - 16; cxi += 24) {
    pDetail.rect(cxi, pCondY - 1, 4, 8).fill({ color: blendColor(ceoTheme.wall, 0xffffff, 0.12), alpha: 0.5 });
  }
  // Amber LED strip along conduit
  for (let lxi = px + 16; lxi < px + pw - 18; lxi += 8) {
    pDetail.rect(lxi, pCondY + 6, 2, 1).fill({ color: ceoTheme.accent, alpha: 0.35 });
  }
  // Dado rail (gold/amber for executive look)
  const pDadoY = pentY + Math.floor(ph * 0.35);
  pDetail.rect(px + 4, pDadoY, pw - 4, 3).fill({ color: blendColor(ceoTheme.wall, 0x000000, 0.3), alpha: 0.65 });
  pDetail.rect(px + 4, pDadoY, pw - 4, 1).fill({ color: 0xf59e0b, alpha: 0.3 });
  pDetail.rect(px + 4, pDadoY + 3, pw - 4, 1).fill({ color: blendColor(ceoTheme.wall, 0xffffff, 0.15), alpha: 0.35 });
  // Baseboard
  pDetail.rect(px + 4, pentY + ph - 5, pw - 4, 4).fill({ color: blendColor(ceoTheme.wall, 0x000000, 0.5), alpha: 0.7 });
  pDetail.rect(px + 4, pentY + ph - 5, pw - 4, 1).fill({ color: 0xf59e0b, alpha: 0.2 });
  pLayer.addChild(pDetail);

  // CEO Grand desk (left area)
  const deskCX = px + 70;
  const deskY = pentY + 38;
  const deskEdge = isDark ? 0x0e1018 : 0x1a2030;
  const deskTop = isDark ? 0x141820 : 0x22304a;
  const monitorFrame = isDark ? 0x0a0c14 : 0x141820;
  const monitorScreen = isDark ? 0x0a1a30 : 0x0c1828;
  const namePlate = isDark ? 0x0a0e16 : 0x101826;

  const deskG = new Graphics();
  deskG.roundRect(deskCX - 44, deskY, 88, 36, 3).fill(deskEdge);
  deskG.roundRect(deskCX - 43, deskY + 1, 86, 34, 2).fill(deskTop);
  deskG.roundRect(deskCX - 16, deskY + 2, 32, 18, 2).fill(monitorFrame);
  deskG.roundRect(deskCX - 14, deskY + 4, 28, 13, 1).fill(monitorScreen);
  deskG.roundRect(deskCX - 14, deskY + 24, 28, 8, 2).fill(namePlate);
  pLayer.addChild(deskG);

  const ceoPlate = new Text({
    text: plateName,
    style: new TextStyle({ fontSize: 5, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace" }),
  });
  ceoPlate.anchor.set(0.5, 0.5);
  ceoPlate.position.set(deskCX, deskY + 28);
  pLayer.addChild(ceoPlate);
  drawer.drawChair(pLayer, deskCX, deskY + 50, isDark ? 0x1a2030 : 0x3a4a5a);

  // Meeting seats now handled by the dedicated conference floor (drawConferenceFloor.ts).
  // Keep seat refs as empty — meeting deliveries are routed to the conf floor instead.
  ceoMeetingSeatsRef.current = [];

  // Update delivery positions after scene rebuild (no meeting seats in penthouse)
  deliveriesRef.current = deliveriesRef.current.filter((d) => !d.sprite.destroyed);

  // Lounge area — more spread out now that meeting table is removed
  const loungeX = px + pw * 0.55;
  drawer.drawSofa(pLayer, loungeX, pentY + 80, isDark ? 0x1a2438 : 0x2e3d52);
  drawer.drawCoffeeTable(pLayer, loungeX + 56, pentY + 82);
  drawer.drawPlant(pLayer, px + pw - 18, pentY + 68, 0);
  drawer.drawPlant(pLayer, px + 8, pentY + ph - 14, 1);

  // ── Terminal data strip (replaces rounded emoji cards) ──────────────────
  const workingCount = agents.filter((a) => a.status === "working").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  const stripH = 22;
  const stripBg = isDark ? 0x0c0c0c : 0x111111;
  const stripG = new Graphics();
  stripG.rect(px + 3, pentY, pw - 3, stripH).fill({ color: stripBg, alpha: isDark ? 0.9 : 0.75 });
  // amber bottom divider
  stripG.rect(px + 3, pentY + stripH - 1, pw - 3, 1).fill({ color: 0xf59e0b, alpha: 0.7 });
  pLayer.addChild(stripG);

  // "CEO" label on left of strip
  const ceoLbl = new Text({
    text: stripLabel,
    style: new TextStyle({ fontSize: 7, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 2 }),
  });
  ceoLbl.anchor.set(0, 0.5);
  ceoLbl.position.set(px + 8, pentY + stripH / 2);
  pLayer.addChild(ceoLbl);

  // Separator
  const sepG = new Graphics();
  sepG.rect(px + 30, pentY + 4, 1, stripH - 8).fill({ color: 0xf59e0b, alpha: 0.3 });
  pLayer.addChild(sepG);

  // Persona badge (if set) — shown between CEO label and stats
  if (personaBadge?.trim()) {
    const pbText = new Text({
      text: personaBadge.trim(),
      style: new TextStyle({ fontSize: 6, fill: 0x22cc88, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 1 }),
    });
    pbText.anchor.set(0, 0.5);
    pbText.position.set(px + 35, pentY + stripH / 2);
    pLayer.addChild(pbText);
  }

  // Stats: STAFF · ACTIVE · TASKS · DONE
  const termStats = [
    { label: "STAFF", val: String(agents.length) },
    { label: "ACTIVE", val: String(workingCount) },
    { label: "TASKS", val: String(inProgress) },
    { label: `DONE`, val: `${doneCount}/${tasks.length}` },
  ];
  const statsArea = pw - 42; // space after CEO label
  const colW = statsArea / termStats.length;
  termStats.forEach((s, i) => {
    const cx = px + 36 + colW * i + colW / 2;
    const lbl = new Text({
      text: s.label,
      style: new TextStyle({ fontSize: 5, fill: isDark ? 0x555555 : 0x666666, fontFamily: "monospace", letterSpacing: 1 }),
    });
    lbl.anchor.set(0.5, 0);
    lbl.position.set(cx, pentY + 3);
    pLayer.addChild(lbl);
    const val = new Text({
      text: s.val,
      style: new TextStyle({ fontSize: 9, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace" }),
    });
    val.anchor.set(0.5, 1);
    val.position.set(cx, pentY + stripH - 2);
    pLayer.addChild(val);
  });

  // Pixel cityscape window strip (above lounge)
  const wsX = loungeX - 4;
  const wsY = pentY + 6;
  const wsW = 80;
  const wsG = new Graphics();
  wsG.rect(wsX, wsY, wsW, 14).fill({ color: isDark ? 0x0a1830 : 0xc8e0f0, alpha: 0.55 });
  const heights = [0, 8, 5, 11, 4, 10, 7, 12, 3, 9, 6];
  let bx = wsX + 2;
  for (const bh of heights) {
    wsG.rect(bx, wsY + 14 - bh, 4, bh).fill({ color: isDark ? 0x1a2a4a : 0x4a6a8a, alpha: 0.7 });
    bx += 6;
    if (bx > wsX + wsW - 2) break;
  }
  pLayer.addChild(wsG);

  // Standard decorations
  drawer.drawPictureFrame(pLayer, px + 14, pentY + 14);
  wallClocksRef.current.push(drawer.drawWallClock(pLayer, px + pw - 18, pentY + 12));
  drawer.drawPlant(pLayer, px + 8, pentY + ph - 18, 0);
  drawer.drawWaterCooler(pLayer, px + 28, pentY + 30);

  // Meeting hint
  if (activeMeetingTaskId) {
    const hint = new Text({
      text: pickLocale(activeLocale, LOCALE_TEXT.meetingTableHint),
      style: new TextStyle({ fontSize: 11, fill: 0x8b6b30, fontWeight: "bold", fontFamily: "system-ui, sans-serif" }),
    });
    hint.anchor.set(1, 1);
    hint.position.set(px + pw - 10, pentY + ph - 8);
    pLayer.addChild(hint);
  }

  stage.addChild(pLayer);
}
