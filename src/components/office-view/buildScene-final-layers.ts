import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Container, Graphics, Text, TextStyle, type Application, type Texture } from "pixi.js";
import type { Task } from "../../types";
import { CEO_SIZE, DESK_H, type Delivery } from "./model";
import { type CeoCustomization, getHeadwearEmoji, loadCeoCustomization } from "./ceo-customization";

interface BuildFinalLayersParams {
  app: Application;
  textures: Record<string, Texture>;
  tasks: Task[];
  ceoPosRef: MutableRefObject<{ x: number; y: number }>;
  agentPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  deliveriesRef: MutableRefObject<Delivery[]>;
  deliveryLayerRef: MutableRefObject<Container | null>;
  highlightRef: MutableRefObject<Graphics | null>;
  ceoSpriteRef: MutableRefObject<Container | null>;
  crownRef: MutableRefObject<Text | null>;
  ceoCustomizationRef: MutableRefObject<CeoCustomization>;
  ceoTrailParticlesRef: MutableRefObject<Container | null>;
  prevAssignRef: MutableRefObject<Set<string>>;
  setSceneRevision: Dispatch<SetStateAction<number>>;
}

export function buildFinalLayers({
  app,
  textures,
  tasks,
  ceoPosRef,
  agentPosRef,
  deliveriesRef,
  deliveryLayerRef,
  highlightRef,
  ceoSpriteRef,
  crownRef,
  ceoCustomizationRef,
  ceoTrailParticlesRef,
  prevAssignRef,
  setSceneRevision,
}: BuildFinalLayersParams): void {
  const deliveryLayer = new Container();
  app.stage.addChild(deliveryLayer);
  deliveryLayerRef.current = deliveryLayer;

  deliveriesRef.current = deliveriesRef.current.filter((delivery) => !delivery.sprite.destroyed);
  for (const delivery of deliveriesRef.current) {
    deliveryLayer.addChild(delivery.sprite);
  }

  const highlight = new Graphics();
  app.stage.addChild(highlight);
  highlightRef.current = highlight;

  const ceoConfig = ceoCustomizationRef.current;
  const ceoCharacter = new Container();

  // ── Terminal Robot CEO (pixel-art android) ──────────────────────
  const robot = new Graphics();
  const bodyColor = 0x141820;
  const panelColor = 0x1a2030;
  const jointColor = 0x2a3048;
  const amberAccent = 0xf59e0b;
  // Antenna mast + tip
  robot.rect(-1, -28, 2, 8).fill(jointColor);
  robot.circle(0, -29, 2.5).fill({ color: amberAccent, alpha: 0.95 });
  // Head
  robot.rect(-9, -20, 18, 13).fill(bodyColor);
  robot.rect(-9, -20, 18, 13).stroke({ width: 0.8, color: jointColor });
  // Ear modules
  robot.rect(-12, -18, 3, 6).fill(panelColor);
  robot.rect(9, -18, 3, 6).fill(panelColor);
  // Visor (amber eye-slit)
  robot.rect(-7, -16, 14, 6).fill(0x0d0800);
  robot.rect(-6, -15, 12, 4).fill({ color: amberAccent, alpha: 0.8 });
  robot.rect(-2, -14, 4, 2).fill({ color: 0xffd060, alpha: 0.95 }); // bright center
  // Chin / neck
  robot.rect(-4, -7, 8, 4).fill(panelColor);
  // Shoulders
  robot.rect(-14, -4, 28, 3).fill(panelColor);
  robot.rect(-14, -4, 28, 3).stroke({ width: 0.5, color: jointColor });
  // Body
  robot.rect(-10, -1, 20, 16).fill(bodyColor);
  robot.rect(-10, -1, 20, 16).stroke({ width: 0.6, color: jointColor });
  // Amber side accent strips
  robot.rect(-10, -1, 2, 16).fill({ color: amberAccent, alpha: 0.5 });
  robot.rect(8, -1, 2, 16).fill({ color: amberAccent, alpha: 0.5 });
  // Chest terminal display
  robot.rect(-6, 2, 12, 7).fill(0x050810);
  robot.rect(-5, 3, 8, 1).fill({ color: 0x22cc88, alpha: 0.7 });
  robot.rect(-5, 5, 6, 1).fill({ color: amberAccent, alpha: 0.7 });
  robot.rect(-5, 7, 10, 1).fill({ color: 0x4488cc, alpha: 0.5 });
  // Status LED row
  robot.circle(-4, 11, 1.2).fill({ color: 0x22cc44, alpha: 0.95 });
  robot.circle(0, 11, 1.2).fill({ color: amberAccent, alpha: 0.9 });
  robot.circle(4, 11, 1.2).fill({ color: 0x3366aa, alpha: 0.7 });
  // Arms
  robot.rect(-16, -1, 5, 12).fill(panelColor);
  robot.rect(11, -1, 5, 12).fill(panelColor);
  // Hand units
  robot.rect(-16, 11, 5, 4).fill(jointColor);
  robot.rect(11, 11, 5, 4).fill(jointColor);
  // Legs
  robot.rect(-8, 15, 6, 11).fill(panelColor);
  robot.rect(2, 15, 6, 11).fill(panelColor);
  // Feet / boots
  robot.rect(-9, 26, 8, 3).fill(bodyColor);
  robot.rect(1, 26, 8, 3).fill(bodyColor);
  // Tint from CEO outfit customization
  if (ceoConfig.outfitTint !== 0xffffff) robot.tint = ceoConfig.outfitTint;
  ceoCharacter.addChild(robot);

  // Headwear
  const headwearEmoji = getHeadwearEmoji(ceoConfig.headwear);
  const crown = new Text({
    text: headwearEmoji,
    style: new TextStyle({ fontSize: ceoConfig.headwear === "halo" ? 18 : 14 }),
  });
  crown.anchor.set(0.5, 1);
  crown.position.set(0, -30); // above robot head antenna
  crown.visible = ceoConfig.headwear !== "none";
  ceoCharacter.addChild(crown);
  crownRef.current = crown;

  // Avatar emoji face overlay (replaces robot visor visually)
  if (ceoConfig.avatarEmoji?.trim()) {
    const faceEmoji = new Text({
      text: ceoConfig.avatarEmoji.trim(),
      style: new TextStyle({ fontSize: 12 }),
    });
    faceEmoji.anchor.set(0.5, 0.5);
    faceEmoji.position.set(0, -13); // centered on robot visor
    ceoCharacter.addChild(faceEmoji);
  }

  // Name badge
  const titleText = ceoConfig.title || "CEO";
  const badgeW = Math.max(32, titleText.length * 6 + 8);
  const nameBadge = new Graphics();
  nameBadge.rect(-badgeW / 2, CEO_SIZE / 2 + 1, badgeW, 11).fill({ color: 0x050810, alpha: 0.9 });
  nameBadge.rect(-badgeW / 2, CEO_SIZE / 2 + 1, 2, 11).fill({ color: 0xf59e0b, alpha: 0.8 });
  ceoCharacter.addChild(nameBadge);
  const nameText = new Text({
    text: titleText,
    style: new TextStyle({ fontSize: 7, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace" }),
  });
  nameText.anchor.set(0.5, 0.5);
  nameText.position.set(0, CEO_SIZE / 2 + 6.5);
  ceoCharacter.addChild(nameText);

  // CEO trail particle layer (behind CEO)
  const trailLayer = new Container();
  app.stage.addChild(trailLayer);
  ceoTrailParticlesRef.current = trailLayer;

  ceoCharacter.position.set(ceoPosRef.current.x, ceoPosRef.current.y);
  app.stage.addChild(ceoCharacter);
  ceoSpriteRef.current = ceoCharacter;

  const currentAssign = new Set(
    tasks.filter((task) => task.assigned_agent_id && task.status === "in_progress").map((task) => task.id),
  );
  const newAssigns = [...currentAssign].filter((id) => !prevAssignRef.current.has(id));
  prevAssignRef.current = currentAssign;

  for (const taskId of newAssigns) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task?.assigned_agent_id) continue;
    const target = agentPosRef.current.get(task.assigned_agent_id);
    if (!target) continue;

    const deliverySprite = new Container();
    const docEmoji = new Text({ text: "📋", style: new TextStyle({ fontSize: 16 }) });
    docEmoji.anchor.set(0.5, 0.5);
    deliverySprite.addChild(docEmoji);
    deliverySprite.position.set(ceoPosRef.current.x, ceoPosRef.current.y);
    deliveryLayer.addChild(deliverySprite);

    deliveriesRef.current.push({
      sprite: deliverySprite,
      fromX: ceoPosRef.current.x,
      fromY: ceoPosRef.current.y,
      toX: target.x,
      toY: target.y + DESK_H,
      progress: 0,
      agentId: task.assigned_agent_id,
    });
  }

  setSceneRevision((prev) => prev + 1);
}
