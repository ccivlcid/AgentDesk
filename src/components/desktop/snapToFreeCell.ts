/**
 * Place a dragged icon at the drop position.
 * Drop position is first snapped to the nearest grid cell.
 * If the snapped cell is free, use it. Otherwise spiral outward.
 */

export const ICON_GRID_X = 88;
export const ICON_GRID_Y = 92;

/** Minimum y so icons don't slide under the menu bar */
const MIN_Y = 48;

/** Grid origin — set to 0 to allow icons to be placed at the very left edge */
export const GRID_ORIGIN_X = 0;
export const GRID_ORIGIN_Y = 60;

/** Menu-bar height + dock height used to compute usable desktop area */
const MENU_BAR_H = 44;
const DOCK_H = 80;

/**
 * How many icon rows fit in the current viewport.
 * Used by default-position logic to arrange icons top-to-bottom, then left-to-right (macOS style).
 */
export function getIconsPerColumn(): number {
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
  const usable = viewportH - MENU_BAR_H - DOCK_H - GRID_ORIGIN_Y;
  return Math.max(1, Math.floor(usable / ICON_GRID_Y));
}

/** Collision radius — reduce slightly so icons can be placed closer without jumping */
const COLLISION_W = ICON_GRID_X - 24;
const COLLISION_H = ICON_GRID_Y - 24;

/** Snap a raw coordinate to the nearest grid cell */
function snapX(x: number): number {
  return GRID_ORIGIN_X + Math.round((x - GRID_ORIGIN_X) / ICON_GRID_X) * ICON_GRID_X;
}
function snapY(y: number): number {
  return GRID_ORIGIN_Y + Math.round((y - GRID_ORIGIN_Y) / ICON_GRID_Y) * ICON_GRID_Y;
}

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
  // Snap drop position to nearest grid cell first
  const x0 = Math.max(0, snapX(dropX));
  const y0 = Math.max(MIN_Y, snapY(dropY));

  // If snapped cell is free, place there
  if (!overlapsAny(x0, y0, selfId, layout)) {
    return { x: x0, y: y0 };
  }

  // Overlap detected — search outward in a grid-step spiral for nearest free cell
  for (let radius = 1; radius <= 20; radius++) {
    const candidates: Array<{ x: number; y: number }> = [];

    for (let i = -radius; i <= radius; i++) {
      candidates.push({ x: x0 + i * ICON_GRID_X, y: y0 - radius * ICON_GRID_Y });
      candidates.push({ x: x0 + i * ICON_GRID_X, y: y0 + radius * ICON_GRID_Y });
    }
    for (let i = -radius + 1; i < radius; i++) {
      candidates.push({ x: x0 - radius * ICON_GRID_X, y: y0 + i * ICON_GRID_Y });
      candidates.push({ x: x0 + radius * ICON_GRID_X, y: y0 + i * ICON_GRID_Y });
    }

    // Sort by distance to the original drop point
    candidates.sort((a, b) => {
      const da = (a.x - x0) ** 2 + (a.y - y0) ** 2;
      const db = (b.x - x0) ** 2 + (b.y - y0) ** 2;
      return da - db;
    });

    for (const c of candidates) {
      if (c.x < GRID_ORIGIN_X || c.y < MIN_Y) continue;
      if (!overlapsAny(c.x, c.y, selfId, layout)) {
        return c;
      }
    }
  }

  // Fallback: return snapped position even if overlapping
  return { x: x0, y: y0 };
}
