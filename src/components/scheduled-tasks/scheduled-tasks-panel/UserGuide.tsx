export function UserGuide({
  tr,
  language,
  guideExpanded,
  setGuideExpanded,
}: {
  tr: (ko: string, en: string) => string;
  language: string;
  guideExpanded: string | null;
  setGuideExpanded: (id: string | null) => void;
}) {
  const sections = [
    {
      id: "overview",
      title: tr("스케줄러 개요", "Scheduler Overview"),
      icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      content: language === "ko" ? [
        "태스크 스케줄러는 Cron 표현식을 기반으로 지정된 시간에 자동으로 태스크를 생성하는 기능입니다.",
        "스케줄, 템플릿, 에이전트, 프로젝트를 조합하여 반복 업무를 완전 자동화할 수 있습니다.",
        "스케줄은 ON/OFF 토글로 활성화 상태를 제어할 수 있으며, 비활성 스케줄은 태스크를 생성하지 않습니다.",
      ] : [
        "The Task Scheduler automatically creates tasks at specified times based on Cron expressions.",
        "Combine schedules, templates, agents, and projects to fully automate recurring work.",
        "Schedules can be toggled ON/OFF. Disabled schedules will not create tasks.",
      ],
    },
    {
      id: "schedule-create",
      title: tr("스케줄 등록 방법", "How to Create a Schedule"),
      icon: "M12 6v6l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      content: language === "ko" ? [
        '1. "스케줄" 탭에서 [새 스케줄] 버튼을 클릭합니다.',
        "2. 스케줄 이름을 입력합니다 (예: 일일 코드 리뷰).",
        "3. Cron 표현식을 직접 입력하거나 빠른 선택 프리셋을 클릭합니다.",
        "4. 필요에 따라 템플릿, 에이전트, 프로젝트를 선택합니다.",
        '5. "자동 실행" 토글을 켜면 태스크 생성과 동시에 에이전트가 바로 작업을 시작합니다.',
        "6. [스케줄 생성] 버튼을 클릭하면 완료됩니다.",
      ] : [
        '1. In the "Schedules" tab, click the [New Schedule] button.',
        "2. Enter a schedule name (e.g., Daily Code Review).",
        "3. Type a Cron expression directly or click a quick preset.",
        "4. Optionally select a template, agent, and project.",
        '5. Enable "Auto-run" to have the agent start working immediately when a task is created.',
        "6. Click [Create Schedule] to finish.",
      ],
    },
    {
      id: "templates",
      title: tr("템플릿 활용 가이드", "Template Usage Guide"),
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      content: language === "ko" ? [
        "템플릿은 반복 생성되는 태스크의 기본 속성(제목, 설명, 우선순위, 워크플로우 팩 등)을 미리 정의합니다.",
        '1. "템플릿" 탭에서 [새 템플릿] 버튼을 클릭합니다.',
        "2. 템플릿 이름(필수)과 태스크 제목, 설명을 입력합니다.",
        "3. 워크플로우 팩을 선택하면 해당 팩의 워크플로우에 따라 태스크가 실행됩니다.",
        "4. 우선순위와 태스크 유형을 설정합니다.",
        "5. 생성 후 스케줄 등록 시 템플릿을 선택하면, 해당 스케줄로 생성되는 모든 태스크에 템플릿 설정이 적용됩니다.",
      ] : [
        "Templates pre-define default properties (title, description, priority, workflow pack, etc.) for recurring tasks.",
        '1. In the "Templates" tab, click the [New Template] button.',
        "2. Enter a template name (required), task title, and description.",
        "3. Select a workflow pack to have tasks follow that pack's workflow.",
        "4. Set priority and task type.",
        "5. When creating a schedule, select the template to apply its settings to all generated tasks.",
      ],
    },
    {
      id: "cron",
      title: tr("Cron 표현식 가이드", "Cron Expression Guide"),
      icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
      content: language === "ko" ? [
        "Cron 표현식은 5개 필드로 구성됩니다: 분 시 일 월 요일",
        "",
        "  * : 모든 값     */N : N 간격마다",
        "  N : 특정 값     N-M : 범위",
        "  N,M : 여러 값",
        "",
        "자주 사용하는 예시:",
        "  */30 * * * *    → 30분마다",
        "  0 * * * *       → 매시간 정각",
        "  0 9 * * *       → 매일 오전 9시",
        "  0 9 * * 1-5     → 평일 오전 9시",
        "  0 9 * * 1       → 매주 월요일 오전 9시",
        "  0 9 1 * *       → 매월 1일 오전 9시",
        "  0 9,18 * * *    → 매일 오전 9시, 오후 6시",
        "",
        "요일: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토",
      ] : [
        "Cron expressions consist of 5 fields: minute hour day month weekday",
        "",
        "  * : any value     */N : every N",
        "  N : specific       N-M : range",
        "  N,M : multiple values",
        "",
        "Common examples:",
        "  */30 * * * *    → every 30 minutes",
        "  0 * * * *       → every hour on the hour",
        "  0 9 * * *       → daily at 9 AM",
        "  0 9 * * 1-5     → weekdays at 9 AM",
        "  0 9 * * 1       → every Monday at 9 AM",
        "  0 9 1 * *       → 1st of every month at 9 AM",
        "  0 9,18 * * *    → daily at 9 AM and 6 PM",
        "",
        "Weekday: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat",
      ],
    },
    {
      id: "workflow",
      title: tr("워크플로우 팩 설명", "Workflow Pack Guide"),
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      content: language === "ko" ? [
        "워크플로우 팩은 태스크 실행 시 에이전트가 따르는 작업 흐름을 정의합니다:",
        "",
        "  Development  — 코드 개발, 테스트, PR 생성 등 소프트웨어 개발 워크플로우",
        "  Novel        — 소설/창작 글쓰기 워크플로우",
        "  Report       — 보고서 작성 워크플로우",
        "  Video Pre-prod — Remotion 기반 영상 기획/렌더링",
        "  Web Research — 웹 리서치 및 보고서 작성",
        "  Roleplay     — 롤플레이/시뮬레이션",
        "  Asset Mgmt   — 자산/리소스 관리",
        "",
        "템플릿에 워크플로우 팩을 지정하면, 스케줄로 생성된 태스크가 해당 워크플로우에 따라 자동 실행됩니다.",
      ] : [
        "Workflow packs define the execution flow agents follow when running tasks:",
        "",
        "  Development  — Software dev: coding, testing, PR creation",
        "  Novel        — Creative/fiction writing workflow",
        "  Report       — Report generation workflow",
        "  Video Pre-prod — Remotion-based video planning & rendering",
        "  Web Research — Web research and report writing",
        "  Roleplay     — Roleplay/simulation scenarios",
        "  Asset Mgmt   — Asset/resource management",
        "",
        "Assigning a workflow pack to a template means all tasks generated by the schedule will follow that workflow automatically.",
      ],
    },
    {
      id: "tips",
      title: tr("활용 팁", "Tips & Best Practices"),
      icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      content: language === "ko" ? [
        "1. 템플릿 먼저 만들기: 스케줄에 템플릿을 연결하면 매번 동일한 설정의 태스크가 자동 생성됩니다.",
        "2. 자동 실행 주의: 자동 실행을 켜면 태스크 생성 즉시 에이전트가 작업을 시작합니다. 검토가 필요한 작업은 끄세요.",
        "3. 에이전트 지정: 특정 에이전트를 지정하면 해당 에이전트가 항상 작업합니다. 미지정 시 시스템이 자동 배정합니다.",
        "4. 프로젝트 연결: 프로젝트를 선택하면 해당 프로젝트의 컨텍스트(코드베이스, 설정 등)에서 태스크가 실행됩니다.",
        "5. 비활성화 활용: 일시적으로 스케줄을 멈추려면 삭제 대신 OFF로 전환하세요.",
        "6. Cron 검증: 입력한 Cron 표현식은 실시간으로 검증되며, 유효할 때 초록색 체크가 표시됩니다.",
      ] : [
        "1. Create templates first: Link them to schedules for consistent task generation.",
        "2. Auto-run caution: When enabled, agents start working immediately on task creation. Disable for tasks needing review.",
        "3. Agent assignment: Assign a specific agent for consistency, or leave on Auto for system-assigned agents.",
        "4. Project linking: Selecting a project runs the task within that project's context (codebase, settings, etc.).",
        "5. Use disable: To pause a schedule temporarily, turn it OFF instead of deleting.",
        "6. Cron validation: The Cron expression is validated in real time; a green check appears when valid.",
      ],
    },
  ];

  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        const isOpen = guideExpanded === sec.id;
        return (
          <div
            key={sec.id}
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", overflow: "hidden" }}
          >
            <button
              type="button"
              onClick={() => setGuideExpanded(isOpen ? null : sec.id)}
              className="flex items-center justify-between w-full px-4 py-3 text-left transition-colors"
              style={{ color: "var(--th-text-primary)" }}
            >
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-accent)" }}>
                  <path d={sec.icon} />
                </svg>
                <span className="text-sm font-semibold font-mono">{sec.title}</span>
              </div>
              <span className="text-xs font-mono transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "var(--th-text-muted)" }}>▼</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "var(--th-border)" }}>
                <div className="space-y-2 mt-3 text-xs font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                  {sec.content.map((line, i) => (
                    <p key={i} className={line === "" ? "h-2" : ""} style={{ whiteSpace: "pre-wrap" }}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
