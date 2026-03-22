import path from "node:path";
import { loadPromptSection } from "../../../lib/prompt-loader.ts";
import type { RuntimeContext } from "../../../types/runtime-context.ts";
import { getDepartmentPromptForPack } from "../packs/department-scope.ts";
import { ensureVideoPreprodRemotionBestPracticesSkill } from "../core/video-skill-bootstrap.ts";
import { buildWorkflowPackExecutionGuidance } from "../packs/execution-guidance.ts";
import { resolveVideoArtifactSpecForTask } from "../packs/video-artifact.ts";
import {
  buildInterruptPromptBlock,
  consumeInterruptPrompts,
  loadPendingInterruptPrompts,
} from "../core/interrupt-injection-tools.ts";
import { buildCharacterPersonaBlock } from "../core/character-persona.ts";
import { buildDocumentGenerationGuidance } from "../core/document-generation-guidance.ts";
import { buildMemoryPromptBlock } from "./autonomous-memory.ts";
import { buildRulesPromptBlock } from "../core/project-scoped-rules.ts";

type CreateExecutionStartTaskToolsDeps = {
  nowMs: RuntimeContext["nowMs"];
  db: RuntimeContext["db"];
  logsDir: RuntimeContext["logsDir"];
  appendTaskLog: RuntimeContext["appendTaskLog"];
  broadcast: RuntimeContext["broadcast"];
  ensureTaskExecutionSession: RuntimeContext["ensureTaskExecutionSession"];
  resolveLang: RuntimeContext["resolveLang"];
  getPreferredLanguage?: () => string;
  notifyTaskStatus: (...args: any[]) => any;
  resolveProjectPath: RuntimeContext["resolveProjectPath"];
  createWorktree: RuntimeContext["createWorktree"];
  getDeptRoleConstraint: RuntimeContext["getDeptRoleConstraint"];
  getRecentConversationContext: RuntimeContext["getRecentConversationContext"];
  getTaskContinuationContext: RuntimeContext["getTaskContinuationContext"];
  getRecentChanges: RuntimeContext["getRecentChanges"];
  ensureClaudeMd: RuntimeContext["ensureClaudeMd"];
  injectTaskContext: RuntimeContext["injectTaskContext"];
  pickL: RuntimeContext["pickL"];
  l: RuntimeContext["l"];
  buildAvailableSkillsPromptBlock: RuntimeContext["buildAvailableSkillsPromptBlock"];
  buildTaskExecutionPrompt: RuntimeContext["buildTaskExecutionPrompt"];
  hasExplicitWarningFixRequest: RuntimeContext["hasExplicitWarningFixRequest"];
  getNextHttpAgentPid: RuntimeContext["getNextHttpAgentPid"];
  launchApiProviderAgent: RuntimeContext["launchApiProviderAgent"];
  launchHttpAgent: RuntimeContext["launchHttpAgent"];
  getProviderModelConfig: RuntimeContext["getProviderModelConfig"];
  spawnCliAgent: RuntimeContext["spawnCliAgent"];
  handleTaskRunComplete: RuntimeContext["handleTaskRunComplete"];
  notifyClient: RuntimeContext["notifyClient"];
  startProgressTimer: RuntimeContext["startProgressTimer"];
  /** Called when the function returns early without spawning a process,
   *  so the agent queue can release the running slot. */
  onEarlyReturn?: (taskId: string) => void;
};

export function createExecutionStartTaskTools(deps: CreateExecutionStartTaskToolsDeps) {
  const {
    nowMs,
    db,
    logsDir,
    appendTaskLog,
    broadcast,
    ensureTaskExecutionSession,
    resolveLang,
    notifyTaskStatus,
    resolveProjectPath,
    createWorktree,
    getDeptRoleConstraint,
    getRecentConversationContext,
    getTaskContinuationContext,
    getRecentChanges,
    ensureClaudeMd,
    injectTaskContext,
    pickL,
    l,
    buildAvailableSkillsPromptBlock,
    buildTaskExecutionPrompt,
    hasExplicitWarningFixRequest,
    getNextHttpAgentPid,
    launchApiProviderAgent,
    launchHttpAgent,
    getProviderModelConfig,
    spawnCliAgent,
    handleTaskRunComplete,
    notifyClient,
    startProgressTimer,
    onEarlyReturn,
    getPreferredLanguage,
  } = deps;

  function buildOutputLanguageGuidance(
    taskLang: string,
    _pickL: typeof pickL,
    _l: typeof l,
  ): string {
    return loadPromptSection("execution/output-language-guidance", taskLang) || "";
  }

  async function buildExecutionPayload(params: {
    taskId: string;
    agentId: string;
    projectId: string | null;
    departmentId: string | null;
    workflowPackKey: string | null;
    provider: string;
    sessionId: string;
    taskTitle: string;
    taskDescription: string | null;
    taskLang: string;
  }) {
    const [rulesBlock, memoryBlock, skillsBlock, interruptPrompts, convCtx, continuationCtx] = await Promise.all([
      Promise.resolve(
        buildRulesPromptBlock(
          db as any,
          {
            projectId: params.projectId,
            agentId: params.agentId,
            departmentId: params.departmentId,
          },
          params.taskLang,
        ),
      ),
      Promise.resolve(
        buildMemoryPromptBlock(
          { db },
          {
            agentId: params.agentId,
            departmentId: params.departmentId,
            workflowPackKey: params.workflowPackKey,
            projectId: params.projectId,
            taskTitle: params.taskTitle,
            taskDescription: params.taskDescription,
          },
          params.taskLang,
        ),
      ),
      Promise.resolve(buildAvailableSkillsPromptBlock(params.provider, params.projectId)),
      Promise.resolve(loadPendingInterruptPrompts(db as any, params.taskId, params.sessionId)),
      Promise.resolve(getRecentConversationContext(params.agentId)),
      Promise.resolve(getTaskContinuationContext(params.taskId)),
    ]);
    return { rulesBlock, memoryBlock, skillsBlock, interruptPrompts, convCtx, continuationCtx };
  }

  async function startTaskExecutionForAgent(taskId: string, execAgent: any, deptId: string | null, deptName: string): Promise<void> {
    // Dependency blocking: check if all predecessor tasks are completed
    const incompletePredecessors = db
      .prepare(
        `SELECT t.id, t.title, t.status FROM task_dependencies td
         JOIN tasks t ON t.id = td.depends_on_task_id
         WHERE td.task_id = ? AND t.status NOT IN ('done', 'cancelled')`,
      )
      .all(taskId) as Array<{ id: string; title: string; status: string }>;

    if (incompletePredecessors.length > 0) {
      const titles = incompletePredecessors.map((p) => `"${p.title}" (${p.status})`).join(", ");
      appendTaskLog(taskId, "system", `BLOCKED: predecessor tasks not completed — ${titles}`);
      const lang = resolveLang(incompletePredecessors[0].title);
      notifyClient(
        pickL(
          l(
            [`선행 태스크가 완료되지 않아 실행이 차단되었습니다: ${titles}`],
            [`Execution blocked — predecessor tasks not done: ${titles}`],
            [`前提タスクが未完了のため実行がブロックされました: ${titles}`],
            [`前置任务未完成，执行已阻止: ${titles}`],
          ),
          lang,
        ),
        taskId,
      );
      broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
      onEarlyReturn?.(taskId);
      return;
    }

    const execName = execAgent.name_ko || execAgent.name;
    const t = nowMs();
    db.prepare(
      "UPDATE tasks SET status = 'in_progress', assigned_agent_id = ?, started_at = ?, updated_at = ? WHERE id = ?",
    ).run(execAgent.id, t, t, taskId);
    db.prepare("UPDATE agents SET status = 'working', current_task_id = ? WHERE id = ?").run(taskId, execAgent.id);
    appendTaskLog(taskId, "system", `${execName} started (approved)`);

    broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
    broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(execAgent.id));

    const provider = execAgent.cli_provider || "claude";
    if (!["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "api", "ollama"].includes(provider)) {
      onEarlyReturn?.(taskId);
      return;
    }
    const executionSession = ensureTaskExecutionSession(taskId, execAgent.id, provider);

    const taskData = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as
      | {
          title: string;
          description: string | null;
          project_id: string | null;
          project_path: string | null;
          department_id: string | null;
          base_branch: string | null;
          workflow_pack_key: string | null;
        }
      | undefined;
    if (!taskData) {
      onEarlyReturn?.(taskId);
      return;
    }
    ensureVideoPreprodRemotionBestPracticesSkill({
      db: db as any,
      nowMs,
      workflowPackKey: taskData.workflow_pack_key,
      provider,
      taskId,
      appendTaskLog,
    });
    const taskLang = typeof getPreferredLanguage === "function" ? getPreferredLanguage() : resolveLang(taskData.description ?? taskData.title);
    const videoArtifactSpec =
      taskData.workflow_pack_key === "video_preprod"
        ? resolveVideoArtifactSpecForTask(db as any, {
            project_id: taskData.project_id,
            project_path: taskData.project_path,
            department_id: deptId ?? taskData.department_id ?? null,
            workflow_pack_key: taskData.workflow_pack_key,
          })
        : null;
    const workflowPackGuidance = buildWorkflowPackExecutionGuidance(taskData.workflow_pack_key, taskLang, {
      videoArtifactRelativePath: videoArtifactSpec?.relativePath,
    });
    notifyTaskStatus(taskId, taskData.title, "in_progress", taskLang);

    const projPath = resolveProjectPath(taskData);
    const worktreePath = createWorktree(projPath, taskId, execAgent.name, taskData.base_branch ?? undefined);
    if (!worktreePath) {
      const rollbackAt = nowMs();
      appendTaskLog(
        taskId,
        "error",
        `Execution blocked: isolated worktree creation failed for project path '${projPath}'`,
      );
      db.prepare("UPDATE tasks SET status = 'pending', started_at = NULL, updated_at = ? WHERE id = ?").run(
        rollbackAt,
        taskId,
      );
      db.prepare(
        "UPDATE agents SET status = 'idle', current_task_id = CASE WHEN current_task_id = ? THEN NULL ELSE current_task_id END WHERE id = ?",
      ).run(taskId, execAgent.id);
      broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
      broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(execAgent.id));
      notifyTaskStatus(taskId, taskData.title, "pending", taskLang);
      notifyClient(
        pickL(
          l(
            [
              `[WORKTREE REQUIRED] '${taskData.title}' 실행을 차단했습니다. 격리 worktree 생성에 실패해 프로젝트 루트 오염을 방지하기 위해 중단되었습니다.`,
            ],
            [
              `[WORKTREE REQUIRED] Blocked execution for '${taskData.title}'. Isolated worktree creation failed, so run was aborted to protect the project root.`,
            ],
            [
              `[WORKTREE REQUIRED] '${taskData.title}' の実行を停止しました。分離 worktree 作成に失敗したため、プロジェクトルート保護のため中断しました。`,
            ],
            [
              `[WORKTREE REQUIRED] 已阻止 '${taskData.title}' 的执行。由于隔离 worktree 创建失败，为保护项目根目录已中止。`,
            ],
          ),
          taskLang,
        ),
        taskId,
      );
      onEarlyReturn?.(taskId);
      return;
    }
    const agentCwd = worktreePath;
    const isDirectMode = worktreePath === projPath;
    if (isDirectMode) {
      appendTaskLog(taskId, "system", `Running in direct mode (no git isolation): ${worktreePath}`);
    } else {
      appendTaskLog(taskId, "system", `Git worktree created: ${worktreePath} (branch: agentdesk/${taskId.slice(0, 8)})`);
    }
    const logFilePath = path.join(logsDir, `${taskId}.log`);
    const roleLabels: Record<string, string> = {
      team_leader: "Team Leader",
      senior: "Senior",
      junior: "Junior",
      intern: "Intern",
    };
    const roleLabel = roleLabels[execAgent.role] ?? execAgent.role;
    const deptConstraint = deptId ? getDeptRoleConstraint(deptId, deptName) : "";
    const deptPromptRaw = deptId ? getDepartmentPromptForPack(db as any, deptId) : null;
    const deptPrompt = typeof deptPromptRaw === "string" ? deptPromptRaw.trim() : "";
    const deptPromptBlock = deptPrompt ? `[Department Shared Prompt]\n${deptPrompt}` : "";

    const { rulesBlock, memoryBlock, skillsBlock: availableSkillsPromptBlock, interruptPrompts: pendingInterruptPrompts, convCtx: conversationCtx, continuationCtx } = await buildExecutionPayload({
      taskId,
      agentId: execAgent.id,
      projectId: taskData.project_id ?? null,
      departmentId: deptId ?? taskData.department_id ?? null,
      workflowPackKey: taskData.workflow_pack_key,
      provider,
      sessionId: executionSession.sessionId,
      taskTitle: taskData.title,
      taskDescription: taskData.description,
      taskLang,
    });

    const interruptPromptBlock = buildInterruptPromptBlock(pendingInterruptPrompts);
    const recentChanges = getRecentChanges(projPath, taskId);
    if (provider === "claude") {
      ensureClaudeMd(projPath, worktreePath);
    }
    // CLI interactive providers: inject .agentdesk-task.md so the agent
    // knows what task it is on and how to signal completion.
    const CLI_INTERACTIVE_PROVIDERS_INJECT = new Set(["claude", "cursor", "codex", "gemini"]);
    if (CLI_INTERACTIVE_PROVIDERS_INJECT.has(provider)) {
      const personaBlock = buildCharacterPersonaBlock(execAgent.persona_id, execAgent.id);
      injectTaskContext({
        worktreePath,
        taskId,
        taskTitle: taskData.title,
        taskDescription: taskData.description,
        personaBlock: personaBlock || undefined,
      });
    }
    const continuationInstruction = continuationCtx
      ? pickL(
          l(
            ["연속 실행: 소유 컨텍스트를 유지하고 인사/착수 멘트 없이 미해결 검토 항목을 즉시 반영하세요."],
            [
              "Continuation run: keep ownership, skip greetings/kickoff narration, and execute unresolved review items immediately.",
            ],
            ["継続実行: オーナーシップを維持し、挨拶/開始ナレーションなしで未解決レビュー項目を即時反映してください。"],
            ["连续执行：保持责任上下文，跳过问候/开场说明，立即处理未解决评审项。"],
          ),
          taskLang,
        )
      : pickL(
          l(
            ["긴 서론 없이 바로 실행하고, 메시지는 간결하게 유지하세요."],
            ["Execute directly without long preamble and keep messages concise."],
            ["長い前置きなしで直ちに実行し、メッセージは簡潔にしてください。"],
            ["无需冗长前言，直接执行并保持消息简洁。"],
          ),
          taskLang,
        );
    const runInstruction = pickL(
      l(
        ["위 작업을 충분히 완수하세요. 필요 시 연속 실행 요약과 대화 맥락을 참고하세요."],
        [
          "Please complete the task above thoroughly. Use the continuation brief and conversation context above if relevant.",
        ],
        ["上記タスクを丁寧に完了してください。必要に応じて継続要約と会話コンテキストを参照してください。"],
        ["请完整地完成上述任务。可按需参考连续执行摘要与会话上下文。"],
      ),
      taskLang,
    );
    const spawnPrompt = buildTaskExecutionPrompt(
      [
        availableSkillsPromptBlock,
        `[Task Session] id=${executionSession.sessionId} owner=${executionSession.agentId} provider=${executionSession.provider}`,
        "This session is scoped to this task only. Keep context continuity inside this task session and do not mix with other projects.",
        recentChanges ? `[Recent Changes]\n${recentChanges}` : "",
        `[Task] ${taskData.title}`,
        taskData.description ? `\n${taskData.description}` : "",
        workflowPackGuidance ? `\n[Workflow Pack Execution Rules]\n${workflowPackGuidance}` : "",
        buildOutputLanguageGuidance(taskLang, pickL, l),
        buildDocumentGenerationGuidance(taskData.title, taskData.description, taskLang),
        continuationCtx,
        conversationCtx,
        `\n---`,
        `Agent: ${execAgent.name} (${roleLabel}, ${deptName})`,
        buildCharacterPersonaBlock(execAgent.persona_id, execAgent.id),
        deptConstraint,
        deptPromptBlock,
        `NOTE: You are working in an isolated Git worktree branch (agentdesk/${taskId.slice(0, 8)}). Commit your changes normally.`,
        interruptPromptBlock,
        rulesBlock,
        memoryBlock,
        continuationInstruction,
        runInstruction,
      ],
      {
        allowWarningFix: hasExplicitWarningFixRequest(taskData.title, taskData.description),
      },
    );

    if (pendingInterruptPrompts.length > 0) {
      consumeInterruptPrompts(
        db as any,
        pendingInterruptPrompts.map((row) => row.id),
        nowMs(),
      );
      appendTaskLog(
        taskId,
        "system",
        `INJECT consumed (${pendingInterruptPrompts.length}) for session ${executionSession.sessionId}`,
      );
    }

    appendTaskLog(taskId, "system", `RUN start (agent=${execAgent.name}, provider=${provider})`);
    if (provider === "api" || provider === "ollama") {
      const controller = new AbortController();
      const fakePid = getNextHttpAgentPid();

      // For ollama: auto-resolve provider ID and model if not explicitly set
      let apiProviderId = execAgent.api_provider_id;
      let apiModel = execAgent.api_model;
      if (provider === "ollama" && !apiProviderId) {
        const ollamaProvider = db.prepare(
          "SELECT id FROM api_providers WHERE type = 'ollama' AND enabled = 1 LIMIT 1",
        ).get() as { id: string } | undefined;
        if (ollamaProvider) apiProviderId = ollamaProvider.id;
      }
      if (provider === "ollama" && !apiModel) {
        apiModel = execAgent.cli_model || "llama3.1";
      }

      launchApiProviderAgent(
        taskId,
        apiProviderId ?? null,
        apiModel ?? null,
        spawnPrompt,
        agentCwd,
        logFilePath,
        controller,
        fakePid,
      );
    } else if (provider === "copilot" || provider === "antigravity") {
      const controller = new AbortController();
      const fakePid = getNextHttpAgentPid();
      launchHttpAgent(
        taskId,
        provider,
        spawnPrompt,
        agentCwd,
        logFilePath,
        controller,
        fakePid,
        execAgent.oauth_account_id ?? null,
      );
    } else {
      const modelConfig = getProviderModelConfig();
      const modelForProvider = execAgent.cli_model || modelConfig[provider]?.model || undefined;
      const reasoningLevel =
        provider === "codex"
          ? execAgent.cli_reasoning_level || modelConfig[provider]?.reasoningLevel || undefined
          : modelConfig[provider]?.reasoningLevel || undefined;

      // All CLI providers run headless — agent executes autonomously,
      // handleTaskRunComplete fires on process exit (no manual "완료" button needed).
      // Client sees only the final result after PM reviews in decision inbox.
      {
        appendTaskLog(taskId, "system", `RUN headless (provider=${provider})`);
        const child = spawnCliAgent(
          taskId,
          provider,
          spawnPrompt,
          agentCwd,
          logFilePath,
          modelForProvider,
          reasoningLevel,
        );
        child.on("close", (code: number | null) => {
          handleTaskRunComplete(taskId, code ?? 1);
        });
      }
    }

    const worktreeNote = pickL(
      l(
        [` (격리 브랜치: agentdesk/${taskId.slice(0, 8)})`],
        [` (isolated branch: agentdesk/${taskId.slice(0, 8)})`],
        [` (分離ブランチ: agentdesk/${taskId.slice(0, 8)})`],
        [`（隔离分支: agentdesk/${taskId.slice(0, 8)}）`],
      ),
      taskLang,
    );
    notifyClient(
      pickL(
        l(
          [`${execName}가 '${taskData.title}' 작업을 시작했습니다.${worktreeNote}`],
          [`${execName} started work on '${taskData.title}'.${worktreeNote}`],
          [`${execName}が '${taskData.title}' の作業を開始しました。${worktreeNote}`],
          [`${execName} 已开始处理 '${taskData.title}'。${worktreeNote}`],
        ),
        taskLang,
      ),
      taskId,
    );
    startProgressTimer(taskId, taskData.title, deptId);
  }

  return {
    startTaskExecutionForAgent,
  };
}
