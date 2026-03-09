import { useMemo } from "react";
import type {
  Department,
  Agent,
  Task,
  SubAgent,
  MeetingPresence,
  CrossDeptDelivery,
  CeoOfficeCall,
} from "../../types";
import type { UiLanguage } from "../../i18n";
import { useOfficePixiRuntime } from "./useOfficePixiRuntime";
import {
  useMeetingPresenceSync,
  useCrossDeptDeliveryAnimations,
  useCeoOfficeCallAnimations,
} from "./useOfficeDeliveryEffects";
import type { useOfficeViewRefs } from "./useOfficeViewRefs";
import type { useOfficeViewInteractions } from "./useOfficeViewInteractions";

export interface UseOfficeViewTickerAndDeliveryParams {
  refs: ReturnType<typeof useOfficeViewRefs>;
  buildScene: () => void;
  interactions: ReturnType<typeof useOfficeViewInteractions>;
  cliUsageRef: { current: Record<string, { windows?: Array<{ utilization: number }> }> | null };
  meetingPresence?: MeetingPresence[];
  language: UiLanguage;
  crossDeptDeliveries?: CrossDeptDelivery[];
  onCrossDeptDeliveryProcessed?: (id: string) => void;
  ceoOfficeCalls?: CeoOfficeCall[];
  onCeoOfficeCallProcessed?: (id: string) => void;
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  unreadAgentIds?: Set<string>;
  activeMeetingTaskId?: string | null;
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  currentTheme: string;
}

export function useOfficeViewTickerAndDelivery({
  refs,
  buildScene,
  interactions,
  cliUsageRef,
  meetingPresence,
  language,
  crossDeptDeliveries,
  onCrossDeptDeliveryProcessed,
  ceoOfficeCalls,
  onCeoOfficeCallProcessed,
  departments,
  agents,
  tasks,
  subAgents,
  unreadAgentIds,
  activeMeetingTaskId,
  customDeptThemes,
  currentTheme,
}: UseOfficeViewTickerAndDeliveryParams): void {
  const tickerContext = useMemo(
    () => ({
      tickRef: refs.tickRef,
      keysRef: refs.keysRef,
      ceoPosRef: refs.ceoPosRef,
      ceoSpriteRef: refs.ceoSpriteRef,
      highlightRef: refs.highlightRef,
      animItemsRef: refs.animItemsRef,
      cliUsageRef,
      roomRectsRef: refs.roomRectsRef,
      deliveriesRef: refs.deliveriesRef,
      breakAnimItemsRef: refs.breakAnimItemsRef,
      subCloneAnimItemsRef: refs.subCloneAnimItemsRef,
      breakSteamParticlesRef: refs.breakSteamParticlesRef,
      breakBubblesRef: refs.breakBubblesRef,
      wallClocksRef: refs.wallClocksRef,
      wallClockSecondRef: refs.wallClockSecondRef,
      themeHighlightTargetIdRef: refs.themeHighlightTargetIdRef,
      ceoOfficeRectRef: refs.ceoOfficeRectRef,
      breakRoomRectRef: refs.breakRoomRectRef,
      officeWRef: refs.officeWRef,
      totalHRef: refs.totalHRef,
      dataRef: refs.dataRef,
      seasonalParticleRef: refs.seasonalParticleRef,
      ceoCustomizationRef: refs.ceoCustomizationRef,
      ceoTrailParticlesRef: refs.ceoTrailParticlesRef,
      elevatorCarRef: refs.elevatorCarRef,
      elevatorFloorDisplayRef: refs.elevatorFloorDisplayRef,
      elevatorDoorRef: refs.elevatorDoorRef,
      elevatorStateRef: refs.elevatorStateRef,
      elevatorNFloorsRef: refs.elevatorNFloorsRef,
      exteriorWindowsRef: refs.exteriorWindowsRef,
      antennaLedRef: refs.antennaLedRef,
      elevatorFloorLedsRef: refs.elevatorFloorLedsRef,
      floorGlowsRef: refs.floorGlowsRef,
      floorSelectBoxesRef: refs.floorSelectBoxesRef,
      selectedFloorIdxRef: refs.selectedFloorIdxRef,
      ceoVisitorAlertRef: refs.ceoVisitorAlertRef,
      agentPosRef: refs.agentPosRef,
      onSelectAgent: interactions.handleCanvasSelectAgent,
      visitorLayerRef: refs.visitorLayerRef,
      visitorTickRef: refs.visitorTickRef,
      themeRef: refs.themeRef,
      texturesRef: refs.texturesRef,
      spriteMapRef: refs.spriteMapRef,
      followCeoInView: interactions.followCeoInView,
      isOverviewModeRef: refs.isOverviewModeRef,
    }),
    [interactions.handleCanvasSelectAgent, interactions.followCeoInView, cliUsageRef]
  );

  useOfficePixiRuntime({
    containerRef: refs.containerRef,
    appRef: refs.appRef,
    texturesRef: refs.texturesRef,
    destroyedRef: refs.destroyedRef,
    initIdRef: refs.initIdRef,
    initDoneRef: refs.initDoneRef,
    officeWRef: refs.officeWRef,
    deliveriesRef: refs.deliveriesRef,
    dataRef: refs.dataRef,
    buildScene,
    followCeoInView: interactions.followCeoInView,
    triggerDepartmentInteract: interactions.triggerDepartmentInteract,
    keysRef: refs.keysRef,
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
    sceneRevision: refs.sceneRevision,
    deliveryLayerRef: refs.deliveryLayerRef,
    texturesRef: refs.texturesRef,
    ceoMeetingSeatsRef: refs.ceoMeetingSeatsRef,
    deliveriesRef: refs.deliveriesRef,
    spriteMapRef: refs.spriteMapRef,
  });

  useCrossDeptDeliveryAnimations({
    crossDeptDeliveries,
    language,
    onCrossDeptDeliveryProcessed,
    deliveryLayerRef: refs.deliveryLayerRef,
    texturesRef: refs.texturesRef,
    agentPosRef: refs.agentPosRef,
    spriteMapRef: refs.spriteMapRef,
    processedCrossDeptRef: refs.processedCrossDeptRef,
    deliveriesRef: refs.deliveriesRef,
  });

  useCeoOfficeCallAnimations({
    ceoOfficeCalls,
    agents,
    language,
    onCeoOfficeCallProcessed,
    deliveryLayerRef: refs.deliveryLayerRef,
    texturesRef: refs.texturesRef,
    ceoMeetingSeatsRef: refs.ceoMeetingSeatsRef,
    deliveriesRef: refs.deliveriesRef,
    spriteMapRef: refs.spriteMapRef,
    agentPosRef: refs.agentPosRef,
    processedCeoOfficeRef: refs.processedCeoOfficeRef,
  });
}
