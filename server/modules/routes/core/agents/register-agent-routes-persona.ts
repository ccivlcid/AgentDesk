import { readdirSync } from "node:fs";
import type { SQLInputValue } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { invalidateAgentPersonaCache } from "../../../workflow/core/character-persona.ts";
import {
  PERSONAS_DIR,
  readAgentPersonaFile,
  writeAgentPersonaFile,
  deleteAgentPersonaFile,
  type AgentCrudHelpers,
} from "./crud-helpers.ts";

type PersonaRoutesCtx = {
  db: { prepare: (sql: string) => { get: (...args: SQLInputValue[]) => unknown } };
  runAgentOneShot: (
    agent: Record<string, unknown>,
    prompt: string,
    opts: { projectPath: string; noTools: boolean; timeoutMs: number },
  ) => Promise<{ text?: string } | undefined>;
};

export function registerAgentPersonaRoutes(
  app: Express,
  ctx: PersonaRoutesCtx,
  _helpers: AgentCrudHelpers,
): void {
  const { db, runAgentOneShot } = ctx;

  app.post("/api/agents/generate-persona", async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const role = typeof body.role === "string" ? body.role : "senior";
      const departmentId = typeof body.department_id === "string" ? body.department_id : null;
      const lang = typeof body.lang === "string" ? body.lang : "ko";
      if (!name) return res.status(400).json({ error: "name_required" });

      const deptRow = departmentId
        ? (db.prepare("SELECT name, name_ko FROM departments WHERE id = ?").get(departmentId) as
            | { name: string; name_ko: string }
            | undefined)
        : null;
      const deptName = deptRow ? (lang === "ko" ? deptRow.name_ko || deptRow.name : deptRow.name) : "";
      const roleLabel =
        lang === "ko"
          ? { team_leader: "팀 리더", senior: "시니어", junior: "주니어", intern: "인턴" }[role] || role
          : { team_leader: "team leader", senior: "senior", junior: "junior", intern: "intern" }[role] || role;

      const prompt =
        lang === "ko"
          ? [
              `[페르소나 생성 요청]`,
              `다음 인물의 AI 캐릭터 페르소나 프롬프트를 한국어로 작성하세요.`,
              `이름: ${name}`,
              `역할: ${roleLabel}`,
              deptName ? `부서: ${deptName}` : "",
              ``,
              `작성 규칙:`,
              `- "나는 ${name}, ..."로 시작하는 1인칭 자기소개 형식`,
              `- 이 인물이 실존/역사 인물이면 그 특징을 반영, 가상 이름이면 이름에서 느껴지는 이미지로 창작`,
              `- 반드시 포함할 항목: (1) 전문성과 사고방식 (2) 특유의 말투나 입버릇 (3) 업무 스타일 (4) 독특한 습관이나 비유 표현`,
              `- 전체 4-6문장, 150-250자 내외`,
              `- JSON이나 마크다운 없이 순수 텍스트만 출력`,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `[Persona Generation Request]`,
              `Write an AI character persona prompt for the following person in English.`,
              `Name: ${name}`,
              `Role: ${roleLabel}`,
              deptName ? `Department: ${deptName}` : "",
              ``,
              `Rules:`,
              `- Start with "I am ${name}, ..." in first-person`,
              `- If this is a real/historical figure, reflect their known traits; if fictional, create based on the name's impression`,
              `- Must include: (1) expertise and thinking style (2) distinctive speech patterns or catchphrases (3) work style (4) unique habits or metaphors`,
              `- 4-6 sentences total, around 150-250 words`,
              `- Output plain text only, no JSON or markdown`,
            ]
              .filter(Boolean)
              .join("\n");

      const stubAgent = {
        id: "persona-gen",
        name: "System",
        name_ko: "시스템",
        role: "senior" as const,
        status: "idle",
        department_id: null,
        current_task_id: null,
        avatar_emoji: "🤖",
        cli_provider: "claude",
        oauth_account_id: null,
        api_provider_id: null,
        api_model: null,
        cli_model: null,
        cli_reasoning_level: null,
      };

      const result = await runAgentOneShot(stubAgent, prompt, {
        projectPath: process.cwd(),
        noTools: true,
        timeoutMs: 30_000,
      });

      const text = (result?.text || "").trim();
      if (!text) {
        return res.status(500).json({ error: "generation_failed", message: "AI returned empty response" });
      }
      res.json({ ok: true, personality: text });
    } catch (err) {
      logger.error({ err }, "[generate-persona] error");
      res.status(500).json({ error: "generation_failed", message: String(err) });
    }
  });

  app.get("/api/personas", (_req, res) => {
    let personas: Array<{ id: string; hasPrompt: boolean }> = [];
    try {
      const files = readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".md"));
      personas = files.map((f) => ({ id: f.replace(/\.md$/, ""), hasPrompt: true }));
    } catch {
      /* directory may not exist */
    }
    res.json({ personas });
  });

  app.get("/api/agents/:id/persona", (req, res) => {
    const id = String(req.params.id);
    const text = readAgentPersonaFile(id);
    res.json({ agentId: id, text: text ?? "" });
  });

  app.put("/api/agents/:id/persona", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT id FROM agents WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (text) {
      writeAgentPersonaFile(id, text);
    } else {
      deleteAgentPersonaFile(id);
    }
    invalidateAgentPersonaCache(id);
    res.json({ ok: true, agentId: id });
  });
}
