import type { Project, Agent, Task, TaskStatus } from "../../../types";

/** 프로젝트 폴더 창 props */
export interface ProjectFolderWindowProps {
  project: Project;
  tasks: Task[];
  agents: Agent[];
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  initialX?: number;
  initialY?: number;
}

export type Tab = "files" | "tasks" | "agents" | "details" | "git" | "terminal";

/** 파일 트리 노드 (Files 탭) */
export interface FileTreeNode {
  name: string;
  type: "dir" | "file";
  path: string;
  children?: FileTreeNode[];
}

/** 터미널 탭: 프로젝트 타입 감지 결과 */
export interface ProjectRunInfo {
  type: string;
  icon: string;
  color: string;
  sections: Array<{
    title: string;
    commands: Array<{ label: string; cmd: string; description?: string }>;
  }>;
}

export type GitProvider = "github" | "gitlab";
export type CloneStep = "idle" | "cloning" | "done" | "error";

// Re-export for tab components that need TaskStatus
export type { TaskStatus };
