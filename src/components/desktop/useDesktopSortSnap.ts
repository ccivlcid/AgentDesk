/**
 * 데스크톱 아이콘 정렬(이름순/기본) 및 그리드 스냅.
 */

import { useCallback } from "react";
import { useUiStore } from "../../store/uiStore";
import type { Project } from "../../types";
import type { DesktopIconDef } from "./DesktopIcon";
import { ICON_GRID_X, ICON_GRID_Y } from "./snapToFreeCell";

export function useDesktopSortSnap(icons: DesktopIconDef[], projects: Project[]) {
  const { setDesktopIconLayout } = useUiStore();

  const arrangeIcons = useCallback(
    (sortedSystemIds: string[], sortedProjectIds: string[]) => {
      const newLayout: Record<string, { x: number; y: number }> = {};
      sortedSystemIds.forEach((id, i) => {
        newLayout[id] = { x: 24 + i * ICON_GRID_X, y: 60 };
      });
      sortedProjectIds.forEach((id, i) => {
        const col = i % 9;
        const row = Math.floor(i / 9);
        newLayout[id] = { x: 24 + col * ICON_GRID_X, y: 60 + ICON_GRID_Y + row * ICON_GRID_Y };
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
        x: 24 + Math.round((pos.x - 24) / ICON_GRID_X) * ICON_GRID_X,
        y: 60 + Math.round((pos.y - 60) / ICON_GRID_Y) * ICON_GRID_Y,
      };
    }
    setDesktopIconLayout({ ...current, ...snapped });
  }, [setDesktopIconLayout]);

  return { sortByName, sortByDefault, snapToGrid };
}
