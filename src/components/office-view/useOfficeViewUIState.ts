import { useEffect, useRef, useState } from "react";
import { ROOF_H, PENTHOUSE_H, CONFERENCE_FLOOR_H, FLOOR_TOTAL_H, SKY_H, GROUND_H } from "./model";
import type { RefObject } from "react";
import type { Application } from "./pixi-compat";

export interface UseOfficeViewUIStateParams {
  containerRef: RefObject<HTMLDivElement | null>;
  appRef: RefObject<Application | null>;
  totalHRef: RefObject<number>;
  cameraTargetRef: RefObject<{ zoom: number; scrollY: number } | null>;
  isOverviewModeRef: RefObject<boolean>;
  dataRef: RefObject<{ departments: Array<{ sort_order: number; id: string }> }>;
  visitorTickRef: RefObject<{ visitors: Array<{ destFloor: number; phase: string; agentId: string }> } | null>;
  setShowVirtualPad: (v: boolean) => void;
  showVirtualPad: boolean;
  clearVirtualMovement: () => void;
  applyCameraOverview: () => void;
  applyCameraFloorFocus: () => void;
  updateFloorIndicator: (setter: (l: string | null) => void) => void;
  exitOverviewAndScroll: (y: number, offset?: number) => void;
  scrollToFloorY: (y: number, offset?: number) => void;
  tasks: Array<{ id: string; status: string; title?: string }>;
}

export function useOfficeViewUIState({
  containerRef,
  appRef,
  totalHRef,
  cameraTargetRef,
  isOverviewModeRef,
  dataRef,
  visitorTickRef,
  setShowVirtualPad,
  showVirtualPad,
  clearVirtualMovement,
  applyCameraOverview,
  applyCameraFloorFocus,
  updateFloorIndicator,
  exitOverviewAndScroll,
  scrollToFloorY,
  tasks,
}: UseOfficeViewUIStateParams) {
  const [clockStr, setClockStr] = useState(() => {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`;
  });
  const prevTaskStatusesRef = useRef<Map<string, string>>(new Map());
  const [completionBursts, setCompletionBursts] = useState<
    Array<{ id: string; x: number; y: number; label: string }>
  >([]);
  const [floorIndicator, setFloorIndicator] = useState<string | null>(null);
  const floorIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [announcementBanner, setAnnouncementBanner] = useState<{
    text: string;
    sender: string;
  } | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [ceoIncomingCount, setCeoIncomingCount] = useState(0);
  const [visitorsByDeptId, setVisitorsByDeptId] = useState<Record<string, number>>({});
  const [visitingAgentIds, setVisitingAgentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateVirtualPadVisibility = () => {
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const isNarrowViewport = window.innerWidth <= 1024;
      setShowVirtualPad(isCoarsePointer || isNarrowViewport);
    };
    updateVirtualPadVisibility();
    window.addEventListener("resize", updateVirtualPadVisibility);
    return () => window.removeEventListener("resize", updateVirtualPadVisibility);
  }, [setShowVirtualPad]);

  useEffect(() => {
    if (!showVirtualPad) clearVirtualMovement();
  }, [showVirtualPad, clearVirtualMovement]);

  useEffect(() => () => clearVirtualMovement(), [clearVirtualMovement]);

  useEffect(() => {
    const el = containerRef.current?.parentElement?.parentElement ?? containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY > 0 && !isOverviewModeRef.current) applyCameraOverview();
        else if (e.deltaY < 0 && isOverviewModeRef.current) applyCameraFloorFocus();
        return;
      }
      if (isOverviewModeRef.current) return;
      e.preventDefault();
      cameraTargetRef.current = null;
      const app = appRef.current;
      if (!app) return;
      const { y: curY } = app.getCameraScroll();
      const zoom = app.getCameraZoom();
      const scrollDelta = (e.deltaY / zoom) * 1.5;
      const sceneH = totalHRef.current + SKY_H + GROUND_H;
      const vp = app.getCameraViewportSize();
      const maxScrollY = Math.max(0, sceneH - vp.h);
      app.setCameraScroll(0, Math.min(maxScrollY, Math.max(0, curY + scrollDelta)));
      updateFloorIndicator(setFloorIndicator);
      if (floorIndicatorTimerRef.current) clearTimeout(floorIndicatorTimerRef.current);
      floorIndicatorTimerRef.current = setTimeout(() => setFloorIndicator(null), 1200);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyCameraOverview, applyCameraFloorFocus, updateFloorIndicator]);

  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.code === "Escape") {
        e.preventDefault();
        if (!isOverviewModeRef.current) applyCameraOverview();
      } else if (e.code === "Home") {
        e.preventDefault();
        if (isOverviewModeRef.current) exitOverviewAndScroll(0, 0);
        else scrollToFloorY(0, 0);
      } else if (e.code === "End") {
        e.preventDefault();
        const nFloors = dataRef.current.departments.length;
        const basementY = ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H;
        if (isOverviewModeRef.current) exitOverviewAndScroll(basementY, 0.5);
        else scrollToFloorY(basementY, 0.5);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyCameraOverview, exitOverviewAndScroll, scrollToFloorY]);

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

  useEffect(() => {
    const inboundPhases = new Set([
      "walk_to_elev",
      "fading_out",
      "in_elev",
      "fading_in",
      "walk_to_dest",
      "at_dest",
    ]);
    const timer = setInterval(() => {
      const visitors = visitorTickRef.current?.visitors ?? [];
      setVisitorCount(visitors.length);
      setCeoIncomingCount(
        visitors.filter((v) => v.destFloor === 0 && inboundPhases.has(v.phase)).length
      );
      const sortedDepts = [...(dataRef.current.departments ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const byDeptId: Record<string, number> = {};
      for (const v of visitors) {
        if (
          v.destFloor >= 1 &&
          v.destFloor <= sortedDepts.length &&
          inboundPhases.has(v.phase)
        ) {
          const dept = sortedDepts[v.destFloor - 1];
          if (dept) byDeptId[dept.id] = (byDeptId[dept.id] ?? 0) + 1;
        }
      }
      setVisitorsByDeptId(byDeptId);
      setVisitingAgentIds(new Set(visitors.map((v) => v.agentId)));
      const n = new Date();
      setClockStr(
        `${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    clockStr,
    completionBursts,
    floorIndicator,
    announcementBanner,
    visitorCount,
    ceoIncomingCount,
    visitorsByDeptId,
    visitingAgentIds,
  };
}
