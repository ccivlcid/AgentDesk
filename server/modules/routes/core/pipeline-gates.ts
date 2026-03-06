import type { Request, Response } from "express";

interface PipelineGateRouteDeps {
  app: any;
  db: any;
  nowMs: () => number;
}

export function registerPipelineGateRoutes({ app, db, nowMs }: PipelineGateRouteDeps): void {
  // List all gate definitions (optionally filtered by pack)
  app.get("/api/pipeline-gates", (req: Request, res: Response) => {
    const packKey = (req.query.workflow_pack_key as string) || null;
    let rows;
    if (packKey) {
      rows = db
        .prepare(
          "SELECT * FROM pipeline_gates WHERE workflow_pack_key = ? AND enabled = 1 ORDER BY gate_order ASC",
        )
        .all(packKey);
    } else {
      rows = db
        .prepare("SELECT * FROM pipeline_gates WHERE enabled = 1 ORDER BY workflow_pack_key, gate_order ASC")
        .all();
    }
    res.json({ ok: true, gates: rows });
  });

  // Get gate results for a specific task
  app.get("/api/tasks/:id/gates", (req: Request, res: Response) => {
    const taskId = req.params.id as string;
    const task = db.prepare("SELECT workflow_pack_key FROM tasks WHERE id = ?").get(taskId) as
      | { workflow_pack_key: string }
      | undefined;
    if (!task) {
      return res.status(404).json({ ok: false, error: "task_not_found" });
    }

    // Get gate definitions for this task's pack
    const gates = db
      .prepare(
        "SELECT * FROM pipeline_gates WHERE workflow_pack_key = ? AND enabled = 1 ORDER BY gate_order ASC",
      )
      .all(task.workflow_pack_key) as Array<{
      id: number;
      gate_key: string;
      gate_label: string;
      gate_label_ko: string;
      gate_order: number;
      gate_type: string;
      sla_minutes: number | null;
    }>;

    // Get existing results
    const results = db
      .prepare("SELECT * FROM task_gate_results WHERE task_id = ?")
      .all(taskId) as Array<{
      gate_id: number;
      status: string;
      evaluated_at: number | null;
      evaluated_by: string | null;
      note: string | null;
    }>;

    const resultMap = new Map(results.map((r) => [r.gate_id, r]));

    const combined = gates.map((gate) => {
      const result = resultMap.get(gate.id);
      return {
        gate_id: gate.id,
        gate_key: gate.gate_key,
        gate_label: gate.gate_label,
        gate_label_ko: gate.gate_label_ko,
        gate_order: gate.gate_order,
        gate_type: gate.gate_type,
        sla_minutes: gate.sla_minutes,
        status: result?.status ?? "pending",
        evaluated_at: result?.evaluated_at ?? null,
        evaluated_by: result?.evaluated_by ?? null,
        note: result?.note ?? null,
      };
    });

    const allPassed = combined.length > 0 && combined.every((g) => g.status === "passed" || g.status === "skipped");
    const anyFailed = combined.some((g) => g.status === "failed");

    return res.json({
      ok: true,
      task_id: taskId,
      workflow_pack_key: task.workflow_pack_key,
      gates: combined,
      summary: { total: combined.length, passed: allPassed, failed: anyFailed },
    });
  });

  // Manually approve/reject a gate for a task
  app.post("/api/tasks/:id/gates/:gateId/evaluate", (req: Request, res: Response) => {
    const taskId = req.params.id as string;
    const gateId = Number(req.params.gateId);
    const body = (req.body ?? {}) as { status?: string; note?: string; evaluated_by?: string };

    if (!body.status || !["passed", "failed", "skipped"].includes(body.status)) {
      return res.status(400).json({ ok: false, error: "status must be passed, failed, or skipped" });
    }

    const gate = db.prepare("SELECT id FROM pipeline_gates WHERE id = ?").get(gateId);
    if (!gate) {
      return res.status(404).json({ ok: false, error: "gate_not_found" });
    }

    const now = nowMs();
    db.prepare(
      `INSERT INTO task_gate_results (task_id, gate_id, status, evaluated_at, evaluated_by, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(task_id, gate_id) DO UPDATE SET status = ?, evaluated_at = ?, evaluated_by = ?, note = ?`,
    ).run(
      taskId,
      gateId,
      body.status,
      now,
      body.evaluated_by || "ceo",
      body.note || null,
      body.status,
      now,
      body.evaluated_by || "ceo",
      body.note || null,
    );

    return res.json({ ok: true, task_id: taskId, gate_id: gateId, status: body.status });
  });

  // Create/update a pipeline gate definition
  app.post("/api/pipeline-gates", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      workflow_pack_key?: string;
      gate_key?: string;
      gate_label?: string;
      gate_label_ko?: string;
      gate_order?: number;
      gate_type?: string;
      check_expression?: string;
      sla_minutes?: number;
    };

    if (!body.workflow_pack_key || !body.gate_key || !body.gate_label) {
      return res.status(400).json({ ok: false, error: "workflow_pack_key, gate_key, gate_label required" });
    }

    db.prepare(
      `INSERT INTO pipeline_gates (workflow_pack_key, gate_key, gate_label, gate_label_ko, gate_order, gate_type, check_expression, sla_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(workflow_pack_key, gate_key) DO UPDATE SET
         gate_label = ?, gate_label_ko = ?, gate_order = ?, gate_type = ?,
         check_expression = ?, sla_minutes = ?`,
    ).run(
      body.workflow_pack_key,
      body.gate_key,
      body.gate_label,
      body.gate_label_ko || "",
      body.gate_order ?? 0,
      body.gate_type || "auto",
      body.check_expression || null,
      body.sla_minutes ?? null,
      body.gate_label,
      body.gate_label_ko || "",
      body.gate_order ?? 0,
      body.gate_type || "auto",
      body.check_expression || null,
      body.sla_minutes ?? null,
    );

    return res.json({ ok: true });
  });

  // Delete a pipeline gate
  app.delete("/api/pipeline-gates/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    db.prepare("DELETE FROM pipeline_gates WHERE id = ?").run(id);
    res.json({ ok: true });
  });
}

/**
 * Evaluate auto-gates for a completed task. Called from run-complete-handler.
 * Returns the list of gate results evaluated.
 */
export function evaluateAutoGates(
  db: any,
  taskId: string,
  packKey: string,
  taskOutput: string | null,
  nowMs: number,
): Array<{ gate_key: string; status: string; note: string }> {
  const gates = db
    .prepare(
      "SELECT * FROM pipeline_gates WHERE workflow_pack_key = ? AND gate_type = 'auto' AND enabled = 1 ORDER BY gate_order ASC",
    )
    .all(packKey) as Array<{
    id: number;
    gate_key: string;
    gate_label: string;
    check_expression: string | null;
    sla_minutes: number | null;
  }>;

  const results: Array<{ gate_key: string; status: string; note: string }> = [];

  for (const gate of gates) {
    let status = "passed";
    let note = "";

    if (gate.check_expression && taskOutput) {
      try {
        const pattern = new RegExp(gate.check_expression, "i");
        if (!pattern.test(taskOutput)) {
          status = "failed";
          note = `Pattern not found: ${gate.check_expression}`;
        }
      } catch {
        // Invalid regex — skip check, mark passed
        note = "check_expression invalid, skipped";
      }
    } else if (gate.check_expression && !taskOutput) {
      status = "failed";
      note = "No task output to evaluate";
    }
    // Auto-gates without check_expression pass by default (placeholder for future)

    db.prepare(
      `INSERT INTO task_gate_results (task_id, gate_id, status, evaluated_at, evaluated_by, note)
       VALUES (?, ?, ?, ?, 'system', ?)
       ON CONFLICT(task_id, gate_id) DO UPDATE SET status = ?, evaluated_at = ?, note = ?`,
    ).run(taskId, gate.id, status, nowMs, note, status, nowMs, note);

    results.push({ gate_key: gate.gate_key, status, note });
  }

  return results;
}
