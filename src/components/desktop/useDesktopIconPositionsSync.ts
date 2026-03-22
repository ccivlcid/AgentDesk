/**
 * 러버밴드 히트 테스트용 아이콘 위치 맵을 동기화.
 */

import { useEffect } from "react";
import type { Project, ProjectFolder } from "../../types";
import type { DesktopIconDef } from "./DesktopIcon";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y } from "./snapToFreeCell";

export function useDesktopIconPositionsSync(
  iconPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  allIcons: DesktopIconDef[],
  DEFAULT_ICON_POSITIONS: Record<string, { x: number; y: number }>,
  pendingDocs: Array<{ id: string; title: string; content: string }>,
  folders: ProjectFolder[],
  projects: Project[],
  _desktopIconLayout: Record<string, { x: number; y: number }>,
) {
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    allIcons.forEach((def, i) => {
      map.set(def.id, DEFAULT_ICON_POSITIONS[def.id] ?? { x: GRID_ORIGIN_X + i * ICON_GRID_X, y: GRID_ORIGIN_Y });
    });
    pendingDocs.forEach((doc, i) => {
      map.set(`doc-${doc.id}`, { x: GRID_ORIGIN_X + i * ICON_GRID_X, y: GRID_ORIGIN_Y + ICON_GRID_Y * 3 + ICON_GRID_Y });
    });
    folders.forEach((folder, i) => {
      map.set(`folder-${folder.id}`, { x: GRID_ORIGIN_X + i * ICON_GRID_X, y: GRID_ORIGIN_Y + ICON_GRID_Y * 2 });
    });
    projects.filter((p) => !p.folder_id).forEach((project, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      map.set(`project-${project.id}`, { x: GRID_ORIGIN_X + col * ICON_GRID_X, y: GRID_ORIGIN_Y + ICON_GRID_Y + row * ICON_GRID_Y });
    });
    iconPositionsRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIcons.length, pendingDocs.length, folders.length, projects.length, _desktopIconLayout]);
}
