import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import type { Application } from "./pixi-compat";
import { FLOOR_W, SKY_H, GROUND_H, SCENE_W, ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H } from "./model";

export interface UseOfficeViewCameraParams {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  appRef: MutableRefObject<Application | null>;
  totalHRef: MutableRefObject<number>;
  dataRef: MutableRefObject<{
    departments: Array<{ id: string; name: string }>;
  }>;
  isOverviewModeRef: MutableRefObject<boolean>;
  cameraTargetRef: MutableRefObject<{ zoom: number; scrollY: number } | null>;
  setSceneRevision?: (v: number | ((prev: number) => number)) => void;
}

export function useOfficeViewCamera({
  containerRef,
  appRef,
  totalHRef,
  dataRef,
  isOverviewModeRef,
  cameraTargetRef,
}: UseOfficeViewCameraParams) {
  const [isOverviewMode, setIsOverviewMode] = useState(true);
  isOverviewModeRef.current = isOverviewMode;

  const getOverviewZoom = useCallback((): number => {
    const app = appRef.current;
    if (!app) return 1;
    const container = containerRef.current;
    const visW = container?.clientWidth || FLOOR_W;
    const visH = container?.clientHeight || 600;
    const sceneH = totalHRef.current + SKY_H + GROUND_H;
    return Math.min(visW / SCENE_W, visH / sceneH) * 0.98;
  }, []);

  const getFloorFocusZoom = useCallback((): number => {
    const container = containerRef.current;
    const visW = container?.clientWidth || FLOOR_W;
    return visW / SCENE_W;
  }, []);

  const applyCameraOverview = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const sceneH = totalHRef.current + SKY_H + GROUND_H;
    const zoom = getOverviewZoom();
    app.setCameraZoom(zoom);
    app.setCameraScroll(0, 0);
    isOverviewModeRef.current = true;
    setIsOverviewMode(true);
  }, [getOverviewZoom]);

  const applyCameraFloorFocus = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const zoom = getFloorFocusZoom();
    app.setCameraZoom(zoom);
    cameraTargetRef.current = null;
    isOverviewModeRef.current = false;
    setIsOverviewMode(false);
  }, [getFloorFocusZoom]);

  const scrollToFloorY = useCallback((logicalY: number, offset = 0.35) => {
    const app = appRef.current;
    if (!app || totalHRef.current <= 0) return;
    const vp = app.getCameraViewportSize();
    const worldY = SKY_H + logicalY;
    const scrollY = Math.max(0, worldY - vp.h * offset);
    app.setCameraScroll(0, scrollY);
    cameraTargetRef.current = { zoom: app.getCameraZoom(), scrollY };
  }, []);

  const exitOverviewAndScroll = useCallback((logicalY: number, offset = 0.35, areaH?: number) => {
    isOverviewModeRef.current = false;
    setIsOverviewMode(false);

    const payload = {
      logicalY,
      offset,
      areaH,
      totalH: totalHRef.current,
    };

    requestAnimationFrame(() => {
      const app = appRef.current;
      if (!app) return;

      const visW = containerRef.current?.clientWidth || FLOOR_W;
      const floorZoom = visW / SCENE_W;

      app.setCameraZoom(floorZoom);
      const vp = app.getCameraViewportSize();

      const sceneH = payload.totalH + SKY_H + GROUND_H;
      const worldYStart = SKY_H + payload.logicalY;
      const worldYCenter =
        worldYStart + (payload.areaH && payload.areaH > 0 ? payload.areaH / 2 : 0);
      const rawScrollY =
        payload.areaH && payload.areaH > 0
          ? worldYCenter - vp.h / 2
          : worldYStart - vp.h * payload.offset;
      const scrollY = Math.max(0, Math.min(rawScrollY, sceneH - vp.h));

      app.setCameraScroll(0, scrollY);
      cameraTargetRef.current = { zoom: floorZoom, scrollY };
    });
  }, []);

  const updateFloorIndicator = useCallback(
    (setFloorIndicator: (label: string | null) => void) => {
      const app = appRef.current;
      if (!app || totalHRef.current <= 0 || isOverviewModeRef.current) return;

      const { y: scrollY } = app.getCameraScroll();
      const vp = app.getCameraViewportSize();
      const viewCenterY = scrollY + vp.h / 2;
      const towerLocalY = viewCenterY - SKY_H;

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
    },
    []
  );

  const handleToggleOverview = useCallback(() => {
    if (!isOverviewMode) {
      applyCameraOverview();
    } else {
      applyCameraFloorFocus();
    }
  }, [isOverviewMode, applyCameraOverview, applyCameraFloorFocus]);

  return {
    isOverviewMode,
    setIsOverviewMode,
    getOverviewZoom,
    getFloorFocusZoom,
    applyCameraOverview,
    applyCameraFloorFocus,
    scrollToFloorY,
    exitOverviewAndScroll,
    updateFloorIndicator,
    handleToggleOverview,
  };
}
