import { create } from "zustand";
import type { Category, Project } from "../types";

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

const LS_KEY = "agentdesk_current_project";

function readProjectIdFromStorage(): string | null {
  try { return window.localStorage.getItem(LS_KEY) ?? null; } catch { return null; }
}

interface ProjectStore {
  categories: Category[];
  projects: Project[];
  currentProjectId: string | null;
  projectAgentIds: Set<string>;
  projectAgentsLoaded: boolean;
  showProjectCreate: boolean;
  projectCreateBusy: boolean;
  showCreateTaskAfterCreate: boolean;

  setCategories: (a: SA<Category[]>) => void;
  setProjects: (a: SA<Project[]>) => void;
  setCurrentProjectId: (id: string | null) => void;
  setProjectAgentIds: (a: SA<Set<string>>) => void;
  setProjectAgentsLoaded: (a: SA<boolean>) => void;
  setShowProjectCreate: (a: SA<boolean>) => void;
  setProjectCreateBusy: (a: SA<boolean>) => void;
  setShowCreateTaskAfterCreate: (a: SA<boolean>) => void;
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  categories: [],
  projects: [],
  currentProjectId: readProjectIdFromStorage(),
  projectAgentIds: new Set(),
  projectAgentsLoaded: false,
  showProjectCreate: false,
  projectCreateBusy: false,
  showCreateTaskAfterCreate: false,

  setCategories: (a) => set((s) => ({ categories: apply(s.categories, a) })),
  setProjects: (a) => set((s) => ({ projects: apply(s.projects, a) })),
  setCurrentProjectId: (id) => {
    if (id) { try { window.localStorage.setItem(LS_KEY, id); } catch { /* ignore */ } }
    set({ currentProjectId: id });
  },
  setProjectAgentIds: (a) => set((s) => ({ projectAgentIds: apply(s.projectAgentIds, a) })),
  setProjectAgentsLoaded: (a) => set((s) => ({ projectAgentsLoaded: apply(s.projectAgentsLoaded, a) })),
  setShowProjectCreate: (a) => set((s) => ({ showProjectCreate: apply(s.showProjectCreate, a) })),
  setProjectCreateBusy: (a) => set((s) => ({ projectCreateBusy: apply(s.projectCreateBusy, a) })),
  setShowCreateTaskAfterCreate: (a) => set((s) => ({ showCreateTaskAfterCreate: apply(s.showCreateTaskAfterCreate, a) })),
}));
