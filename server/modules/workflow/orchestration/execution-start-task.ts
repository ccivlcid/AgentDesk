import path from "node:path";
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

type CreateExecutionStartTaskToolsDeps = {
  nowMs: RuntimeContext["nowMs"];
  db: RuntimeContext["db"];
  logsDir: RuntimeContext["logsDir"];
  appendTaskLog: RuntimeContext["appendTaskLog"];
  broadcast: RuntimeContext["broadcast"];
  ensureTaskExecutionSession: RuntimeContext["ensureTaskExecutionSession"];
  resolveLang: RuntimeContext["resolveLang"];
  notifyTaskStatus: (...args: any[]) => any;
  resolveProjectPath: RuntimeContext["resolveProjectPath"];
  createWorktree: RuntimeContext["createWorktree"];
  getDeptRoleConstraint: RuntimeContext["getDeptRoleConstraint"];
  getRecentConversationContext: RuntimeContext["getRecentConversationContext"];
  getTaskContinuationContext: RuntimeContext["getTaskContinuationContext"];
  getRecentChanges: RuntimeContext["getRecentChanges"];
  ensureClaudeMd: RuntimeContext["ensureClaudeMd"];
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
  notifyCeo: RuntimeContext["notifyCeo"];
  startProgressTimer: RuntimeContext["startProgressTimer"];
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
    notifyCeo,
    startProgressTimer,
  } = deps;

  function buildOutputLanguageGuidance(
    taskLang: string,
    _pickL: typeof pickL,
    _l: typeof l,
  ): string {
    const rules: Record<string, string> = {
      ko: [
        "[Output Language & Quality Rules]",
        "- 모든 산출물(PPT, 문서, 영상 자막, 보고서)은 반드시 한글로 작성하세요.",
        "- 슬라이드 제목, 본문, 설명 텍스트 모두 한글이어야 합니다. 영문 전용 고유명사(브랜드명, 기술명)만 예외입니다.",
        "- PPT 슬라이드의 HTML에 폰트가 깨지지 않도록 Pretendard 또는 Noto Sans KR 폰트를 사용하세요.",
        "- 최종 산출물 생성 후 반드시 검증하세요: 파일 존재 여부, 파일 크기, 내용이 깨지지 않았는지 확인.",
        "- PPT 생성 시 html2pptx 변환 후 에러가 없는지 확인하고, 에러 발생 시 HTML을 수정하여 재생성하세요.",
      ].join("\n"),
      en: [
        "[Output Language & Quality Rules]",
        "- All deliverables (PPT, docs, video subtitles, reports) must be written in English.",
        "- Verify final artifacts after generation: check file existence, file size, and content integrity.",
        "- When generating PPT via html2pptx, verify no conversion errors. Fix HTML and regenerate if errors occur.",
      ].join("\n"),
      ja: [
        "[Output Language & Quality Rules]",
        "- すべての成果物（PPT、ドキュメント、動画字幕、レポート）は日本語で作成してください。",
        "- 最終成果物生成後、必ず検証してください：ファイルの存在、サイズ、内容の整合性を確認。",
        "- html2pptxでPPT生成時、変換エラーがないか確認し、エラー発生時はHTMLを修正して再生成してください。",
      ].join("\n"),
      zh: [
        "[Output Language & Quality Rules]",
        "- 所有交付物（PPT、文档、视频字幕、报告）必须用中文撰写。",
        "- 生成最终产物后必须验证：检查文件是否存在、文件大小、内容是否完整。",
        "- 通过html2pptx生成PPT时，确认无转换错误。如有错误，修复HTML后重新生成。",
      ].join("\n"),
    };
    return rules[taskLang] || rules.en;
  }

  function startTaskExecutionForAgent(taskId: string, execAgent: any, deptId: string | null, deptName: string): void {
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
    if (!["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "api"].includes(provider)) return;
    const executionSession = ensureTaskExecutionSession(taskId, execAgent.id, provider);
    const pendingInterruptPrompts = loadPendingInterruptPrompts(db as any, taskId, executionSession.sessionId);
    const interruptPromptBlock = buildInterruptPromptBlock(pendingInterruptPrompts);

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
    if (!taskData) return;
    ensureVideoPreprodRemotionBestPracticesSkill({
      db: db as any,
      nowMs,
      workflowPackKey: taskData.workflow_pack_key,
      provider,
      taskId,
      appendTaskLog,
    });
    const taskLang = resolveLang(taskData.description ?? taskData.title);
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
      notifyCeo(
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
      return;
    }
    const agentCwd = worktreePath;
    appendTaskLog(taskId, "system", `Git worktree created: ${worktreePath} (branch: agentdesk/${taskId.slice(0, 8)})`);
    const logFilePath = path.join(logsDir, `${taskId}.log`);
    const roleLabels: Record<string, string> = {
      team_leader: "Team Leader",
      senior: "Senior",
      junior: "Junior",
      intern: "Intern",
    };
    const roleLabel = roleLabels[execAgent.role] ?? execAgent.role;
    const deptConstraint = deptId ? getDeptRoleConstraint(deptId, deptName) : "";
    const deptPromptRaw = deptId ? getDepartmentPromptForPack(db as any, taskData.workflow_pack_key, deptId) : null;
    const deptPrompt = typeof deptPromptRaw === "string" ? deptPromptRaw.trim() : "";
    const deptPromptBlock = deptPrompt ? `[Department Shared Prompt]\n${deptPrompt}` : "";
    const conversationCtx = getRecentConversationContext(execAgent.id);
    const continuationCtx = getTaskContinuationContext(taskId);
    const recentChanges = getRecentChanges(projPath, taskId);
    if (provider === "claude") {
      ensureClaudeMd(projPath, worktreePath);
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
    const availableSkillsPromptBlock = buildAvailableSkillsPromptBlock(provider);
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
        continuationCtx,
        conversationCtx,
        `\n---`,
        `Agent: ${execAgent.name} (${roleLabel}, ${deptName})`,
        execAgent.personality ? `Personality: ${execAgent.personality}` : "",
        deptConstraint,
        deptPromptBlock,
        `NOTE: You are working in an isolated Git worktree branch (agentdesk/${taskId.slice(0, 8)}). Commit your changes normally.`,
        interruptPromptBlock,
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
    if (provider === "api") {
      const controller = new AbortController();
      const fakePid = getNextHttpAgentPid();
      launchApiProviderAgent(
        taskId,
        execAgent.api_provider_id ?? null,
        execAgent.api_model ?? null,
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

    const worktreeNote = pickL(
      l(
        [` (격리 브랜치: agentdesk/${taskId.slice(0, 8)})`],
        [` (isolated branch: agentdesk/${taskId.slice(0, 8)})`],
        [` (分離ブランチ: agentdesk/${taskId.slice(0, 8)})`],
        [`（隔离分支: agentdesk/${taskId.slice(0, 8)}）`],
      ),
      taskLang,
    );
    notifyCeo(
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
