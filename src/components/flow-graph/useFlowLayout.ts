import { useMemo } from "react";
import type { Agent, Department, Task, SubAgent, CrossDeptDelivery, MeetingPresence } from "../../types";
import { NODE_WIDTH, NODE_HEIGHT, NODE_GAP, MEETING_RADIUS } from "./constants";

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
  inMeeting: boolean;
  parentId?: string;
}

export interface FlowEdge {
  id: string;
  from: { nodeId: string; x: number; y: number };
  to: { nodeId: string; x: number; y: number };
  type: "delegation" | "sub-agent" | "cross_dept" | "meeting" | "collab";
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
    // Filter to project agents
    const projectAgents = projectAgentIds && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents;

    // Apply view filter
    const inMeetingIds = new Set(meetingPresences.map((m) => m.agent_id));
    let filteredAgents = projectAgents;
    if (filter === "working") {
      filteredAgents = projectAgents.filter((a) => a.status === "working");
    } else if (filter === "meeting") {
      filteredAgents = projectAgents.filter((a) => inMeetingIds.has(a.id));
    }

    if (filteredAgents.length === 0) {
      return { nodes: [], edges: [], meetings: [] };
    }

    const deptMap = new Map(departments.map((d) => [d.id, d]));

    // Compute degree for layout ordering (more connections = closer to center)
    const degreeMap = new Map<string, number>(filteredAgents.map((a) => [a.id, 0]));

    for (const delivery of crossDeptDeliveries) {
      if (degreeMap.has(delivery.fromAgentId)) degreeMap.set(delivery.fromAgentId, (degreeMap.get(delivery.fromAgentId) ?? 0) + 1);
      if (degreeMap.has(delivery.toAgentId)) degreeMap.set(delivery.toAgentId, (degreeMap.get(delivery.toAgentId) ?? 0) + 1);
    }
    for (const sub of subAgents) {
      if (degreeMap.has(sub.parentAgentId)) degreeMap.set(sub.parentAgentId, (degreeMap.get(sub.parentAgentId) ?? 0) + 1);
    }

    // Separate meeting agents from non-meeting agents
    const meetingAgentIds = new Set(meetingPresences.map((m) => m.agent_id));
    const nonMeetingAgents = filteredAgents.filter((a) => !meetingAgentIds.has(a.id));
    const meetingAgents = filteredAgents.filter((a) => meetingAgentIds.has(a.id));

    // Sort non-meeting agents by degree descending
    const sorted = [...nonMeetingAgents].sort((a, b) => (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0));

    // Group into rows (dynamic columns based on agent count)
    const COLS = (() => {
      const n = sorted.length;
      if (n <= 6) return Math.min(3, n);
      if (n <= 20) return 4;
      if (n <= 40) return 5;
      return 6;
    })();
    const rows: Agent[][] = [];
    for (let i = 0; i < sorted.length; i += COLS) {
      rows.push(sorted.slice(i, i + COLS));
    }

    // Assign coordinates
    const agentPositions = new Map<string, { x: number; y: number }>();
    const startX = 0;
    const startY = 0;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const rowWidth = row.length * NODE_WIDTH + (row.length - 1) * NODE_GAP;
      const rowStartX = startX - rowWidth / 2 + NODE_WIDTH / 2;
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const agent = row[colIdx];
        agentPositions.set(agent.id, {
          x: rowStartX + colIdx * (NODE_WIDTH + NODE_GAP),
          y: startY + rowIdx * (NODE_HEIGHT + NODE_GAP * 2),
        });
      }
    }

    // Sub-agents below their parents
    const subAgentParentMap = new Map<string, SubAgent[]>();
    for (const sub of subAgents) {
      if (agentPositions.has(sub.parentAgentId)) {
        if (!subAgentParentMap.has(sub.parentAgentId)) subAgentParentMap.set(sub.parentAgentId, []);
        subAgentParentMap.get(sub.parentAgentId)!.push(sub);
      }
    }

    // Build nodes for non-meeting agents
    const nodes: FlowNode[] = [];
    for (const agent of sorted) {
      const pos = agentPositions.get(agent.id);
      if (!pos) continue;
      const dept = agent.department_id ? deptMap.get(agent.department_id) : undefined;
      nodes.push({
        id: agent.id,
        type: "agent",
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        agent,
        deptLabel: dept?.name ?? "",
        deptColor: dept?.color ?? "var(--th-text-muted)",
        inMeeting: false,
      });

      // Sub-agents
      const subs = subAgentParentMap.get(agent.id) ?? [];
      const subW = Math.round(NODE_WIDTH * 0.7);
      const subH = Math.round(NODE_HEIGHT * 0.7);
      for (let si = 0; si < subs.length; si++) {
        const sub = subs[si];
        const subX = pos.x - NODE_WIDTH / 2 + si * (subW + 10);
        const subY = pos.y + NODE_HEIGHT / 2 + 30;
        // Create a synthetic agent for the sub-agent node
        const subAgent: Agent = {
          id: sub.id,
          name: sub.task.slice(0, 20),
          name_ko: sub.task.slice(0, 20),
          department_id: agent.department_id,
          role: "intern",
          cli_provider: "claude",
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
          deptLabel: dept?.name ?? "",
          deptColor: dept?.color ?? "var(--th-text-muted)",
          inMeeting: false,
          parentId: agent.id,
        });
        agentPositions.set(sub.id, { x: subX + subW / 2, y: subY + subH / 2 });
      }
    }

    // Meeting clusters
    const meetingGroups = new Map<string, MeetingPresence[]>();
    for (const mp of meetingPresences) {
      const key = `${mp.task_id ?? "none"}-${mp.phase}`;
      if (!meetingGroups.has(key)) meetingGroups.set(key, []);
      meetingGroups.get(key)!.push(mp);
    }

    const meetings: MeetingClusterData[] = [];
    let meetingOffsetX = 0;
    const meetingBaseY = rows.length > 0
      ? rows.length * (NODE_HEIGHT + NODE_GAP * 2) + 80
      : 0;

    for (const [key, members] of meetingGroups) {
      const firstMember = members[0];
      const cx = meetingOffsetX;
      const cy = meetingBaseY;
      const radius = MEETING_RADIUS;

      // Position meeting agents in a circle
      members.forEach((mp, idx) => {
        const angle = (idx / members.length) * 2 * Math.PI - Math.PI / 2;
        const ax = cx + Math.cos(angle) * (radius * 0.6);
        const ay = cy + Math.sin(angle) * (radius * 0.6);
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
            inMeeting: true,
          });
        }
      });

      meetings.push({
        id: key,
        cx,
        cy,
        radius,
        agentIds: members.map((m) => m.agent_id),
        phase: firstMember.phase,
        taskId: firstMember.task_id,
      });

      meetingOffsetX += radius * 2 + NODE_GAP * 2;
    }

    // Build edges
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

    // Meeting edges (connect meeting participants)
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

    // Delegation edges via task handoff (task.handoff_to_agent_id)
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

    // Collaboration edges: agents with concurrent in_progress tasks in the same project
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
          // Skip if already connected by delegation
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

    return { nodes, edges, meetings };
  }, [agents, departments, tasks, subAgents, crossDeptDeliveries, meetingPresences, projectAgentIds, filter]);
}
