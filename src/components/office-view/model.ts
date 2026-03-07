import { type Container, Graphics, Text, TextStyle } from "pixi.js";
import type {
  Department,
  Agent,
  Task,
  MeetingPresence,
  MeetingReviewDecision,
  SubAgent,
  CrossDeptDelivery,
  CeoOfficeCall,
} from "../../types";
import type { CliStatusMap } from "../../types";
import type { CliUsageEntry } from "../../api";

interface OfficeViewProps {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  meetingPresence?: MeetingPresence[];
  activeMeetingTaskId?: string | null;
  unreadAgentIds?: Set<string>;
  crossDeptDeliveries?: CrossDeptDelivery[];
  onCrossDeptDeliveryProcessed?: (id: string) => void;
  ceoOfficeCalls?: CeoOfficeCall[];
  onCeoOfficeCallProcessed?: (id: string) => void;
  onOpenActiveMeetingMinutes?: (taskId: string) => void;
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  themeHighlightTargetId?: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment: (dept: Department) => void;
  /** CLI 사용량(오피스 티커용). 전달 시 패널은 별도 메뉴에서 표시 */
  cliStatus?: CliStatusMap | null;
  cliUsage?: Record<string, CliUsageEntry> | null;
  cliUsageRef?: { current: Record<string, CliUsageEntry> | null };
  cliUsageRefreshing?: boolean;
  onRefreshCliUsage?: () => void;
  onOpenRoomManager?: () => void;
}

interface Delivery {
  sprite: Container;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  arcHeight?: number;
  speed?: number;
  type?: "throw" | "walk";
  agentId?: string;
  holdAtSeat?: boolean;
  holdUntil?: number;
  arrived?: boolean;
  seatedPoseApplied?: boolean;
  meetingSeatIndex?: number;
  meetingDecision?: MeetingReviewDecision;
  badgeGraphics?: Graphics;
  badgeText?: Text;
  /** Multi-segment waypoint path for hallway routing. When set, overrides from/to linear interpolation. */
  waypoints?: Array<{ x: number; y: number }>;
}

interface RoomRect {
  dept: Department;
  x: number;
  y: number;
  w: number;
  h: number;
  floorIndex?: number;
  isElevator?: boolean;
  isPenthouse?: boolean;
  isBasement?: boolean;
}

interface ElevatorState {
  currentFloor: number;  // 0=basement, 1=floor1, ..., N=penthouse
  targetFloor: number;
  carY: number;          // pixel Y of car top
  doorState: "closed" | "opening" | "open" | "closing";
  doorFrame: number;     // 0-3
}

interface WallClockVisual {
  hourHand: Graphics;
  minuteHand: Graphics;
  secondHand: Graphics;
}

function detachNode(node: Container): void {
  if (node.destroyed) return;
  node.parent?.removeChild(node);
}

/** Remove from parent AND destroy to free GPU/texture memory. */
function destroyNode(node: Container): void {
  if (node.destroyed) return;
  node.parent?.removeChild(node);
  node.destroy({ children: true });
}

function trackProcessedId(set: Set<string>, id: string, max = 4000): void {
  set.add(id);
  if (set.size <= max) return;
  const trimCount = set.size - max;
  let removed = 0;
  for (const key of set) {
    set.delete(key);
    removed += 1;
    if (removed >= trimCount) break;
  }
}

type ScrollAxis = "x" | "y";

function isScrollableOverflowValue(value: string): boolean {
  return value === "auto" || value === "scroll" || value === "overlay";
}

function canScrollOnAxis(el: HTMLElement, axis: ScrollAxis): boolean {
  const style = window.getComputedStyle(el);
  if (axis === "y") {
    return isScrollableOverflowValue(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
  }
  return isScrollableOverflowValue(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
}

function findScrollContainer(start: HTMLElement | null, axis: ScrollAxis): HTMLElement | null {
  let current = start?.parentElement ?? null;
  let fallback: HTMLElement | null = null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const hasScrollableStyle =
      axis === "y" ? isScrollableOverflowValue(overflowY) : isScrollableOverflowValue(overflowX);
    if (!fallback && hasScrollableStyle) fallback = current;
    if (canScrollOnAxis(current, axis)) return current;
    current = current.parentElement;
  }
  return fallback;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const MIN_OFFICE_W = 360;
const CEO_ZONE_H = 110;
const HALLWAY_H = 32;
const TARGET_CHAR_H = 36;   // was 52 — reduced for better FM2024 proportions
const MINI_CHAR_H = 20;     // was 28
const CEO_SIZE = 44;
const DESK_W = 48;
const DESK_H = 26;
const SLOT_W = 110;         // was 100 — slightly wider per slot
const SLOT_H = 156;         // was 120 — taller rooms give breathing room
const COLS_PER_ROW = 3;
const ROOM_PAD = 16;
const TILE = 20;
const CEO_SPEED = 7;
const DELIVERY_SPEED = 0.012;

const BREAK_ROOM_H = 110;
const BREAK_ROOM_GAP = 32;

/* ---- Tower redesign constants (Phase 5/15) ---- */
const WALL_W = 20;
const ELEVATOR_W = 40;
const FLOOR_W = COLS_PER_ROW * SLOT_W + ELEVATOR_W + WALL_W * 2; // 410
const PENTHOUSE_H = 160;
const PENTHOUSE_INTERIOR_H = 140;
const CONFERENCE_FLOOR_H = 140;  // dedicated meeting room floor
const FLOOR_ROOM_H = SLOT_H;    // 156
const FLOOR_HALLWAY_H = 28;     // was 24
const FLOOR_TOTAL_H = FLOOR_ROOM_H + FLOOR_HALLWAY_H; // 184
const BASEMENT_H = 140;         // was 130 — slightly taller break room
const BASEMENT_INTERIOR_H = 120; // was 110
const ROOF_H = 40;
const MAX_VISIBLE_SUB_CLONES_PER_AGENT = 3;
const SUB_CLONE_WAVE_SPEED = 0.04;
const SUB_CLONE_MOVE_X_AMPLITUDE = 0.16;
const SUB_CLONE_MOVE_Y_AMPLITUDE = 0.34;
const SUB_CLONE_FLOAT_DRIFT = 0.08;
const SUB_CLONE_FIREWORK_INTERVAL = 210;

/* ---- Agent character animation constants ---- */
const AGENT_BREATHE_SPEED = 0.025;
const AGENT_BREATHE_Y_AMP = 0.6;
const AGENT_BREATHE_SCALE_AMP = 0.004;
const AGENT_WORK_FRAME_SPEED = 0.035;
const AGENT_WORK_BOB_SPEED = 0.18;
const AGENT_WORK_BOB_Y_AMP = 0.35;
const AGENT_WORK_BOB_ROT_AMP = 0.012;
const AGENT_IDLE_GESTURE_INTERVAL = 300;
const AGENT_IDLE_GESTURE_DURATION = 60;
const AGENT_TASK_BOUNCE_DURATION = 30;
const AGENT_TASK_BOUNCE_HEIGHT = 4;
const MOBILE_MOVE_CODES = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
} as const;
type MobileMoveDirection = keyof typeof MOBILE_MOVE_CODES;
type RoomTheme = { floor1: number; floor2: number; wall: number; accent: number };

type SubCloneBurstParticle = {
  node: Container;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
  growth: number;
};

function emitSubCloneSmokeBurst(
  target: Container,
  particles: SubCloneBurstParticle[],
  x: number,
  y: number,
  mode: "spawn" | "despawn",
): void {
  const baseColor = mode === "spawn" ? 0xc7d4ec : 0xb7bfd1;
  const strokeColor = mode === "spawn" ? 0xe6edff : 0xd4dae8;
  const puffCount = mode === "spawn" ? 9 : 7;
  for (let i = 0; i < puffCount; i++) {
    const puff = new Graphics();
    const radius = 1.8 + Math.random() * 2.8;
    puff.circle(0, 0, radius).fill({ color: baseColor, alpha: 0.62 + Math.random() * 0.18 });
    puff.circle(0, 0, radius).stroke({ width: 0.6, color: strokeColor, alpha: 0.32 });
    puff.position.set(x + (Math.random() - 0.5) * 10, y - 14 + (Math.random() - 0.5) * 6);
    target.addChild(puff);
    particles.push({
      node: puff,
      vx: (Math.random() - 0.5) * (mode === "spawn" ? 1.4 : 1.1),
      vy: -0.22 - Math.random() * 0.6,
      life: 0,
      maxLife: 20 + Math.floor(Math.random() * 12),
      spin: (Math.random() - 0.5) * 0.1,
      growth: 0.013 + Math.random() * 0.012,
    });
  }

  const flash = new Graphics();
  flash.circle(0, 0, mode === "spawn" ? 5.4 : 4.2).fill({ color: 0xf8fbff, alpha: mode === "spawn" ? 0.52 : 0.42 });
  flash.position.set(x, y - 14);
  target.addChild(flash);
  particles.push({
    node: flash,
    vx: 0,
    vy: -0.16,
    life: 0,
    maxLife: mode === "spawn" ? 14 : 12,
    spin: 0,
    growth: 0.022,
  });

  const burstTxt = new Text({
    text: "펑",
    style: new TextStyle({
      fontSize: 7,
      fill: mode === "spawn" ? 0xeff4ff : 0xdde4f5,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
      stroke: { color: 0x1f2838, width: 2 },
    }),
  });
  burstTxt.anchor.set(0.5, 0.5);
  burstTxt.position.set(x, y - 24);
  target.addChild(burstTxt);
  particles.push({
    node: burstTxt,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -0.3,
    life: 0,
    maxLife: mode === "spawn" ? 18 : 16,
    spin: (Math.random() - 0.5) * 0.04,
    growth: 0.004,
  });
}

function emitSubCloneFireworkBurst(target: Container, particles: SubCloneBurstParticle[], x: number, y: number): void {
  const colors = [0xff6b6b, 0xffc75f, 0x7ce7ff, 0x8cff9f, 0xd7a6ff];
  const sparkCount = 10;
  for (let i = 0; i < sparkCount; i++) {
    const spark = new Graphics();
    const color = colors[Math.floor(Math.random() * colors.length)];
    const radius = 0.85 + Math.random() * 0.6;
    spark.circle(0, 0, radius).fill({ color, alpha: 0.96 });
    spark.circle(0, 0, radius).stroke({ width: 0.45, color: 0xffffff, alpha: 0.5 });
    spark.position.set(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 3);
    target.addChild(spark);
    const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.45;
    const speed = 0.9 + Math.random() * 0.85;
    particles.push({
      node: spark,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.45,
      life: 0,
      maxLife: 16 + Math.floor(Math.random() * 8),
      spin: (Math.random() - 0.5) * 0.08,
      growth: 0.006 + Math.random() * 0.006,
    });
  }
}

export {
  type OfficeViewProps,
  type Delivery,
  type RoomRect,
  type ElevatorState,
  type WallClockVisual,
  detachNode,
  destroyNode,
  trackProcessedId,
  type ScrollAxis,
  canScrollOnAxis,
  findScrollContainer,
  MIN_OFFICE_W,
  CEO_ZONE_H,
  HALLWAY_H,
  TARGET_CHAR_H,
  MINI_CHAR_H,
  CEO_SIZE,
  DESK_W,
  DESK_H,
  SLOT_W,
  SLOT_H,
  COLS_PER_ROW,
  ROOM_PAD,
  TILE,
  CEO_SPEED,
  DELIVERY_SPEED,
  BREAK_ROOM_H,
  BREAK_ROOM_GAP,
  WALL_W,
  ELEVATOR_W,
  FLOOR_W,
  PENTHOUSE_H,
  PENTHOUSE_INTERIOR_H,
  CONFERENCE_FLOOR_H,
  FLOOR_ROOM_H,
  FLOOR_HALLWAY_H,
  FLOOR_TOTAL_H,
  BASEMENT_H,
  BASEMENT_INTERIOR_H,
  ROOF_H,
  MAX_VISIBLE_SUB_CLONES_PER_AGENT,
  SUB_CLONE_WAVE_SPEED,
  SUB_CLONE_MOVE_X_AMPLITUDE,
  SUB_CLONE_MOVE_Y_AMPLITUDE,
  SUB_CLONE_FLOAT_DRIFT,
  SUB_CLONE_FIREWORK_INTERVAL,
  MOBILE_MOVE_CODES,
  type MobileMoveDirection,
  type RoomTheme,
  type SubCloneBurstParticle,
  emitSubCloneSmokeBurst,
  emitSubCloneFireworkBurst,
  AGENT_BREATHE_SPEED,
  AGENT_BREATHE_Y_AMP,
  AGENT_BREATHE_SCALE_AMP,
  AGENT_WORK_FRAME_SPEED,
  AGENT_WORK_BOB_SPEED,
  AGENT_WORK_BOB_Y_AMP,
  AGENT_WORK_BOB_ROT_AMP,
  AGENT_IDLE_GESTURE_INTERVAL,
  AGENT_IDLE_GESTURE_DURATION,
  AGENT_TASK_BOUNCE_DURATION,
  AGENT_TASK_BOUNCE_HEIGHT,
};
