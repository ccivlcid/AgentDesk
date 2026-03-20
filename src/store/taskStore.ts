import { create } from "zustand";
import type { Task, Message, CliStatusMap, SubTask, MeetingPresence, CrossDeptDelivery, ClientOfficeCall } from "../types";
import type { TaskReportDetail } from "../api";
import type { TaskPanelTab } from "../app/types";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";

// SA<T>: setter가 값 직접 전달과 함수형 업데이트(prev => next) 둘 다 받을 수 있게 하는 유니온 타입.
// React의 useState setter와 동일한 패턴으로, WebSocket 이벤트 핸들러에서
// 이전 상태 기반 업데이트(예: 배열 append)를 stale closure 없이 처리할 수 있다.
type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

interface TaskStore {
  tasks: Task[];                  // 전체 태스크 목록 (칸반 보드, 스케줄, 모니터링에 사용)
  messages: Message[];            // 채팅 메시지 목록 (에이전트 채팅 패널)
  cliStatus: CliStatusMap | null; // CLI 프로세스별 실행 상태 맵 (provider → status)
  subtasks: SubTask[];            // 서브태스크 목록 (태스크 패널 하위 항목)
  taskPanel: { taskId: string; tab: TaskPanelTab } | null; // 열린 태스크 패널 (터미널/미팅 분)
  taskReport: TaskReportDetail | null;    // 태스크 완료 보고서 (보고서 뷰어 오버레이)
  crossDeptDeliveries: CrossDeptDelivery[];  // 부서 간 산출물 전달 목록
  clientOfficeCalls: ClientOfficeCall[];     // 클라이언트 오피스 통화 기록
  meetingPresence: MeetingPresence[];        // 미팅 참여자 현황 (실시간 싱크)
  decisionInboxItems: DecisionInboxItem[]; // 결재 inbox

  setTasks: (a: SA<Task[]>) => void;
  setMessages: (a: SA<Message[]>) => void;
  setCliStatus: (a: SA<CliStatusMap | null>) => void;
  setSubtasks: (a: SA<SubTask[]>) => void;
  setTaskPanel: (a: SA<{ taskId: string; tab: TaskPanelTab } | null>) => void;
  setTaskReport: (a: SA<TaskReportDetail | null>) => void;
  setCrossDeptDeliveries: (a: SA<CrossDeptDelivery[]>) => void;
  setClientOfficeCalls: (a: SA<ClientOfficeCall[]>) => void;
  setMeetingPresence: (a: SA<MeetingPresence[]>) => void;
  setDecisionInboxItems: (a: SA<DecisionInboxItem[]>) => void;
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
