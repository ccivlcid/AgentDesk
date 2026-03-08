import { Container, Graphics, Text, TextStyle } from "./pixi-compat";
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
  SKY_H,
  GROUND_H,
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
import { drawCityscape } from "./drawCityscape";
import { blendColor } from "./drawing-core";
import type { RoomTheme } from "./model";

/** Darken a custom theme for dark mode so bright floor/wall colors don't look washed-out. */
function darkenTheme(t: RoomTheme): RoomTheme {
  return {
    floor1: blendColor(t.floor1, 0x000000, 0.85),
    floor2: blendColor(t.floor2, 0x000000, 0.85),
    wall:   blendColor(t.wall,   0x000000, 0.70),
    accent: t.accent,
  };
}

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
    towerOffsetXRef,
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
    if (preservedDeliverySprites.has(child as Container)) continue;
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

  const rawCeoTheme = customThemes?.ceoOffice ?? DEFAULT_CEO_THEME;
  const rawBreakTheme = customThemes?.breakRoom ?? DEFAULT_BREAK_THEME;
  const ceoTheme = (isDark && customThemes?.ceoOffice) ? darkenTheme(rawCeoTheme) : rawCeoTheme;
  const breakTheme = (isDark && customThemes?.breakRoom) ? darkenTheme(rawBreakTheme) : rawBreakTheme;
  const spriteMap = buildSpriteMap(agents);
  spriteMapRef.current = spriteMap;
  const drawer = getDrawer(styleKeyRef.current);

  // ── Tower dimensions ──────────────────────────────────────────
  const nFloors = Math.max(1, departments.length);
  const totalH = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H + BASEMENT_H;

  // Store tower dimensions (used by CEO movement bounds in ticker)
  totalHRef.current = totalH;
  officeWRef.current = FLOOR_W;

  // ── Scene dimensions (tower + cityscape) ────────────────────
  const canvasEl = app.canvas as HTMLCanvasElement;
  const CITY_MARGIN = 40; // px of cityscape on each side of tower
  const SCENE_W = FLOOR_W + CITY_MARGIN * 2; // 490px — tower-centric scene
  const SCENE_H = SKY_H + totalH + GROUND_H;
  const towerX = Math.floor((SCENE_W - FLOOR_W) / 2);

  towerOffsetXRef.current = towerX;
  app.renderer.resize(SCENE_W, SCENE_H);

  // Canvas CSS sizing is controlled by OfficeView.tsx (applyFitAll / applyFloorFocus)
  canvasEl.style.display = "block";

  // ── 0. Cityscape background ────────────────────────────────
  const bgContainer = new Container();
  app.stage.addChild(bgContainer);
  drawCityscape({
    stage: bgContainer,
    sceneW: SCENE_W,
    sceneH: SCENE_H,
    towerX,
    towerW: FLOOR_W,
    skyH: SKY_H,
    groundH: GROUND_H,
    towerH: totalH,
    isDark,
  });

  // ── Tower container (all tower elements drawn in tower-local coords) ──
  const towerContainer = new Container(towerX, SKY_H);
  app.stage.addChild(towerContainer);

  // ── 1. Exterior walls (behind everything) ────────────────────
  exteriorWindowsRef.current = drawExteriorWalls({
    stage: towerContainer,
    nFloors: departments.length,
    totalH,
    isDark,
  });

  // ── 2. Roof ──────────────────────────────────────────────────
  const ceoCustomization = ceoCustomizationRef.current;
  antennaLedRef.current = drawRoof({ stage: towerContainer, floorW: FLOOR_W, roofH: ROOF_H, isDark, companyName: ceoCustomization?.companyName });

  // ── 3. Penthouse (CEO) ───────────────────────────────────────
  drawPenthouse({
    stage: towerContainer,
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

  // ── 4. Conference floor ──────────────────────────────────────
  drawConferenceFloor({
    stage: towerContainer,
    drawer,
    confY: ROOF_H + PENTHOUSE_H,
    isDark,
    activeLocale,
    activeMeetingTaskId: activeMeetingTaskIdRef.current,
    onOpenActiveMeetingMinutes: meetingMinutesOpenRef.current,
    meetingPresence: dataRef.current.meetingPresence,
    agents,
  });

  // ── 5. Department floors (top → bottom) ──────────────────────
  departments.forEach((dept, deptIdx) => {
    const floorY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
    const deptAgents = agents.filter((a) => a.department_id === dept.id);

    drawFloor({
      stage: towerContainer,
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

  // ── 5b. Floor activity glow overlays ──────────────────────────
  floorGlowsRef.current = [];
  floorSelectBoxesRef.current = [];
  const glowW = FLOOR_W - ELEVATOR_W - WALL_W * 2;
  departments.forEach((_dept, deptIdx) => {
    const floorY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
    const glowG = new Graphics();
    glowG.rect(WALL_W, floorY, glowW, FLOOR_ROOM_H).fill({ color: 0xffffff, alpha: 0.1 });
    glowG.alpha = 0;
    glowG.tint = 0x22c55e;
    towerContainer.addChild(glowG);
    floorGlowsRef.current.push(glowG);
    const selBox = new Graphics();
    selBox.rect(WALL_W + 1, floorY + 1, glowW - 2, FLOOR_ROOM_H - 2)
      .stroke({ width: 2, color: 0xf59e0b });
    selBox.alpha = 0;
    towerContainer.addChild(selBox);
    floorSelectBoxesRef.current.push(selBox);
  });
  selectedFloorIdxRef.current = 0;

  // ── 5c. CEO visitor alert text ────────────────────────────────
  {
    const alertT = new Text({
      text: "▲ VISITOR INBOUND",
      style: new TextStyle({ fontSize: 7, fill: 0xf59e0b, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 2 }),
    });
    alertT.anchor.set(0.5, 1);
    alertT.position.set(FLOOR_W / 2 - ELEVATOR_W / 2, ROOF_H + PENTHOUSE_H - 8);
    alertT.alpha = 0;
    towerContainer.addChild(alertT);
    ceoVisitorAlertRef.current = alertT;
  }

  // ── 6. Basement (Break Room) ──────────────────────────────────
  const basementY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
  drawBasement({
    stage: towerContainer,
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

  // ── 7. Elevator shaft ────────────────────────────────────────
  const shaftX = getElevatorShaftX(FLOOR_W, ELEVATOR_W, WALL_W);
  const elevatorVisuals = drawElevatorShaft({
    stage: towerContainer,
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
  elevatorStateRef.current = {
    floorIndex: 0,
    targetFloorIndex: 0,
    carY: getFloorCarY(0, departments.length),
    idleTicks: 0,
    doorProgress: 0,
    doorPhase: "closed",
  };

  // ── 8. Seasonal particles (masked to tower interior) ──────────
  if (seasonalParticleRef.current) {
    destroySeasonalParticles(seasonalParticleRef.current);
    seasonalParticleRef.current = null;
  }
  if (seasonKeyRef.current !== "none") {
    const interiorW = FLOOR_W - ELEVATOR_W - WALL_W * 2;
    seasonalParticleRef.current = createSeasonalParticleState(
      towerContainer,
      seasonKeyRef.current,
      interiorW,
      totalH,
    );
    const pMask = new Graphics();
    pMask.rect(0, 0, interiorW, totalH).fill(0xffffff);
    seasonalParticleRef.current.container.addChild(pMask);
    seasonalParticleRef.current.container.mask = pMask;
    seasonalParticleRef.current.container.x = WALL_W;
  }

  // ── 9. Visitor layer (inter-dept agent movement) ──────────────
  if (visitorLayerRef.current && !visitorLayerRef.current.destroyed) {
    visitorLayerRef.current.destroy({ children: true });
  }
  const visitorLayer = new Container();
  towerContainer.addChild(visitorLayer);
  visitorLayerRef.current = visitorLayer;
  if (visitorTickRef.current) {
    visitorTickRef.current.visitors = [];
    visitorTickRef.current.spawnCooldown = 120;
  }

  // ── 10. Final layers (CEO sprite, delivery layer, highlight) ──
  buildFinalLayers({
    app,
    stage: towerContainer,
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
