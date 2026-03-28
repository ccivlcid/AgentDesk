import { create } from "zustand";
import type { Task, CliStatusMap, SubTask, MeetingPresence } from "../types";
import type { TaskPanelTab } from "../app/types";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";

// SA<T>: setter가 값 직접 전달과 함수형 업데이트(prev => next) 둘 다 받을 수 있게 하는 유니온 타입.
// React의 useState setter와 동일한 패턴으로, WebSocket 이벤트 핸들러에서
// 이전 상태 기반 업데이트(예: 배열 append)를 stale closure 없이 처리할 수 있다.
type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

interface TaskStore {
  tasks: Task[];                  // 전체 태스크 목록 (칸반 보드, 스케줄, 모니터링에 사용)
  cliStatus: CliStatusMap | null; // CLI 프로세스별 실행 상태 맵 (provider → status)
  subtasks: SubTask[];            // 서브태스크 목록 (태스크 패널 하위 항목)
  taskPanel: { taskId: string; tab: TaskPanelTab } | null; // 열린 태스크 패널 (터미널/미팅 분)
  meetingPresence: MeetingPresence[];        // 미팅 참여자 현황 (실시간 싱크)
  decisionInboxItems: DecisionInboxItem[]; // 결재 inbox

  setTasks: (a: SA<Task[]>) => void;
  setCliStatus: (a: SA<CliStatusMap | null>) => void;
  setSubtasks: (a: SA<SubTask[]>) => void;
  setTaskPanel: (a: SA<{ taskId: string; tab: TaskPanelTab } | null>) => void;
  setMeetingPresence: (a: SA<MeetingPresence[]>) => void;
  setDecisionInboxItems: (a: SA<DecisionInboxItem[]>) => void;
}

export const useTaskStore = create<TaskStore>()((set) => ({
  tasks: [],
  cliStatus: null,
  subtasks: [],
  taskPanel: null,
  meetingPresence: [],
  decisionInboxItems: [],

  setTasks: (a) => set((s) => ({ tasks: apply(s.tasks, a) })),
  setCliStatus: (a) => set((s) => ({ cliStatus: apply(s.cliStatus, a) })),
  setSubtasks: (a) => set((s) => ({ subtasks: apply(s.subtasks, a) })),
  setTaskPanel: (a) => set((s) => ({ taskPanel: apply(s.taskPanel, a) })),
  setMeetingPresence: (a) => set((s) => ({ meetingPresence: apply(s.meetingPresence, a) })),
  setDecisionInboxItems: (a) => set((s) => ({ decisionInboxItems: apply(s.decisionInboxItems, a) })),
}));
