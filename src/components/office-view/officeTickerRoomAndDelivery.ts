import { Graphics, type Container, spawnParticleTween } from "./pixi-compat";
import type { MutableRefObject } from "react";
import { DELIVERY_SPEED, type Delivery, destroyNode } from "./model";
import { hashStr } from "./drawing-core";

interface BreakAnimItem {
  sprite: Container;
  baseX: number;
  baseY: number;
}

interface UpdateBreakRoomAndDeliveryParams {
  breakAnimItemsRef: MutableRefObject<BreakAnimItem[]>;
  breakSteamParticlesRef: MutableRefObject<Container | null>;
  breakRoomRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>;
  breakBubblesRef: MutableRefObject<Container[]>;
  deliveriesRef: MutableRefObject<Delivery[]>;
}

export function updateBreakRoomAndDeliveryAnimations(
  {
    breakAnimItemsRef,
    breakSteamParticlesRef,
    breakRoomRectRef,
    breakBubblesRef,
    deliveriesRef,
  }: UpdateBreakRoomAndDeliveryParams,
  tick: number,
): void {
  // Guard: during scene rebuild, destroyed sprites may linger in refs — wrap safely.
  try { _updateBreakRoomAndDelivery(breakAnimItemsRef, breakSteamParticlesRef, breakRoomRectRef, breakBubblesRef, deliveriesRef, tick); }
  catch { /* scene objects destroyed mid-tick during rebuild */ }
}

function _updateBreakRoomAndDelivery(
  breakAnimItemsRef: MutableRefObject<BreakAnimItem[]>,
  breakSteamParticlesRef: MutableRefObject<Container | null>,
  breakRoomRectRef: MutableRefObject<{ x: number; y: number; w: number; h: number } | null>,
  breakBubblesRef: MutableRefObject<Container[]>,
  deliveriesRef: MutableRefObject<Delivery[]>,
  tick: number,
): void {
  for (const { sprite, baseX, baseY } of breakAnimItemsRef.current) {
    if (!sprite || sprite.destroyed) continue;
    const seed = hashStr((sprite as any)._name || `${baseX}`);
    sprite.position.x = baseX + Math.sin(tick * 0.02 + seed) * 1.5;
    sprite.position.y = baseY + Math.sin(tick * 0.03 + seed) * 0.8;
  }

  const steamContainer = breakSteamParticlesRef.current;
  if (steamContainer) {
    if (tick % 20 === 0) {
      const particle = new Graphics();
      particle.circle(0, 0, 1.5 + Math.random()).fill({ color: 0xffffff, alpha: 0.5 });
      const breakRoom = breakRoomRectRef.current;
      if (breakRoom) {
        const startY = breakRoom.y + 18;
        particle.position.set(breakRoom.x + 26, startY);
        // Steam: float up, fade out over ~500ms (≈30 ticks), auto-destroy
        spawnParticleTween(steamContainer, particle, {
          y: startY + (-0.3 - Math.random() * 0.2) * 30,
          alpha: 0,
        }, 500, { ease: "Sine.easeOut" });
      }
    }
  }

  for (const bubble of breakBubblesRef.current) {
    const phase = tick * 0.05;
    bubble.alpha = 0.7 + Math.sin(phase) * 0.3;
  }

  const deliveries = deliveriesRef.current;
  const now = Date.now();
  for (let i = deliveries.length - 1; i >= 0; i--) {
    const delivery = deliveries[i];
    if (delivery.sprite.destroyed) {
      deliveries.splice(i, 1);
      continue;
    }

    if (delivery.holdAtSeat && delivery.arrived) {
      if (!delivery.seatedPoseApplied) {
        for (const child of delivery.sprite.children) {
          const maybeAnim = child as unknown as { stop?: () => void; gotoAndStop?: (frame: number) => void };
          if (typeof maybeAnim.stop === "function" && typeof maybeAnim.gotoAndStop === "function") {
            maybeAnim.stop();
            maybeAnim.gotoAndStop(0);
          }
        }
        delivery.sprite.scale.x = 1;
        delivery.seatedPoseApplied = true;
      }

      delivery.sprite.position.set(delivery.toX, delivery.toY);
      delivery.sprite.alpha = 1;
      if (delivery.holdUntil && now >= delivery.holdUntil) {
        destroyNode(delivery.sprite);
        deliveries.splice(i, 1);
      }
      continue;
    }

    delivery.progress += delivery.speed ?? DELIVERY_SPEED;
    if (delivery.progress >= 1) {
      if (delivery.holdAtSeat) {
        delivery.arrived = true;
        delivery.progress = 1;
        delivery.sprite.position.set(delivery.toX, delivery.toY);
        delivery.sprite.alpha = 1;
        continue;
      }
      destroyNode(delivery.sprite);
      deliveries.splice(i, 1);
    } else if (delivery.waypoints && delivery.waypoints.length >= 2) {
      // ── Hallway waypoint walk ──────────────────────────────
      const wpts = delivery.waypoints;
      const totalSegs = wpts.length - 1;
      const segFloat = delivery.progress * totalSegs;
      const segIdx = Math.min(Math.floor(segFloat), totalSegs - 1);
      const segFrac = segFloat - segIdx;
      const ease = segFrac < 0.5 ? 2 * segFrac * segFrac : -1 + (4 - 2 * segFrac) * segFrac;
      const from = wpts[segIdx];
      const to = wpts[segIdx + 1];
      delivery.sprite.position.x = from.x + (to.x - from.x) * ease;
      delivery.sprite.position.y = from.y + (to.y - from.y) * ease;
      // Bounce only on horizontal segments (same Y)
      if (Math.abs(to.y - from.y) < 4) {
        delivery.sprite.position.y -= Math.abs(Math.sin(segFrac * Math.PI * 10)) * 2.5;
      }
      const t = delivery.progress;
      if (t < 0.05) delivery.sprite.alpha = t / 0.05;
      else if (t > 0.9) delivery.sprite.alpha = (1 - t) / 0.1;
      else delivery.sprite.alpha = 1;
      delivery.sprite.scale.x = to.x > from.x ? 1 : to.x < from.x ? -1 : delivery.sprite.scale.x;
    } else if (delivery.type === "walk") {
      const t = delivery.progress;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      delivery.sprite.position.x = delivery.fromX + (delivery.toX - delivery.fromX) * ease;
      delivery.sprite.position.y = delivery.fromY + (delivery.toY - delivery.fromY) * ease;
      const walkBounce = Math.abs(Math.sin(t * Math.PI * 12)) * 3;
      delivery.sprite.position.y -= walkBounce;
      if (t < 0.05) delivery.sprite.alpha = t / 0.05;
      else if (t > 0.9) delivery.sprite.alpha = (1 - t) / 0.1;
      else delivery.sprite.alpha = 1;
      delivery.sprite.scale.x = delivery.toX > delivery.fromX ? 1 : -1;
    } else {
      const t = delivery.progress;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const arc = delivery.arcHeight ?? -30;
      delivery.sprite.position.x = delivery.fromX + (delivery.toX - delivery.fromX) * ease;
      delivery.sprite.position.y =
        delivery.fromY + (delivery.toY - delivery.fromY) * ease + Math.sin(t * Math.PI) * arc;
      delivery.sprite.alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      delivery.sprite.scale.set(0.8 + Math.sin(t * Math.PI) * 0.3);
    }
  }
}
