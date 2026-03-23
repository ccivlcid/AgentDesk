/**
 * 데스크톱 데이터 로딩·부가 효과 (폴더 목록, Reports 뱃지, 새 폴더 포커스).
 */

import { useEffect } from "react";
import { getProjectFolders } from "../../api/project-folders";
import type { ProjectFolder } from "../../types";

export function useDesktopData(
  deps: {
    openWindows: Set<string>;
    clearUnreadReportCount: () => void;
  },
  setFolders: (v: ProjectFolder[] | ((prev: ProjectFolder[]) => ProjectFolder[])) => void,
  newFolderPos: { x: number; y: number } | null,
  newFolderInputRef: React.RefObject<HTMLInputElement | null>,
  newFolderCreatingRef: React.MutableRefObject<boolean>,
) {
  const { openWindows, clearUnreadReportCount } = deps;

  useEffect(() => {
    if (openWindows.has("reports")) clearUnreadReportCount();
  }, [openWindows, clearUnreadReportCount]);

  useEffect(() => {
    if (newFolderPos) {
      newFolderCreatingRef.current = false;
      setTimeout(() => newFolderInputRef.current?.focus(), 50);
    }
  }, [newFolderPos, newFolderInputRef, newFolderCreatingRef]);

  useEffect(() => {
    getProjectFolders().then(setFolders).catch(() => {});
  }, []);
}
