import { create } from "zustand";
import type { Task, Message, CliStatusMap, SubTask, MeetingPresence, CrossDeptDelivery, ClientOfficeCall } from "../types";
import type { TaskReportDetail } from "../api";
import type { TaskPanelTab } from "../app/types";

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

interface TaskStore {
  tasks: Task[];
  messages: Message[];
  cliStatus: CliStatusMap | null;
  subtasks: SubTask[];
  taskPanel: { taskId: string; tab: TaskPanelTab } | null;
  taskReport: TaskReportDetail | null;
  crossDeptDeliveries: CrossDeptDelivery[];
  clientOfficeCalls: ClientOfficeCall[];
  meetingPresence: MeetingPresence[];
  decisionInboxItems: import("../components/chat/decision-inbox").DecisionInboxItem[];

  setTasks: (a: SA<Task[]>) => void;
  setMessages: (a: SA<Message[]>) => void;
  setCliStatus: (a: SA<CliStatusMap | null>) => void;
  setSubtasks: (a: SA<SubTask[]>) => void;
  setTaskPanel: (a: SA<{ taskId: string; tab: TaskPanelTab } | null>) => void;
  setTaskReport: (a: SA<TaskReportDetail | null>) => void;
  setCrossDeptDeliveries: (a: SA<CrossDeptDelivery[]>) => void;
  setClientOfficeCalls: (a: SA<ClientOfficeCall[]>) => void;
  setMeetingPresence: (a: SA<MeetingPresence[]>) => void;
  setDecisionInboxItems: (a: SA<import("../components/chat/decision-inbox").DecisionInboxItem[]>) => void;
}

export const useTaskStore = create<TaskStore>()((set) => ({
  tasks: [],
  messages: [],
  cliStatus: null,
  subtasks: [],
  taskPanel: null,
  taskReport: null,
  crossDeptDeliveries: [],
  clientOfficeCalls: [],
  meetingPresence: [],
  decisionInboxItems: [],

  setTasks: (a) => set((s) => ({ tasks: apply(s.tasks, a) })),
  setMessages: (a) => set((s) => ({ messages: apply(s.messages, a) })),
  setCliStatus: (a) => set((s) => ({ cliStatus: apply(s.cliStatus, a) })),
  setSubtasks: (a) => set((s) => ({ subtasks: apply(s.subtasks, a) })),
  setTaskPanel: (a) => set((s) => ({ taskPanel: apply(s.taskPanel, a) })),
  setTaskReport: (a) => set((s) => ({ taskReport: apply(s.taskReport, a) })),
  setCrossDeptDeliveries: (a) => set((s) => ({ crossDeptDeliveries: apply(s.crossDeptDeliveries, a) })),
  setClientOfficeCalls: (a) => set((s) => ({ clientOfficeCalls: apply(s.clientOfficeCalls, a) })),
  setMeetingPresence: (a) => set((s) => ({ meetingPresence: apply(s.meetingPresence, a) })),
  setDecisionInboxItems: (a) => set((s) => ({ decisionInboxItems: apply(s.decisionInboxItems, a) })),
}));
