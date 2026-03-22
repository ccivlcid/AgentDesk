/**
 * 데스크톱 아이콘 정렬(이름순/기본) 및 그리드 스냅.
 */

import { useCallback } from "react";
import { useUiStore } from "../../store/uiStore";
import type { Project } from "../../types";
import type { DesktopIconDef } from "./DesktopIcon";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y } from "./snapToFreeCell";

export function useDesktopSortSnap(icons: DesktopIconDef[], projects: Project[]) {
  const { setDesktopIconLayout } = useUiStore();

  const arrangeIcons = useCallback(
    (sortedSystemIds: string[], sortedProjectIds: string[]) => {
      const newLayout: Record<string, { x: number; y: number }> = {};
      sortedSystemIds.forEach((id, i) => {
        newLayout[id] = { x: GRID_ORIGIN_X + i * ICON_GRID_X, y: GRID_ORIGIN_Y };
      });
      sortedProjectIds.forEach((id, i) => {
        const col = i % 9;
        const row = Math.floor(i / 9);
        newLayout[id] = { x: GRID_ORIGIN_X + col * ICON_GRID_X, y: GRID_ORIGIN_Y + ICON_GRID_Y + row * ICON_GRID_Y };
      });
      setDesktopIconLayout(newLayout);
    },
    [setDesktopIconLayout],
  );

  const sortByName = useCallback(() => {
    const sortedSystem = [...icons].sort((a, b) => a.label.localeCompare(b.label)).map((d) => d.id);
    const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => `project-${p.id}`);
    arrangeIcons(sortedSystem, sortedProjects);
  }, [icons, projects, arrangeIcons]);

  const sortByDefault = useCallback(() => {
    const systemIds = [...icons].map((d) => d.id);
    const projectIds = projects.map((p) => `project-${p.id}`);
    arrangeIcons(systemIds, projectIds);
  }, [icons, projects, arrangeIcons]);

  const snapToGrid = useCallback(() => {
    const current = useUiStore.getState().desktopIconLayout;
    const snapped: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(current)) {
      snapped[id] = {
        x: GRID_ORIGIN_X + Math.round((pos.x - GRID_ORIGIN_X) / ICON_GRID_X) * ICON_GRID_X,
        y: GRID_ORIGIN_Y + Math.round((pos.y - GRID_ORIGIN_Y) / ICON_GRID_Y) * ICON_GRID_Y,
      };
    }
    setDesktopIconLayout({ ...current, ...snapped });
  }, [setDesktopIconLayout]);

  const sortByLastUsed = useCallback(() => {
    const sortedSystem = [...icons].map((d) => d.id);
    const sortedProjects = [...projects]
      .sort((a, b) => ((b as any).updated_at ?? 0) - ((a as any).updated_at ?? 0))
      .map((p) => `project-${p.id}`);
    arrangeIcons(sortedSystem, sortedProjects);
  }, [icons, projects, arrangeIcons]);

  return { sortByName, sortByDefault, snapToGrid, sortByLastUsed };
}
