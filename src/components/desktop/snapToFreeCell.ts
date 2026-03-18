/**
 * Place a dragged icon at the drop position.
 * If no other icon overlaps there, use the position as-is.
 * If there is an overlap, spiral outward to find the nearest free spot.
 */

export const ICON_GRID_X = 88;
export const ICON_GRID_Y = 92;

/** Minimum y so icons don't slide under the menu bar */
const MIN_Y = 48;

/** Collision radius — icons closer than this (in each axis) are considered overlapping */
const COLLISION_W = ICON_GRID_X - 8;
const COLLISION_H = ICON_GRID_Y - 8;

function overlapsAny(
  x: number,
  y: number,
  selfId: string,
  layout: Record<string, { x: number; y: number }>,
): boolean {
  for (const [id, pos] of Object.entries(layout)) {
    if (id === selfId) continue;
    if (Math.abs(x - pos.x) < COLLISION_W && Math.abs(y - pos.y) < COLLISION_H) return true;
  }
  return false;
}

export function snapToFreeCell(
  dropX: number,
  dropY: number,
  selfId: string,
  layout: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  const x0 = Math.max(0, dropX);
  const y0 = Math.max(MIN_Y, dropY);

  // If no overlap at drop position, place exactly there
  if (!overlapsAny(x0, y0, selfId, layout)) {
    return { x: x0, y: y0 };
  }

  // Overlap detected — search outward in a grid-step spiral for nearest free cell
  for (let radius = 1; radius <= 20; radius++) {
    const step = Math.min(ICON_GRID_X, ICON_GRID_Y);
    const candidates: Array<{ x: number; y: number }> = [];

    for (let i = -radius; i <= radius; i++) {
      candidates.push({ x: x0 + i * step, y: y0 - radius * step });
      candidates.push({ x: x0 + i * step, y: y0 + radius * step });
    }
    for (let i = -radius + 1; i < radius; i++) {
      candidates.push({ x: x0 - radius * step, y: y0 + i * step });
      candidates.push({ x: x0 + radius * step, y: y0 + i * step });
    }

    // Sort by distance to the original drop point
    candidates.sort((a, b) => {
      const da = (a.x - x0) ** 2 + (a.y - y0) ** 2;
      const db = (b.x - x0) ** 2 + (b.y - y0) ** 2;
      return da - db;
    });

    for (const c of candidates) {
      if (c.x < 0 || c.y < MIN_Y) continue;
      if (!overlapsAny(c.x, c.y, selfId, layout)) {
        return c;
      }
    }
  }

  // Fallback: return drop position even if overlapping
  return { x: x0, y: y0 };
}
