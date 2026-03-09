import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { motion } from "framer-motion";
import OfficeDeptPanel from "./office-view/OfficeDeptPanel";
import { ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, BASEMENT_H, FLOOR_W, SKY_H, GROUND_H } from "./office-view/model";
import OfficeAgentPanel from "./office-view/OfficeAgentPanel";
import {
  type Application,
  type Container,
  type Graphics,
  type Text,
  type Sprite,
  type Texture,
  type AnimatedSprite,
} from "./office-view/pixi-compat";
import { useI18n } from "../i18n";
import { useTheme, type ThemeMode } from "../ThemeContext";
import VirtualPadOverlay from "./office-view/VirtualPadOverlay";
import OfficeMinimap from "./office-view/OfficeMinimap";
import OfficeOverviewBars from "./office-view/OfficeOverviewBars";
import { usePackVocab } from "../pack-identity/vocabulary";
import PackHud from "./hud/PackHud";
import {
  type OfficeViewProps,
  type Delivery,
  type RoomRect,
  type WallClockVisual,
  canScrollOnAxis,
  findScrollContainer,
  MIN_OFFICE_W,
  MOBILE_MOVE_CODES,
  type MobileMoveDirection,
} from "./office-view/model";
import { type SupportedLocale } from "./office-view/themes-locale";
import { useCliUsage } from "./office-view/useCliUsage";
import {
  useMeetingPresenceSync,
  useCrossDeptDeliveryAnimations,
  useCeoOfficeCallAnimations,
} from "./office-view/useOfficeDeliveryEffects";
import { useOfficePixiRuntime } from "./office-view/useOfficePixiRuntime";
import { buildOfficeScene } from "./office-view/buildScene";
import type { SeasonalParticleState, SeasonKey } from "./office-view/seasonal-particles";
import { loadSeasonPreference, resolveSeasonKey } from "./office-view/seasonal-particles";
import { type StyleKey, loadStylePreference, getDrawer } from "./office-view/drawing-styles";
import { type CeoCustomization, loadCeoCustomization } from "./office-view/ceo-customization";
import { type RoomDecoration, loadRoomDecorations } from "./office-view/room-decoration";
import { type FurnitureLayout, loadFurnitureLayouts } from "./office-view/furniture-catalog";
import { type VisitorTickState, createVisitorTickState } from "./office-view/visitorTick";
import type { ExteriorWindowVisual } from "./office-view/drawExteriorWalls";

export default function OfficeView({
  departments,
  agents,
  tasks,
  subAgents,
  meetingPresence,
  activeMeetingTaskId,
  unreadAgentIds,
  crossDeptDeliveries,
  onCrossDeptDeliveryProcessed,
  ceoOfficeCalls,
  onCeoOfficeCallProcessed,
  onOpenActiveMeetingMinutes,
  customDeptThemes,
  themeHighlightTargetId,
  onSelectAgent,
  onSelectDepartment,
  cliStatus: cliStatusProp,
  cliUsage: cliUsageProp,
  cliUsageRef: cliUsageRefProp,
  cliUsageRefreshing: cliUsageRefreshingProp,
  onRefreshCliUsage: onRefreshCliUsageProp,
  onOpenRoomManager,
  activeWorkflowPackKey,
}: OfficeViewProps) {
  const { language, t } = useI18n();
  const packVocab = usePackVocab(activeWorkflowPackKey ?? "development");
  const { theme: currentTheme } = useTheme();
  const themeRef = useRef<ThemeMode>(currentTheme);
  themeRef.current = currentTheme;
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const texturesRef = useRef<Record<string, Texture>>({});
  const destroyedRef = useRef(false);
  const initIdRef = useRef(0);
  const initDoneRef = useRef(false);
  const firstBuildDoneRef = useRef(false);
  const [sceneRevision, setSceneRevision] = useState(0);

  const cliUsageFromHook = useCliUsage(tasks);
  const cliStatus = cliStatusProp ?? cliUsageFromHook.cliStatus;
  const cliUsage = cliUsageProp ?? cliUsageFromHook.cliUsage;
  const cliUsageRef = cliUsageRefProp ?? cliUsageFromHook.cliUsageRef;
  const cliUsageRefreshing = cliUsageRefreshingProp ?? cliUsageFromHook.refreshing;
  const onRefreshCliUsage = onRefreshCliUsageProp ?? cliUsageFromHook.handleRefreshUsage;

  // Animation state refs
  const tickRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const ceoPosRef = useRef({ x: 180, y: 60 });
  const ceoSpriteRef = useRef<Container | null>(null);
  const crownRef = useRef<Text | null>(null);
  const ceoCustomizationRef = useRef<CeoCustomization>(loadCeoCustomization());
  const ceoTrailParticlesRef = useRef<Container | null>(null);
  const highlightRef = useRef<Graphics | null>(null);
  const animItemsRef = useRef<
    Array<{
      sprite: Container;
      status: string;
      baseX: number;
      baseY: number;
      particles: Container;
      agentId?: string;
      cliProvider?: string;
      deskG?: Graphics;
      bedG?: Graphics;
      blanketG?: Graphics;
      personaGlow?: Graphics;
      phase: number;
      animated?: AnimatedSprite;
      frameCount: number;
      bounceUntilTick: number;
      moodIcon?: Text;
      idleTicks: number;
    }>
  >([]);
  const roomRectsRef = useRef<RoomRect[]>([]);
  const deliveriesRef = useRef<Delivery[]>([]);
  const deliveryLayerRef = useRef<Container | null>(null);
  const prevAssignRef = useRef<Set<string>>(new Set());
  const agentPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const processedCrossDeptRef = useRef<Set<string>>(new Set());
  const processedCeoOfficeRef = useRef<Set<string>>(new Set());
  const spriteMapRef = useRef<Map<string, number>>(new Map());
  const ceoMeetingSeatsRef = useRef<Array<{ x: number; y: number }>>([]);
  const totalHRef = useRef(600);
  const officeWRef = useRef(MIN_OFFICE_W);
  const ceoOfficeRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const breakRoomRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const breakAnimItemsRef = useRef<
    Array<{
      sprite: Container;
      baseX: number;
      baseY: number;
    }>
  >([]);
  const subCloneAnimItemsRef = useRef<
    Array<{
      container: Container;
      aura: Graphics;
      cloneVisual: Sprite | AnimatedSprite;
      animated?: AnimatedSprite;
      frameCount: number;
      baseScale: number;
      baseX: number;
      baseY: number;
      phase: number;
      fireworkOffset: number;
    }>
  >([]);
  const subCloneSnapshotRef = useRef<Map<string, { parentAgentId: string; x: number; y: number }>>(new Map());
  const breakSteamParticlesRef = useRef<Container | null>(null);
  const breakBubblesRef = useRef<Container[]>([]);
  const wallClocksRef = useRef<WallClockVisual[]>([]);
  const wallClockSecondRef = useRef(-1);
  const roomDecorationsRef = useRef<Record<string, RoomDecoration>>(loadRoomDecorations());
  const furnitureLayoutsRef = useRef<FurnitureLayout>(loadFurnitureLayouts());
  const styleKeyRef = useRef<StyleKey>(loadStylePreference());
  const seasonalParticleRef = useRef<SeasonalParticleState | null>(null);
  const [currentSeasonKey, setCurrentSeasonKey] = useState<SeasonKey>(() => resolveSeasonKey(loadSeasonPreference()));
  const seasonKeyRef = useRef<SeasonKey>(resolveSeasonKey(loadSeasonPreference()));
  const elevatorCarRef = useRef<Container | null>(null);
  const elevatorFloorDisplayRef = useRef<Text | null>(null);
  const elevatorDoorRef = useRef<Graphics | null>(null) as React.MutableRefObject<Graphics | null>;
  const elevatorStateRef = useRef({ floorIndex: 0, targetFloorIndex: 0, carY: 0, idleTicks: 0, doorProgress: 0, doorPhase: "closed" as const });
  const elevatorNFloorsRef = useRef(0);
  const exteriorWindowsRef = useRef<ExteriorWindowVisual[]>([]);
  const antennaLedRef = useRef<Graphics | null>(null) as React.MutableRefObject<Graphics | null>;
  const visitorLayerRef = useRef<Container | null>(null);
  const visitorTickRef = useRef<VisitorTickState | null>(createVisitorTickState());
  const elevatorFloorLedsRef = useRef<Graphics[]>([]) as React.MutableRefObject<Graphics[]>;
  const floorGlowsRef = useRef<Graphics[]>([]) as React.MutableRefObject<Graphics[]>;
  const floorSelectBoxesRef = useRef<Graphics[]>([]) as React.MutableRefObject<Graphics[]>;
  const selectedFloorIdxRef = useRef<number>(0);
  const ceoVisitorAlertRef = useRef<Text | null>(null);
  const towerOffsetXRef = useRef<number>(0);
  const localeRef = useRef<SupportedLocale>(language);
  localeRef.current = language;
  const themeHighlightTargetIdRef = useRef<string | null>(themeHighlightTargetId ?? null);
  themeHighlightTargetIdRef.current = themeHighlightTargetId ?? null;

  // Dept floor order (persisted via OfficeRoomManager drag-and-drop)
  const [deptFloorOrder, setDeptFloorOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("agentdesk_dept_floor_order");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  const sortedDepartments = useMemo(() => {
    if (!deptFloorOrder.length) return departments;
    return [...departments].sort((a, b) => {
      const ai = deptFloorOrder.indexOf(a.id);
      const bi = deptFloorOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [departments, deptFloorOrder]);

  // Latest data via refs (avoids stale closures)
  const dataRef = useRef({ departments: sortedDepartments, agents, tasks, subAgents, unreadAgentIds, meetingPresence, customDeptThemes });
  dataRef.current = { departments: sortedDepartments, agents, tasks, subAgents, unreadAgentIds, meetingPresence, customDeptThemes };
  // Wrap canvas callbacks: update right panel state AND call parent
  const handleCanvasSelectAgent = useCallback((agent: import("../types").Agent) => {
    setSelectedAgent(agent);
    setSelectedDept(null);
  }, []);
  const isOverviewModeRef = useRef(true);

  const handleCallElevator = useCallback((_dept: import("../types").Department, floorIdx: number) => {
    elevatorStateRef.current.targetFloorIndex = floorIdx;
    elevatorStateRef.current.idleTicks = 0;
  }, []);

  const cbRef = useRef({ onSelectAgent: handleCanvasSelectAgent, onSelectDepartment: (_dept: import("../types").Department) => {} });
  const activeMeetingTaskIdRef = useRef<string | null>(activeMeetingTaskId ?? null);
  activeMeetingTaskIdRef.current = activeMeetingTaskId ?? null;
  const meetingMinutesOpenRef = useRef<typeof onOpenActiveMeetingMinutes>(onOpenActiveMeetingMinutes);
  meetingMinutesOpenRef.current = onOpenActiveMeetingMinutes;
  const [showVirtualPad, setShowVirtualPad] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<import("../types").Agent | null>(null);
  const [selectedDept, setSelectedDept] = useState<import("../types").Department | null>(null);
  const showVirtualPadRef = useRef(showVirtualPad);
  showVirtualPadRef.current = showVirtualPad;
  const scrollHostXRef = useRef<HTMLElement | null>(null);
  const scrollHostYRef = useRef<HTMLElement | null>(null);

  const triggerDepartmentInteract = useCallback(() => {
    const cx = ceoPosRef.current.x;
    const cy = ceoPosRef.current.y;
    for (const r of roomRectsRef.current) {
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y - 10 && cy <= r.y + r.h) {
        cbRef.current.onSelectDepartment(r.dept);
        break;
      }
    }
  }, []);

  const setMoveDirectionPressed = useCallback((direction: MobileMoveDirection, pressed: boolean) => {
    for (const code of MOBILE_MOVE_CODES[direction]) {
      keysRef.current[code] = pressed;
    }
  }, []);

  const clearVirtualMovement = useCallback(() => {
    (Object.keys(MOBILE_MOVE_CODES) as MobileMoveDirection[]).forEach((direction) => {
      setMoveDirectionPressed(direction, false);
    });
  }, [setMoveDirectionPressed]);

  const followCeoInView = useCallback(() => {
    if (!showVirtualPadRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // The canvas logical size includes cityscape; CEO pos is tower-local
    // We need to convert tower-local coords → scene coords → rendered pixels
    const canvas = container.querySelector("canvas");
    const resolution = 2;
    const logicalW = canvas ? canvas.width / resolution : officeWRef.current;
    const logicalH = canvas ? canvas.height / resolution : (totalHRef.current + SKY_H + GROUND_H);
    const scaleX = logicalW > 0 ? container.clientWidth / logicalW : 1;
    const scaleY = logicalH > 0 ? container.clientHeight / logicalH : scaleX;

    let hostX = scrollHostXRef.current;
    if (!hostX || !canScrollOnAxis(hostX, "x")) {
      hostX = findScrollContainer(container, "x") ?? (document.scrollingElement as HTMLElement | null);
      scrollHostXRef.current = hostX;
    }

    let hostY = scrollHostYRef.current;
    if (!hostY || !canScrollOnAxis(hostY, "y")) {
      hostY = findScrollContainer(container, "y") ?? (document.scrollingElement as HTMLElement | null);
      scrollHostYRef.current = hostY;
    }

    let nextLeft: number | null = null;
    let movedX = false;
    if (hostX) {
      const hostRectX = hostX.getBoundingClientRect();
      const ceoInHostX = containerRect.left - hostRectX.left + (towerOffsetXRef.current + ceoPosRef.current.x) * scaleX;
      const ceoContentX = hostX.scrollLeft + ceoInHostX;
      const targetLeft = ceoContentX - hostX.clientWidth * 0.45;
      const maxLeft = Math.max(0, hostX.scrollWidth - hostX.clientWidth);
      nextLeft = Math.max(0, Math.min(maxLeft, targetLeft));
      movedX = Math.abs(hostX.scrollLeft - nextLeft) > 1;
    }

    let nextTop: number | null = null;
    let movedY = false;
    if (hostY) {
      const hostRectY = hostY.getBoundingClientRect();
      const ceoInHostY = containerRect.top - hostRectY.top + (SKY_H + ceoPosRef.current.y) * scaleY;
      const ceoContentY = hostY.scrollTop + ceoInHostY;
      const targetTop = ceoContentY - hostY.clientHeight * 0.45;
      const maxTop = Math.max(0, hostY.scrollHeight - hostY.clientHeight);
      nextTop = Math.max(0, Math.min(maxTop, targetTop));
      movedY = Math.abs(hostY.scrollTop - nextTop) > 1;
    }

    if (hostX && hostY && hostX === hostY) {
      if (movedX || movedY) {
        hostX.scrollTo({
          left: movedX && nextLeft !== null ? nextLeft : hostX.scrollLeft,
          top: movedY && nextTop !== null ? nextTop : hostX.scrollTop,
          behavior: "auto",
        });
      }
      return;
    }

    if (hostX && movedX && nextLeft !== null) {
      hostX.scrollTo({ left: nextLeft, top: hostX.scrollTop, behavior: "auto" });
    }
    if (hostY && movedY && nextTop !== null) {
      hostY.scrollTo({ left: hostY.scrollLeft, top: nextTop, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    const updateVirtualPadVisibility = () => {
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const isNarrowViewport = window.innerWidth <= 1024;
      setShowVirtualPad(isCoarsePointer || isNarrowViewport);
    };
    updateVirtualPadVisibility();
    window.addEventListener("resize", updateVirtualPadVisibility);
    return () => window.removeEventListener("resize", updateVirtualPadVisibility);
  }, []);

  useEffect(() => {
    if (!showVirtualPad) clearVirtualMovement();
  }, [showVirtualPad, clearVirtualMovement]);

  useEffect(
    () => () => {
      clearVirtualMovement();
    },
    [clearVirtualMovement],
  );

  /* ── View mode helpers ── */
  // DOM: containerRef → .office-canvas-frame → .office-canvas-wrap (scroll host)
  const getScrollWrap = useCallback((): HTMLElement | null => {
    return (
      scrollHostYRef.current ??
      (containerRef.current?.parentElement?.parentElement as HTMLElement | null) ??
      null
    );
  }, [containerRef, scrollHostYRef]);

  /** Overview = full tower + cityscape fits in viewport.
   *  Scene canvas includes sky, tower, and ground — aspect ratio is close to viewport. */
  const applyFitAll = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const totalH = totalHRef.current;
    if (!totalH) return;
    const wrap = getScrollWrap();
    if (!wrap) return;
    const frame = containerRef.current?.parentElement as HTMLElement | null;

    const visH = wrap.clientHeight || window.innerHeight;
    const visW = wrap.clientWidth || FLOOR_W;
    // Scene dimensions (canvas logical size includes cityscape)
    const sceneH = totalH + SKY_H + GROUND_H;
    const resolution = 2;
    const sceneW = canvas.width / resolution;
    // Fit entire scene height to viewport, let width fill naturally
    const fitScale = Math.min(visW / sceneW, visH / sceneH) * 0.98;
    const canvasW = Math.floor(sceneW * fitScale);
    const canvasH = Math.floor(sceneH * fitScale);

    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    canvas.style.maxWidth = "";
    canvas.style.margin = "0 auto";
    canvas.style.display = "block";
    canvas.style.transform = "";
    canvas.style.imageRendering = "pixelated";

    if (frame) {
      frame.style.minWidth = "";
      frame.style.width = "";
      frame.style.maxWidth = "";
      frame.style.overflow = "";
      frame.style.display = "flex";
      frame.style.alignItems = "center";
      frame.style.justifyContent = "center";
      frame.style.height = "";
    }
    wrap.style.overflow = "hidden";
    wrap.scrollTop = 0;
    wrap.scrollLeft = 0;
  }, [containerRef, totalHRef, getScrollWrap]);

  /** Floor Focus = canvas fills viewport width, vertical scroll enabled */
  const applyFloorFocus = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const frame = containerRef.current?.parentElement as HTMLElement | null;
    const wrap = getScrollWrap();

    const visW = wrap?.clientWidth || 800;

    canvas.style.width = `${visW}px`;
    canvas.style.height = "auto";
    canvas.style.maxWidth = "";
    canvas.style.margin = "0";
    canvas.style.display = "block";
    canvas.style.transform = "";
    // With resolution=2, canvas has 2x physical pixels — downscale looks crisp
    canvas.style.imageRendering = "pixelated";

    if (frame) {
      frame.style.display = "block";
      frame.style.width = "";
      frame.style.minWidth = "";
      frame.style.maxWidth = "";
      frame.style.overflow = "";
      frame.style.alignItems = "";
      frame.style.justifyContent = "";
      frame.style.height = "";
    }
    if (wrap) {
      wrap.style.overflow = "auto";
      wrap.scrollLeft = 0;
    }
  }, [containerRef, getScrollWrap]);

  /** Convert tower-local logical Y to actual scroll Y (accounting for cityscape offset) */
  const scrollToFloorY = useCallback((logicalY: number, offset = 0.35) => {
    const wrap = getScrollWrap();
    if (!wrap || totalHRef.current <= 0) return;
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const renderedH = canvas.getBoundingClientRect().height;
    // Scene height = sky + tower + ground; tower-local Y needs SKY_H offset
    const sceneH = totalHRef.current + SKY_H + GROUND_H;
    const scale = renderedH / sceneH;
    const scrollY = (SKY_H + logicalY) * scale;
    wrap.scrollTo({ top: Math.max(0, scrollY - wrap.clientHeight * offset), left: 0, behavior: "smooth" });
  }, [getScrollWrap, containerRef]);

  /** Exit overview → switch to floor focus + scroll to target */
  const exitOverviewAndScroll = useCallback((logicalY: number, offset = 0.35) => {
    // Sync ref BEFORE applying CSS so that if buildScene fires (ResizeObserver)
    // it sees the correct mode and doesn't re-apply fitAll over floorFocus.
    isOverviewModeRef.current = false;
    applyFloorFocus();
    setIsOverviewMode(false);
    // Wait for layout reflow after CSS change — need enough delay for canvas resize
    setTimeout(() => {
      const wrap = getScrollWrap();
      if (!wrap || totalHRef.current <= 0) return;
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return;
      const renderedH = canvas.getBoundingClientRect().height;
      const sceneH = totalHRef.current + SKY_H + GROUND_H;
      const scale = renderedH / sceneH;
      const scrollY = (SKY_H + logicalY) * scale;
      // Instant jump first (no smooth animation from 0)
      wrap.scrollTo({ top: Math.max(0, scrollY - wrap.clientHeight * offset), left: 0, behavior: "instant" });
    }, 80);
  }, [applyFloorFocus, getScrollWrap, containerRef]);

  const handleCanvasSelectDept = useCallback((dept: import("../types").Department) => {
    setSelectedDept(dept);
    setSelectedAgent(null);
    const deptIdx = dataRef.current.departments.findIndex((d) => d.id === dept.id);
    if (deptIdx < 0) return;

    elevatorStateRef.current.targetFloorIndex = deptIdx + 1;
    elevatorStateRef.current.idleTicks = 0;
    selectedFloorIdxRef.current = deptIdx + 1;

    const logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;

    if (isOverviewModeRef.current) {
      exitOverviewAndScroll(logicalY);
    } else {
      scrollToFloorY(logicalY);
    }
  }, [exitOverviewAndScroll, scrollToFloorY]);
  cbRef.current = { onSelectAgent: handleCanvasSelectAgent, onSelectDepartment: handleCanvasSelectDept };

  const handleScrollToFloor = useCallback((target: "ceo" | "conf" | "basement") => {
    const nFloors = dataRef.current.departments.length;
    let logicalY: number;
    if (target === "ceo") {
      logicalY = 0;
    } else if (target === "conf") {
      logicalY = ROOF_H + PENTHOUSE_H;
    } else {
      logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
    }

    if (isOverviewModeRef.current) {
      exitOverviewAndScroll(logicalY, 0.1);
    } else {
      scrollToFloorY(logicalY, 0.1);
    }
  }, [exitOverviewAndScroll, scrollToFloorY]);

  /* ── BUILD SCENE (no app destroy, just stage clear + rebuild) ── */
  const buildScene = useCallback(() => {
    const isFirst = !firstBuildDoneRef.current;
    firstBuildDoneRef.current = true;
    const wasOverview = isOverviewModeRef.current;

    buildOfficeScene({
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
    });

    // Default = overview (full tower + cityscape visible)
    // Floor focus when user clicks a dept or explicitly toggles
    if (isFirst) {
      // First load: show full tower overview
      applyFitAll();
      isOverviewModeRef.current = true;
    } else if (wasOverview) {
      applyFitAll();
    } else {
      applyFloorFocus();
    }
  }, [applyFitAll, applyFloorFocus, getScrollWrap]);

  // Listen for season preference changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      const pref = (e as CustomEvent).detail as string;
      const newKey = resolveSeasonKey(pref as any);
      seasonKeyRef.current = newKey;
      setCurrentSeasonKey(newKey);
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_season_change", handler);
    return () => window.removeEventListener("agentdesk_season_change", handler);
  }, [buildScene]);

  // Listen for CEO customization changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      ceoCustomizationRef.current = (e as CustomEvent).detail as CeoCustomization;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_ceo_change", handler);
    return () => window.removeEventListener("agentdesk_ceo_change", handler);
  }, [buildScene]);

  // Listen for room decoration changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      roomDecorationsRef.current = (e as CustomEvent).detail as Record<string, RoomDecoration>;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_room_decor_change", handler);
    return () => window.removeEventListener("agentdesk_room_decor_change", handler);
  }, [buildScene]);

  // Listen for style theme changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail as StyleKey;
      styleKeyRef.current = key;
      if (!initDoneRef.current || !appRef.current) return;
      const drawer = getDrawer(key);
      if (drawer.init) {
        void drawer.init().then(() => buildScene());
      } else {
        buildScene();
      }
    };
    window.addEventListener("agentdesk_style_change", handler);
    return () => window.removeEventListener("agentdesk_style_change", handler);
  }, [buildScene]);

  // Listen for furniture catalog changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      furnitureLayoutsRef.current = (e as CustomEvent).detail as FurnitureLayout;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_furniture_change", handler);
    return () => window.removeEventListener("agentdesk_furniture_change", handler);
  }, [buildScene]);

  // Listen for dept floor order changes from OfficeRoomManager
  useEffect(() => {
    const handler = (e: Event) => {
      const order = (e as CustomEvent).detail as string[];
      setDeptFloorOrder(order);
    };
    window.addEventListener("agentdesk_dept_floor_order_change", handler);
    return () => window.removeEventListener("agentdesk_dept_floor_order_change", handler);
  }, []);

  // Rebuild canvas when dept order changes
  useEffect(() => {
    if (initDoneRef.current && appRef.current) buildScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFloorOrder]);

  const tickerContext = useMemo(
    () => ({
      tickRef,
      keysRef,
      ceoPosRef,
      ceoSpriteRef,
      highlightRef,
      animItemsRef,
      cliUsageRef,
      roomRectsRef,
      deliveriesRef,
      breakAnimItemsRef,
      subCloneAnimItemsRef,
      breakSteamParticlesRef,
      breakBubblesRef,
      wallClocksRef,
      wallClockSecondRef,
      themeHighlightTargetIdRef,
      ceoOfficeRectRef,
      breakRoomRectRef,
      officeWRef,
      totalHRef,
      dataRef,
      seasonalParticleRef,
      ceoCustomizationRef,
      ceoTrailParticlesRef,
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
      agentPosRef,
      onSelectAgent: handleCanvasSelectAgent,
      visitorLayerRef,
      visitorTickRef,
      themeRef,
      texturesRef,
      spriteMapRef,
      followCeoInView,
    }),
    [followCeoInView, cliUsageRef, handleCanvasSelectAgent],
  );

  useOfficePixiRuntime({
    containerRef,
    appRef,
    texturesRef,
    destroyedRef,
    initIdRef,
    initDoneRef,
    officeWRef,
    scrollHostXRef,
    scrollHostYRef,
    deliveriesRef,
    dataRef,
    buildScene,
    followCeoInView,
    triggerDepartmentInteract,
    keysRef,
    tickerContext,
    departments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds,
    language,
    activeMeetingTaskId,
    customDeptThemes,
    currentTheme,
  });

  useMeetingPresenceSync({
    meetingPresence,
    language,
    sceneRevision,
    deliveryLayerRef,
    texturesRef,
    ceoMeetingSeatsRef,
    deliveriesRef,
    spriteMapRef,
  });

  useCrossDeptDeliveryAnimations({
    crossDeptDeliveries,
    language,
    onCrossDeptDeliveryProcessed,
    deliveryLayerRef,
    texturesRef,
    agentPosRef,
    spriteMapRef,
    processedCrossDeptRef,
    deliveriesRef,
  });

  useCeoOfficeCallAnimations({
    ceoOfficeCalls,
    agents,
    language,
    onCeoOfficeCallProcessed,
    deliveryLayerRef,
    texturesRef,
    ceoMeetingSeatsRef,
    deliveriesRef,
    spriteMapRef,
    agentPosRef,
    processedCeoOfficeRef,
  });

  const [clockStr, setClockStr] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`;
  });

  // Task completion burst particles
  const prevTaskStatusesRef = useRef<Map<string, string>>(new Map());
  const [completionBursts, setCompletionBursts] = useState<Array<{ id: string; x: number; y: number; label: string }>>([]);
  const [isOverviewMode, setIsOverviewMode] = useState(true);
  // Keep a ref in sync so callbacks with [] deps can read the current value
  isOverviewModeRef.current = isOverviewMode;

  const handleToggleOverview = useCallback(() => {
    if (!isOverviewMode) {
      isOverviewModeRef.current = true;
      applyFitAll();
    } else {
      isOverviewModeRef.current = false;
      applyFloorFocus();
    }
    setIsOverviewMode((prev) => !prev);
  }, [isOverviewMode, applyFitAll, applyFloorFocus]);

  // ── Ctrl+Wheel zoom ───────────────────────────────────────────
  useEffect(() => {
    const wrap = getScrollWrap();
    const el = containerRef.current?.parentElement?.parentElement ?? wrap;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Zoom out → overview, zoom in → floor focus
      if (e.deltaY > 0) {
        // Zoom out
        if (!isOverviewModeRef.current) {
          isOverviewModeRef.current = true;
          applyFitAll();
          setIsOverviewMode(true);
        }
      } else {
        // Zoom in
        if (isOverviewModeRef.current) {
          isOverviewModeRef.current = false;
          applyFloorFocus();
          setIsOverviewMode(false);
        }
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [getScrollWrap, applyFitAll, applyFloorFocus]);

  // ── Keyboard shortcuts (Escape=overview, Home/End=top/bottom) ──
  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.code === "Escape") {
        e.preventDefault();
        if (!isOverviewModeRef.current) {
          isOverviewModeRef.current = true;
          applyFitAll();
          setIsOverviewMode(true);
        }
      } else if (e.code === "Home") {
        e.preventDefault();
        if (isOverviewModeRef.current) {
          exitOverviewAndScroll(0, 0);
        } else {
          scrollToFloorY(0, 0);
        }
      } else if (e.code === "End") {
        e.preventDefault();
        const nFloors = dataRef.current.departments.length;
        const basementY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
        if (isOverviewModeRef.current) {
          exitOverviewAndScroll(basementY, 0.5);
        } else {
          scrollToFloorY(basementY, 0.5);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyFitAll, applyFloorFocus, exitOverviewAndScroll, scrollToFloorY]);

  useEffect(() => {
    const prev = prevTaskStatusesRef.current;
    const newlyDone: Array<{ id: string; label: string }> = [];
    for (const task of tasks) {
      const prevStatus = prev.get(task.id);
      if (prevStatus && prevStatus !== "done" && task.status === "done") {
        newlyDone.push({ id: task.id, label: task.title?.slice(0, 20) ?? "DONE" });
      }
      prev.set(task.id, task.status);
    }
    if (newlyDone.length === 0) return;
    const bursts = newlyDone.map((t) => ({
      id: `burst-${t.id}-${Date.now()}`,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      label: t.label,
    }));
    setCompletionBursts((prev) => [...prev, ...bursts]);
    const timer = setTimeout(() => {
      setCompletionBursts((prev) => prev.filter((b) => !bursts.some((nb) => nb.id === b.id)));
    }, 1400);
    return () => clearTimeout(timer);
  }, [tasks]);

  // Poll visitor state every 1s for FM ticker + CEO incoming alert + dept visitor badges
  const [announcementBanner, setAnnouncementBanner] = useState<{ text: string; sender: string } | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string; sender: string }>).detail;
      setAnnouncementBanner(detail);
      const t = setTimeout(() => setAnnouncementBanner(null), 4500);
      return () => clearTimeout(t);
    };
    window.addEventListener("agentdesk_office_announcement", handler);
    return () => window.removeEventListener("agentdesk_office_announcement", handler);
  }, []);

  // ── Floor indicator (shows current floor during scroll) ──────
  const [floorIndicator, setFloorIndicator] = useState<string | null>(null);
  const floorIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isOverviewMode) return;
    const wrap = getScrollWrap();
    if (!wrap) return;

    const onScroll = () => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas || totalHRef.current <= 0) return;
      const renderedH = canvas.getBoundingClientRect().height;
      const sceneH = totalHRef.current + SKY_H + GROUND_H;
      const scale = renderedH / sceneH;
      // Center of viewport in tower-local Y
      const viewCenterScrollY = wrap.scrollTop + wrap.clientHeight / 2;
      const towerLocalY = viewCenterScrollY / scale - SKY_H;

      const depts = dataRef.current.departments;
      let label = "";
      if (towerLocalY < ROOF_H) {
        label = "ROOF";
      } else if (towerLocalY < ROOF_H + PENTHOUSE_H) {
        label = "P  CEO";
      } else if (towerLocalY < ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H) {
        label = "CONF";
      } else {
        const floorStartY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H;
        const basementStartY = floorStartY + depts.length * FLOOR_TOTAL_H;
        if (towerLocalY >= basementStartY) {
          label = "B1  BREAK";
        } else {
          const idx = Math.floor((towerLocalY - floorStartY) / FLOOR_TOTAL_H);
          const dept = depts[Math.min(idx, depts.length - 1)];
          label = dept ? `F${idx + 1}  ${dept.name}` : `F${idx + 1}`;
        }
      }

      setFloorIndicator(label);
      if (floorIndicatorTimerRef.current) clearTimeout(floorIndicatorTimerRef.current);
      floorIndicatorTimerRef.current = setTimeout(() => setFloorIndicator(null), 1200);
    };

    wrap.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      wrap.removeEventListener("scroll", onScroll);
      if (floorIndicatorTimerRef.current) clearTimeout(floorIndicatorTimerRef.current);
    };
  }, [isOverviewMode, getScrollWrap]);

  const [visitorCount, setVisitorCount] = useState(0);
  const [ceoIncomingCount, setCeoIncomingCount] = useState(0);
  const [visitorsByDeptId, setVisitorsByDeptId] = useState<Record<string, number>>({});
  const [visitingAgentIds, setVisitingAgentIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const inboundPhases = new Set([
      "walk_to_elev", "fading_out", "in_elev", "fading_in", "walk_to_dest", "at_dest",
    ]);
    const timer = setInterval(() => {
      const visitors = visitorTickRef.current?.visitors ?? [];
      setVisitorCount(visitors.length);
      setCeoIncomingCount(visitors.filter((v) => v.destFloor === 0 && inboundPhases.has(v.phase)).length);
      // Map destFloor → dept.id using same sort order as OfficeDeptPanel
      const sortedDepts = [...(dataRef.current.departments ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const byDeptId: Record<string, number> = {};
      for (const v of visitors) {
        if (v.destFloor >= 1 && v.destFloor <= sortedDepts.length && inboundPhases.has(v.phase)) {
          const dept = sortedDepts[v.destFloor - 1];
          if (dept) byDeptId[dept.id] = (byDeptId[dept.id] ?? 0) + 1;
        }
      }
      setVisitorsByDeptId(byDeptId);
      setVisitingAgentIds(new Set(visitors.map((v) => v.agentId)));
      const n = new Date();
      setClockStr(`${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // FM-style live event ticker — computed from current agent/task state
  const fmTickerEvents = useMemo(() => {
    const working = agents.filter((a) => a.status === "working");
    const idle = agents.filter((a) => a.status === "idle");
    const onBreak = agents.filter((a) => a.status === "break");
    const activeTasks = tasks.filter((t) => t.status === "in_progress");
    const doneTasks = tasks.filter((t) => t.status === "done");
    const events: string[] = [];

    // Headline capacity
    if (agents.length > 0) {
      const actPct = Math.round((working.length / agents.length) * 100);
      events.push(`HQ CAPACITY ${actPct}% · ${working.length}/${agents.length} ${packVocab.agents.toUpperCase()} ACTIVE`);
    }

    // Working agents + their tasks
    if (working.length > 0) {
      const sample = working.slice(0, 3);
      for (const a of sample) {
        const task = tasks.find((t) => t.assigned_agent_id === a.id && t.status === "in_progress");
        if (task) events.push(`${a.avatar_emoji} ${a.name} >> ${task.title.slice(0, 30)}`);
      }
    }

    // Dept highlights
    const topDept = departments
      .map((d) => {
        const das = agents.filter((a) => a.department_id === d.id);
        const runCount = das.filter((a) => a.status === "working").length;
        return { d, pct: das.length > 0 ? Math.round((runCount / das.length) * 100) : 0 };
      })
      .sort((a, b) => b.pct - a.pct)[0];
    if (topDept && topDept.pct > 0) {
      events.push(`${topDept.d.icon} ${topDept.d.name} LEADS AT ${topDept.pct}% ACTIVITY`);
    }

    if (idle.length > 0) events.push(`${idle.length} ${packVocab.agent.toUpperCase()}${idle.length > 1 ? "S" : ""} ${packVocab.idle.toUpperCase()} — AWAITING ASSIGNMENT`);
    if (onBreak.length > 0) events.push(`${onBreak.length} IN ${packVocab.breakRoom.toUpperCase()}`);
    if (visitorCount > 0) events.push(`${visitorCount} ${packVocab.agent.toUpperCase()}${visitorCount > 1 ? "S" : ""} ON INTER-DEPT VISIT`);

    // Task throughput
    if (activeTasks.length > 0) events.push(`${activeTasks.length} ${packVocab.task.toUpperCase()}${activeTasks.length > 1 ? "S" : ""} IN PROGRESS`);
    if (doneTasks.length > 0) events.push(`${doneTasks.length} ${packVocab.task.toUpperCase()}${doneTasks.length > 1 ? "S" : ""} ${packVocab.done.toUpperCase()}`);

    // Top XP agent
    const topXpAgent = [...agents].sort((a, b) => (b.stats_xp ?? 0) - (a.stats_xp ?? 0))[0];
    if (topXpAgent && (topXpAgent.stats_xp ?? 0) > 0) {
      events.push(`TOP PERFORMER: ${topXpAgent.avatar_emoji} ${topXpAgent.name} · ${(topXpAgent.stats_xp ?? 0).toLocaleString()} ${packVocab.xp}`);
    }

    if (events.length === 0) events.push("AGENTDESK HQ — ALL SYSTEMS NOMINAL");
    return events.join("     //     ");
  }, [agents, tasks, departments, visitorCount, packVocab]);

  return (
    <div className="office-screen">
      {/* ── Toolbar ── */}
      <div className="office-toolbar">
        <div className="office-toolbar-breadcrumb">
          <span className="office-toolbar-prompt">▶</span>
          <span className="office-toolbar-title">AgentDesk HQ</span>
          <span className="office-toolbar-sep">·</span>
          <span className="office-toolbar-sub">
            {departments.length}F Tower
          </span>
        </div>
        <div className="office-toolbar-center">
          <span className="office-toolbar-stat-chip" style={{ color: "#22c55e" }}>
            {agents.filter((a) => a.status === "working").length} {packVocab.running.toUpperCase()}
          </span>
          <span className="office-toolbar-stat-chip">
            {tasks.filter((t) => t.status === "in_progress").length} {packVocab.tasks.toUpperCase()}
          </span>
          {visitorCount > 0 && (
            <span className="office-toolbar-stat-chip" style={{ color: "var(--th-accent)" }}>
              {visitorCount} VISITING
            </span>
          )}
          {currentSeasonKey !== "none" && (
            <span className="office-toolbar-stat-chip" style={{ color: "rgba(255,255,255,0.5)" }}>
              {currentSeasonKey === "spring" ? "SPRING" : currentSeasonKey === "summer" ? "SUMMER" : currentSeasonKey === "autumn" ? "AUTUMN" : "WINTER"}
            </span>
          )}
        </div>
        <div className="office-toolbar-actions">
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.65rem", color: "var(--th-accent)", letterSpacing: 2, opacity: 0.85 }}>
            {clockStr}
          </span>
          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--th-border)", borderRadius: 2 }}>
            <button
              className="office-toolbar-btn"
              title="Zoom In (Floor Focus)"
              onClick={() => { if (isOverviewMode) { isOverviewModeRef.current = false; applyFloorFocus(); setIsOverviewMode(false); } }}
              style={{ borderRadius: "2px 0 0 2px", border: "none", padding: "2px 6px", fontSize: "0.7rem", opacity: isOverviewMode ? 1 : 0.4 }}
            >
              +
            </button>
            <button
              className="office-toolbar-btn"
              title={isOverviewMode ? "Floor Focus (Esc)" : "Overview (Esc)"}
              onClick={handleToggleOverview}
              style={{
                border: "none", borderLeft: "1px solid var(--th-border)", borderRight: "1px solid var(--th-border)",
                padding: "2px 8px", fontSize: "0.6rem", letterSpacing: 1,
                ...(isOverviewMode ? { color: "var(--th-accent)" } : {}),
              }}
            >
              {isOverviewMode ? "FIT" : "1:1"}
            </button>
            <button
              className="office-toolbar-btn"
              title="Zoom Out (Overview)"
              onClick={() => { if (!isOverviewMode) { isOverviewModeRef.current = true; applyFitAll(); setIsOverviewMode(true); } }}
              style={{ borderRadius: "0 2px 2px 0", border: "none", padding: "2px 6px", fontSize: "0.7rem", opacity: isOverviewMode ? 0.4 : 1 }}
            >
              -
            </button>
          </div>
          <button className="office-toolbar-btn" title="Season / Style settings" onClick={onOpenRoomManager}>
            Season ▾
          </button>
          <button className="office-toolbar-btn" title="Season / Style settings" onClick={onOpenRoomManager}>
            Style ▾
          </button>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="office-body">
        {/* Left — department list */}
        <motion.div
          className="office-left"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: "linear" }}
        >
          <OfficeDeptPanel
            departments={departments}
            agents={agents}
            tasks={tasks}
            selectedDeptId={selectedDept?.id ?? null}
            onSelectDept={handleCanvasSelectDept}
            onCallElevator={handleCallElevator}
            onScrollToFloor={handleScrollToFloor}
            visitorsByDeptId={visitorsByDeptId}
            cliStatus={cliStatus}
            cliUsage={cliUsage}
            cliUsageRefreshing={cliUsageRefreshing}
            onRefreshCliUsage={onRefreshCliUsage}
          />
        </motion.div>

        {/* Center — PixiJS canvas + fixed overlay for HUD elements */}
        <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="office-canvas-wrap" style={{ position: "relative" }}>
            {/* office-canvas-frame: inline-block, sizes to canvas, amber cut-frame border */}
            <div className="office-canvas-frame">
              <div
                ref={containerRef}
                style={{ lineHeight: 0, outline: "none", display: "block" }}
                tabIndex={0}
              />
            </div>
            {!isOverviewMode && (
              <VirtualPadOverlay
                showVirtualPad={showVirtualPad}
                t={t}
                onInteract={triggerDepartmentInteract}
                onSetMoveDirectionPressed={setMoveDirectionPressed}
              />
            )}

            {/* ── Semantic Zoom: Full-screen department list (overview) or hidden ── */}
            <OfficeOverviewBars
              departments={sortedDepartments}
              agents={agents}
              tasks={tasks}
              isOverviewMode={isOverviewMode}
              onClickFloor={exitOverviewAndScroll}
              containerRef={containerRef}
              totalH={totalHRef.current}
              customDeptThemes={customDeptThemes}
            />
          </div>

          {/* ── Fixed overlay (doesn't scroll with canvas) ── */}
          <div
            className="pointer-events-none"
            style={{ position: "absolute", inset: 0, zIndex: 40, overflow: "hidden" }}
          >
            {/* ── Minimap ── */}
            <div className="pointer-events-auto" style={{ position: "absolute", bottom: 8, right: 8 }}>
              <OfficeMinimap
                departments={sortedDepartments}
                totalH={totalHRef.current}
                getScrollWrap={getScrollWrap}
                containerRef={containerRef}
                isOverviewMode={isOverviewMode}
                customDeptThemes={customDeptThemes}
              />
            </div>

            {/* ── Floor Indicator (shows current floor during scroll) ── */}
            {floorIndicator && !isOverviewMode && (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 60,
                  background: "rgba(0,0,0,0.82)",
                  border: "1px solid rgba(245,158,11,0.5)",
                  borderRadius: 2,
                  padding: "4px 10px",
                  fontFamily: "var(--th-font-mono)",
                  fontSize: 11,
                  color: "var(--th-accent)",
                  letterSpacing: 1.5,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.15s",
                }}
              >
                {floorIndicator}
              </div>
            )}

            {/* ── Global Announcement Banner ── */}
            {announcementBanner && (
              <motion.div
                key={announcementBanner.text + announcementBanner.sender}
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ duration: 0.25, ease: "linear" }}
                style={{
                  position: "absolute",
                  top: 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 80,
                  minWidth: 280,
                  maxWidth: "90%",
                  background: "rgba(0,0,0,0.88)",
                  border: "1px solid rgba(245,158,11,0.6)",
                  borderRadius: "2px",
                  padding: "8px 14px",
                  pointerEvents: "none",
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--th-accent)", fontSize: 9, fontFamily: "monospace", letterSpacing: 1 }}>◉ BROADCAST</span>
                  <span style={{ color: "rgba(245,158,11,0.4)", fontSize: 9 }}>|</span>
                  <span style={{ color: "var(--th-text-primary)", fontSize: 10, fontFamily: "monospace", flex: 1 }}>{announcementBanner.text}</span>
                </div>
                <div style={{ color: "rgba(245,158,11,0.55)", fontSize: 8, fontFamily: "monospace", textAlign: "right", marginTop: 2 }}>
                  — {announcementBanner.sender}
                </div>
              </motion.div>
            )}
            {/* Task completion burst particles */}
            {completionBursts.map((burst) => (
              <div
                key={burst.id}
                className="pointer-events-none"
                style={{ position: "absolute", left: `${burst.x}%`, top: `${burst.y}%`, zIndex: 50 }}
              >
                {/* Rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, ri) => (
                  <div
                    key={ri}
                    style={{
                      position: "absolute",
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: ri % 2 === 0 ? "var(--th-accent)" : "rgb(52,211,153)",
                      animation: "task-burst-ray 1.2s ease-out forwards",
                      animationDelay: `${ri * 30}ms`,
                      transform: `rotate(${deg}deg)`,
                      transformOrigin: "1.5px 1.5px",
                    }}
                  />
                ))}
                {/* Label */}
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    top: -10,
                    whiteSpace: "nowrap",
                    fontSize: 9,
                    fontFamily: "var(--th-font-mono)",
                    color: "var(--th-accent)",
                    background: "rgba(0,0,0,0.7)",
                    padding: "1px 4px",
                    borderRadius: 2,
                    animation: "task-burst-label 1.2s ease-out forwards",
                    letterSpacing: 0.5,
                  }}
                >
                  ✓ {burst.label}
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* Right — agent / dept detail (visible >= 1280px) */}
        <motion.div
          className="office-right"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: "linear", delay: 0.04 }}
        >
          <OfficeAgentPanel
            selectedAgent={selectedAgent}
            selectedDept={selectedDept}
            agents={agents}
            tasks={tasks}
            departments={departments}
            ceoIncoming={ceoIncomingCount}
            visitingAgentIds={visitingAgentIds}
            onViewAgent={onSelectAgent}
            onViewDept={onSelectDepartment}
          />
        </motion.div>

        {/* Floating agent/dept detail (visible < 1280px when selected) */}
        {(selectedAgent || selectedDept) && (
          <div className="office-right-float">
            <button
              className="office-right-float__close"
              onClick={() => { setSelectedAgent(null); setSelectedDept(null); }}
              aria-label="Close"
            >✕</button>
            <OfficeAgentPanel
              selectedAgent={selectedAgent}
              selectedDept={selectedDept}
              agents={agents}
              tasks={tasks}
              departments={departments}
              ceoIncoming={ceoIncomingCount}
              visitingAgentIds={visitingAgentIds}
              onViewAgent={onSelectAgent}
              onViewDept={onSelectDepartment}
            />
          </div>
        )}
      </div>

      {/* ── FM Event Ticker ── */}
      <div className="office-fm-ticker" aria-label="Live event feed">
        <span className="office-fm-ticker__label">
          <span className="office-fm-ticker__dot" />
          LIVE
        </span>
        <div className="office-fm-ticker__track">
          <span className="office-fm-ticker__text">{fmTickerEvents}</span>
        </div>
      </div>

      {/* ── Pack HUD overlay ── */}
      <PackHud
        packKey={activeWorkflowPackKey ?? "development"}
        agents={agents}
        tasks={tasks}
      />

      {/* ── FM-style Action bar ── */}
      <div className="office-actionbar">
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">{packVocab.agent.slice(0, 3).toUpperCase()}</span>
          <span className="office-actionbar-stat__val" style={{ color: "#22c55e" }}>
            {agents.filter((a) => a.status === "working").length}
          </span>
          <span className="office-actionbar-stat__total">/{agents.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">{packVocab.task.slice(0, 3).toUpperCase()}</span>
          <span className="office-actionbar-stat__val" style={{ color: "var(--th-accent)" }}>
            {tasks.filter((t) => t.status === "in_progress").length}
          </span>
          <span className="office-actionbar-stat__total">/{tasks.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">{packVocab.department.slice(0, 4).toUpperCase()}</span>
          <span className="office-actionbar-stat__val">{departments.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">{packVocab.onBreak.slice(0, 5).toUpperCase()}</span>
          <span className="office-actionbar-stat__val" style={{ color: "rgba(245,158,11,0.7)" }}>
            {agents.filter((a) => a.status === "break").length}
          </span>
        </div>
        {visitorCount > 0 && (
          <>
            <div className="office-actionbar-sep" />
            <div className="office-actionbar-stat">
              <span className="office-actionbar-stat__lbl">VISIT</span>
              <span className="office-actionbar-stat__val" style={{ color: "#22c55e" }}>
                {visitorCount}
              </span>
            </div>
          </>
        )}
        <div className="office-actionbar-info" style={{ marginLeft: "auto" }}>
          <span style={{ color: agents.filter((a) => a.status === "working").length > 0 ? "#22c55e" : "var(--th-text-muted)" }}>
            {agents.filter((a) => a.status === "working").length > 0 ? packVocab.running.toUpperCase() : packVocab.idle.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
