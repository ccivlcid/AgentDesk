import { useMemo } from "react";
import type { Agent, Department, Task, SubAgent, CrossDeptDelivery, MeetingPresence } from "../../types";
import { NODE_WIDTH, NODE_HEIGHT, NODE_GAP, MEETING_RADIUS } from "./constants";

const DEPT_COL_PAD_X = 20;
const DEPT_COL_TOTAL_W = NODE_WIDTH + DEPT_COL_PAD_X * 2;
const DEPT_COL_GAP = 24;
const DEPT_HEADER_H = 44;
const DEPT_PAD_BOTTOM = 20;

export interface FlowNode {
  id: string;
  type: "agent" | "sub-agent";
  x: number;
  y: number;
  width: number;
  height: number;
  agent: Agent;
  deptLabel: string;
  deptColor: string;
  deptIcon: string;
  inMeeting: boolean;
  parentId?: string;
}

export interface FlowEdge {
  id: string;
  from: { nodeId: string; x: number; y: number };
  to: { nodeId: string; x: number; y: number };
  type: "delegation" | "sub-agent" | "cross_dept" | "meeting" | "collab" | "task_pipeline";
  label?: string;
  animated?: boolean;
  path: string;
  deptColor?: string;
}

export interface MeetingClusterData {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  agentIds: string[];
  phase: "kickoff" | "review";
  taskId: string | null;
}

export interface DeptGroupData {
  id: string;
  label: string;
  color: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  agentCount: number;
  workingCount: number;
}

interface UseFlowLayoutOptions {
  agents: Agent[];
  departments: Department[];
  tasks: Task[];
  subAgents: SubAgent[];
  crossDeptDeliveries: CrossDeptDelivery[];
  meetingPresences: MeetingPresence[];
  projectAgentIds?: Set<string>;
  filter: "all" | "working" | "meeting";
}

function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dy = to.y - from.y;
  const cp = Math.abs(dy) * 0.4 + 20;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + cp}, ${to.x} ${to.y - cp}, ${to.x} ${to.y}`;
}

function statusRank(status: string): number {
  switch (status) {
    case "working": return 0;
    case "idle":    return 1;
    case "break":   return 2;
    default:        return 3;
  }
}

export function useFlowLayout({
  agents,
  departments,
  tasks,
  subAgents,
  crossDeptDeliveries,
  meetingPresences,
  projectAgentIds,
  filter,
}: UseFlowLayoutOptions) {
  return useMemo(() => {
    // 1. Project scope filter
    const projectAgents = projectAgentIds && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents;

    // 2. View filter
    const inMeetingIds = new Set(meetingPresences.map((m) => m.agent_id));
    let filteredAgents = projectAgents;
    if (filter === "working") {
      filteredAgents = projectAgents.filter((a) => a.status === "working");
    } else if (filter === "meeting") {
      filteredAgents = projectAgents.filter((a) => inMeetingIds.has(a.id));
    }

    if (filteredAgents.length === 0) {
      return { nodes: [], edges: [], meetings: [], deptGroups: [] };
    }

    const deptMap = new Map(departments.map((d) => [d.id, d]));

    // 3. Separate meeting vs non-meeting agents
    const meetingAgentIds = new Set(meetingPresences.map((m) => m.agent_id));
    const nonMeetingAgents = filteredAgents.filter((a) => !meetingAgentIds.has(a.id));

    // 4. Build sub-agent parent map
    const subAgentParentMap = new Map<string, SubAgent[]>();
    for (const sub of subAgents) {
      const parentExists = nonMeetingAgents.some((a) => a.id === sub.parentAgentId);
      if (!parentExists) continue;
      if (!subAgentParentMap.has(sub.parentAgentId)) subAgentParentMap.set(sub.parentAgentId, []);
      subAgentParentMap.get(sub.parentAgentId)!.push(sub);
    }

    // 5. Group agents by department (dept column layout)
    const sortedDepts = [...departments].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
    const deptAgentsMap = new Map<string, Agent[]>();
    for (const dept of sortedDepts) deptAgentsMap.set(dept.id, []);

    const noDeptList: Agent[] = [];
    for (const agent of nonMeetingAgents) {
      if (agent.department_id && deptAgentsMap.has(agent.department_id)) {
        deptAgentsMap.get(agent.department_id)!.push(agent);
      } else {
        noDeptList.push(agent);
      }
    }
    if (noDeptList.length > 0) {
      deptAgentsMap.set("__none__", noDeptList);
    }

    // Sort agents within each dept: working first, then idle, break, offline
    for (const [, list] of deptAgentsMap) {
      list.sort((a, b) => statusRank(a.status) - statusRank(b.status));
    }

    // 6. Layout: assign positions column by column
    const agentPositions = new Map<string, { x: number; y: number }>();
    const nodes: FlowNode[] = [];
    const deptGroups: DeptGroupData[] = [];

    let colX = 0;
    const deptOrder = [...sortedDepts.map((d) => d.id), ...(noDeptList.length > 0 ? ["__none__"] : [])];

    for (const deptId of deptOrder) {
      const agentsInDept = deptAgentsMap.get(deptId);
      if (!agentsInDept || agentsInDept.length === 0) continue;

      const dept = deptMap.get(deptId);
      const deptColor = dept?.color ?? "#64748b";
      const deptLabel = dept?.name ?? "Other";
      const deptIcon = dept?.icon ?? "🏢";

      let rowY = DEPT_HEADER_H;

      for (const agent of agentsInDept) {
        const nodeX = colX + DEPT_COL_PAD_X;
        const nodeY = rowY;

        // Center position (used by edges)
        agentPositions.set(agent.id, {
          x: nodeX + NODE_WIDTH / 2,
          y: nodeY + NODE_HEIGHT / 2,
        });

        nodes.push({
          id: agent.id,
          type: "agent",
          x: nodeX,
          y: nodeY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          agent,
          deptLabel,
          deptColor,
          deptIcon,
          inMeeting: false,
        });

        rowY += NODE_HEIGHT + NODE_GAP;

        // Sub-agents below parent
        const subs = subAgentParentMap.get(agent.id) ?? [];
        const subW = Math.round(NODE_WIDTH * 0.72);
        const subH = Math.round(NODE_HEIGHT * 0.72);
        for (let si = 0; si < subs.length; si++) {
          const sub = subs[si];
          const subX = nodeX + si * (subW + 8);
          const subY = rowY;
          const subAgent: Agent = {
            id: sub.id,
            name: sub.task.slice(0, 24),
            name_ko: sub.task.slice(0, 24),
            department_id: agent.department_id,
            role: "intern",
            cli_provider: agent.cli_provider,
            avatar_emoji: "🤖",
            status: sub.status === "working" ? "working" : "idle",
            current_task_id: null,
            stats_tasks_done: 0,
            stats_xp: 0,
            created_at: 0,
          };
          nodes.push({
            id: sub.id,
            type: "sub-agent",
            x: subX,
            y: subY,
            width: subW,
            height: subH,
            agent: subAgent,
            deptLabel,
            deptColor,
            deptIcon,
            inMeeting: false,
            parentId: agent.id,
          });
          agentPositions.set(sub.id, { x: subX + subW / 2, y: subY + subH / 2 });
        }
        if (subs.length > 0) {
          rowY += subH + NODE_GAP;
        }
      }

      const groupH = rowY + DEPT_PAD_BOTTOM;
      deptGroups.push({
        id: deptId,
        label: deptLabel,
        color: deptColor,
        icon: deptIcon,
        x: colX,
        y: 0,
        width: DEPT_COL_TOTAL_W,
        height: groupH,
        agentCount: agentsInDept.length,
        workingCount: agentsInDept.filter((a) => a.status === "working").length,
      });

      colX += DEPT_COL_TOTAL_W + DEPT_COL_GAP;
    }

    // 7. Meeting clusters (below main columns)
    const meetingGroups = new Map<string, MeetingPresence[]>();
    for (const mp of meetingPresences) {
      const key = `${mp.task_id ?? "none"}-${mp.phase}`;
      if (!meetingGroups.has(key)) meetingGroups.set(key, []);
      meetingGroups.get(key)!.push(mp);
    }

    const maxGroupH = deptGroups.reduce((m, g) => Math.max(m, g.height), 0);
    const meetingBaseY = maxGroupH + 60;
    const meetings: MeetingClusterData[] = [];
    let meetingOffsetX = 0;

    for (const [key, members] of meetingGroups) {
      const firstMember = members[0];
      const cx = meetingOffsetX;
      const cy = meetingBaseY;

      members.forEach((mp, idx) => {
        const angle = (idx / members.length) * 2 * Math.PI - Math.PI / 2;
        const ax = cx + Math.cos(angle) * (MEETING_RADIUS * 0.6);
        const ay = cy + Math.sin(angle) * (MEETING_RADIUS * 0.6);
        agentPositions.set(mp.agent_id, { x: ax, y: ay });

        const agent = agents.find((a) => a.id === mp.agent_id);
        if (agent) {
          const dept = agent.department_id ? deptMap.get(agent.department_id) : undefined;
          nodes.push({
            id: agent.id,
            type: "agent",
            x: ax - NODE_WIDTH / 2,
            y: ay - NODE_HEIGHT / 2,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            agent,
            deptLabel: dept?.name ?? "",
            deptColor: dept?.color ?? "var(--th-text-muted)",
            deptIcon: dept?.icon ?? "🏢",
            inMeeting: true,
          });
        }
      });

      meetings.push({
        id: key,
        cx,
        cy,
        radius: MEETING_RADIUS,
        agentIds: members.map((m) => m.agent_id),
        phase: firstMember.phase,
        taskId: firstMember.task_id,
      });

      meetingOffsetX += MEETING_RADIUS * 2 + NODE_GAP * 2;
    }

    // 8. Build edges
    const edges: FlowEdge[] = [];

    // Sub-agent edges
    for (const sub of subAgents) {
      const fromPos = agentPositions.get(sub.parentAgentId);
      const toPos = agentPositions.get(sub.id);
      if (!fromPos || !toPos) continue;
      const from = { x: fromPos.x, y: fromPos.y + NODE_HEIGHT / 2 };
      const to = { x: toPos.x, y: toPos.y - NODE_HEIGHT * 0.35 };
      edges.push({
        id: `sub-${sub.parentAgentId}-${sub.id}`,
        from: { nodeId: sub.parentAgentId, x: from.x, y: from.y },
        to: { nodeId: sub.id, x: to.x, y: to.y },
        type: "sub-agent",
        animated: sub.status === "working",
        path: bezierPath(from, to),
      });
    }

    // Cross-dept delivery edges
    for (const delivery of crossDeptDeliveries) {
      const fromPos = agentPositions.get(delivery.fromAgentId);
      const toPos = agentPositions.get(delivery.toAgentId);
      if (!fromPos || !toPos) continue;
      const fromAgent = agents.find((a) => a.id === delivery.fromAgentId);
      const dept = fromAgent?.department_id ? deptMap.get(fromAgent.department_id) : undefined;
      const from = { x: fromPos.x + NODE_WIDTH / 2, y: fromPos.y };
      const to = { x: toPos.x - NODE_WIDTH / 2, y: toPos.y };
      edges.push({
        id: `cross-${delivery.id}`,
        from: { nodeId: delivery.fromAgentId, x: from.x, y: from.y },
        to: { nodeId: delivery.toAgentId, x: to.x, y: to.y },
        type: "cross_dept",
        animated: true,
        path: bezierPath(from, to),
        deptColor: dept?.color,
      });
    }

    // Meeting edges
    for (const cluster of meetings) {
      const memberIds = cluster.agentIds;
      for (let i = 0; i < memberIds.length; i++) {
        for (let j = i + 1; j < memberIds.length; j++) {
          const fromPos = agentPositions.get(memberIds[i]);
          const toPos = agentPositions.get(memberIds[j]);
          if (!fromPos || !toPos) continue;
          edges.push({
            id: `meeting-${cluster.id}-${i}-${j}`,
            from: { nodeId: memberIds[i], x: fromPos.x, y: fromPos.y },
            to: { nodeId: memberIds[j], x: toPos.x, y: toPos.y },
            type: "meeting",
            path: bezierPath(fromPos, toPos),
          });
        }
      }
    }

    // Delegation edges
    const delegationEdgeSet = new Set<string>();
    for (const task of tasks) {
      if (!task.assigned_agent_id || !task.handoff_to_agent_id) continue;
      if (task.assigned_agent_id === task.handoff_to_agent_id) continue;
      const fromPos = agentPositions.get(task.assigned_agent_id);
      const toPos = agentPositions.get(task.handoff_to_agent_id);
      if (!fromPos || !toPos) continue;
      const edgeId = `delegation-${task.assigned_agent_id}-${task.handoff_to_agent_id}`;
      if (delegationEdgeSet.has(edgeId)) continue;
      delegationEdgeSet.add(edgeId);
      const from = { x: fromPos.x + NODE_WIDTH / 2, y: fromPos.y };
      const to = { x: toPos.x - NODE_WIDTH / 2, y: toPos.y };
      edges.push({
        id: edgeId,
        from: { nodeId: task.assigned_agent_id, x: from.x, y: from.y },
        to: { nodeId: task.handoff_to_agent_id, x: to.x, y: to.y },
        type: "delegation",
        animated: task.status === "in_progress" || task.status === "done",
        path: bezierPath(from, to),
      });
    }

    // Collaboration edges
    const collabEdgeSet = new Set<string>();
    const projectActiveAgents = new Map<string, string[]>();
    for (const task of tasks) {
      if (!task.project_id || !task.assigned_agent_id) continue;
      if (task.status !== "in_progress" && task.status !== "collaborating") continue;
      if (!agentPositions.has(task.assigned_agent_id)) continue;
      if (!projectActiveAgents.has(task.project_id)) projectActiveAgents.set(task.project_id, []);
      projectActiveAgents.get(task.project_id)!.push(task.assigned_agent_id);
    }
    for (const [, agentIds] of projectActiveAgents) {
      const unique = [...new Set(agentIds)];
      if (unique.length < 2) continue;
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          const a = unique[i], b = unique[j];
          const edgeId = [a, b].sort().join("-collab-");
          if (collabEdgeSet.has(edgeId)) continue;
          if (delegationEdgeSet.has(`delegation-${a}-${b}`) || delegationEdgeSet.has(`delegation-${b}-${a}`)) continue;
          collabEdgeSet.add(edgeId);
          const fromPos = agentPositions.get(a)!;
          const toPos = agentPositions.get(b)!;
          const from = { x: fromPos.x, y: fromPos.y + NODE_HEIGHT / 2 };
          const to = { x: toPos.x, y: toPos.y - NODE_HEIGHT / 2 };
          edges.push({
            id: edgeId,
            from: { nodeId: a, x: from.x, y: from.y },
            to: { nodeId: b, x: to.x, y: to.y },
            type: "collab",
            animated: false,
            path: bezierPath(from, to),
          });
        }
      }
    }

    // ── Task pipeline edges: show execution order between agents in current project ──
    if (projectAgentIds && projectAgentIds.size > 0) {
      const projectTasks = tasks
        .filter((tk) => tk.project_id && tk.assigned_agent_id && agentPositions.has(tk.assigned_agent_id))
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));

      const pipelineEdgeSet = new Set<string>();
      for (let i = 0; i < projectTasks.length - 1; i++) {
        const curr = projectTasks[i];
        const next = projectTasks[i + 1];
        if (!curr.assigned_agent_id || !next.assigned_agent_id) continue;
        if (curr.assigned_agent_id === next.assigned_agent_id) continue;
        const edgeId = `pipeline-${curr.id}-${next.id}`;
        const reverseKey = `${next.assigned_agent_id}-${curr.assigned_agent_id}`;
        const forwardKey = `${curr.assigned_agent_id}-${next.assigned_agent_id}`;
        if (pipelineEdgeSet.has(forwardKey) || pipelineEdgeSet.has(reverseKey)) continue;
        pipelineEdgeSet.add(forwardKey);

        const fromPos = agentPositions.get(curr.assigned_agent_id)!;
        const toPos = agentPositions.get(next.assigned_agent_id)!;
        const from = { x: fromPos.x + NODE_WIDTH, y: fromPos.y + NODE_HEIGHT / 2 };
        const to = { x: toPos.x, y: toPos.y + NODE_HEIGHT / 2 };

        const isDone = curr.status === "done";
        const isRunning = curr.status === "in_progress" || next.status === "in_progress";

        edges.push({
          id: edgeId,
          from: { nodeId: curr.assigned_agent_id, x: from.x, y: from.y },
          to: { nodeId: next.assigned_agent_id, x: to.x, y: to.y },
          type: "task_pipeline",
          label: `${i + 1} → ${i + 2}`,
          animated: isRunning,
          path: bezierPath(from, to),
          deptColor: isDone ? "#22c55e" : isRunning ? "#f59e0b" : undefined,
        });
      }
    }

    return { nodes, edges, meetings, deptGroups };
  }, [agents, departments, tasks, subAgents, crossDeptDeliveries, meetingPresences, projectAgentIds, filter]);
}
