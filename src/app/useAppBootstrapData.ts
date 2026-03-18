import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import * as api from "../api";
import { fetchCategories } from "../api/categories-dashboard";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import { detectBrowserLanguage, normalizeLanguage } from "../i18n";
import type { Agent, Category, CompanySettings, CompanyStats, Department, MeetingPresence, Project, SubTask, Task } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { ROOM_THEMES_STORAGE_KEY } from "./constants";
import { mapWorkflowDecisionItemsRaw } from "./decision-inbox";
import type { RoomThemeMap } from "./types";
import {
  isRoomThemeMap,
  isUserLanguagePinned,
  mergeSettingsWithDefaults,
  readStoredClientLanguage,
  syncClientLanguage,
} from "./utils";

type StoredRoomThemes = {
  themes: RoomThemeMap;
  hasStored: boolean;
};

type UseAppBootstrapDataParams = {
  initialRoomThemes?: StoredRoomThemes;
  hasLocalRoomThemesRef?: MutableRefObject<boolean>;
  setDepartments: Dispatch<SetStateAction<Department[]>>;
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  setLibraryAgents: Dispatch<SetStateAction<Agent[]>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setStats: Dispatch<SetStateAction<CompanyStats | null>>;
  setSettings: Dispatch<SetStateAction<CompanySettings>>;
  setSubtasks: Dispatch<SetStateAction<SubTask[]>>;
  setMeetingPresence: Dispatch<SetStateAction<MeetingPresence[]>>;
  setDecisionInboxItems: Dispatch<SetStateAction<DecisionInboxItem[]>>;
  setCustomRoomThemes?: Dispatch<SetStateAction<RoomThemeMap>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

export function useAppBootstrapData({
  initialRoomThemes,
  hasLocalRoomThemesRef,
  setDepartments,
  setAgents,
  setLibraryAgents,
  setTasks,
  setStats,
  setSettings,
  setSubtasks,
  setMeetingPresence,
  setDecisionInboxItems,
  setCustomRoomThemes,
  setCategories,
  setProjects,
  setLoading,
}: UseAppBootstrapDataParams): void {
  const fetchAll = useCallback(async () => {
    try {
      // Settings is loaded first because server-side /api/settings can trigger one-time
      // workflow-pack hydration, and we want follow-up agent/department fetches to include it.
      const sett = await api.getSettings();
      const [depts, ags, libraryAgs, tks, sts, subs, presence, decisionItems, cats, projectsResult] = await Promise.all([
        api.getDepartments(),
        api.getAgents({ includeSeed: false }),
        api.getAgents({ includeSeed: true }),
        api.getTasks(),
        api.getStats(),
        api.getActiveSubtasks(),
        api.getMeetingPresence().catch(() => []),
        api.getDecisionInbox().catch(() => []),
        fetchCategories().catch(() => []),
        api.getProjects({ page_size: 50 }).catch(() => ({ projects: [] as Project[] })),
      ]);
      setDepartments(depts);
      setAgents(ags);
      setLibraryAgents(libraryAgs);
      setTasks(tks);
      setStats(sts);
      setCategories(cats);
      setProjects(projectsResult.projects);
      const mergedSettings = mergeSettingsWithDefaults(sett);
      const autoDetectedLanguage = detectBrowserLanguage();
      const storedClientLanguage = readStoredClientLanguage();
      // 사용자가 명시적으로 언어를 설정한 경우 → localStorage 값 우선
      // 서버가 기본값(en)을 반환해도 덮어쓰지 않음
      const userPinnedLanguage = isUserLanguagePinned() && storedClientLanguage ? normalizeLanguage(storedClientLanguage) : null;
      const shouldAutoAssignLanguage =
        !isUserLanguagePinned() && !storedClientLanguage && mergedSettings.language === DEFAULT_SETTINGS.language;
      const nextSettings = userPinnedLanguage
        ? { ...mergedSettings, language: userPinnedLanguage }
        : shouldAutoAssignLanguage
        ? { ...mergedSettings, language: autoDetectedLanguage }
        : mergedSettings;

      setSettings(nextSettings);
      syncClientLanguage(nextSettings.language);
      const dbRoomThemes = isRoomThemeMap(nextSettings.roomThemes) ? nextSettings.roomThemes : undefined;

      if (hasLocalRoomThemesRef && setCustomRoomThemes && !hasLocalRoomThemesRef.current && dbRoomThemes && Object.keys(dbRoomThemes).length > 0) {
        setCustomRoomThemes(dbRoomThemes);
        hasLocalRoomThemesRef.current = true;
        try {
          window.localStorage.setItem(ROOM_THEMES_STORAGE_KEY, JSON.stringify(dbRoomThemes));
        } catch {
          // ignore quota errors
        }
      }

      if (
        hasLocalRoomThemesRef?.current &&
        initialRoomThemes &&
        Object.keys(initialRoomThemes.themes).length > 0 &&
        (!dbRoomThemes || Object.keys(dbRoomThemes).length === 0)
      ) {
        api.saveRoomThemes(initialRoomThemes.themes).catch((error) => {
          console.error("Room theme sync to DB failed:", error);
        });
      }

      if (shouldAutoAssignLanguage && mergedSettings.language !== autoDetectedLanguage) {
        api.saveSettings(nextSettings).catch((error) => {
          console.error("Auto language sync failed:", error);
        });
      }
      setSubtasks(subs);
      setMeetingPresence(presence);
      setDecisionInboxItems(mapWorkflowDecisionItemsRaw(decisionItems ?? []));
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    hasLocalRoomThemesRef,
    initialRoomThemes,
    setAgents,
    setLibraryAgents,
    setCategories,
    setCustomRoomThemes,
    setDecisionInboxItems,
    setDepartments,
    setLoading,
    setMeetingPresence,
    setProjects,
    setSettings,
    setStats,
    setSubtasks,
    setTasks,
  ]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);
}
