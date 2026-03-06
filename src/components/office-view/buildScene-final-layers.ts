import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Container, Graphics, Sprite, Text, TextStyle, type Application, type Texture } from "pixi.js";
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
  if (textures.ceo) {
    const sprite = new Sprite(textures.ceo);
    sprite.anchor.set(0.5, 0.5);
    const scale = CEO_SIZE / Math.max(sprite.texture.width, sprite.texture.height);
    sprite.scale.set(scale);
    if (ceoConfig.outfitTint !== 0xffffff) sprite.tint = ceoConfig.outfitTint;
    ceoCharacter.addChild(sprite);
  } else {
    const fallback = new Graphics();
    fallback.circle(0, 0, 18).fill(0xff4d4d);
    ceoCharacter.addChild(fallback);
  }

  // Headwear
  const headwearEmoji = getHeadwearEmoji(ceoConfig.headwear);
  const crown = new Text({
    text: headwearEmoji,
    style: new TextStyle({ fontSize: ceoConfig.headwear === "halo" ? 18 : 14 }),
  });
  crown.anchor.set(0.5, 1);
  crown.position.set(0, -CEO_SIZE / 2 + 2);
  crown.visible = ceoConfig.headwear !== "none";
  ceoCharacter.addChild(crown);
  crownRef.current = crown;

  // Name badge
  const titleText = ceoConfig.title || "CEO";
  const badgeW = Math.max(32, titleText.length * 6 + 8);
  const nameBadge = new Graphics();
  nameBadge.roundRect(-badgeW / 2, CEO_SIZE / 2 + 1, badgeW, 11, 3).fill({ color: 0xf0d888, alpha: 0.9 });
  ceoCharacter.addChild(nameBadge);
  const nameText = new Text({
    text: titleText,
    style: new TextStyle({ fontSize: 7, fill: 0x5a4020, fontWeight: "bold", fontFamily: "monospace" }),
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
