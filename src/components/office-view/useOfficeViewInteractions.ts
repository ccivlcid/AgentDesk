import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Application } from "./pixi-compat";
import type { Department, Agent } from "../../types";
import { ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, BASEMENT_H, SKY_H } from "./model";
import { MOBILE_MOVE_CODES, type MobileMoveDirection } from "./model";
import type { RoomRect } from "./model";

export interface UseOfficeViewInteractionsParams {
  roomRectsRef: MutableRefObject<RoomRect[]>;
  ceoPosRef: MutableRefObject<{ x: number; y: number }>;
  dataRef: MutableRefObject<{ departments: Department[] }>;
  cbRef: MutableRefObject<{ onSelectAgent: (a: Agent) => void; onSelectDepartment: (d: Department) => void }>;
  elevatorStateRef: MutableRefObject<{ targetFloorIndex: number; idleTicks: number }>;
  selectedFloorIdxRef: MutableRefObject<number>;
  appRef: MutableRefObject<Application | null>;
  showVirtualPadRef: MutableRefObject<boolean>;
  isOverviewModeRef: MutableRefObject<boolean>;
  towerOffsetXRef: MutableRefObject<number>;
  setSelectedAgent: (agent: Agent | null) => void;
  setSelectedDept: (dept: Department | null) => void;
  scrollToFloorY: (logicalY: number, offset?: number) => void;
  exitOverviewAndScroll: (logicalY: number, offset?: number, areaH?: number) => void;
  keysRef: MutableRefObject<Record<string, boolean>>;
}

export function useOfficeViewInteractions({
  roomRectsRef,
  ceoPosRef,
  dataRef,
  cbRef,
  elevatorStateRef,
  selectedFloorIdxRef,
  appRef,
  showVirtualPadRef,
  isOverviewModeRef,
  towerOffsetXRef,
  setSelectedAgent,
  setSelectedDept,
  scrollToFloorY,
  exitOverviewAndScroll,
  keysRef,
}: UseOfficeViewInteractionsParams) {
  const handleCanvasSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedDept(null);
  }, [setSelectedAgent, setSelectedDept]);

  const handleCanvasSelectDept = useCallback(
    (dept: Department) => {
      setSelectedDept(dept);
      setSelectedAgent(null);
      const deptIdx = dataRef.current.departments.findIndex((d) => d.id === dept.id);
      if (deptIdx < 0) return;

      elevatorStateRef.current.targetFloorIndex = deptIdx + 1;
      elevatorStateRef.current.idleTicks = 0;
      selectedFloorIdxRef.current = deptIdx + 1;

      if (isOverviewModeRef.current) return;

      const logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + deptIdx * FLOOR_TOTAL_H;
      scrollToFloorY(logicalY);
    },
    [setSelectedDept, setSelectedAgent, scrollToFloorY]
  );

  const handleCallElevator = useCallback((dept: Department, _floorIdx: number) => {
    const actualIdx = dataRef.current.departments.findIndex((d) => d.id === dept.id);
    const towerFloorIdx = actualIdx >= 0 ? actualIdx + 1 : _floorIdx;
    elevatorStateRef.current.targetFloorIndex = towerFloorIdx;
    elevatorStateRef.current.idleTicks = 0;
  }, []);

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
    const app = appRef.current;
    if (!app || isOverviewModeRef.current) return;

    const ceoWorldX = towerOffsetXRef.current + ceoPosRef.current.x;
    const ceoWorldY = SKY_H + ceoPosRef.current.y;

    const vp = app.getCameraViewportSize();
    const targetX = ceoWorldX - vp.w * 0.45;
    const targetY = ceoWorldY - vp.h * 0.45;

    const { x: curX, y: curY } = app.getCameraScroll();
    const lerpFactor = 0.12;
    const nextX = curX + (targetX - curX) * lerpFactor;
    const nextY = curY + (targetY - curY) * lerpFactor;

    app.setCameraScroll(Math.max(0, nextX), Math.max(0, nextY));
  }, []);

  const handleScrollToFloor = useCallback(
    (target: "ceo" | "conf" | "basement") => {
      if (isOverviewModeRef.current) return;

      const nFloors = dataRef.current.departments.length;
      let logicalY: number;
      if (target === "ceo") {
        logicalY = ROOF_H;
      } else if (target === "conf") {
        logicalY = ROOF_H + PENTHOUSE_H;
      } else {
        logicalY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
      }

      const offset = target === "ceo" ? 0.02 : 0.1;
      const areaH = target === "ceo" ? PENTHOUSE_H : target === "conf" ? CONFERENCE_FLOOR_H : BASEMENT_H;
      exitOverviewAndScroll(logicalY, offset, areaH);
    },
    [exitOverviewAndScroll]
  );

  return {
    handleCanvasSelectAgent,
    handleCanvasSelectDept,
    handleCallElevator,
    triggerDepartmentInteract,
    setMoveDirectionPressed,
    clearVirtualMovement,
    followCeoInView,
    handleScrollToFloor,
  };
}
