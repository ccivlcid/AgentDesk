import type { MutableRefObject } from "react";
import { Graphics, Text, TextStyle, type AnimatedSprite, type Container, type Sprite, type Texture } from "pixi.js";
import type { MeetingPresence } from "../../types";
import {
  type Delivery,
  type RoomRect,
  type SubCloneBurstParticle,
  type WallClockVisual,
  CEO_SIZE,
  CEO_SPEED,
  SUB_CLONE_FIREWORK_INTERVAL,
  SUB_CLONE_FLOAT_DRIFT,
  SUB_CLONE_MOVE_X_AMPLITUDE,
  SUB_CLONE_MOVE_Y_AMPLITUDE,
  SUB_CLONE_WAVE_SPEED,
  TARGET_CHAR_H,
  destroyNode,
  emitSubCloneFireworkBurst,
  AGENT_BREATHE_SPEED,
  AGENT_BREATHE_Y_AMP,
  AGENT_WORK_FRAME_SPEED,
  AGENT_WORK_BOB_SPEED,
  AGENT_WORK_BOB_Y_AMP,
  AGENT_TASK_BOUNCE_DURATION,
  AGENT_TASK_BOUNCE_HEIGHT,
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
} from "./model";
import { applyWallClockTime, blendColor } from "./drawing-core";
import { DEPT_THEME, DEFAULT_BREAK_THEME, DEFAULT_CEO_THEME } from "./themes-locale";
import { updateBreakRoomAndDeliveryAnimations } from "./officeTickerRoomAndDelivery";
import {
  type VisitorTickState,
  spawnVisitor,
  updateVisitorAgents,
  MAX_VISITORS,
  SPAWN_INTERVAL,
  VISITOR_PHRASES,
} from "./visitorTick";
import type { Agent } from "../../types";
import type { SeasonalParticleState } from "./seasonal-particles";
import { updateSeasonalParticles } from "./seasonal-particles";
import type { CeoCustomization } from "./ceo-customization";
import { getTrailColors } from "./ceo-customization";
import { updateElevatorTick, type ElevatorTickState } from "./elevatorTick";
import type { ExteriorWindowVisual } from "./drawExteriorWalls";

interface AgentAnimItem {
  sprite: Container;
  status: string;
  baseX: number;
  baseY: number;
  particles: Container;
  agentId?: string;
  cliProvider?: string;
  deskG?: Container;
  bedG?: Graphics;
  blanketG?: Graphics;
  personaGlow?: Graphics;
  phase: number;
  animated?: AnimatedSprite;
  frameCount: number;
  bounceUntilTick: number;
  moodIcon?: Text;
  idleTicks: number;
}

interface SubCloneAnimItem {
  container: Container;
  aura: Graphics;
  cloneVisual: Sprite;
  animated?: AnimatedSprite;
  frameCount: number;
  baseScale: number;
  baseX: number;
  baseY: number;
  phase: number;
  fireworkOffset: number;
}

interface BreakAnimItem {
  sprite: Container;
  baseX: number;
  baseY: number;
}

interface OfficeTickerData {
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  meetingPresence?: MeetingPresence[];
  agents?: Agent[];
}

export interface OfficeTickerContext {
  tickRef: MutableRefObject<number>;
  keysRef: MutableRefObject<Record<string, boolean>>;
  ceoPosRef: MutableRefObject<{ x: number; y: number }>;
  ceoSpriteRef: MutableRefObject<Container | null>;
  crownRef: MutableRefObject<Text | null>;
  highlightRef: MutableRefObject<Graphics | null>;
  animItemsRef: MutableRefObject<AgentAnimItem[]>;
  cliUsageRef: MutableRefObject<Record<string, { windows?: Array<{ utilization: number }> }> | null>;
  roomRectsRef: MutableRefObject<RoomRect[]>;
  deliveriesRef: MutableRefObject<Delivery[]>;
  breakAnimItemsRef: MutableRefObject<BreakAnimItem[]>;
  subCloneAnimItemsRef: MutableRefObject<SubCloneAnimItem[]>;
  subCloneBurstParticlesRef: MutableRefObject<SubCloneBurstParticle[]>;
  breakSteamParticlesRef: MutableRefObject<Container | null>;
  breakBubblesRef: MutableRefObject<Container[]>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  wallClockSecondRef: MutableRefObject<number>;
  themeHighlightTargetIdRef: MutableRefObject<string | null>;
  ceoOfficeRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
  breakRoomRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
  officeWRef: MutableRefObject<number>;
  totalHRef: MutableRefObject<number>;
  dataRef: MutableRefObject<OfficeTickerData>;
  seasonalParticleRef: MutableRefObject<SeasonalParticleState | null>;
  ceoCustomizationRef: MutableRefObject<CeoCustomization>;
  ceoTrailParticlesRef: MutableRefObject<Container | null>;
  elevatorCarRef: MutableRefObject<Container | null>;
  elevatorFloorDisplayRef: MutableRefObject<Text | null>;
  elevatorDoorRef: MutableRefObject<Graphics | null>;
  elevatorStateRef: MutableRefObject<ElevatorTickState>;
  elevatorNFloorsRef: MutableRefObject<number>;
  exteriorWindowsRef: MutableRefObject<ExteriorWindowVisual[]>;
  antennaLedRef: MutableRefObject<Graphics | null>;
  elevatorFloorLedsRef: MutableRefObject<Graphics[]>;
  floorGlowsRef: MutableRefObject<Graphics[]>;
  floorSelectBoxesRef: MutableRefObject<Graphics[]>;
  selectedFloorIdxRef: MutableRefObject<number>;
  ceoVisitorAlertRef: MutableRefObject<Text | null>;
  agentPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  onSelectAgent: (agent: Agent) => void;
  visitorLayerRef: MutableRefObject<Container | null>;
  visitorTickRef: MutableRefObject<VisitorTickState | null>;
  themeRef: MutableRefObject<string>;
  texturesRef: MutableRefObject<Record<string, Texture>>;
  spriteMapRef: MutableRefObject<Map<string, number>>;
  followCeoInView: () => void;
}

export function runOfficeTickerStep(ctx: OfficeTickerContext): void {
  const tick = ++ctx.tickRef.current;
  const keys = ctx.keysRef.current;
  const ceo = ctx.ceoSpriteRef.current;
  const wallClockNow = new Date();
  const wallClockSecond = wallClockNow.getHours() * 3600 + wallClockNow.getMinutes() * 60 + wallClockNow.getSeconds();

  if (ctx.wallClockSecondRef.current !== wallClockSecond) {
    ctx.wallClockSecondRef.current = wallClockSecond;
    for (const clock of ctx.wallClocksRef.current) applyWallClockTime(clock, wallClockNow);
  }

  if (ceo) {
    let dx = 0;
    let dy = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) dx -= CEO_SPEED;
    if (keys["ArrowRight"] || keys["KeyD"]) dx += CEO_SPEED;
    if (keys["ArrowUp"] || keys["KeyW"]) dy -= CEO_SPEED;
    if (keys["ArrowDown"] || keys["KeyS"]) dy += CEO_SPEED;

    if (dx || dy) {
      ctx.ceoPosRef.current.x = Math.max(28, Math.min(ctx.officeWRef.current - 28, ctx.ceoPosRef.current.x + dx));
      ctx.ceoPosRef.current.y = Math.max(18, Math.min(ctx.totalHRef.current - 28, ctx.ceoPosRef.current.y + dy));
      ceo.position.set(ctx.ceoPosRef.current.x, ctx.ceoPosRef.current.y);
      ctx.followCeoInView();

      // CEO trail particles on movement
      const trailEffect = ctx.ceoCustomizationRef.current.trailEffect;
      if (trailEffect !== "none" && tick % 3 === 0) {
        const trailLayer = ctx.ceoTrailParticlesRef.current;
        if (trailLayer) {
          const colors = getTrailColors(trailEffect);
          const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
          const p = new Graphics();
          if (trailEffect === "hearts") {
            p.circle(-1.5, -1, 1.5).fill({ color, alpha: 0.8 });
            p.circle(1.5, -1, 1.5).fill({ color, alpha: 0.8 });
            p.moveTo(-3, -0.5).lineTo(0, 3).lineTo(3, -0.5).fill({ color, alpha: 0.7 });
          } else if (trailEffect === "fire") {
            p.ellipse(0, 0, 2, 3).fill({ color, alpha: 0.75 });
          } else {
            p.star(0, 0, trailEffect === "stars" ? 5 : 4, 2.5, 1, 0).fill({ color, alpha: 0.8 });
          }
          p.position.set(
            ctx.ceoPosRef.current.x + (Math.random() - 0.5) * 16,
            ctx.ceoPosRef.current.y + 8 + Math.random() * 8,
          );
          (p as any)._life = 0;
          trailLayer.addChild(p);
        }
      }
    }

    const crown = ctx.crownRef.current;
    if (crown) {
      crown.position.y = -30 + Math.sin(tick * 0.06) * 2;
      crown.rotation = Math.sin(tick * 0.03) * 0.06;
    }
  }

  const highlight = ctx.highlightRef.current;
  if (highlight) {
    highlight.clear();
    const activeThemeTargetId = ctx.themeHighlightTargetIdRef.current;

    if (activeThemeTargetId) {
      const pulse = 0.55 + Math.sin(tick * 0.08) * 0.2;
      let targetRect: { x: number; y: number; w: number; h: number } | null = null;
      let targetAccent = DEPT_THEME.dev.accent;

      if (activeThemeTargetId === "ceoOffice") {
        targetRect = ctx.ceoOfficeRectRef.current;
        targetAccent = ctx.dataRef.current.customDeptThemes?.ceoOffice?.accent ?? DEFAULT_CEO_THEME.accent;
      } else if (activeThemeTargetId === "breakRoom") {
        targetRect = ctx.breakRoomRectRef.current;
        targetAccent = ctx.dataRef.current.customDeptThemes?.breakRoom?.accent ?? DEFAULT_BREAK_THEME.accent;
      } else {
        const targetRoom = ctx.roomRectsRef.current.find((roomRect) => roomRect.dept.id === activeThemeTargetId);
        if (targetRoom) {
          targetRect = { x: targetRoom.x, y: targetRoom.y, w: targetRoom.w, h: targetRoom.h };
          const targetTheme =
            ctx.dataRef.current.customDeptThemes?.[activeThemeTargetId] ||
            DEPT_THEME[activeThemeTargetId] ||
            DEPT_THEME.dev;
          targetAccent = targetTheme.accent;
        }
      }

      if (targetRect) {
        highlight.roundRect(targetRect.x - 4, targetRect.y - 4, targetRect.w + 8, targetRect.h + 8, 7).stroke({
          width: 3.5,
          color: targetAccent,
          alpha: pulse,
        });
        highlight.roundRect(targetRect.x - 6, targetRect.y - 6, targetRect.w + 12, targetRect.h + 12, 9).stroke({
          width: 1.2,
          color: blendColor(targetAccent, 0xffffff, 0.22),
          alpha: 0.35 + Math.sin(tick * 0.06) * 0.08,
        });
      }
    }

    const ceoX = ctx.ceoPosRef.current.x;
    const ceoY = ctx.ceoPosRef.current.y;
    let highlighted = false;

    for (const roomRect of ctx.roomRectsRef.current) {
      if (
        ceoX >= roomRect.x &&
        ceoX <= roomRect.x + roomRect.w &&
        ceoY >= roomRect.y - 10 &&
        ceoY <= roomRect.y + roomRect.h
      ) {
        const theme =
          ctx.dataRef.current.customDeptThemes?.[roomRect.dept.id] || DEPT_THEME[roomRect.dept.id] || DEPT_THEME.dev;
        highlight.roundRect(roomRect.x - 2, roomRect.y - 2, roomRect.w + 4, roomRect.h + 4, 5).stroke({
          width: 3,
          color: theme.accent,
          alpha: 0.5 + Math.sin(tick * 0.08) * 0.2,
        });
        highlighted = true;
        break;
      }
    }

    if (!highlighted) {
      const breakRoomRect = ctx.breakRoomRectRef.current;
      if (
        breakRoomRect &&
        ceoX >= breakRoomRect.x &&
        ceoX <= breakRoomRect.x + breakRoomRect.w &&
        ceoY >= breakRoomRect.y - 10 &&
        ceoY <= breakRoomRect.y + breakRoomRect.h
      ) {
        const breakTheme = ctx.dataRef.current.customDeptThemes?.breakRoom ?? DEFAULT_BREAK_THEME;
        highlight
          .roundRect(breakRoomRect.x - 2, breakRoomRect.y - 2, breakRoomRect.w + 4, breakRoomRect.h + 4, 5)
          .stroke({
            width: 3,
            color: breakTheme.accent,
            alpha: 0.5 + Math.sin(tick * 0.08) * 0.2,
          });
      }
    }
  }

  for (const item of ctx.animItemsRef.current) {
    const { sprite, status, baseX, baseY, particles, agentId, cliProvider, deskG, bedG, blanketG, phase, animated, frameCount, moodIcon } = item;
    if (agentId) {
      const meetingNow = Date.now();
      const inMeetingPresence = (ctx.dataRef.current.meetingPresence ?? []).some((row) => {
        return row.agent_id === agentId && row.until >= meetingNow;
      });
      const inMeeting =
        inMeetingPresence || ctx.deliveriesRef.current.some((d) => d.agentId === agentId && d.holdAtSeat && d.arrived);
      sprite.visible = !inMeeting;
      if (inMeeting) continue;
    }

    sprite.position.x = baseX;
    sprite.position.y = baseY;

    // ── Mood icon update ──────────────────────────────────────────
    if (moodIcon && !moodIcon.destroyed) {
      if (status === "working") {
        item.idleTicks = 0;
        const blink = tick % 40 < 20;
        moodIcon.text = "💻";
        moodIcon.visible = blink;
      } else {
        item.idleTicks += 1;
        if (item.idleTicks > 90) {
          moodIcon.text = "💤";
          moodIcon.visible = true;
        } else {
          moodIcon.visible = false;
        }
      }
    }

    // ===== CHARACTER ANIMATION BLOCK =====
    const cliUsageForAnim = cliProvider ? ctx.cliUsageRef.current?.[cliProvider] : undefined;
    const maxUtilForAnim = cliUsageForAnim?.windows?.reduce((max: number, w: { utilization: number }) => Math.max(max, w.utilization), 0) ?? 0;
    const isInBed = maxUtilForAnim >= 1.0;

    if (!isInBed) {
      const wave = tick * AGENT_BREATHE_SPEED + phase;

      // Breathing Y-axis bob (all visible agents)
      sprite.position.y = baseY + Math.sin(wave) * AGENT_BREATHE_Y_AMP;

      if (status === "working") {
        // Frame cycling (D-1 ↔ D-2 ↔ D-3)
        if (animated && frameCount > 1) {
          const workWave = tick * AGENT_WORK_FRAME_SPEED + phase;
          const frameFloat = (Math.sin(workWave * 2.8) + 1) * 0.5 * frameCount;
          const frame = Math.min(frameCount - 1, Math.floor(frameFloat));
          animated.gotoAndStop(frame);
        }
        // Typing bob (Y-axis only)
        const typingWave = tick * AGENT_WORK_BOB_SPEED + phase;
        sprite.position.y += Math.sin(typingWave) * AGENT_WORK_BOB_Y_AMP;
      }

      // Task reception bounce
      if (item.bounceUntilTick > 0 && tick <= item.bounceUntilTick) {
        const bounceProgress = 1 - (item.bounceUntilTick - tick) / AGENT_TASK_BOUNCE_DURATION;
        sprite.position.y -= Math.sin(bounceProgress * Math.PI) * AGENT_TASK_BOUNCE_HEIGHT;
      }
    }

    // Bounce trigger: detect arriving delivery for this agent
    if (agentId && item.bounceUntilTick <= tick) {
      for (const d of ctx.deliveriesRef.current) {
        if (d.agentId === agentId && d.progress > 0.85 && d.progress < 1 && !d.holdAtSeat) {
          item.bounceUntilTick = tick + AGENT_TASK_BOUNCE_DURATION;
          break;
        }
      }
    }
    // ===== END CHARACTER ANIMATION BLOCK =====

    // Persona glow pulse — soft amber aura behind agents with a persona
    if (item.personaGlow && !item.personaGlow.destroyed) {
      const pulseAlpha = (0.12 + Math.sin(tick * 0.05 + item.phase) * 0.08) * (status === "working" ? 1.4 : 0.7);
      item.personaGlow.clear();
      item.personaGlow.circle(baseX, baseY - 26, 18).fill({ color: 0xf59e0b, alpha: Math.max(0, pulseAlpha) });
    }

    if (status === "working") {
      if (tick % 10 === 0) {
        const particle = new Graphics();
        const colors = [0x55aaff, 0x55ff88, 0xffaa33, 0xff5577, 0xaa77ff];
        particle.star(0, 0, 4, 2, 1, 0).fill(colors[Math.floor(Math.random() * colors.length)]);
        particle.position.set(baseX + (Math.random() - 0.5) * 24, baseY - 16 - Math.random() * 8);
        (particle as any)._vy = -0.4 - Math.random() * 0.3;
        (particle as any)._life = 0;
        particles.addChild(particle);
      }

      for (let i = particles.children.length - 1; i >= 0; i--) {
        const particle = particles.children[i] as any;
        if (particle._sweat) continue;
        particle._life++;
        particle.position.y += particle._vy ?? -0.4;
        particle.position.x += Math.sin(particle._life * 0.2) * 0.2;
        particle.alpha = Math.max(0, 1 - particle._life * 0.03);
        particle.scale.set(Math.max(0.1, 1 - particle._life * 0.02));
        if (particle._life > 35) {
          particles.removeChild(particle);
          particle.destroy();
        }
      }
    }

    if (cliProvider) {
      const usage = ctx.cliUsageRef.current?.[cliProvider];
      const maxUtil = usage?.windows?.reduce((max, window) => Math.max(max, window.utilization), 0) ?? 0;
      const isOfflineAgent = status === "offline";

      if (maxUtil >= 1.0) {
        const bedCenterX = baseX;
        const bedCenterY = baseY - 8 + 18;
        const headX = bedCenterX - TARGET_CHAR_H / 2 + 6;
        sprite.rotation = -Math.PI / 2;
        sprite.position.set(headX + TARGET_CHAR_H - 6, bedCenterY);
        sprite.alpha = 0.85;
        const child0 = sprite.children[0];
        if (child0 && "tint" in child0) (child0 as any).tint = 0xff6666;
        if (deskG) deskG.visible = false;

        if (bedG) {
          bedG.visible = true;
          const room = sprite.parent;
          if (room) {
            room.removeChild(sprite);
            const bedIndex = room.children.indexOf(bedG);
            room.addChildAt(sprite, bedIndex + 1);
          }
        }

        if (blanketG) {
          blanketG.visible = true;
          const room = sprite.parent;
          if (room) {
            room.removeChild(blanketG);
            const spriteIndex = room.children.indexOf(sprite);
            room.addChildAt(blanketG, spriteIndex + 1);
          }
        }

        if (tick % 40 === 0) {
          const star = new Graphics();
          star.star(0, 0, 5, 3, 1.5, 0).fill({ color: 0xffdd44, alpha: 0.8 });
          star.position.set(headX, bedCenterY - 22);
          (star as any)._sweat = true;
          (star as any)._dizzy = true;
          (star as any)._offset = Math.random() * Math.PI * 2;
          (star as any)._life = 0;
          particles.addChild(star);
        }

        if (tick % 80 === 0) {
          const sleepy = new Text({
            text: "z",
            style: new TextStyle({ fontSize: 7 + Math.random() * 3, fill: 0xaaaacc, fontFamily: "monospace" }),
          });
          sleepy.anchor.set(0.5, 0.5);
          sleepy.position.set(headX + 6, bedCenterY - 18);
          (sleepy as any)._sweat = true;
          (sleepy as any)._life = 0;
          particles.addChild(sleepy);
        }
      } else if (maxUtil >= 0.8) {
        sprite.rotation = 0;
        sprite.alpha = 1;
        const child0 = sprite.children[0];
        if (child0 && "tint" in child0) (child0 as any).tint = 0xff9999;
        if (deskG) deskG.visible = true;
        if (bedG) bedG.visible = false;
        if (blanketG) blanketG.visible = false;

        if (tick % 40 === 0) {
          const drop = new Graphics();
          drop
            .moveTo(0, 0)
            .lineTo(-1.8, 4)
            .quadraticCurveTo(0, 6.5, 1.8, 4)
            .lineTo(0, 0)
            .fill({ color: 0x7ec8e3, alpha: 0.85 });
          drop.circle(0, 3.8, 1.2).fill({ color: 0xbde4f4, alpha: 0.5 });
          drop.position.set(baseX + 8, baseY - 36);
          (drop as any)._sweat = true;
          (drop as any)._life = 0;
          particles.addChild(drop);
        }
      } else if (maxUtil >= 0.6) {
        sprite.rotation = 0;
        sprite.alpha = 1;
        const child0 = sprite.children[0];
        if (child0 && "tint" in child0) (child0 as any).tint = 0xffffff;
        if (deskG) deskG.visible = true;
        if (bedG) bedG.visible = false;
        if (blanketG) blanketG.visible = false;

        if (tick % 55 === 0) {
          const drop = new Graphics();
          drop
            .moveTo(0, 0)
            .lineTo(-1.8, 4)
            .quadraticCurveTo(0, 6.5, 1.8, 4)
            .lineTo(0, 0)
            .fill({ color: 0x7ec8e3, alpha: 0.85 });
          drop.circle(0, 3.8, 1.2).fill({ color: 0xbde4f4, alpha: 0.5 });
          drop.position.set(baseX + 8, baseY - 36);
          (drop as any)._sweat = true;
          (drop as any)._life = 0;
          particles.addChild(drop);
        }
      } else {
        sprite.rotation = 0;
        sprite.alpha = isOfflineAgent ? 0.3 : 1;
        const child0 = sprite.children[0];
        if (child0 && "tint" in child0) (child0 as any).tint = isOfflineAgent ? 0x888899 : 0xffffff;
        if (deskG) deskG.visible = true;
        if (bedG) bedG.visible = false;
        if (blanketG) blanketG.visible = false;
      }

      for (let i = particles.children.length - 1; i >= 0; i--) {
        const particle = particles.children[i] as any;
        if (!particle._sweat) continue;
        particle._life++;

        if (particle._dizzy) {
          const headPX = baseX - TARGET_CHAR_H / 2 + 10;
          const bedCenterY = baseY - 8 + 18;
          const angle = tick * 0.08 + particle._offset;
          particle.position.x = headPX + Math.cos(angle) * 14;
          particle.position.y = bedCenterY - 22 + Math.sin(angle * 0.7) * 4;
          particle.alpha = 0.7 + Math.sin(tick * 0.1) * 0.3;
        } else {
          particle.position.y += 0.45;
          particle.position.x += Math.sin(particle._life * 0.15) * 0.15;
          particle.alpha = Math.max(0, 0.85 - particle._life * 0.022);
        }

        if (particle._life > 38) {
          particles.removeChild(particle);
          particle.destroy();
        }
      }
    }
  }

  for (const clone of ctx.subCloneAnimItemsRef.current) {
    const wave = tick * SUB_CLONE_WAVE_SPEED + clone.phase;
    const driftX =
      Math.sin(wave * 0.7) * SUB_CLONE_MOVE_X_AMPLITUDE +
      Math.cos(wave * 0.38 + clone.phase * 0.6) * SUB_CLONE_FLOAT_DRIFT;
    const driftY =
      Math.sin(wave * 0.95) * SUB_CLONE_MOVE_Y_AMPLITUDE +
      Math.cos(wave * 0.52 + clone.phase) * (SUB_CLONE_FLOAT_DRIFT * 0.65);
    clone.container.position.x = clone.baseX + driftX;
    clone.container.position.y = clone.baseY + driftY;
    clone.aura.alpha = 0.1 + (Math.sin(wave * 0.9) + 1) * 0.06;
    clone.cloneVisual.alpha = 0.9 + Math.max(0, Math.sin(wave * 1.9)) * 0.08;
    clone.cloneVisual.rotation = Math.sin(wave * 1.45 + clone.phase) * 0.045;
    const scalePulse = clone.baseScale * (1 + Math.sin(wave * 1.7) * 0.01);
    clone.cloneVisual.scale.set(scalePulse);

    if (clone.animated && clone.frameCount > 1) {
      const frameFloat = (Math.sin(wave * 2.8) + 1) * 0.5 * clone.frameCount;
      const frame = Math.min(clone.frameCount - 1, Math.floor(frameFloat));
      clone.animated.gotoAndStop(frame);
    }

    if ((tick + clone.fireworkOffset) % SUB_CLONE_FIREWORK_INTERVAL === 0) {
      const room = clone.container.parent as Container | null;
      if (room) {
        emitSubCloneFireworkBurst(
          room,
          ctx.subCloneBurstParticlesRef.current,
          clone.container.position.x,
          clone.container.position.y - 24,
        );
      }
    }
  }

  const burstParticles = ctx.subCloneBurstParticlesRef.current;
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    const particle = burstParticles[i];
    particle.life += 1;
    particle.node.position.x += particle.vx;
    particle.node.position.y += particle.vy;
    particle.node.rotation += particle.spin;
    particle.node.scale.set(particle.node.scale.x + particle.growth, particle.node.scale.y + particle.growth);
    particle.node.alpha = Math.max(0, 1 - particle.life / particle.maxLife);

    if (particle.life >= particle.maxLife || particle.node.destroyed) {
      destroyNode(particle.node);
      burstParticles.splice(i, 1);
    }
  }

  updateBreakRoomAndDeliveryAnimations(
    {
      breakAnimItemsRef: ctx.breakAnimItemsRef,
      breakSteamParticlesRef: ctx.breakSteamParticlesRef,
      breakRoomRectRef: ctx.breakRoomRectRef,
      breakBubblesRef: ctx.breakBubblesRef,
      deliveriesRef: ctx.deliveriesRef,
    },
    tick,
  );

  // CEO trail particle cleanup
  const trailLayer = ctx.ceoTrailParticlesRef.current;
  if (trailLayer) {
    for (let i = trailLayer.children.length - 1; i >= 0; i--) {
      const p = trailLayer.children[i] as any;
      p._life++;
      p.position.y -= 0.5;
      p.alpha = Math.max(0, 0.8 - p._life * 0.04);
      p.scale.set(Math.max(0.1, 1 - p._life * 0.03));
      if (p._life > 25) {
        trailLayer.removeChild(p);
        p.destroy();
      }
    }
  }

  // Seasonal particle animation
  if (ctx.seasonalParticleRef.current) {
    updateSeasonalParticles(ctx.seasonalParticleRef.current, tick);
  }

  // Elevator animation
  updateElevatorTick(
    ctx.elevatorStateRef,
    ctx.elevatorCarRef,
    ctx.elevatorFloorDisplayRef,
    ctx.elevatorNFloorsRef,
    ctx.elevatorDoorRef,
  );

  // Elevator floor LED indicators — amber=elevator here, green=agents working, dim=idle
  const floorLeds = ctx.elevatorFloorLedsRef.current;
  if (floorLeds.length > 0) {
    const currentFloor = ctx.elevatorStateRef.current.floorIndex;
    const nFloors = ctx.elevatorNFloorsRef.current;
    const pulse = 0.7 + Math.sin(tick * 0.15) * 0.3;

    // Build a set of floor indices that have working agents
    const activeFloors = new Set<number>();
    const agents = ctx.dataRef.current.agents ?? [];
    const posMap = ctx.agentPosRef.current;
    for (const agent of agents) {
      if (agent.status !== "working") continue;
      const pos = posMap.get(agent.id);
      if (!pos) continue;
      const confBottom = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H;
      const basementStart = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
      let floorIdx: number;
      if (pos.y < confBottom) floorIdx = 0;
      else if (pos.y >= basementStart) floorIdx = nFloors + 1;
      else floorIdx = Math.min(nFloors, Math.max(1, Math.floor((pos.y - confBottom) / FLOOR_TOTAL_H) + 1));
      activeFloors.add(floorIdx);
    }

    for (let li = 0; li < floorLeds.length; li++) {
      const led = floorLeds[li];
      if (!led || led.destroyed) continue;
      if (li === currentFloor) {
        led.tint = 0xf59e0b;
        led.alpha = pulse;
      } else if (activeFloors.has(li)) {
        led.tint = 0x22c55e;
        led.alpha = 0.45 + Math.sin(tick * 0.08 + li * 1.2) * 0.15;
      } else {
        led.tint = 0xffffff;
        led.alpha = 0.10;
      }
    }

    // Floor activity glow overlays — subtle green/amber tint when agents work
    const selectedFloorIdx = ctx.selectedFloorIdxRef.current; // 1-based, 0=none
    const floorGlows = ctx.floorGlowsRef.current;
    for (let gi = 0; gi < floorGlows.length; gi++) {
      const glow = floorGlows[gi];
      if (!glow || glow.destroyed) continue;
      const floorIdxForGlow = gi + 1; // glow 0 = dept floor 1
      const isActive = activeFloors.has(floorIdxForGlow);
      const isSelected = selectedFloorIdx === floorIdxForGlow;
      const targetAlpha = isSelected
        ? 0.10 + Math.sin(tick * 0.06) * 0.03
        : isActive
          ? 0.06 + Math.sin(tick * 0.045 + gi * 0.9) * 0.02
          : 0;
      glow.alpha += (targetAlpha - glow.alpha) * 0.035; // smooth lerp
      glow.tint = isSelected ? 0xf59e0b : isActive ? 0x22c55e : 0xffffff;
    }
  }

  // Floor selection boxes — amber outline on the selected dept floor
  const selectedFloorIdx = ctx.selectedFloorIdxRef.current;
  const selBoxes = ctx.floorSelectBoxesRef.current;
  for (let si = 0; si < selBoxes.length; si++) {
    const box = selBoxes[si];
    if (!box || box.destroyed) continue;
    const isSelected = (si + 1) === selectedFloorIdx;
    const targetAlpha = isSelected ? (0.75 + Math.sin(tick * 0.1) * 0.2) : 0;
    box.alpha += (targetAlpha - box.alpha) * 0.15;
  }

  // CEO visitor alert — blink amber text in penthouse when visitor is inbound
  const ceoAlert = ctx.ceoVisitorAlertRef.current;
  if (ceoAlert && !ceoAlert.destroyed) {
    const visitorTick2 = ctx.visitorTickRef.current;
    const hasCeoVisitor = visitorTick2?.visitors.some(
      (v) => v.destFloor === 0 && (
        v.phase === "walk_to_elev" || v.phase === "fading_out" ||
        v.phase === "in_elev" || v.phase === "fading_in" ||
        v.phase === "walk_to_dest" || v.phase === "at_dest"
      ),
    ) ?? false;
    if (hasCeoVisitor) {
      // Fast blink: on 20t / off 10t cycle
      const blinkPhase = tick % 30;
      ceoAlert.alpha = blinkPhase < 20 ? 0.9 : 0;
    } else {
      ceoAlert.alpha = Math.max(0, ceoAlert.alpha - 0.05);
    }
  }

  // Antenna LED blink — 3-frame cycle: on(30t) → dim(10t) → off(10t)
  const led = ctx.antennaLedRef.current;
  if (led && !led.destroyed) {
    const phase = tick % 50;
    led.alpha = phase < 30 ? 1 : phase < 40 ? 0.3 : 0;
  }

  // ── Visitor agent system (inter-dept movement) ───────────────
  const visitorTick = ctx.visitorTickRef.current;
  const visitorLayer = ctx.visitorLayerRef.current;
  if (visitorTick && visitorLayer && !visitorLayer.destroyed) {
    const nFloors = ctx.elevatorNFloorsRef.current;
    // Sync phrase pool from CEO greetings customization
    const customGreetings = ctx.ceoCustomizationRef.current?.greetings;
    if (Array.isArray(customGreetings) && customGreetings.length > 0) {
      visitorTick.phrasePool = customGreetings;
    } else {
      visitorTick.phrasePool = VISITOR_PHRASES;
    }
    // Tick spawn cooldown
    if (visitorTick.spawnCooldown > 0) {
      visitorTick.spawnCooldown--;
    } else if (visitorTick.visitors.length < MAX_VISITORS) {
      const agents = ctx.dataRef.current.agents ?? [];
      if (agents.length > 0) {
        const isDark = ctx.themeRef.current === "dark";
        spawnVisitor(visitorTick, visitorLayer, agents, ctx.agentPosRef, nFloors, isDark, ctx.onSelectAgent, ctx.texturesRef.current, ctx.spriteMapRef.current);
        visitorTick.spawnCooldown = SPAWN_INTERVAL + Math.floor(Math.random() * 120);
      }
    }
    updateVisitorAgents(visitorTick, ctx.elevatorStateRef, nFloors, tick);
  }

  // Exterior window flicker — floor-aware: active floors stay lit, idle floors dim
  if (tick % 60 === 0) {
    const activeFloors = new Set([ctx.selectedFloorIdxRef.current]);
    const wins = ctx.exteriorWindowsRef.current;
    if (wins.length > 0) {
      const target = wins[Math.floor(Math.random() * wins.length)];
      if (!target.g.destroyed) {
        // Active floor windows prefer to stay lit; idle floors prefer dark
        const floorActive = activeFloors.has(target.floorIdx);
        const litThreshold = floorActive ? 0.75 : 0.30;
        target.isLit = Math.random() < litThreshold;
        target.g.clear();
        target.g.rect(target.wx, target.wy, 4, 6).fill(target.isLit ? target.litColor : target.darkColor);
        target.g.rect(target.wx, target.wy, 4, 6).stroke({ width: 0.5, color: target.strokeColor, alpha: 0.6 });
        if (target.isLit) {
          target.g.rect(target.wx + 1, target.wy + 2, 2, 1).fill({ color: 0xffffff, alpha: 0.2 });
        }
      }
    }
  }
}
