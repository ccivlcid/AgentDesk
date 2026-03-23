import { randomUUID } from "node:crypto";
import { initRoomQueue } from "../../collab/room-lane-queue.ts";
import type { SQLInputValue } from "node:sqlite";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { AgentRow, StoredMessage } from "../../shared/types.ts";

type ChatMessageRouteCtx = Pick<RuntimeContext, "app" | "db" | "broadcast">;

type ChatMessageRouteDeps = {
  IdempotencyConflictError: RuntimeContext["IdempotencyConflictError"];
  StorageBusyError: RuntimeContext["StorageBusyError"];
  firstQueryValue: RuntimeContext["firstQueryValue"];
  resolveMessageIdempotencyKey: RuntimeContext["resolveMessageIdempotencyKey"];
  recordMessageIngressAuditOr503: RuntimeContext["recordMessageIngressAuditOr503"];
  insertMessageWithIdempotency: RuntimeContext["insertMessageWithIdempotency"];
  recordAcceptedIngressAuditOrRollback: RuntimeContext["recordAcceptedIngressAuditOrRollback"];
  normalizeTextField: RuntimeContext["normalizeTextField"];
  handleReportRequest: RuntimeContext["handleReportRequest"];
  scheduleAgentReply: RuntimeContext["scheduleAgentReply"];
  detectMentions: RuntimeContext["detectMentions"];
  resolveLang: RuntimeContext["resolveLang"];
  handleMentionDelegation: RuntimeContext["handleMentionDelegation"];
};

export function registerChatMessageRoutes(ctx: ChatMessageRouteCtx, deps: ChatMessageRouteDeps): void {
  const { app, db, broadcast } = ctx;
  const {
    IdempotencyConflictError,
    StorageBusyError,
    firstQueryValue,
    resolveMessageIdempotencyKey,
    recordMessageIngressAuditOr503,
    insertMessageWithIdempotency,
    recordAcceptedIngressAuditOrRollback,
    normalizeTextField,
    handleReportRequest,
    scheduleAgentReply,
    detectMentions,
    resolveLang,
    handleMentionDelegation,
  } = deps;

  // ── 단톡방 목록 ─────────────────────────────────────────────────────────
  app.get("/api/group-chat-rooms", (_req, res) => {
    const rows = db
      .prepare(
        `
        SELECT
          m.room_id,
          MAX(m.created_at) AS last_ts,
          COUNT(*)           AS msg_count,
          (SELECT content FROM messages m2
           WHERE m2.room_id = m.room_id ORDER BY m2.created_at DESC LIMIT 1
          ) AS last_content,
          (SELECT GROUP_CONCAT(DISTINCT m3.receiver_id)
           FROM messages m3
           WHERE m3.room_id = m.room_id AND m3.receiver_type = 'room'
                 AND m3.sender_type = 'client'
           LIMIT 1
          ) AS agent_ids_csv
        FROM messages m
        WHERE m.room_id IS NOT NULL AND m.room_id != ''
        GROUP BY m.room_id
        ORDER BY last_ts DESC
        LIMIT 30
        `,
      )
      .all() as { room_id: string; last_ts: number; msg_count: number; last_content: string | null; agent_ids_csv: string | null }[];

    // agent_ids를 실제 배열로 변환하되, CSV가 receiver에는 room_id 자체가 들어가므로
    // 별도로 참여 에이전트 목록을 sender_id에서 추출
    const rooms = rows.map((r) => {
      // 방에서 응답한 에이전트 목록
      const agentRows = db
        .prepare(
          `SELECT DISTINCT sender_id FROM messages
           WHERE room_id = ? AND sender_type = 'agent' AND sender_id IS NOT NULL`,
        )
        .all(r.room_id) as { sender_id: string }[];
      return {
        room_id: r.room_id,
        last_ts: r.last_ts,
        msg_count: r.msg_count,
        last_content: r.last_content,
        agent_ids: agentRows.map((a) => a.sender_id),
      };
    });

    res.json({ ok: true, rooms });
  });

  app.get("/api/messages", (req, res) => {
    const receiverType = firstQueryValue(req.query.receiver_type);
    const receiverId = firstQueryValue(req.query.receiver_id);
    const roomId = firstQueryValue(req.query.room_id);
    const limitRaw = firstQueryValue(req.query.limit);
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 500);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (roomId) {
      // Group chat room: return all messages tagged with this room_id
      conditions.push("room_id = ?");
      params.push(roomId);
    } else if (receiverType && receiverId) {
      // Conversation with a specific agent: show messages TO and FROM that agent
      conditions.push(
        "((receiver_type = ? AND receiver_id = ?) OR (sender_type = 'agent' AND sender_id = ?) OR receiver_type = 'all')",
      );
      params.push(receiverType, receiverId, receiverId);
    } else if (receiverType) {
      conditions.push("receiver_type = ?");
      params.push(receiverType);
    } else if (receiverId) {
      conditions.push("(receiver_id = ? OR receiver_type = 'all')");
      params.push(receiverId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const messages = db
      .prepare(
        `
    SELECT m.*,
      a.name AS sender_name,
      a.avatar_emoji AS sender_avatar
    FROM messages m
    LEFT JOIN agents a ON m.sender_type = 'agent' AND m.sender_id = a.id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT ?
  `,
      )
      .all(...(params as SQLInputValue[]));

    res.json({ messages: messages.reverse() }); // return in chronological order
  });

  app.post("/api/messages", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const idempotencyKey = resolveMessageIdempotencyKey(req, body, "api.messages");
    const content = body.content;
    if (!content || typeof content !== "string") {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/messages",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 400,
          detail: "content_required",
        })
      )
        return;
      return res.status(400).json({ error: "content_required" });
    }

    const senderType = typeof body.sender_type === "string" ? body.sender_type : "client";
    const senderId = typeof body.sender_id === "string" ? body.sender_id : null;
    const receiverType = typeof body.receiver_type === "string" ? body.receiver_type : "all";
    const receiverId = typeof body.receiver_id === "string" ? body.receiver_id : null;
    const messageType = typeof body.message_type === "string" ? body.message_type : "chat";
    const taskId = typeof body.task_id === "string" ? body.task_id : null;
    const projectId = normalizeTextField(body.project_id);
    const projectPath = normalizeTextField(body.project_path);
    const projectContext = normalizeTextField(body.project_context);

    let storedMessage: StoredMessage;
    let created: boolean;
    try {
      ({ message: storedMessage, created } = await insertMessageWithIdempotency({
        senderType,
        senderId,
        receiverType,
        receiverId,
        content,
        messageType,
        taskId,
        idempotencyKey,
      }));
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        const conflictErr = err as { key: string };
        if (
          !recordMessageIngressAuditOr503(res, {
            endpoint: "/api/messages",
            req,
            body,
            idempotencyKey,
            outcome: "idempotency_conflict",
            statusCode: 409,
            detail: "payload_mismatch",
          })
        )
          return;
        return res.status(409).json({ error: "idempotency_conflict", idempotency_key: conflictErr.key });
      }
      if (err instanceof StorageBusyError) {
        const busyErr = err as { operation: string; attempts: number };
        if (
          !recordMessageIngressAuditOr503(res, {
            endpoint: "/api/messages",
            req,
            body,
            idempotencyKey,
            outcome: "storage_busy",
            statusCode: 503,
            detail: `operation=${busyErr.operation}, attempts=${busyErr.attempts}`,
          })
        )
          return;
        return res.status(503).json({ error: "storage_busy", retryable: true, operation: busyErr.operation });
      }
      throw err;
    }

    const msg = { ...storedMessage };

    if (!created) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/messages",
          req,
          body,
          idempotencyKey,
          outcome: "duplicate",
          statusCode: 200,
          messageId: msg.id,
          detail: "idempotent_replay",
        })
      )
        return;
      return res.json({ ok: true, message: msg, duplicate: true });
    }

    if (
      !(await recordAcceptedIngressAuditOrRollback(
        res,
        {
          endpoint: "/api/messages",
          req,
          body,
          idempotencyKey,
          outcome: "accepted",
          statusCode: 200,
          detail: "created",
        },
        msg.id,
      ))
    )
      return;
    broadcast("new_message", msg);

    // Schedule agent auto-reply when Client messages an agent
    if (senderType === "client" && receiverType === "agent" && receiverId) {
      if (messageType === "report") {
        const handled = handleReportRequest(receiverId, content);
        if (!handled) {
          scheduleAgentReply(receiverId, content, messageType, {
            projectId,
            projectPath,
            projectContext,
          });
        }
        return res.json({ ok: true, message: msg });
      }

      scheduleAgentReply(receiverId, content, messageType, {
        projectId,
        projectPath,
        projectContext,
      });

      // Check for @mentions to other departments/agents
      const mentions = detectMentions(content);
      if (mentions.deptIds.length > 0 || mentions.agentIds.length > 0) {
        const senderAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(receiverId) as AgentRow | undefined;
        if (senderAgent) {
          const lang = resolveLang(content);
          const mentionDelay = 4000 + Math.random() * 2000; // After the main delegation starts
          setTimeout(() => {
            // Handle department mentions
            for (const deptId of mentions.deptIds) {
              if (deptId === senderAgent.department_id) continue; // Skip own department
              handleMentionDelegation(senderAgent, deptId, content, lang);
            }
            // Handle agent mentions — find their department and delegate there
            for (const agentId of mentions.agentIds) {
              const mentioned = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as AgentRow | undefined;
              if (mentioned && mentioned.department_id && mentioned.department_id !== senderAgent.department_id) {
                if (!mentions.deptIds.includes(mentioned.department_id)) {
                  handleMentionDelegation(senderAgent, mentioned.department_id, content, lang);
                }
              }
            }
          }, mentionDelay);
        }
      }
    }

    res.json({ ok: true, message: msg });
  });

  // Group chat room: send one message to a shared room and schedule replies from all agents
  app.post("/api/group-chat", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const content = body.content;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content_required" });
    }

    const agentIds = (Array.isArray(body.agent_ids) ? body.agent_ids : []).filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    if (agentIds.length === 0) {
      return res.status(400).json({ error: "agent_ids_required" });
    }

    const rawRoomId = body.room_id;
    const roomId =
      typeof rawRoomId === "string" && rawRoomId.trim() ? rawRoomId.trim() : randomUUID();

    const msgId = randomUUID();
    const now = Date.now();
    const trimmedContent = content.trim();
    const messageType = typeof body.message_type === "string" ? body.message_type : "chat";
    const projectId = normalizeTextField(body.project_id);
    const projectPath = normalizeTextField(body.project_path);
    const projectContext = normalizeTextField(body.project_context);

    db.prepare(
      `INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, room_id, created_at)
       VALUES (?, 'client', NULL, 'room', NULL, ?, ?, ?, ?)`,
    ).run(msgId, trimmedContent, messageType, roomId, now);

    broadcast("new_message", {
      id: msgId,
      sender_type: "client",
      sender_id: null,
      receiver_type: "room",
      receiver_id: null,
      content: trimmedContent,
      message_type: messageType,
      room_id: roomId,
      created_at: now,
    });

    // Lane queue: fire only the first agent; each subsequent agent starts after
    // the previous one completes (so it can read prior responses in the room).
    const firstAgentId = initRoomQueue(roomId, agentIds, trimmedContent, messageType, {
      projectId,
      projectPath,
      projectContext,
    });
    if (firstAgentId) {
      scheduleAgentReply(firstAgentId, trimmedContent, messageType, {
        projectId,
        projectPath,
        projectContext,
        roomId,
      });
    }

    return res.json({ ok: true, room_id: roomId, message_id: msgId });
  });

  // Delete conversation messages
  app.delete("/api/messages", (req, res) => {
    const agentId = firstQueryValue(req.query.agent_id);
    const scope = firstQueryValue(req.query.scope) || "conversation"; // "conversation" or "all"

    // Preserve PM-activity messages (report, status_update) from deletion.
    // These feed the project PM Activity timeline and must not be wiped
    // by chat-clearing actions.
    const PM_ACTIVITY_GUARD = "AND message_type NOT IN ('report', 'status_update')";

    if (scope === "all") {
      // Delete all conversation/announcement messages, but keep report/status_update
      const result = db.prepare(`DELETE FROM messages WHERE 1=1 ${PM_ACTIVITY_GUARD}`).run();
      broadcast("messages_cleared", { scope: "all" });
      return res.json({ ok: true, deleted: result.changes });
    }

    if (agentId) {
      // Delete messages for a specific agent conversation + announcements shown in that chat
      const result = db
        .prepare(
          `DELETE FROM messages WHERE
        ((sender_type = 'client' AND receiver_type = 'agent' AND receiver_id = ?)
        OR (sender_type = 'agent' AND sender_id = ?)
        OR receiver_type = 'all'
        OR message_type = 'announcement')
        ${PM_ACTIVITY_GUARD}`,
        )
        .run(agentId, agentId);
      broadcast("messages_cleared", { scope: "agent", agent_id: agentId });
      return res.json({ ok: true, deleted: result.changes });
    }

    // Delete only announcements/broadcasts (not report/status_update)
    const result = db
      .prepare(
        `DELETE FROM messages WHERE (receiver_type = 'all' OR message_type = 'announcement') ${PM_ACTIVITY_GUARD}`,
      )
      .run();
    broadcast("messages_cleared", { scope: "announcements" });
    res.json({ ok: true, deleted: result.changes });
  });
}
