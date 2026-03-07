import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { buildSpriteMap } from "../AgentAvatar";
import {
  FLOOR_W,
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
  FLOOR_ROOM_H,
  BASEMENT_H,
  WALL_W,
  ELEVATOR_W,
  detachNode,
} from "./model";
import { drawConferenceFloor } from "./drawConferenceFloor";
import { DEFAULT_BREAK_THEME, DEFAULT_CEO_THEME, applyOfficeThemeMode } from "./themes-locale";
import type { BuildOfficeSceneContext } from "./buildScene-types";
import { buildFinalLayers } from "./buildScene-final-layers";
import { createSeasonalParticleState, destroySeasonalParticles } from "./seasonal-particles";
import { getDrawer } from "./drawing-styles";
import { drawRoof } from "./drawRoof";
import { drawPenthouse } from "./drawPenthouse";
import { drawFloor } from "./drawFloor";
import { drawBasement } from "./drawBasement";
import { drawElevatorShaft, getElevatorShaftX } from "./drawElevator";
import { getFloorCarY } from "./elevatorTick";
import { drawExteriorWalls } from "./drawExteriorWalls";

export function buildOfficeScene(context: BuildOfficeSceneContext): void {
  const {
    appRef,
    texturesRef,
    dataRef,
    cbRef,
    activeMeetingTaskIdRef,
    meetingMinutesOpenRef,
    localeRef,
    themeRef,
    animItemsRef,
    roomRectsRef,
    deliveriesRef,
    deliveryLayerRef,
    prevAssignRef,
    agentPosRef,
    spriteMapRef,
    ceoMeetingSeatsRef,
    totalHRef,
    officeWRef,
    ceoPosRef,
    ceoSpriteRef,
    crownRef,
    ceoCustomizationRef,
    ceoTrailParticlesRef,
    highlightRef,
    ceoOfficeRectRef,
    breakRoomRectRef,
    breakAnimItemsRef,
    subCloneAnimItemsRef,
    subCloneBurstParticlesRef,
    subCloneSnapshotRef,
    breakSteamParticlesRef,
    breakBubblesRef,
    wallClocksRef,
    wallClockSecondRef,
    roomDecorationsRef,
    furnitureLayoutsRef,
    styleKeyRef,
    seasonalParticleRef,
    seasonKeyRef,
    setSceneRevision,
    elevatorCarRef,
    elevatorFloorDisplayRef,
    elevatorDoorRef,
    elevatorStateRef,
    elevatorNFloorsRef,
    exteriorWindowsRef,
    antennaLedRef,
    elevatorFloorLedsRef,
    floorGlowsRef,
    floorSelectBoxesRef,
    selectedFloorIdxRef,
    ceoVisitorAlertRef,
    visitorLayerRef,
    visitorTickRef,
  } = context;

  const app = appRef.current;
  const textures = texturesRef.current;
  if (!app) return;

  // Preserve in-flight delivery sprites across rebuild
  const preservedDeliverySprites = new Set<Container>();
  for (const delivery of deliveriesRef.current) {
    if (delivery.sprite.destroyed) continue;
    preservedDeliverySprites.add(delivery.sprite);
    detachNode(delivery.sprite);
  }

  const oldChildren = app.stage.removeChildren();
  for (const child of oldChildren) {
    if (preservedDeliverySprites.has(child)) continue;
    if (!child.destroyed) child.destroy({ children: true });
  }

  // Reset per-frame state
  animItemsRef.current = [];
  roomRectsRef.current = [];
  agentPosRef.current.clear();
  breakAnimItemsRef.current = [];
  subCloneAnimItemsRef.current = [];
  subCloneBurstParticlesRef.current = [];
  breakBubblesRef.current = [];
  breakSteamParticlesRef.current = null;
  wallClocksRef.current = [];
  wallClockSecondRef.current = -1;
  ceoOfficeRectRef.current = null;
  breakRoomRectRef.current = null;
  ceoMeetingSeatsRef.current = [];

  const {
    departments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds: unread,
    customDeptThemes: customThemes,
  } = dataRef.current;

  // Sub-clone snapshot tracking (despawn burst positions)
  const previousSubSnapshot = subCloneSnapshotRef.current;
  const currentWorkingSubIds = new Set(subAgents.filter((s) => s.status === "working").map((s) => s.id));
  const addedWorkingSubIds = new Set<string>();
  for (const sub of subAgents) {
    if (sub.status !== "working") continue;
    if (!previousSubSnapshot.has(sub.id)) addedWorkingSubIds.add(sub.id);
  }

  const removedSubBurstsByParent = new Map<string, Array<{ x: number; y: number }>>();
  for (const [subId, prev] of previousSubSnapshot.entries()) {
    if (currentWorkingSubIds.has(subId)) continue;
    const list = removedSubBurstsByParent.get(prev.parentAgentId) ?? [];
    list.push({ x: prev.x, y: prev.y });
    removedSubBurstsByParent.set(prev.parentAgentId, list);
  }
  const nextSubSnapshot = new Map<string, { parentAgentId: string; x: number; y: number }>();

  const activeLocale = localeRef.current;
  const isDark = themeRef.current === "dark";
  applyOfficeThemeMode(isDark);

  const ceoTheme = customThemes?.ceoOffice ?? DEFAULT_CEO_THEME;
  const breakTheme = customThemes?.breakRoom ?? DEFAULT_BREAK_THEME;
  const spriteMap = buildSpriteMap(agents);
  spriteMapRef.current = spriteMap;
  const drawer = getDrawer(styleKeyRef.current);

  // ── Tower dimensions ──────────────────────────────────────────
  const nFloors = Math.max(1, departments.length);
  // CONFERENCE_FLOOR_H (100) is the dedicated meeting room floor between penthouse and dept floors
  const totalH = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H + BASEMENT_H;
  const OFFICE_W = FLOOR_W; // 380

  totalHRef.current = totalH;
  officeWRef.current = OFFICE_W;
  app.renderer.resize(OFFICE_W, totalH);

  // CSS-scale the canvas to fill the container — overrides autoDensity inline px values
  const canvasEl = app.canvas as HTMLCanvasElement;
  canvasEl.style.width = "100%";
  canvasEl.style.height = "auto";
  canvasEl.style.display = "block";

  // ── Full building background ──────────────────────────────────
  // Drawn by drawRoof (roof cap) + zone backgrounds below

  // ── 0. Exterior walls (behind everything) ────────────────────
  exteriorWindowsRef.current = drawExteriorWalls({
    stage: app.stage as Container,
    nFloors: departments.length,
    totalH,
    isDark,
  });

  // ── 1. Roof ──────────────────────────────────────────────────
  const ceoCustomization = ceoCustomizationRef.current;
  antennaLedRef.current = drawRoof({ stage: app.stage as Container, floorW: FLOOR_W, roofH: ROOF_H, isDark, companyName: ceoCustomization?.companyName });

  // ── 2. Penthouse (CEO) ───────────────────────────────────────
  drawPenthouse({
    stage: app.stage as Container,
    drawer,
    pentY: ROOF_H,
    isDark,
    activeLocale,
    ceoTheme,
    ceoName: ceoCustomization?.name,
    ceoTitle: ceoCustomization?.title,
    personaBadge: ceoCustomization?.personaId ? `[${ceoCustomization.personaId.toUpperCase()}]` : undefined,
    activeMeetingTaskId: activeMeetingTaskIdRef.current,
    onOpenActiveMeetingMinutes: meetingMinutesOpenRef.current,
    agents,
    tasks,
    deliveriesRef,
    ceoMeetingSeatsRef,
    wallClocksRef,
    ceoOfficeRectRef,
  });

  // ── 2b. Conference floor (between penthouse and dept floors) ──
  drawConferenceFloor({
    stage: app.stage as Container,
    drawer,
    confY: ROOF_H + PENTHOUSE_H,
    isDark,
    activeLocale,
    activeMeetingTaskId: activeMeetingTaskIdRef.current,
    onOpenActiveMeetingMinutes: meetingMinutesOpenRef.current,
  });

  // ── 3. Department floors (top → bottom) ──────────────────────
  departments.forEach((dept, deptIdx) => {
    const floorY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
    const deptAgents = agents.filter((a) => a.department_id === dept.id);

    drawFloor({
      stage: app.stage as Container,
      drawer,
      textures,
      dept,
      deptIdx,
      floorIndex: deptIdx,
      floorY,
      deptAgents,
      allAgents: agents,
      tasks,
      subAgents,
      unread,
      customTheme: customThemes?.[dept.id],
      activeLocale,
      isDark,
      spriteMap,
      cbRef,
      roomRectsRef,
      agentPosRef,
      animItemsRef,
      subCloneAnimItemsRef,
      subCloneBurstParticlesRef,
      wallClocksRef,
      roomDecorations: roomDecorationsRef.current,
      furnitureLayouts: furnitureLayoutsRef.current,
      removedSubBurstsByParent,
      addedWorkingSubIds,
      nextSubSnapshot,
    });
  });

  subCloneSnapshotRef.current = nextSubSnapshot;

  // ── 3b. Floor activity glow overlays (one per dept floor, updated in ticker) ──
  floorGlowsRef.current = [];
  floorSelectBoxesRef.current = [];
  const glowW = FLOOR_W - ELEVATOR_W - WALL_W * 2; // 300
  departments.forEach((_dept, deptIdx) => {
    const floorY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
    // Activity glow fill
    const glowG = new Graphics();
    glowG.rect(WALL_W, floorY, glowW, FLOOR_ROOM_H).fill({ color: 0xffffff, alpha: 0.1 });
    glowG.alpha = 0;
    glowG.tint = 0x22c55e;
    (app.stage as Container).addChild(glowG);
    floorGlowsRef.current.push(glowG);
    // Selection highlight box (amber stroke outline, hidden until selected)
    const selBox = new Graphics();
    selBox.rect(WALL_W + 1, floorY + 1, glowW - 2, FLOOR_ROOM_H - 2)
      .stroke({ width: 2, color: 0xf59e0b });
    selBox.alpha = 0;
    (app.stage as Container).addChild(selBox);
    floorSelectBoxesRef.current.push(selBox);
  });
  // Reset selection on scene rebuild
  selectedFloorIdxRef.current = 0;

  // ── 3c. CEO visitor alert text (blinks in penthouse when visitor is inbound) ──
  {
    const alertT = new Text({
      text: "▲ VISITOR INBOUND",
      style: new TextStyle({ fontSize: 7, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 2 }),
    });
    alertT.anchor.set(0.5, 1);
    alertT.position.set(FLOOR_W / 2 - ELEVATOR_W / 2, ROOF_H + PENTHOUSE_H - 8);
    alertT.alpha = 0;
    (app.stage as Container).addChild(alertT);
    ceoVisitorAlertRef.current = alertT;
  }

  // ── 4. Basement (Break Room) ──────────────────────────────────
  const basementY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
  drawBasement({
    stage: app.stage as Container,
    drawer,
    textures,
    agents,
    spriteMap,
    activeLocale,
    breakTheme,
    isDark,
    basementY,
    cbRef,
    breakAnimItemsRef,
    breakBubblesRef,
    breakSteamParticlesRef,
    breakRoomRectRef,
    wallClocksRef,
    agentPosRef,
  });

  // ── 5. Elevator shaft ────────────────────────────────────────
  const shaftX = getElevatorShaftX(FLOOR_W, ELEVATOR_W, WALL_W);
  const elevatorVisuals = drawElevatorShaft({
    stage: app.stage as Container,
    shaftX,
    shaftTopY: ROOF_H,
    totalH,
    nFloors: departments.length,
    isDark,
  });
  elevatorCarRef.current = elevatorVisuals.carContainer;
  elevatorFloorDisplayRef.current = elevatorVisuals.floorDisplay;
  elevatorDoorRef.current = elevatorVisuals.doorG;
  elevatorFloorLedsRef.current = elevatorVisuals.floorLeds;
  elevatorNFloorsRef.current = departments.length;
  // Reset elevator to penthouse on every rebuild
  elevatorStateRef.current = {
    floorIndex: 0,
    targetFloorIndex: 0,
    carY: getFloorCarY(0, departments.length),
    idleTicks: 0,
    doorProgress: 0,
    doorPhase: "closed",
  };

  // ── 6. Seasonal particles (masked to interior — no exterior wall overflow) ──
  if (seasonalParticleRef.current) {
    destroySeasonalParticles(seasonalParticleRef.current);
    seasonalParticleRef.current = null;
  }
  if (seasonKeyRef.current !== "none") {
    const interiorW = FLOOR_W - ELEVATOR_W - WALL_W * 2; // 300
    seasonalParticleRef.current = createSeasonalParticleState(
      app.stage as Container,
      seasonKeyRef.current,
      interiorW,
      totalH,
    );
    // Clip particles to interior — prevents bleed onto exterior walls.
    // Add mask as a child of the particle container (PixiJS v8 pattern).
    // The mask is in container-local space: x=0..interiorW clips particles to interior.
    const pMask = new Graphics();
    pMask.rect(0, 0, interiorW, totalH).fill(0xffffff);
    seasonalParticleRef.current.container.addChild(pMask);
    seasonalParticleRef.current.container.mask = pMask;
    // Shift container so particle X=0 aligns with interior left edge (WALL_W in stage space)
    seasonalParticleRef.current.container.x = WALL_W;
  }

  // ── 7. Visitor layer (inter-dept agent movement) ──────────────
  if (visitorLayerRef.current && !visitorLayerRef.current.destroyed) {
    visitorLayerRef.current.destroy({ children: true });
  }
  const visitorLayer = new Container();
  app.stage.addChild(visitorLayer as Container);
  visitorLayerRef.current = visitorLayer;
  if (visitorTickRef.current) {
    visitorTickRef.current.visitors = [];
    visitorTickRef.current.spawnCooldown = 120;
  }

  // ── 8. Final layers (CEO sprite, delivery layer, highlight) ──
  buildFinalLayers({
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
  });
}
