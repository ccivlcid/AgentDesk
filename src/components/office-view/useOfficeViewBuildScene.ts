import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import { buildOfficeScene } from "./buildScene";
import type { BuildOfficeSceneContext } from "./buildScene-types";
import type { CeoCustomization } from "./ceo-customization";
import type { RoomDecoration } from "./room-decoration";
import type { StyleKey } from "./drawing-styles";
import { getDrawer } from "./drawing-styles";
import type { FurnitureLayout } from "./furniture-catalog";
import type { SeasonKey } from "./seasonal-particles";
import { resolveSeasonKey } from "./seasonal-particles";

export interface UseOfficeViewBuildSceneParams extends BuildOfficeSceneContext {
  firstBuildDoneRef: MutableRefObject<boolean>;
  initDoneRef: MutableRefObject<boolean>;
  isOverviewModeRef: MutableRefObject<boolean>;
  cameraTargetRef: MutableRefObject<{ zoom: number; scrollY: number } | null>;
  setCurrentSeasonKey: (key: SeasonKey) => void;
  setDeptFloorOrder: (order: string[] | ((prev: string[]) => string[])) => void;
  deptFloorOrder: string[];
  applyCameraOverview: () => void;
  getFloorFocusZoom: () => number;
}

export function useOfficeViewBuildScene({
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
  firstBuildDoneRef,
  initDoneRef,
  isOverviewModeRef,
  cameraTargetRef,
  setCurrentSeasonKey,
  setDeptFloorOrder,
  deptFloorOrder,
  applyCameraOverview,
  getFloorFocusZoom,
}: UseOfficeViewBuildSceneParams) {
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

    if (cameraTargetRef.current) {
      appRef.current?.setCameraZoom(cameraTargetRef.current.zoom);
      appRef.current?.setCameraScroll(0, cameraTargetRef.current.scrollY);
    } else if (isFirst || wasOverview) {
      applyCameraOverview();
    } else {
      appRef.current?.setCameraZoom(getFloorFocusZoom());
    }
  }, [applyCameraOverview, getFloorFocusZoom]);

  useEffect(() => {
    const handler = (e: Event) => {
      const pref = (e as CustomEvent).detail as string;
      const newKey = resolveSeasonKey(pref as SeasonKey);
      seasonKeyRef.current = newKey;
      setCurrentSeasonKey(newKey);
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_season_change", handler);
    return () => window.removeEventListener("agentdesk_season_change", handler);
  }, [buildScene, setCurrentSeasonKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      ceoCustomizationRef.current = (e as CustomEvent).detail as CeoCustomization;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_ceo_change", handler);
    return () => window.removeEventListener("agentdesk_ceo_change", handler);
  }, [buildScene]);

  useEffect(() => {
    const handler = (e: Event) => {
      roomDecorationsRef.current = (e as CustomEvent).detail as Record<string, RoomDecoration>;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_room_decor_change", handler);
    return () => window.removeEventListener("agentdesk_room_decor_change", handler);
  }, [buildScene]);

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

  useEffect(() => {
    const handler = (e: Event) => {
      furnitureLayoutsRef.current = (e as CustomEvent).detail as FurnitureLayout;
      if (initDoneRef.current && appRef.current) buildScene();
    };
    window.addEventListener("agentdesk_furniture_change", handler);
    return () => window.removeEventListener("agentdesk_furniture_change", handler);
  }, [buildScene]);

  useEffect(() => {
    const handler = (e: Event) => {
      const order = (e as CustomEvent).detail as string[];
      setDeptFloorOrder(order);
    };
    window.addEventListener("agentdesk_dept_floor_order_change", handler);
    return () => window.removeEventListener("agentdesk_dept_floor_order_change", handler);
  }, [setDeptFloorOrder]);

  useEffect(() => {
    if (initDoneRef.current && appRef.current) buildScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFloorOrder]);

  return buildScene;
}
