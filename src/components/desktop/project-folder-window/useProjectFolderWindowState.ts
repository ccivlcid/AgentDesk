import { useState, useRef, useCallback, useEffect } from "react";
import { useProjectStore } from "../../../store/projectStore";
import type { Project, Agent, Task } from "../../../types";
import type { Tab } from "./types";

export function useProjectFolderWindowState(
  project: Project,
  tasks: Task[],
  agents: Agent[],
  initialX: number,
  initialY: number,
) {
  const [tab, setTab] = useState<Tab>("files");
  const { currentProjectId, setCurrentProjectId } = useProjectStore();
  const isActive = currentProjectId === project.id;
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: 860, h: 560 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const [assignedAgentIds, setAssignedAgentIds] = useState<Set<string>>(
    new Set(project.assigned_agent_ids ?? []),
  );
  useEffect(() => {
    fetch(`/api/projects/${project.id}/agents`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { agents: Array<{ id: string }> } | null) => {
        if (data?.agents) setAssignedAgentIds(new Set(data.agents.map((a) => a.id)));
      })
      .catch(() => {});
  }, [project.id]);

  const projectTasks = tasks.filter((t) => t.project_id === project.id && !t.hidden);
  const projectAgents = assignedAgentIds.size > 0
    ? agents.filter((a) => assignedAgentIds.has(a.id))
    : [];

  const statusCounts = projectTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragging.current) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing.current) {
        setSize({
          w: Math.max(520, resizeStart.current.w + e.clientX - resizeStart.current.x),
          h: Math.max(360, resizeStart.current.h + e.clientY - resizeStart.current.y),
        });
      }
    }
    function onMouseUp() {
      dragging.current = false;
      resizing.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  }, [size]);

  const activeTasks = projectTasks.filter((t) => t.status === "in_progress" || t.status === "collaborating");
  const doneTasks = projectTasks.filter((t) => t.status === "done");

  return {
    tab,
    setTab,
    isActive,
    pos,
    size,
    onTitleMouseDown,
    onResizeMouseDown,
    projectTasks,
    projectAgents,
    statusCounts,
    activeTasks,
    doneTasks,
    setCurrentProjectId,
  };
}
