import { create } from "zustand";
import type { Category, Project } from "../types";

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

const LS_KEY = "agentdesk_current_project";

function readProjectIdFromStorage(): string | null {
  try { return window.localStorage.getItem(LS_KEY) ?? null; } catch { return null; }
}

export interface PendingClarification {
  projectId: string;
  clarificationId: string;
  question: string;
}

interface ProjectStore {
  categories: Category[];
  projects: Project[];
  currentProjectId: string | null;
  projectAgentIds: Set<string>;
  projectAgentsLoaded: boolean;
  projectPmAgentId: string | null;
  showProjectCreate: boolean;
  projectCreateBusy: boolean;
  editDirectiveProjectId: string | null;
  pendingClarification: PendingClarification | null;
  clarificationBusy: boolean;

  setCategories: (a: SA<Category[]>) => void;
  setProjects: (a: SA<Project[]>) => void;
  setCurrentProjectId: (id: string | null) => void;
  setProjectAgentIds: (a: SA<Set<string>>) => void;
  setProjectAgentsLoaded: (a: SA<boolean>) => void;
  setProjectPmAgentId: (id: string | null) => void;
  setShowProjectCreate: (a: SA<boolean>) => void;
  setProjectCreateBusy: (a: SA<boolean>) => void;
  setEditDirectiveProjectId: (id: string | null) => void;
  setPendingClarification: (v: PendingClarification | null) => void;
  setClarificationBusy: (v: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  categories: [],
  projects: [],
  currentProjectId: readProjectIdFromStorage(),
  projectAgentIds: new Set(),
  projectAgentsLoaded: false,
  projectPmAgentId: null,
  showProjectCreate: false,
  projectCreateBusy: false,
  editDirectiveProjectId: null,
  pendingClarification: null,
  clarificationBusy: false,

  setCategories: (a) => set((s) => ({ categories: apply(s.categories, a) })),
  setProjects: (a) => set((s) => ({ projects: apply(s.projects, a) })),
  setCurrentProjectId: (id) => {
    if (id) { try { window.localStorage.setItem(LS_KEY, id); } catch { /* ignore */ } }
    set({ currentProjectId: id });
  },
  setProjectAgentIds: (a) => set((s) => ({ projectAgentIds: apply(s.projectAgentIds, a) })),
  setProjectAgentsLoaded: (a) => set((s) => ({ projectAgentsLoaded: apply(s.projectAgentsLoaded, a) })),
  setProjectPmAgentId: (id) => set({ projectPmAgentId: id }),
  setShowProjectCreate: (a) => set((s) => ({ showProjectCreate: apply(s.showProjectCreate, a) })),
  setProjectCreateBusy: (a) => set((s) => ({ projectCreateBusy: apply(s.projectCreateBusy, a) })),
  setEditDirectiveProjectId: (id) => set({ editDirectiveProjectId: id }),
  setPendingClarification: (v) => set({ pendingClarification: v }),
  setClarificationBusy: (v) => set({ clarificationBusy: v }),
}));
