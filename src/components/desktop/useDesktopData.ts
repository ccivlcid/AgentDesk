/**
 * 데스크톱 데이터 로딩·부가 효과 (폴더 목록, 커스텀 피처, Reports 뱃지, 새 폴더 포커스).
 */

import { useEffect, useRef } from "react";
import { getProjectFolders } from "../../api/project-folders";
import { listCustomFeatures } from "../../api/custom-features";
import type { ProjectFolder } from "../../types";
import type { CustomFeature } from "../../types";

export function useDesktopData(
  deps: {
    openWindows: Set<string>;
    clearUnreadReportCount: () => void;
    customFeaturesTick: number;
  },
  setFolders: (v: ProjectFolder[] | ((prev: ProjectFolder[]) => ProjectFolder[])) => void,
  setCustomFeatures: (v: CustomFeature[] | ((prev: CustomFeature[]) => CustomFeature[])) => void,
  newFolderPos: { x: number; y: number } | null,
  newFolderInputRef: React.RefObject<HTMLInputElement | null>,
  newFolderCreatingRef: React.MutableRefObject<boolean>,
) {
  const { openWindows, clearUnreadReportCount, customFeaturesTick } = deps;

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

  useEffect(() => {
    listCustomFeatures()
      .then((list) => setCustomFeatures(list.filter((f) => f.status === "active" || f.status === "pending_install")))
      .catch(() => {});
  }, [customFeaturesTick, setCustomFeatures]);
}
