import { useEffect, useRef } from "react";
import { useUiStore } from "../../store/uiStore";
import type { WindowType } from "../../app/types";

export interface UseDesktopKeyboardOptions {
  jiggleMode: boolean;
  setJiggleMode: (v: boolean) => void;
  missionControlOpen: boolean;
  setMissionControlOpen: (v: boolean) => void;
  quickLookProjectId: string | null;
  setQuickLookProjectId: (v: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (v: string | null) => void;
  setOpenProjectWindowIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (v: string | null) => void;
  selectedIconIds: Set<string>;
  setSelectedIconIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setShowCommandPalette: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleDeleteProject: (projectId: string) => Promise<void>;
  removePendingDoc: (docId: string) => void;
  toggleWindow: (w: WindowType) => void;
  openCli: () => void;
}

export function useDesktopKeyboard(options: UseDesktopKeyboardOptions) {
  const {
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    quickLookProjectId,
    setQuickLookProjectId,
    selectedProjectId,
    setSelectedProjectId,
    setOpenProjectWindowIds,
    selectedAgentId,
    setSelectedAgentId,
    selectedIconIds,
    setSelectedIconIds,
    setShowCommandPalette,
    handleDeleteProject,
    removePendingDoc,
    toggleWindow,
    openCli,
  } = options;

  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        if (jiggleMode) {
          setJiggleMode(false);
          return;
        }
        if (quickLookProjectId) {
          setQuickLookProjectId(null);
          return;
        }
        if (missionControlOpen) {
          setMissionControlOpen(false);
          return;
        }
        if (selectedAgentId) {
          setSelectedAgentId(null);
          return;
        }
      }

      if ((e.ctrlKey && e.shiftKey && e.key === "K") || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }

      if (e.ctrlKey && e.key === "ArrowUp") {
        e.preventDefault();
        setMissionControlOpen(!missionControlOpen);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        const { windowFocusOrder, closeWindow: cw } = useUiStore.getState();
        const top = windowFocusOrder[windowFocusOrder.length - 1];
        if (top) cw(top);
        return;
      }

      if (isInput) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = useUiStore.getState().desktopIconLayout;
        void ids;
        const sel = [...selectedIconIds];
        if (sel.length > 0) {
          sel.forEach((id) => {
            if (id.startsWith("project-")) {
              handleDeleteProject(id.replace("project-", ""));
            } else if (id.startsWith("doc-")) {
              removePendingDoc(id.replace("doc-", ""));
            }
          });
          setSelectedIconIds(new Set());
          return;
        }
        if (selectedProjectId) {
          handleDeleteProject(selectedProjectId);
          setSelectedProjectId(null);
          return;
        }
      }

      if (e.key === "Enter" && selectedProjectId) {
        e.preventDefault();
        setOpenProjectWindowIds((prev) => new Set([...prev, selectedProjectId]));
        return;
      }

      if (e.key === "F2" && selectedProjectId) {
        e.preventDefault();
        const el = document.querySelector(
          `[data-icon-id="project-${selectedProjectId}"]`,
        ) as HTMLElement | null;
        el?.dispatchEvent(new CustomEvent("agentdesk:rename", { bubbles: true }));
        return;
      }

      if (e.key === " " && selectedProjectId) {
        e.preventDefault();
        setQuickLookProjectId(selectedProjectId);
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        toggleWindow("user-guide");
        return;
      }

      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, 800);
        return;
      }

      if (gPending.current) {
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        const map: Record<string, () => void> = {
          w: () => toggleWindow("workflow"),
          l: () => toggleWindow("library"),
          s: () => toggleWindow("settings"),
          c: () => toggleWindow("chat"),
          a: () => toggleWindow("agent-manager"),
          e: () => openCli(),
          i: () => toggleWindow("image-studio"),
          d: () => toggleWindow("dashboard"),
        };
        map[e.key]?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [
    toggleWindow,
    openCli,
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    quickLookProjectId,
    setQuickLookProjectId,
    selectedProjectId,
    setSelectedProjectId,
    setOpenProjectWindowIds,
    selectedAgentId,
    setSelectedAgentId,
    selectedIconIds,
    setSelectedIconIds,
    setShowCommandPalette,
    handleDeleteProject,
    removePendingDoc,
  ]);
}
