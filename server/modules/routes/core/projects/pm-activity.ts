/**
 * PM Activity Log API — aggregates PM actions, task status changes,
 * agent reports, and oversight events into a unified timeline.
 *
 * GET /api/projects/:id/pm-activity?limit=50&since=<timestamp>
 */

import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";

interface MeetingEntry {
  speaker: string;
  content: string;
}

interface PmActivityItem {
  id: string;
  type: "meeting" | "task_status" | "pm_message" | "decision" | "oversight";
  timestamp: number;
  taskId: string | null;
  taskTitle: string | null;
  agentId: string | null;
  agentName: string | null;
  summary: string;
  detail?: string;
  meetingEntries?: MeetingEntry[];
}

interface PmActivityResponse {
  ok: true;
  items: PmActivityItem[];
  counts: { planned: number; in_progress: number; review: number; done: number; total: number };
  pmAgent: { id: string; name: string; nameKo: string } | null;
}

export function registerPmActivityRoutes(app: Express, db: DatabaseSync): void {
  app.get("/api/projects/:id/pm-activity", (req, res) => {
    const projectId = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const since = Number(req.query.since) || 0;

    try {
      // PM agent for this project
      const pmRow = db
        .prepare(
          `SELECT a.id, a.name, a.name_ko
           FROM project_agents pa
           JOIN agents a ON a.id = pa.agent_id
           WHERE pa.project_id = ? AND pa.project_role = 'pm'
           LIMIT 1`,
        )
        .get(projectId) as { id: string; name: string; name_ko: string } | undefined;

      const items: PmActivityItem[] = [];

      // 1. Task status changes (system + pm_oversight logs)
      const taskLogs = db
        .prepare(
          `SELECT tl.rowid AS row_id, tl.task_id, tl.kind, tl.message, tl.created_at,
                  t.title AS task_title, t.assigned_agent_id,
                  COALESCE(a.name, '') AS agent_name
           FROM task_logs tl
           JOIN tasks t ON t.id = tl.task_id
           LEFT JOIN agents a ON a.id = t.assigned_agent_id
           WHERE t.project_id = ?
             AND tl.kind IN ('system', 'pm_oversight')
             AND tl.created_at > ?
             AND (tl.message LIKE 'Status →%' OR tl.message LIKE 'PM %' OR tl.message LIKE 'RUN %'
                  OR tl.message LIKE 'Review 대기%' OR tl.message LIKE 'Decision inbox%'
                  OR tl.kind = 'pm_oversight')
           ORDER BY tl.created_at DESC
           LIMIT ?`,
        )
        .all(projectId, since, limit) as unknown as Array<{
        row_id: number;
        task_id: string;
        kind: string;
        message: string;
        created_at: number;
        task_title: string;
        assigned_agent_id: string | null;
        agent_name: string;
      }>;

      for (const log of taskLogs) {
        items.push({
          id: `log:${log.row_id}`,
          type: log.kind === "pm_oversight" ? "oversight" : "task_status",
          timestamp: log.created_at,
          taskId: log.task_id,
          taskTitle: log.task_title,
          agentId: log.assigned_agent_id,
          agentName: log.agent_name || null,
          summary: log.message,
        });
      }

      // 2. PM messages (reports from agents to PM, PM directives, announcements)
      if (pmRow) {
        // 2a. PM 에이전트가 보내거나 받은 프로젝트 태스크 관련 메시지
        const pmTaskMessages = db
          .prepare(
            `SELECT m.id, m.content, m.message_type, m.created_at, m.task_id,
                    m.sender_id, m.sender_type,
                    COALESCE(a.name, '') AS sender_name,
                    COALESCE(t.title, '') AS task_title
             FROM messages m
             LEFT JOIN agents a ON a.id = m.sender_id
             LEFT JOIN tasks t ON t.id = m.task_id
             WHERE m.created_at > ?
               AND ((m.sender_id = ? AND m.sender_type = 'agent')
                    OR (m.receiver_id = ? AND m.receiver_type = 'agent'))
               AND m.task_id IN (SELECT id FROM tasks WHERE project_id = ?)
             ORDER BY m.created_at DESC
             LIMIT ?`,
          )
          .all(since, pmRow.id, pmRow.id, projectId, limit) as unknown as Array<{
          id: string;
          content: string;
          message_type: string;
          created_at: number;
          task_id: string | null;
          sender_id: string | null;
          sender_type: string;
          sender_name: string;
          task_title: string;
        }>;

        // 2b. 프로젝트 에이전트가 전사공지('all')로 보낸 보고 메시지 (PM + 기타 에이전트)
        const pmBroadcastMessages = db
          .prepare(
            `SELECT m.id, m.content, m.message_type, m.created_at, m.task_id,
                    m.sender_id, m.sender_type,
                    COALESCE(a.name, '') AS sender_name,
                    COALESCE(t.title, '') AS task_title
             FROM messages m
             LEFT JOIN agents a ON a.id = m.sender_id
             LEFT JOIN tasks t ON t.id = m.task_id
             WHERE m.created_at > ?
               AND m.sender_type = 'agent'
               AND m.receiver_type = 'all'
               AND m.message_type IN ('report', 'status_update')
               AND m.sender_id IN (SELECT agent_id FROM project_agents WHERE project_id = ?)
             ORDER BY m.created_at DESC
             LIMIT ?`,
          )
          .all(since, projectId, limit) as unknown as Array<{
          id: string;
          content: string;
          message_type: string;
          created_at: number;
          task_id: string | null;
          sender_id: string | null;
          sender_type: string;
          sender_name: string;
          task_title: string;
        }>;

        const seenMsgIds = new Set<string>();
        for (const msg of [...pmTaskMessages, ...pmBroadcastMessages]) {
          if (seenMsgIds.has(msg.id)) continue;
          seenMsgIds.add(msg.id);
          items.push({
            id: `msg:${msg.id}`,
            type: "pm_message",
            timestamp: msg.created_at,
            taskId: msg.task_id,
            taskTitle: msg.task_title || null,
            agentId: msg.sender_id,
            agentName: msg.sender_name || null,
            summary: msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content,
            detail: msg.content.length > 200 ? msg.content : undefined,
          });
        }
      }

      // 3. Decision events
      const decisions = db
        .prepare(
          `SELECT id, event_type, summary, created_at, task_id
           FROM project_review_decision_events
           WHERE project_id = ? AND created_at > ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .all(projectId, since, limit) as unknown as Array<{
        id: string;
        event_type: string;
        summary: string;
        created_at: number;
        task_id: string | null;
      }>;

      for (const dec of decisions) {
        items.push({
          id: `dec:${dec.id}`,
          type: "decision",
          timestamp: dec.created_at,
          taskId: dec.task_id,
          taskTitle: null,
          agentId: null,
          agentName: null,
          summary: dec.summary,
        });
      }

      // 4. Meeting minutes
      const meetings = db
        .prepare(
          `SELECT mm.id, mm.title, mm.meeting_type, mm.status, mm.started_at, mm.completed_at
           FROM meeting_minutes mm
           JOIN tasks t ON t.id = mm.task_id
           WHERE t.project_id = ? AND mm.started_at > ?
           ORDER BY mm.started_at DESC
           LIMIT ?`,
        )
        .all(projectId, since, limit) as unknown as Array<{
        id: string;
        title: string;
        meeting_type: string;
        status: string;
        started_at: number;
        completed_at: number | null;
      }>;

      for (const mtg of meetings) {
        const entries = db
          .prepare(
            `SELECT speaker_name, content FROM meeting_minute_entries
             WHERE meeting_id = ? ORDER BY seq ASC LIMIT 20`,
          )
          .all(mtg.id) as unknown as Array<{ speaker_name: string; content: string }>;

        items.push({
          id: `mtg:${mtg.id}`,
          type: "meeting",
          timestamp: mtg.started_at,
          taskId: null,
          taskTitle: mtg.title,
          agentId: null,
          agentName: null,
          summary: mtg.title,
          meetingEntries: entries.map((e) => ({ speaker: e.speaker_name, content: e.content })),
        });
      }

      // Sort by timestamp descending
      items.sort((a, b) => b.timestamp - a.timestamp);

      // Task counts
      const counts = { planned: 0, in_progress: 0, review: 0, done: 0, total: 0 };
      const statusRows = db
        .prepare("SELECT status, COUNT(*) AS cnt FROM tasks WHERE project_id = ? GROUP BY status")
        .all(projectId) as unknown as Array<{ status: string; cnt: number }>;
      for (const row of statusRows) {
        counts.total += row.cnt;
        if (row.status === "planned") counts.planned = row.cnt;
        else if (row.status === "in_progress") counts.in_progress = row.cnt;
        else if (row.status === "review") counts.review = row.cnt;
        else if (row.status === "done") counts.done = row.cnt;
      }

      const response: PmActivityResponse = {
        ok: true,
        items: items.slice(0, limit),
        counts,
        pmAgent: pmRow ? { id: pmRow.id, name: pmRow.name, nameKo: pmRow.name_ko } : null,
      };

      res.json(response);
    } catch (err) {
      logger.error({ err, projectId }, "[pm-activity] failed to fetch");
      res.status(500).json({ error: "pm_activity_fetch_failed" });
    }
  });
}
