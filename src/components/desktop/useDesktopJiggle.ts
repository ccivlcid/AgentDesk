/**
 * 데스크톱 빈 영역 롱프레스 → Jiggle 모드 진입 및 클릭 시 메뉴 정리·해제.
 */

import type React from "react";
import { useRef, useCallback } from "react";

type SetCtxMenu = (v: { x: number; y: number } | null) => void;
type SetProjectCtxMenu = (v: { x: number; y: number; projectId: string; projectName: string } | null) => void;
type SetCfCtxMenu = (v: { x: number; y: number; featureId: string; featureName: string } | null) => void;

export interface UseDesktopJiggleParams {
  jiggleMode: boolean;
  setJiggleMode: (v: boolean) => void;
  setCtxMenu: SetCtxMenu;
  setProjectCtxMenu: SetProjectCtxMenu;
  setCfCtxMenu: SetCfCtxMenu;
}

export function useDesktopJiggle(params: UseDesktopJiggleParams) {
  const { jiggleMode, setJiggleMode, setCtxMenu, setProjectCtxMenu, setCfCtxMenu } = params;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMoved = useRef(false);
  const longPressStartPos = useRef({ x: 0, y: 0 });

  const onDesktopMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-no-ctx]")) return;
      longPressMoved.current = false;
      longPressStartPos.current = { x: e.clientX, y: e.clientY };
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        if (!longPressMoved.current) setJiggleMode(true);
      }, 600);
    },
    [setJiggleMode],
  );

  const onDesktopMouseMove = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - longPressStartPos.current.x;
    const dy = e.clientY - longPressStartPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      longPressMoved.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }, []);

  const onDesktopMouseUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      setCtxMenu(null);
      setProjectCtxMenu(null);
      setCfCtxMenu(null);
      if (jiggleMode && !(e.target as HTMLElement).closest("[data-no-ctx]")) {
        setJiggleMode(false);
      }
    },
    [jiggleMode, setJiggleMode, setCtxMenu, setProjectCtxMenu, setCfCtxMenu],
  );

  return { onDesktopMouseDown, onDesktopMouseMove, onDesktopMouseUp, onDesktopClick };
}
