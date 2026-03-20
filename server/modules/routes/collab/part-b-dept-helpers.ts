import type { SQLInputValue } from "node:sqlite";
import type { Lang } from "../../../types/lang.ts";
import type { L10n } from "./language-policy.ts";
import { getDepartmentForPack } from "../../workflow/packs/department-scope.ts";
import type { AgentRow } from "./direct-chat.ts";

type DbLike = {
  prepare: (sql: string) => {
    get: (...args: SQLInputValue[]) => unknown;
    all: (...args: SQLInputValue[]) => unknown;
  };
};

export function createPartBDeptHelpers(deps: {
  db: DbLike;
  getPreferredLanguage: () => Lang;
  sendAgentMessage: (
    agent: AgentRow,
    content: string,
    messageType?: string,
    receiverType?: string,
    receiverId?: string | null,
    taskId?: string | null,
  ) => void;
  broadcast: (event: string, payload: unknown) => void;
  pickL: (pool: L10n, lang: Lang) => string;
  l: (ko: string[], en: string[], ja?: string[], zh?: string[]) => L10n;
  getHandleTaskDelegation: () => (leader: AgentRow, ceoMessage: string, ceoMsgId: string) => void;
}) {
  const { db, getPreferredLanguage, sendAgentMessage, broadcast, pickL, l, getHandleTaskDelegation } = deps;

  function detectMentions(message: string): { deptIds: string[]; agentIds: string[] } {
    const deptIds: string[] = [];
    const agentIds: string[] = [];

    const depts = db.prepare("SELECT id, name, name_ko FROM departments").all() as {
      id: string;
      name: string;
      name_ko: string;
    }[];
    for (const dept of depts) {
      const nameKo = dept.name_ko.replace("팀", "");
      if (
        message.includes(`@${dept.name_ko}`) ||
        message.includes(`@${nameKo}`) ||
        message.includes(`@${dept.name}`) ||
        message.includes(`@${dept.id}`)
      ) {
        deptIds.push(dept.id);
      }
    }

    const agents = db.prepare("SELECT id, name, name_ko FROM agents").all() as {
      id: string;
      name: string;
      name_ko: string | null;
    }[];
    for (const agent of agents) {
      if ((agent.name_ko && message.includes(`@${agent.name_ko}`)) || message.includes(`@${agent.name}`)) {
        agentIds.push(agent.id);
      }
    }

    return { deptIds, agentIds };
  }

  function handleMentionDelegation(originLeader: AgentRow, targetDeptId: string, ceoMessage: string, lang: Lang): void {
    const crossLeader = findTeamLeader(targetDeptId);
    if (!crossLeader) return;
    const crossDeptName = getDeptName(targetDeptId);
    const crossLeaderName = lang === "ko" ? crossLeader.name_ko || crossLeader.name : crossLeader.name;
    const originLeaderName = lang === "ko" ? originLeader.name_ko || originLeader.name : originLeader.name;
    const taskTitle = ceoMessage.length > 60 ? ceoMessage.slice(0, 57) + "..." : ceoMessage;

    const mentionReq = pickL(
      l(
        [
          `${crossLeaderName}님! 클라이언트님 지시입니다: "${taskTitle}" — ${crossDeptName}에서 처리 부탁드립니다! 🏷️`,
          `${crossLeaderName}님, 클라이언트님이 직접 요청하셨습니다. "${taskTitle}" 건, ${crossDeptName} 담당으로 진행해주세요!`,
        ],
        [
          `${crossLeaderName}! Client directive for ${crossDeptName}: "${taskTitle}" — please handle this! 🏷️`,
          `${crossLeaderName}, Client requested this for your team: "${taskTitle}"`,
        ],
        [`${crossLeaderName}さん！Client指示です："${taskTitle}" — ${crossDeptName}で対応お願いします！🏷️`],
        [`${crossLeaderName}，Client指示："${taskTitle}" — 请${crossDeptName}处理！🏷️`],
      ),
      lang,
    );
    sendAgentMessage(originLeader, mentionReq, "task_assign", "agent", crossLeader.id, null);

    broadcast("cross_dept_delivery", {
      from_agent_id: originLeader.id,
      to_agent_id: crossLeader.id,
      task_title: taskTitle,
    });

    const ackDelay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      getHandleTaskDelegation()(crossLeader, ceoMessage, "");
    }, ackDelay);
  }

  function findBestSubordinate(
    deptId: string,
    excludeId: string,
    candidateAgentIds?: string[] | null,
  ): AgentRow | null {
    if (Array.isArray(candidateAgentIds)) {
      if (candidateAgentIds.length === 0) {
        return null;
      }
      const placeholders = candidateAgentIds.map(() => "?").join(",");
      const agents = db
        .prepare(
          `SELECT * FROM agents WHERE id IN (${placeholders}) AND department_id = ? AND id != ? AND role != 'team_leader' ORDER BY
         CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
         CASE role WHEN 'senior' THEN 0 WHEN 'junior' THEN 1 WHEN 'intern' THEN 2 ELSE 3 END`,
        )
        .all(...candidateAgentIds, deptId, excludeId) as unknown as AgentRow[];
      return agents[0] ?? null;
    }
    const agents = db
      .prepare(
        `SELECT * FROM agents WHERE department_id = ? AND id != ? AND role != 'team_leader' ORDER BY
       CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
       CASE role WHEN 'senior' THEN 0 WHEN 'junior' THEN 1 WHEN 'intern' THEN 2 ELSE 3 END`,
      )
      .all(deptId, excludeId) as unknown as AgentRow[];
    return agents[0] ?? null;
  }

  function findTeamLeader(deptId: string | null, candidateAgentIds?: string[] | null): AgentRow | null {
    if (!deptId) return null;
    const isPlanningLookup = deptId === "planning";
    if (Array.isArray(candidateAgentIds)) {
      const scopedIds = [...new Set(candidateAgentIds.map((id) => String(id || "").trim()).filter(Boolean))];
      if (scopedIds.length === 0) return null;
      const placeholders = scopedIds.map(() => "?").join(", ");
      if (isPlanningLookup) {
        try {
          return (
            (db
              .prepare(
                `
              SELECT *
              FROM agents
              WHERE role = 'team_leader'
                AND id IN (${placeholders})
                AND (
                  department_id = ?
                  OR COALESCE(acts_as_planning_leader, 0) = 1
                )
              ORDER BY
                CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
                CASE WHEN COALESCE(acts_as_planning_leader, 0) = 1 THEN 0 ELSE 1 END,
                created_at ASC
              LIMIT 1
            `,
              )
              .get(...scopedIds, deptId) as AgentRow | undefined) ?? null
          );
        } catch {
          // Older test schemas may not have acts_as_planning_leader.
        }
      }
      return (
        (db
          .prepare(
            `
          SELECT *
          FROM agents
          WHERE department_id = ?
            AND role = 'team_leader'
            AND id IN (${placeholders})
          ORDER BY
            CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
            created_at ASC
          LIMIT 1
        `,
          )
          .get(deptId, ...scopedIds) as AgentRow | undefined) ?? null
      );
    }
    if (isPlanningLookup) {
      try {
        return (
          (db
            .prepare(
              `
            SELECT *
            FROM agents
            WHERE role = 'team_leader'
              AND (
                department_id = ?
                OR COALESCE(acts_as_planning_leader, 0) = 1
              )
            ORDER BY
              CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
              CASE WHEN COALESCE(acts_as_planning_leader, 0) = 1 THEN 0 ELSE 1 END,
              created_at ASC
            LIMIT 1
          `,
            )
            .get(deptId) as AgentRow | undefined) ?? null
        );
      } catch {
        // Older test schemas may not have acts_as_planning_leader.
      }
    }
    return (
      (db
        .prepare(
          `
        SELECT *
        FROM agents
        WHERE department_id = ?
          AND role = 'team_leader'
        ORDER BY
          CASE status WHEN 'idle' THEN 0 WHEN 'break' THEN 1 WHEN 'working' THEN 2 ELSE 3 END,
          created_at ASC
        LIMIT 1
      `,
        )
        .get(deptId) as AgentRow | undefined) ?? null
    );
  }

  function getDeptName(deptId: string, workflowPackKey?: string | null): string {
    const lang = getPreferredLanguage();
    const scoped = getDepartmentForPack(db as any, deptId);
    if (!scoped) return deptId;
    if (lang === "ko") return scoped.name_ko || scoped.name || deptId;
    if (lang === "ja") return scoped.name_ja || scoped.name || scoped.name_ko || deptId;
    if (lang === "zh") return scoped.name_zh || scoped.name || scoped.name_ko || deptId;
    return scoped.name || scoped.name_ko || deptId;
  }

  function getDeptRoleConstraint(deptId: string, deptName: string): string {
    const constraints: Record<string, string> = {
      planning: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (Planning). Focus ONLY on planning, strategy, market analysis, requirements, and documentation. Do NOT write production code, create design assets, or run tests. If coding/design is needed, describe requirements and specifications instead.`,
      dev: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (Development). Focus ONLY on coding, debugging, code review, and technical implementation. Do NOT create design mockups, write business strategy documents, or perform QA testing.`,
      design: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (Design). Focus ONLY on UI/UX design, visual assets, design specs, and prototyping. Do NOT write production backend code, run tests, or make infrastructure changes.`,
      qa: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (QA/QC). Focus ONLY on testing, quality assurance, test automation, and bug reporting. Do NOT write production code or create design assets.`,
      devsecops: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (DevSecOps). Focus ONLY on infrastructure, security audits, CI/CD pipelines, container orchestration, and deployment. Do NOT write business logic or create design assets.`,
      operations: `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName} (Operations). Focus ONLY on operations, automation, monitoring, maintenance, and process optimization. Do NOT write production code or create design assets.`,
    };
    return (
      constraints[deptId] ||
      `IMPORTANT ROLE CONSTRAINT: You belong to ${deptName}. Focus on tasks within your department's expertise.`
    );
  }

  return {
    detectMentions,
    handleMentionDelegation,
    findBestSubordinate,
    findTeamLeader,
    getDeptName,
    getDeptRoleConstraint,
  };
}
