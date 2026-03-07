import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FLOOR_W, WALL_W, ELEVATOR_W, CONFERENCE_FLOOR_H } from "./model";
import { LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  drawAmbientGlow,
  drawRoomAtmosphere,
  drawTiledFloor,
  hashStr,
} from "./drawing-core";
import type { FurnitureDrawer } from "./drawing-styles";
import type { Agent } from "../../types";

const ATTENDEE_COLORS = [0x60a5fa, 0x34d399, 0xfbbf24, 0xf87171, 0xa78bfa, 0x38bdf8];

const CONF_THEME = {
  floor1: 0x1a1a2e,
  floor2: 0x16213e,
  wall: 0x1a2340,
  accent: 0xf59e0b,
};

interface DrawConferenceFloorParams {
  stage: Container;
  drawer: FurnitureDrawer;
  confY: number;
  isDark: boolean;
  activeLocale: SupportedLocale;
  activeMeetingTaskId: string | null;
  onOpenActiveMeetingMinutes?: ((taskId: string) => void) | null;
  meetingPresence?: Array<{ agent_id: string; until: number }>;
  agents?: Agent[];
}

export function drawConferenceFloor({
  stage,
  drawer,
  confY,
  isDark,
  activeLocale,
  activeMeetingTaskId,
  onOpenActiveMeetingMinutes,
  meetingPresence,
  agents,
}: DrawConferenceFloorParams): void {
  const cx = WALL_W;
  const cw = FLOOR_W - ELEVATOR_W - WALL_W * 2;
  const ch = CONFERENCE_FLOOR_H;

  const layer = new Container();

  // Floor & atmosphere
  const floorG = new Graphics();
  drawTiledFloor(floorG, cx, confY, cw, ch, CONF_THEME.floor1, CONF_THEME.floor2);
  layer.addChild(floorG);
  drawRoomAtmosphere(layer, cx, confY, cw, ch, CONF_THEME.wall, CONF_THEME.accent);
  drawAmbientGlow(layer, cx + cw / 2, confY + ch / 2, cw * 0.45, CONF_THEME.accent, 0.06);

  // Border + amber left accent bar
  const borderG = new Graphics();
  borderG.rect(cx, confY, cw, ch).stroke({ width: 1, color: blendColor(CONF_THEME.wall, CONF_THEME.accent, 0.4) });
  borderG.rect(cx, confY, 3, ch).fill({ color: CONF_THEME.accent, alpha: 0.55 });
  borderG.rect(cx, confY, cw, 1).fill({ color: CONF_THEME.accent, alpha: 0.4 });
  borderG.rect(cx, confY + ch - 2, cw, 2).fill({ color: CONF_THEME.accent, alpha: 0.5 });
  layer.addChild(borderG);

  // ── Wall structural detail layers ────────────────────────────────
  const detailG = new Graphics();
  // Ceiling cornice
  detailG.rect(cx + 3, confY, cw - 3, 5).fill({ color: blendColor(CONF_THEME.wall, 0x000000, 0.45), alpha: 0.75 });
  detailG.rect(cx + 3, confY + 5, cw - 3, 1).fill({ color: blendColor(CONF_THEME.wall, 0xffffff, 0.18), alpha: 0.4 });
  // Cable conduit (double — executive/meeting space)
  const condY = confY + 8;
  detailG.rect(cx + 12, condY, cw - 24, 3).fill({ color: blendColor(CONF_THEME.wall, 0x000000, 0.55), alpha: 0.7 });
  detailG.rect(cx + 12, condY, cw - 24, 1).fill({ color: blendColor(CONF_THEME.wall, 0xffffff, 0.2), alpha: 0.4 });
  // Clips
  for (let cx2 = cx + 24; cx2 < cx + cw - 14; cx2 += 26) {
    detailG.rect(cx2, condY - 1, 4, 6).fill({ color: blendColor(CONF_THEME.wall, 0xffffff, 0.12), alpha: 0.5 });
  }
  // Amber LED strip along conduit
  for (let lx2 = cx + 16; lx2 < cx + cw - 14; lx2 += 8) {
    detailG.rect(lx2, condY + 4, 2, 1).fill({ color: CONF_THEME.accent, alpha: 0.3 });
  }
  // Dado rail at 40% room height
  const dadoY = confY + Math.floor(ch * 0.40);
  detailG.rect(cx + 3, dadoY, cw - 3, 2).fill({ color: blendColor(CONF_THEME.wall, 0x000000, 0.35), alpha: 0.65 });
  detailG.rect(cx + 3, dadoY, cw - 3, 1).fill({ color: CONF_THEME.accent, alpha: 0.22 });
  detailG.rect(cx + 3, dadoY + 2, cw - 3, 1).fill({ color: blendColor(CONF_THEME.wall, 0xffffff, 0.12), alpha: 0.3 });
  // Baseboard
  detailG.rect(cx + 3, confY + ch - 4, cw - 3, 4).fill({ color: blendColor(CONF_THEME.wall, 0x000000, 0.52), alpha: 0.7 });
  detailG.rect(cx + 3, confY + ch - 4, cw - 3, 1).fill({ color: CONF_THEME.accent, alpha: 0.15 });
  layer.addChild(detailG);

  // Room sign
  const signW = 110;
  const signBg = new Graphics();
  signBg.rect(cx + 3, confY - 1, signW, 13).fill({ color: 0x000000, alpha: isDark ? 0.7 : 0.55 });
  signBg.rect(cx + 3, confY + 12, signW, 1).fill({ color: CONF_THEME.accent, alpha: 0.5 });
  layer.addChild(signBg);

  const signTxt = new Text({
    text: pickLocale(activeLocale, LOCALE_TEXT.conferenceRoom ?? { ko: "회의실", en: "CONFERENCE", ja: "会議室", zh: "会议室" }),
    style: new TextStyle({ fontSize: 7, fill: CONF_THEME.accent, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 1 }),
  });
  signTxt.anchor.set(0, 0.5);
  signTxt.position.set(cx + 6, confY + 5);
  layer.addChild(signTxt);

  // Meeting status badge
  const isMeeting = Boolean(activeMeetingTaskId);
  const statusBadge = new Graphics();
  const badgeColor = isMeeting ? 0x22c55e : 0x374151;
  statusBadge.rect(cx + signW + 8, confY + 1, isMeeting ? 52 : 40, 10).fill({ color: badgeColor, alpha: 0.9 });
  layer.addChild(statusBadge);
  const statusTxt = new Text({
    text: isMeeting ? "● IN MEETING" : "○ STANDBY",
    style: new TextStyle({ fontSize: 6, fill: isMeeting ? 0xffffff : 0x6b7280, fontFamily: "monospace", letterSpacing: 1 }),
  });
  statusTxt.anchor.set(0, 0.5);
  statusTxt.position.set(cx + signW + 10, confY + 6);
  layer.addChild(statusTxt);

  // Ceiling light
  drawer.drawCeilingLight(layer, cx + cw / 2, confY + 10, CONF_THEME.accent);
  drawer.drawWallClock(layer, cx + cw - 16, confY + 10);

  // Conference table — centered, fills most of room width
  const tableW = Math.min(cw - 60, 280);
  const tableH = 32;
  const tableX = cx + (cw - tableW) / 2;
  const tableY = confY + ch / 2 - tableH / 2 + 6;
  const tableEdge = isDark ? 0x0c1018 : 0x1a2030;
  const tableTop = isDark ? 0x111820 : 0x22304a;
  const inlayColor = isDark ? 0x1a2838 : 0x3a4858;

  const tableG = new Graphics();
  tableG.rect(tableX, tableY, tableW, tableH).fill(tableEdge);
  tableG.rect(tableX + 2, tableY + 2, tableW - 4, tableH - 4).fill(tableTop);
  // Center inlay strip
  tableG.rect(tableX + tableW / 4, tableY + tableH / 2 - 1, tableW / 2, 2)
    .fill({ color: CONF_THEME.accent, alpha: 0.35 });
  // Subtle grid lines on table surface
  for (let xi = 1; xi < 5; xi++) {
    tableG.rect(tableX + (tableW / 5) * xi, tableY + 2, 0.5, tableH - 4)
      .fill({ color: inlayColor, alpha: 0.4 });
  }
  if (isMeeting && activeMeetingTaskId && onOpenActiveMeetingMinutes) {
    tableG.eventMode = "static";
    tableG.cursor = "pointer";
    tableG.on("pointerdown", () => {
      if (activeMeetingTaskId) onOpenActiveMeetingMinutes(activeMeetingTaskId);
    });
  }
  layer.addChild(tableG);

  // Table label
  const tableLbl = new Text({
    text: isMeeting ? "[ MEETING IN PROGRESS ]" : "[ CONF TABLE ]",
    style: new TextStyle({ fontSize: 6, fill: isDark ? 0xf59e0b : 0xa07020, fontFamily: "monospace", letterSpacing: 2 }),
  });
  tableLbl.anchor.set(0.5, 0.5);
  tableLbl.position.set(tableX + tableW / 2, tableY + tableH / 2);
  layer.addChild(tableLbl);

  // Chairs — top and bottom rows
  const nChairsTop = Math.floor(tableW / 45);
  const nChairsBot = nChairsTop;
  const chairColor = isDark ? 0x1a2030 : 0x2a3850;
  for (let i = 0; i < nChairsTop; i++) {
    const sx = tableX + (tableW / (nChairsTop + 1)) * (i + 1);
    drawer.drawChair(layer, sx, tableY - 2, chairColor);
    if (i < nChairsBot) {
      drawer.drawChair(layer, sx, tableY + tableH + 12, chairColor);
    }
  }

  // ── Meeting attendees ─────────────────────────────────────────
  if (isMeeting && agents && meetingPresence && meetingPresence.length > 0) {
    const attendeeIds = meetingPresence.map((mp) => mp.agent_id);
    const totalSeats = (nChairsTop + nChairsBot);

    for (let seatIdx = 0; seatIdx < Math.min(totalSeats, 8); seatIdx++) {
      const agentId = attendeeIds[seatIdx];
      if (!agentId) continue;
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) continue;

      const isTop = seatIdx < nChairsTop;
      const localIdx = isTop ? seatIdx : seatIdx - nChairsTop;
      const totalInRow = isTop ? nChairsTop : nChairsBot;
      const sx = tableX + (tableW / (totalInRow + 1)) * (localIdx + 1);
      const chairCenterY = isTop ? tableY - 2 : tableY + tableH + 12;

      const color = ATTENDEE_COLORS[hashStr(agent.id) % ATTENDEE_COLORS.length];
      const bodyColor = blendColor(color, 0x000000, 0.2);
      const figureG = new Graphics();

      if (isTop) {
        // Seated above table — body above chair, head above body
        const headY = chairCenterY - 17;
        figureG.rect(sx - 4, headY + 5, 8, 7).fill({ color: bodyColor, alpha: 0.85 });
        figureG.circle(sx, headY, 5).fill({ color, alpha: 0.92 });
        figureG.circle(sx - 1.5, headY - 0.5, 0.9).fill({ color: 0x000000, alpha: 0.55 });
        figureG.circle(sx + 1.5, headY - 0.5, 0.9).fill({ color: 0x000000, alpha: 0.55 });
        layer.addChild(figureG);
        const lbl = new Text({ text: (agent.name ?? "?").slice(0, 5), style: new TextStyle({ fontSize: 5, fill: 0xffffff, fontFamily: "monospace", align: "center" }) });
        lbl.anchor.set(0.5, 1);
        lbl.position.set(sx, headY - 7);
        layer.addChild(lbl);
      } else {
        // Seated below table — body below chair, head below body
        const headY = chairCenterY + 19;
        figureG.rect(sx - 4, headY - 12, 8, 7).fill({ color: bodyColor, alpha: 0.85 });
        figureG.circle(sx, headY, 5).fill({ color, alpha: 0.92 });
        figureG.circle(sx - 1.5, headY - 0.5, 0.9).fill({ color: 0x000000, alpha: 0.55 });
        figureG.circle(sx + 1.5, headY - 0.5, 0.9).fill({ color: 0x000000, alpha: 0.55 });
        layer.addChild(figureG);
        const lbl = new Text({ text: (agent.name ?? "?").slice(0, 5), style: new TextStyle({ fontSize: 5, fill: 0xffffff, fontFamily: "monospace", align: "center" }) });
        lbl.anchor.set(0.5, 0);
        lbl.position.set(sx, headY + 7);
        layer.addChild(lbl);
      }
    }

    // Extra amber glow on table while meeting is live
    drawAmbientGlow(layer, tableX + tableW / 2, tableY + tableH / 2, tableW * 0.38, CONF_THEME.accent, 0.10);
  }

  // Plants on corners
  drawer.drawPlant(layer, cx + 8, confY + ch - 14, 2);
  drawer.drawPlant(layer, cx + cw - 18, confY + ch - 14, 3);

  // Whiteboard on right wall
  drawer.drawWhiteboard(layer, cx + cw - 52, confY + 14);

  // Hallway strip below
  const hallY = confY + ch;
  const hallG = new Graphics();
  const hallBase = isDark ? 0x181825 : 0x1a2030;
  hallG.rect(cx, hallY, cw, 8).fill(hallBase);
  hallG.rect(cx, hallY + 7, cw, 1).fill({ color: CONF_THEME.accent, alpha: 0.4 });
  stage.addChild(hallG);

  stage.addChild(layer);
}
