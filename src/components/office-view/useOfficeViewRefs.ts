import { useRef, useState, useMemo } from "react";
import type { Application, Container, Graphics, Text, Sprite, Texture, AnimatedSprite } from "./pixi-compat";
import type { Department, Agent, Task, MeetingPresence, SubAgent } from "../../types";
import type { ThemeMode } from "../../ThemeContext";
import { MIN_OFFICE_W, type RoomRect, type WallClockVisual } from "./model";
import type { SupportedLocale } from "./themes-locale";
import type { SeasonalParticleState, SeasonKey } from "./seasonal-particles";
import { loadSeasonPreference, resolveSeasonKey } from "./seasonal-particles";
import type { StyleKey } from "./drawing-styles";
import { loadStylePreference } from "./drawing-styles";
import type { CeoCustomization } from "./ceo-customization";
import { loadCeoCustomization } from "./ceo-customization";
import type { RoomDecoration } from "./room-decoration";
import { loadRoomDecorations } from "./room-decoration";
import type { FurnitureLayout } from "./furniture-catalog";
import { loadFurnitureLayouts } from "./furniture-catalog";
import type { VisitorTickState } from "./visitorTick";
import { createVisitorTickState } from "./visitorTick";
import type { ExteriorWindowVisual } from "./drawExteriorWalls";
import type { Delivery } from "./model";

export interface UseOfficeViewRefsParams {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  unreadAgentIds?: Set<string>;
  meetingPresence?: MeetingPresence[];
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  language: SupportedLocale;
  currentTheme: ThemeMode;
  themeHighlightTargetId?: string | null;
  activeMeetingTaskId?: string | null;
  onOpenActiveMeetingMinutes?: (taskId: string) => void;
}

export function useOfficeViewRefs({
  departments,
  agents,
  tasks,
  subAgents,
  unreadAgentIds,
  meetingPresence,
  customDeptThemes,
  language,
  currentTheme,
  themeHighlightTargetId,
  activeMeetingTaskId,
  onOpenActiveMeetingMinutes,
}: UseOfficeViewRefsParams) {
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const texturesRef = useRef<Record<string, Texture>>({});
  const destroyedRef = useRef(false);
  const initIdRef = useRef(0);
  const initDoneRef = useRef(false);
  const firstBuildDoneRef = useRef(false);
  const [sceneRevision, setSceneRevision] = useState(0);

  const cameraTargetRef = useRef<{ zoom: number; scrollY: number } | null>(null);

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
    Array<{ sprite: Container; baseX: number; baseY: number }>
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
  const [currentSeasonKey, setCurrentSeasonKey] = useState<SeasonKey>(() =>
    resolveSeasonKey(loadSeasonPreference())
  );
  const seasonKeyRef = useRef<SeasonKey>(resolveSeasonKey(loadSeasonPreference()));
  const elevatorCarRef = useRef<Container | null>(null);
  const elevatorFloorDisplayRef = useRef<Text | null>(null);
  const elevatorDoorRef = useRef<Graphics | null>(null) as React.MutableRefObject<Graphics | null>;
  const elevatorStateRef = useRef({
    floorIndex: 0,
    targetFloorIndex: 0,
    carY: 0,
    idleTicks: 0,
    doorProgress: 0,
    doorPhase: "closed" as const,
  });
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

  const [deptFloorOrder, setDeptFloorOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("agentdesk_dept_floor_order");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
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

  const dataRef = useRef({
    departments: sortedDepartments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds,
    meetingPresence,
    customDeptThemes,
  });
  dataRef.current = {
    departments: sortedDepartments,
    agents,
    tasks,
    subAgents,
    unreadAgentIds,
    meetingPresence,
    customDeptThemes,
  };

  const cbRef = useRef<{ onSelectAgent: (a: Agent) => void; onSelectDepartment: (d: Department) => void }>({
    onSelectAgent: () => {},
    onSelectDepartment: () => {},
  });
  const activeMeetingTaskIdRef = useRef<string | null>(activeMeetingTaskId ?? null);
  activeMeetingTaskIdRef.current = activeMeetingTaskId ?? null;
  const meetingMinutesOpenRef = useRef<((taskId: string) => void) | undefined>(onOpenActiveMeetingMinutes);
  meetingMinutesOpenRef.current = onOpenActiveMeetingMinutes;

  const [showVirtualPad, setShowVirtualPad] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const showVirtualPadRef = useRef(showVirtualPad);
  showVirtualPadRef.current = showVirtualPad;

  const isOverviewModeRef = useRef(true);

  return {
    themeRef,
    containerRef,
    appRef,
    texturesRef,
    destroyedRef,
    initIdRef,
    initDoneRef,
    firstBuildDoneRef,
    sceneRevision,
    setSceneRevision,
    cameraTargetRef,
    tickRef,
    keysRef,
    ceoPosRef,
    ceoSpriteRef,
    crownRef,
    ceoCustomizationRef,
    ceoTrailParticlesRef,
    highlightRef,
    animItemsRef,
    roomRectsRef,
    deliveriesRef,
    deliveryLayerRef,
    prevAssignRef,
    agentPosRef,
    processedCrossDeptRef,
    processedCeoOfficeRef,
    spriteMapRef,
    ceoMeetingSeatsRef,
    totalHRef,
    officeWRef,
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
    currentSeasonKey,
    setCurrentSeasonKey,
    elevatorCarRef,
    elevatorFloorDisplayRef,
    elevatorDoorRef,
    elevatorStateRef,
    elevatorNFloorsRef,
    exteriorWindowsRef,
    antennaLedRef,
    visitorLayerRef,
    visitorTickRef,
    elevatorFloorLedsRef,
    floorGlowsRef,
    floorSelectBoxesRef,
    selectedFloorIdxRef,
    ceoVisitorAlertRef,
    towerOffsetXRef,
    localeRef,
    themeHighlightTargetIdRef,
    deptFloorOrder,
    setDeptFloorOrder,
    sortedDepartments,
    dataRef,
    cbRef,
    activeMeetingTaskIdRef,
    meetingMinutesOpenRef,
    showVirtualPad,
    setShowVirtualPad,
    showVirtualPadRef,
    selectedAgent,
    setSelectedAgent,
    selectedDept,
    setSelectedDept,
    isOverviewModeRef,
  };
}
