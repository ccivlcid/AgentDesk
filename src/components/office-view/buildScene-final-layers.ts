import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Container, Graphics, Text, TextStyle, type Application, type Texture, tweenNode } from "./pixi-compat";
import type { Task } from "../../types";
import { CEO_SIZE, DESK_H, TXT, type Delivery } from "./model";
import { type CeoCustomization, getHeadwearEmoji, loadCeoCustomization } from "./ceo-customization";

interface BuildFinalLayersParams {
  app: Application;
  /** Container to add final layers to (towerContainer, not app.stage). */
  stage: Container;
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
  stage,
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
  stage.addChild(deliveryLayer);
  deliveryLayerRef.current = deliveryLayer;

  deliveriesRef.current = deliveriesRef.current.filter((delivery) => !delivery.sprite.destroyed);
  for (const delivery of deliveriesRef.current) {
    deliveryLayer.addChild(delivery.sprite);
  }

  const highlight = new Graphics();
  stage.addChild(highlight);
  highlightRef.current = highlight;

  const ceoConfig = ceoCustomizationRef.current;
  const ceoCharacter = new Container();

  // ── Cute Chibi CEO Character ──────────────────────────────────
  const robot = new Graphics();
  const bodyColor = 0x2a3448;
  const panelColor = 0x3a4a60;
  const amberAccent = 0xf59e0b;
  const eyeWhite = 0xffffff;
  const pupilColor = 0x1a1a2e;
  const blushColor = 0xff6b8a;
  const mouthColor = 0x1a1a2e;

  // ── Hair / top of head accent ──
  robot.roundRect(-14, -50, 28, 6, 3).fill(panelColor);

  // ── Large round head (~60% of height) ──
  robot.circle(0, -30, 16).fill(bodyColor);
  robot.circle(0, -30, 16).stroke({ width: 0.6, color: panelColor });

  // ── Eyes: big round with sclera, pupils, highlights ──
  // Left eye
  robot.circle(-6, -32, 4.5).fill(eyeWhite);
  robot.circle(-5.5, -31.5, 3).fill(pupilColor);
  robot.circle(-4.5, -33, 1.2).fill(eyeWhite); // highlight dot
  // Right eye
  robot.circle(6, -32, 4.5).fill(eyeWhite);
  robot.circle(6.5, -31.5, 3).fill(pupilColor);
  robot.circle(7.5, -33, 1.2).fill(eyeWhite); // highlight dot

  // ── Blush cheeks (semi-transparent pink) ──
  robot.circle(-10, -27, 3).fill({ color: blushColor, alpha: 0.25 });
  robot.circle(10, -27, 3).fill({ color: blushColor, alpha: 0.25 });

  // ── Small cute mouth (tiny arc-like shape) ──
  robot.circle(0, -25, 1.5).fill(mouthColor);
  robot.circle(0, -24.5, 1.8).fill(bodyColor); // mask upper half to make a smile arc

  // ── Amber hair clip / accessory ──
  robot.circle(-12, -38, 2.5).fill({ color: amberAccent, alpha: 0.9 });

  // ── Compact rounded body ──
  robot.roundRect(-10, -14, 20, 18, 5).fill(bodyColor);
  robot.roundRect(-10, -14, 20, 18, 5).stroke({ width: 0.5, color: panelColor });

  // ── Amber collar / neckline accent ──
  robot.roundRect(-7, -14, 14, 3, 1.5).fill({ color: amberAccent, alpha: 0.7 });

  // ── Chest badge / emblem ──
  robot.circle(0, -3, 3).fill(panelColor);
  robot.circle(0, -3, 2).fill({ color: amberAccent, alpha: 0.8 });

  // ── Stubby rounded arms ──
  robot.roundRect(-15, -11, 6, 12, 3).fill(panelColor);
  robot.roundRect(9, -11, 6, 12, 3).fill(panelColor);
  // Tiny hands
  robot.circle(-12, 2, 3).fill(bodyColor);
  robot.circle(12, 2, 3).fill(bodyColor);

  // ── Short stubby legs ──
  robot.roundRect(-8, 4, 7, 10, 3).fill(panelColor);
  robot.roundRect(1, 4, 7, 10, 3).fill(panelColor);

  // ── Small rounded feet ──
  robot.roundRect(-9, 13, 9, 4, 2).fill(bodyColor);
  robot.roundRect(0, 13, 9, 4, 2).fill(bodyColor);

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
  crown.position.set(0, -48); // above chibi head
  crown.visible = ceoConfig.headwear !== "none";
  ceoCharacter.addChild(crown);
  crownRef.current = crown;

  // Persistent crown bob tween (replaces per-tick Math.sin)
  if (ceoConfig.headwear !== "none") {
    // Y bob: -48 → -44 → -48 (amplitude 2, centered at -46 → but we want -48 to -44)
    tweenNode(crown, { y: -44 }, 1050, { ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    // Rotation sway
    tweenNode(crown, { rotation: 0.06 }, 2100, { ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
  }

  // Avatar emoji face overlay (replaces robot visor visually)
  if (ceoConfig.avatarEmoji?.trim()) {
    const faceEmoji = new Text({
      text: ceoConfig.avatarEmoji.trim(),
      style: new TextStyle({ fontSize: 12 }),
    });
    faceEmoji.anchor.set(0.5, 0.5);
    faceEmoji.position.set(0, -30); // centered on chibi face
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
    style: new TextStyle({ fontSize: TXT.NORMAL, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace" }),
  });
  nameText.anchor.set(0.5, 0.5);
  nameText.position.set(0, CEO_SIZE / 2 + 6.5);
  ceoCharacter.addChild(nameText);

  // CEO trail particle layer (behind CEO)
  const trailLayer = new Container();
  stage.addChild(trailLayer);
  ceoTrailParticlesRef.current = trailLayer;

  ceoCharacter.position.set(ceoPosRef.current.x, ceoPosRef.current.y);
  stage.addChild(ceoCharacter);
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
