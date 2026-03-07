import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { motion } from "framer-motion";
import OfficeDeptPanel from "./office-view/OfficeDeptPanel";
import { ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, BASEMENT_H } from "./office-view/model";
import OfficeAgentPanel from "./office-view/OfficeAgentPanel";
import OfficeQuickChat from "./office-view/OfficeQuickChat";
import {
  type Application,
  type Container,
  type Graphics,
  type Text,
  type Sprite,
  type Texture,
  type AnimatedSprite,
} from "pixi.js";
import { useI18n } from "../i18n";
import { useTheme, type ThemeMode } from "../ThemeContext";
import VirtualPadOverlay from "./office-view/VirtualPadOverlay";
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
  type SubCloneBurstParticle,
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
}: OfficeViewProps) {
  const { language, t } = useI18n();
  const { theme: currentTheme } = useTheme();
  const themeRef = useRef<ThemeMode>(currentTheme);
  themeRef.current = currentTheme;
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const texturesRef = useRef<Record<string, Texture>>({});
  const destroyedRef = useRef(false);
  const initIdRef = useRef(0);
  const initDoneRef = useRef(false);
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
      phase: number;
      animated?: AnimatedSprite;
      frameCount: number;
      bounceUntilTick: number;
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
      cloneVisual: Sprite;
      animated?: AnimatedSprite;
      frameCount: number;
      baseScale: number;
      baseX: number;
      baseY: number;
      phase: number;
      fireworkOffset: number;
    }>
  >([]);
  const subCloneBurstParticlesRef = useRef<SubCloneBurstParticle[]>([]);
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
  const elevatorDoorRef = useRef<import("pixi.js").Graphics | null>(null);
  const elevatorStateRef = useRef({ floorIndex: 0, targetFloorIndex: 0, carY: 0, idleTicks: 0, doorProgress: 0, doorPhase: "closed" as const });
  const elevatorNFloorsRef = useRef(0);
  const exteriorWindowsRef = useRef<ExteriorWindowVisual[]>([]);
  const antennaLedRef = useRef<import("pixi.js").Graphics | null>(null);
  const visitorLayerRef = useRef<Container | null>(null);
  const visitorTickRef = useRef<VisitorTickState | null>(createVisitorTickState());
  const elevatorFloorLedsRef = useRef<import("pixi.js").Graphics[]>([]);
  const floorGlowsRef = useRef<import("pixi.js").Graphics[]>([]);
  const floorSelectBoxesRef = useRef<import("pixi.js").Graphics[]>([]);
  const selectedFloorIdxRef = useRef<number>(0);
  const ceoVisitorAlertRef = useRef<Text | null>(null);
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
    setQuickChatAgent(agent);
  }, []);
  const handleCanvasSelectDept = useCallback((dept: import("../types").Department) => {
    setSelectedDept(dept);
    setSelectedAgent(null);
    // Send elevator to the clicked department's floor
    const deptIdx = dataRef.current.departments.findIndex((d) => d.id === dept.id);
    if (deptIdx >= 0) {
      elevatorStateRef.current.targetFloorIndex = deptIdx + 1;
      elevatorStateRef.current.idleTicks = 0;
      // Light up the amber selection box on the dept floor in the canvas
      selectedFloorIdxRef.current = deptIdx + 1;
      // Scroll canvas to center on the dept floor
      const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      const wrap = containerRef.current?.closest(".office-canvas-wrap") as HTMLElement | null;
      if (canvas && wrap && totalHRef.current > 0) {
        const logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
        const scale = canvas.clientHeight / totalHRef.current;
        const scrollY = logicalY * scale - wrap.clientHeight * 0.35;
        wrap.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
      }
    }
  }, []);

  const handleCallElevator = useCallback((_dept: import("../types").Department, floorIdx: number) => {
    elevatorStateRef.current.targetFloorIndex = floorIdx;
    elevatorStateRef.current.idleTicks = 0;
  }, []);

  const handleScrollToFloor = useCallback((target: "ceo" | "conf" | "basement") => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    const wrap = containerRef.current?.closest(".office-canvas-wrap") as HTMLElement | null;
    if (!canvas || !wrap || totalHRef.current <= 0) return;
    const nFloors = dataRef.current.departments.length;
    let logicalY: number;
    if (target === "ceo") {
      logicalY = 0; // scroll to very top — penthouse is at ROOF_H
    } else if (target === "conf") {
      logicalY = ROOF_H + PENTHOUSE_H;
    } else {
      logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
    }
    const scale = canvas.clientHeight / totalHRef.current;
    const scrollY = logicalY * scale - wrap.clientHeight * 0.1;
    wrap.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
  }, []);

  const cbRef = useRef({ onSelectAgent: handleCanvasSelectAgent, onSelectDepartment: handleCanvasSelectDept });
  cbRef.current = { onSelectAgent: handleCanvasSelectAgent, onSelectDepartment: handleCanvasSelectDept };
  const activeMeetingTaskIdRef = useRef<string | null>(activeMeetingTaskId ?? null);
  activeMeetingTaskIdRef.current = activeMeetingTaskId ?? null;
  const meetingMinutesOpenRef = useRef<typeof onOpenActiveMeetingMinutes>(onOpenActiveMeetingMinutes);
  meetingMinutesOpenRef.current = onOpenActiveMeetingMinutes;
  const [showVirtualPad, setShowVirtualPad] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<import("../types").Agent | null>(null);
  const [selectedDept, setSelectedDept] = useState<import("../types").Department | null>(null);
  const [quickChatAgent, setQuickChatAgent] = useState<import("../types").Agent | null>(null);
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
    const scaleX = officeWRef.current > 0 ? container.clientWidth / officeWRef.current : 1;
    const scaleY = totalHRef.current > 0 ? container.clientHeight / totalHRef.current : scaleX;

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
      const ceoInHostX = containerRect.left - hostRectX.left + ceoPosRef.current.x * scaleX;
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
      const ceoInHostY = containerRect.top - hostRectY.top + ceoPosRef.current.y * scaleY;
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

  /* ── BUILD SCENE (no app destroy, just stage clear + rebuild) ── */
  const buildScene = useCallback(() => {
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
    });
  }, []);

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
      crownRef,
      highlightRef,
      animItemsRef,
      cliUsageRef,
      roomRectsRef,
      deliveriesRef,
      breakAnimItemsRef,
      subCloneAnimItemsRef,
      subCloneBurstParticlesRef,
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
      events.push(`HQ CAPACITY ${actPct}% · ${working.length}/${agents.length} AGENTS ACTIVE`);
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

    if (idle.length > 0) events.push(`${idle.length} AGENT${idle.length > 1 ? "S" : ""} IDLE — AWAITING ASSIGNMENT`);
    if (onBreak.length > 0) events.push(`${onBreak.length} IN BREAK ROOM`);
    if (visitorCount > 0) events.push(`${visitorCount} AGENT${visitorCount > 1 ? "S" : ""} ON INTER-DEPT VISIT`);

    // Task throughput
    if (activeTasks.length > 0) events.push(`${activeTasks.length} TASK${activeTasks.length > 1 ? "S" : ""} IN PROGRESS`);
    if (doneTasks.length > 0) events.push(`${doneTasks.length} TASK${doneTasks.length > 1 ? "S" : ""} COMPLETED`);

    // Top XP agent
    const topXpAgent = [...agents].sort((a, b) => (b.stats_xp ?? 0) - (a.stats_xp ?? 0))[0];
    if (topXpAgent && (topXpAgent.stats_xp ?? 0) > 0) {
      events.push(`TOP PERFORMER: ${topXpAgent.avatar_emoji} ${topXpAgent.name} · ${(topXpAgent.stats_xp ?? 0).toLocaleString()} XP`);
    }

    if (events.length === 0) events.push("AGENTDESK HQ — ALL SYSTEMS NOMINAL");
    return events.join("     //     ");
  }, [agents, tasks, departments, visitorCount]);

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
            {agents.filter((a) => a.status === "working").length} RUNNING
          </span>
          <span className="office-toolbar-stat-chip">
            {tasks.filter((t) => t.status === "in_progress").length} TASKS
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

        {/* Center — PixiJS canvas */}
        <div className="office-canvas-wrap" style={{ position: "relative" }}>
          {/* office-canvas-frame: inline-block, sizes to canvas, amber cut-frame border */}
          <div className="office-canvas-frame">
            <div
              ref={containerRef}
              style={{ lineHeight: 0, outline: "none", display: "block" }}
              tabIndex={0}
            />
          </div>
          <VirtualPadOverlay
            showVirtualPad={showVirtualPad}
            t={t}
            onInteract={triggerDepartmentInteract}
            onSetMoveDirectionPressed={setMoveDirectionPressed}
          />

          {/* ── Global Announcement Banner ── */}
          {announcementBanner && (
            <motion.div
              key={announcementBanner.text + announcementBanner.sender}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.25, ease: "linear" }}
              className="pointer-events-none"
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

          {/* Quick chat popup — appears when agent is clicked on canvas */}
          {quickChatAgent && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                zIndex: 40,
              }}
            >
              <OfficeQuickChat
                agent={quickChatAgent}
                agents={agents}
                onClose={() => setQuickChatAgent(null)}
              />
            </div>
          )}
        </div>

        {/* Right — agent / dept detail */}
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

      {/* ── FM-style Action bar ── */}
      <div className="office-actionbar">
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">AGT</span>
          <span className="office-actionbar-stat__val" style={{ color: "#22c55e" }}>
            {agents.filter((a) => a.status === "working").length}
          </span>
          <span className="office-actionbar-stat__total">/{agents.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">TSK</span>
          <span className="office-actionbar-stat__val" style={{ color: "var(--th-accent)" }}>
            {tasks.filter((t) => t.status === "in_progress").length}
          </span>
          <span className="office-actionbar-stat__total">/{tasks.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">DEPT</span>
          <span className="office-actionbar-stat__val">{departments.length}</span>
        </div>
        <div className="office-actionbar-sep" />
        <div className="office-actionbar-stat">
          <span className="office-actionbar-stat__lbl">BREAK</span>
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
            {agents.filter((a) => a.status === "working").length > 0 ? "RUNNING" : "IDLE"}
          </span>
        </div>
      </div>
    </div>
  );
}
