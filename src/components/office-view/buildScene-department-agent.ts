import type { MutableRefObject } from "react";
import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";
import type { Agent, SubAgent, Task } from "../../types";
import type { AnimItem, CallbackSnapshot, SubCloneAnimItem } from "./buildScene-types";
import {
  DESK_W,
  MAX_VISIBLE_SUB_CLONES_PER_AGENT,
  SUB_CLONE_FIREWORK_INTERVAL,
  TARGET_CHAR_H,
  type SubCloneBurstParticle,
  emitSubCloneFireworkBurst,
  emitSubCloneSmokeBurst,
} from "./model";
import { hashStr } from "./drawing-core";
import type { FurnitureDrawer } from "./drawing-styles";

interface RenderDeskAgentAndSubClonesParams {
  room: Container;
  drawer: FurnitureDrawer;
  textures: Record<string, Texture>;
  spriteMap: Map<string, number>;
  agent: Agent;
  tasks: Task[];
  subAgents: SubAgent[];
  ax: number;
  deskY: number;
  charFeetY: number;
  isWorking: boolean;
  isOffline: boolean;
  cbRef: MutableRefObject<CallbackSnapshot>;
  animItemsRef: MutableRefObject<AnimItem[]>;
  subCloneAnimItemsRef: MutableRefObject<SubCloneAnimItem[]>;
  subCloneBurstParticlesRef: MutableRefObject<SubCloneBurstParticle[]>;
  addedWorkingSubIds: Set<string>;
  nextSubSnapshot: Map<string, { parentAgentId: string; x: number; y: number }>;
  themeAccent: number;
}

export function renderDeskAgentAndSubClones({
  room,
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
  themeAccent,
}: RenderDeskAgentAndSubClonesParams): void {
  const spriteNum = spriteMap.get(agent.id) ?? (hashStr(agent.id) % 13) + 1;
  const charContainer = new Container();
  charContainer.position.set(ax, charFeetY);
  charContainer.eventMode = "static";
  charContainer.cursor = "pointer";
  charContainer.on("pointerdown", () => cbRef.current.onSelectAgent(agent));

  const frames: Texture[] = [];
  for (let frame = 1; frame <= 3; frame++) {
    const key = `${spriteNum}-D-${frame}`;
    if (textures[key]) frames.push(textures[key]);
  }

  let animSpriteRef: AnimatedSprite | undefined;
  if (frames.length > 0) {
    const animSprite = new AnimatedSprite(frames);
    animSprite.anchor.set(0.5, 1);
    const scale = TARGET_CHAR_H / animSprite.texture.height;
    animSprite.scale.set(scale);
    animSprite.gotoAndStop(0);
    if (isOffline) {
      animSprite.alpha = 0.3;
      animSprite.tint = 0x888899;
    } else {
      // Subtle cool tint to harmonize with terminal palette
      animSprite.tint = 0xd8e8ff;
    }
    charContainer.addChild(animSprite);
    animSpriteRef = animSprite;
  } else {
    const fallback = new Text({ text: agent.avatar_emoji || "🤖", style: new TextStyle({ fontSize: 24 }) });
    fallback.anchor.set(0.5, 1);
    charContainer.addChild(fallback);
  }
  room.addChild(charContainer);

  const deskG = drawer.drawDesk(room, ax - DESK_W / 2, deskY, isWorking);

  const bedW = TARGET_CHAR_H + 20;
  const bedH = 36;
  const bedX = ax - bedW / 2;
  const bedY = deskY;

  const bedG = new Graphics();
  // Terminal rest pod — dark metal chassis
  bedG.rect(bedX, bedY, bedW, bedH).fill(0x0c0e14);
  bedG.rect(bedX, bedY, bedW, bedH).stroke({ width: 0.6, color: 0x2a3048 });
  bedG.rect(bedX, bedY, 2, bedH).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Pillow zone — terminal scan area
  bedG.rect(bedX + 3, bedY + 3, 20, bedH - 6).fill(0x141820);
  bedG.circle(bedX + 13, bedY + bedH / 2, 7).fill({ color: 0x1a2838, alpha: 0.8 });
  bedG.circle(bedX + 13, bedY + bedH / 2, 4).fill({ color: 0x22cc88, alpha: 0.12 });
  bedG.visible = false;
  room.addChild(bedG);

  const blanketG = new Graphics();
  const blanketX = bedX + bedW * 0.35;
  const blanketW = bedW * 0.62;
  // Rest module cover — dark panel with scan lines
  blanketG.rect(blanketX, bedY + 2, blanketW, bedH - 4).fill(0x141820);
  blanketG.rect(blanketX, bedY + 2, blanketW, bedH - 4).stroke({ width: 0.5, color: 0x2a3048 });
  for (let ly = 4; ly < bedH - 4; ly += 4) {
    blanketG.rect(blanketX + 1, bedY + ly, blanketW - 2, 1).fill({ color: 0x22cc88, alpha: 0.04 });
  }
  blanketG.rect(blanketX + 2, bedY + bedH / 2 - 0.5, blanketW - 4, 1).fill({ color: 0x22cc88, alpha: 0.2 });
  blanketG.visible = false;
  room.addChild(blanketG);

  // Persona glow — soft aura ring behind agent sprite when persona_id is set
  let personaGlow: Graphics | undefined;
  if (agent.persona_id) {
    personaGlow = new Graphics();
    personaGlow.circle(ax, charFeetY - TARGET_CHAR_H * 0.5, 18).fill({ color: 0xf59e0b, alpha: 0 });
    room.addChildAt(personaGlow, 0);
  }

  // Mood icon — visible above agent head, updated each ticker tick
  const moodIcon = new Text({ text: "", style: new TextStyle({ fontSize: 10 }) });
  moodIcon.anchor.set(0.5, 1);
  moodIcon.position.set(0, -TARGET_CHAR_H - 4);
  moodIcon.visible = false;
  charContainer.addChild(moodIcon);

  const particles = new Container();
  room.addChild(particles);
  animItemsRef.current.push({
    sprite: charContainer,
    status: agent.status,
    baseX: ax,
    baseY: charContainer.position.y,
    particles,
    agentId: agent.id,
    cliProvider: agent.cli_provider,
    deskG,
    bedG,
    blanketG,
    phase: (hashStr(agent.id) % 360) / 57.2958,
    animated: animSpriteRef,
    frameCount: frames.length,
    bounceUntilTick: 0,
    personaGlow,
    moodIcon,
    idleTicks: 0,
  });

  const activeTask = tasks.find((task) => task.assigned_agent_id === agent.id && task.status === "in_progress");
  if (activeTask) {
    const txt = activeTask.title.length > 16 ? `${activeTask.title.slice(0, 16)}...` : activeTask.title;
    const bubbleText = new Text({
      text: txt,
      style: new TextStyle({
        fontSize: 6,
        fill: 0x22cc88,
        fontFamily: "monospace",
        wordWrap: true,
        wordWrapWidth: 85,
      }),
    });
    bubbleText.anchor.set(0.5, 1);
    const bw = Math.min(bubbleText.width + 10, 100);
    const bh = bubbleText.height + 6;
    const bubbleTop = charFeetY - TARGET_CHAR_H - bh - 6;
    const bubbleG = new Graphics();
    // Terminal dark task bubble
    bubbleG.rect(ax - bw / 2, bubbleTop, bw, bh).fill({ color: 0x050810, alpha: 0.92 });
    bubbleG.rect(ax - bw / 2, bubbleTop, bw, bh).stroke({ width: 0.8, color: themeAccent, alpha: 0.6 });
    // Amber left accent bar
    bubbleG.rect(ax - bw / 2, bubbleTop, 2, bh).fill({ color: themeAccent, alpha: 0.7 });
    // Tail
    bubbleG
      .moveTo(ax - 3, bubbleTop + bh)
      .lineTo(ax, bubbleTop + bh + 4)
      .lineTo(ax + 3, bubbleTop + bh)
      .fill({ color: 0x050810, alpha: 0.92 });
    room.addChild(bubbleG);
    bubbleText.position.set(ax + 1, bubbleTop + bh - 3);
    room.addChild(bubbleText);
  }

  const workingSubs = subAgents.filter((sub) => sub.parentAgentId === agent.id && sub.status === "working");
  if (isWorking && workingSubs.length > 0) {
    const visibleSubs = workingSubs.slice(0, MAX_VISIBLE_SUB_CLONES_PER_AGENT);
    visibleSubs.forEach((sub, index) => {
      const sx = ax - 14 + index * 12;
      const sy = charFeetY - 3.5 + (index % 2) * 0.9;
      const cloneContainer = new Container();
      cloneContainer.position.set(sx, sy);

      const aura = new Graphics();
      aura.ellipse(0, 2.0, 8.1, 2.7).fill({ color: 0x1f2937, alpha: 0.12 });
      cloneContainer.addChild(aura);

      const cloneSpriteNum = (hashStr(`${sub.id}:clone`) % 13) + 1;
      const cloneFrames: Texture[] = [];
      for (let frame = 1; frame <= 3; frame++) {
        const key = `${cloneSpriteNum}-D-${frame}`;
        if (textures[key]) cloneFrames.push(textures[key]);
      }
      const baseTexture = cloneFrames[0];
      if (!baseTexture) return;
      const baseScale = (TARGET_CHAR_H / baseTexture.height) * 0.76;

      const cloneVisual = cloneFrames.length > 1 ? new AnimatedSprite(cloneFrames) : new Sprite(baseTexture);
      cloneVisual.anchor.set(0.5, 1);
      cloneVisual.scale.set(baseScale);
      cloneVisual.tint = 0xd0e0ff;
      cloneVisual.alpha = 0.97;
      if (cloneVisual instanceof AnimatedSprite) cloneVisual.gotoAndStop((index + 1) % cloneFrames.length);
      cloneContainer.addChild(cloneVisual);

      const charIdx = room.children.indexOf(charContainer);
      if (charIdx >= 0) room.addChildAt(cloneContainer, charIdx);
      else room.addChild(cloneContainer);

      nextSubSnapshot.set(sub.id, { parentAgentId: agent.id, x: sx, y: sy });
      if (addedWorkingSubIds.has(sub.id)) {
        emitSubCloneSmokeBurst(room, subCloneBurstParticlesRef.current, sx, sy, "spawn");
        emitSubCloneFireworkBurst(room, subCloneBurstParticlesRef.current, sx, sy - 24);
        addedWorkingSubIds.delete(sub.id);
      }

      subCloneAnimItemsRef.current.push({
        container: cloneContainer,
        aura,
        cloneVisual,
        animated: cloneVisual instanceof AnimatedSprite ? cloneVisual : undefined,
        frameCount: cloneFrames.length,
        baseScale,
        baseX: sx,
        baseY: sy,
        phase: (hashStr(sub.id) % 360) / 57.2958 + index * 0.3,
        fireworkOffset: Math.abs(hashStr(`${sub.id}:firework`)) % SUB_CLONE_FIREWORK_INTERVAL,
      });
    });

    if (workingSubs.length > MAX_VISIBLE_SUB_CLONES_PER_AGENT) {
      const remain = workingSubs.length - MAX_VISIBLE_SUB_CLONES_PER_AGENT;
      const moreBg = new Graphics();
      moreBg.roundRect(ax + 18, deskY - 18, 18, 10, 2).fill({ color: 0x101722, alpha: 0.82 });
      room.addChild(moreBg);
      const moreTxt = new Text({
        text: `+${remain}`,
        style: new TextStyle({ fontSize: 6.5, fill: 0xe2e8f8, fontWeight: "bold", fontFamily: "monospace" }),
      });
      moreTxt.anchor.set(0.5, 0.5);
      moreTxt.position.set(ax + 27, deskY - 13);
      room.addChild(moreTxt);
    }
  }

  if (isOffline) {
    const zzz = new Text({ text: "💤", style: new TextStyle({ fontSize: 12 }) });
    zzz.anchor.set(0.5, 0.5);
    zzz.position.set(ax + 20, charFeetY - TARGET_CHAR_H / 2);
    room.addChild(zzz);
  }
}
