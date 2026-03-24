import type { DatabaseSync } from "node:sqlite";

type BreakRotationDeps = {
  db: DatabaseSync;
  broadcast: (event: string, payload?: unknown) => void;
  isAgentInMeeting: (agentId: string) => boolean;
};

export function rotateBreaks({ db, broadcast, isAgentInMeeting }: BreakRotationDeps): void {
  const allAgents = db
    .prepare("SELECT id, department_id, status FROM agents WHERE status IN ('idle','break')")
    .all() as { id: string; department_id: string; status: string }[];

  if (allAgents.length === 0) return;

  for (const a of allAgents) {
    if (a.status === "break" && isAgentInMeeting(a.id)) {
      db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(a.id);
      broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(a.id));
    }
  }

  const candidates = allAgents.filter((a) => !isAgentInMeeting(a.id));
  if (candidates.length === 0) return;

  const byDept = new Map<string, typeof candidates>();
  for (const a of candidates) {
    const list = byDept.get(a.department_id) || [];
    list.push(a);
    byDept.set(a.department_id, list);
  }

  for (const [, members] of byDept) {
    const onBreak = members.filter((a) => a.status === "break");
    const idle = members.filter((a) => a.status === "idle");

    if (onBreak.length > 1) {
      const extras = onBreak.slice(1);
      for (const a of extras) {
        db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(a.id);
        broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(a.id));
      }
    } else if (onBreak.length === 1) {
      if (Math.random() < 0.4) {
        db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(onBreak[0].id);
        broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(onBreak[0].id));
      }
    } else if (onBreak.length === 0 && idle.length > 0) {
      if (Math.random() < 0.5) {
        const pick = idle[Math.floor(Math.random() * idle.length)];
        db.prepare("UPDATE agents SET status = 'break' WHERE id = ?").run(pick.id);
        broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(pick.id));
      }
    }
  }
}
