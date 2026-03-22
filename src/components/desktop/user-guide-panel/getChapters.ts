import type { Chapter, I18nT } from "./types";

export function getChapters(t: I18nT): Chapter[] {
  return [
    // ── 시작하기 ──────────────────────────────────────────────────────────────
    {
      id: "getting-started",
      color: "#0a84ff",
      icon: "⚡",
      title: t({ ko: "시작하기", en: "Getting Started", ja: "はじめに", zh: "快速开始" }),
      sections: [
        {
          heading: t({ ko: "AgentDesk란?", en: "What is AgentDesk?", ja: "AgentDeskとは？", zh: "什么是AgentDesk？" }),
          body: t({
            ko: "AgentDesk는 여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS입니다.\nmacOS 바탕화면 은유로 설계되어 메뉴바, 데스크톱 아이콘, 위젯, Dock, 앱 창이 유기적으로 연결됩니다.",
            en: "AgentDesk is a developer OS for running, monitoring, and controlling multiple AI agents simultaneously.\nDesigned with a macOS desktop metaphor — menubar, desktop icons, widgets, Dock, and app windows.",
            ja: "AgentDeskは複数のAIエージェントを同時に実行・監視・制御する開発者向けOSです。",
            zh: "AgentDesk是同时运行、监控和控制多个AI代理的开发者操作系统。",
          }),
        },
        {
          heading: t({ ko: "화면 구성", en: "Interface Overview", ja: "画面構成", zh: "界面概览" }),
          body: t({
            ko: "• 상단 메뉴바 — 로고 · 프로젝트 선택 · AI 비용 · 알림 · 시각\n• 바탕화면 — 아이콘 + 위젯 자유 배치\n• 하단 Dock — Workflow · Library · TaskBoard · Settings · Chat · REPL\n• 앱 창 — 트래픽 라이트 (닫기·최소화·최대화)\n• 알림 센터 — 우상단 벨 아이콘 클릭",
            en: "• Menubar — logo · project · cost · alerts · clock\n• Desktop — icons + freely placed widgets\n• Bottom Dock — Workflow · Library · TaskBoard · Settings · Chat · REPL\n• App windows — traffic light style\n• Notification Center — click the bell icon",
            ja: "• メニューバー · デスクトップ · Dock · アプリウィンドウ · 通知センター",
            zh: "• 菜单栏 · 桌面 · Dock · 应用窗口 · 通知中心",
          }),
        },
        {
          heading: t({ ko: "첫 프로젝트 만들기", en: "Creating Your First Project", ja: "最初のプロジェクト", zh: "创建第一个项目" }),
          body: t({
            ko: "1. 바탕화면 📁 아이콘 또는 메뉴바 프로젝트 선택기에서 새 프로젝트 생성\n2. 프로젝트 이름·목표·경로를 입력합니다\n3. 에이전트를 배정하고 태스크를 생성합니다\n4. ▶ Run Task 아이콘으로 즉시 실행",
            en: "1. Click the 📁 icon on the desktop or use the menubar project selector\n2. Enter project name, goal, and path\n3. Assign agents and create tasks\n4. Use the ▶ Run Task icon to execute immediately",
            ja: "1. 📁アイコンまたはメニューバーで新規プロジェクト作成\n2. 名前・目標・パスを入力\n3. エージェントを割り当てタスクを作成",
            zh: "1. 点击桌面📁图标或菜单栏新建项目\n2. 输入名称·目标·路径\n3. 分配代理并创建任务",
          }),
          callout: {
            type: "tip",
            text: t({ ko: "Ctrl+Shift+K 커맨드 팔레트에서 'N' 키로 즉시 태스크를 생성할 수 있습니다.", en: "Press 'N' in the Command Palette (Ctrl+Shift+K) to instantly create a task.", ja: "コマンドパレット(Ctrl+Shift+K)でNキーを押すと即座にタスクを作成できます。", zh: "在命令面板(Ctrl+Shift+K)中按N键可立即创建任务。" }),
          },
        },
      ],
    },

    // ── 바탕화면 ─────────────────────────────────────────────────────────────
    {
      id: "desktop",
      color: "#30d158",
      icon: "🖥️",
      title: t({ ko: "바탕화면", en: "Desktop", ja: "デスクトップ", zh: "桌面" }),
      sections: [
        {
          heading: t({ ko: "데스크톱 아이콘", en: "Desktop Icons", ja: "アイコン", zh: "桌面图标" }),
          features: [
            { icon: "👤", label: t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" }), desc: t({ ko: "에이전트·전문 분야 관리", en: "Manage agents & specialties", ja: "エージェント管理", zh: "管理代理和专业领域" }) },
            { icon: "📁", label: t({ ko: "프로젝트 생성", en: "New Project", ja: "新規プロジェクト", zh: "新建项目" }), desc: t({ ko: "프로젝트 마법사", en: "Project wizard", ja: "プロジェクトウィザード", zh: "项目向导" }) },
            { icon: "▶", label: t({ ko: "태스크 실행", en: "Run Task", ja: "タスク実行", zh: "运行任务" }), desc: t({ ko: "즉시 태스크 생성", en: "Create task instantly", ja: "即時タスク作成", zh: "立即创建任务" }) },
            { icon: "⚡", label: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }), desc: t({ ko: "파이프라인 빌더", en: "Pipeline builder", ja: "パイプライン編集", zh: "流水线构建" }) },
            { icon: "📊", label: t({ ko: "보고서", en: "Reports", ja: "レポート", zh: "报告" }), desc: t({ ko: "성과·실행 이력", en: "Performance & run history", ja: "パフォーマンス履歴", zh: "性能和运行历史" }) },
            { icon: "⇄", label: t({ ko: "Synapse", en: "Synapse", ja: "Synapse", zh: "Synapse" }), desc: t({ ko: "에이전트 테스트·벤치마크", en: "Agent test & benchmark", ja: "エージェントテスト", zh: "代理测试和基准" }) },
          ],
        },
        {
          heading: t({ ko: "아이콘 이동 & 삭제", en: "Moving & Deleting Icons", ja: "アイコンの移動と削除", zh: "移动和删除图标" }),
          body: t({
            ko: "• 드래그로 자유 배치 (위치 자동 저장)\n• 빈 바탕화면을 600ms 길게 누르면 Jiggle Mode 활성화\n• 프로젝트 아이콘에 ✕ 배지가 나타나면 클릭하여 삭제\n• Esc 또는 빈 곳 클릭으로 Jiggle Mode 해제",
            en: "• Drag freely — positions auto-save\n• Long-press empty desktop for 600ms to activate Jiggle Mode\n• A ✕ badge appears on project icons — click to delete\n• Press Esc or click empty area to exit Jiggle Mode",
            ja: "• ドラッグして自由に配置（位置は自動保存）\n• 600ms長押しでJiggleモード\n• ✕バッジが表示されたらクリックで削除",
            zh: "• 拖动自由放置（位置自动保存）\n• 长按600ms激活Jiggle模式\n• ✕徽标出现后点击删除",
          }),
        },
        {
          heading: t({ ko: "Quick Look (빠른 미리보기)", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
          body: t({
            ko: "프로젝트 아이콘을 선택하고 Space 키를 누르면 프로젝트 상세 미리보기 패널이 열립니다.\n• 프로젝트명·경로·목표·태스크 수·담당 에이전트 확인\n• 우클릭 메뉴 → '빠른 미리보기'로도 열 수 있습니다",
            en: "Select a project icon and press Space to open the Quick Look panel.\n• Shows project name, path, goal, task count, assigned agents\n• Also accessible via right-click → 'Quick Look'",
            ja: "プロジェクトアイコンを選択してSpaceキーでクイックルックパネルを開きます。",
            zh: "选中项目图标后按Space键打开快速预览面板。",
          }),
        },
        {
          heading: t({ ko: "Mission Control (Ctrl+↑)", en: "Mission Control (Ctrl+↑)", ja: "ミッションコントロール", zh: "Mission Control" }),
          body: t({
            ko: "Ctrl+↑ 또는 앱 메뉴에서 Mission Control을 열면 현재 열린 모든 창과 위젯을 한 화면에서 조망합니다.\n창을 클릭하면 바로 해당 창으로 포커스가 이동합니다.",
            en: "Press Ctrl+↑ or use the app menu to open Mission Control — an overview of all open windows and widgets.\nClick any window thumbnail to focus it.",
            ja: "Ctrl+↑でMission Controlを開き、全ウィンドウを俯瞰できます。",
            zh: "Ctrl+↑打开Mission Control，一览所有打开的窗口和小组件。",
          }),
        },
      ],
    },

    // ── 에이전트 ─────────────────────────────────────────────────────────────
    {
      id: "agents",
      color: "#ff9f0a",
      icon: "🤖",
      title: t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" }),
      sections: [
        {
          heading: t({ ko: "에이전트 만들기", en: "Creating an Agent", ja: "エージェントの作成", zh: "创建代理" }),
          body: t({
            ko: "1. 바탕화면 👤 아이콘 클릭 → Agent Manager 창 열림\n2. 'Hire Agent' 버튼 클릭\n3. 이름·역할(Role)·AI 모델 설정\n4. 전문 분야(Specialty)에 배치\n\n에이전트별로 시스템 프롬프트, 사용 가능한 Skills, Memory 설정이 가능합니다.",
            en: "1. Click the 👤 icon on the desktop → opens Agent Manager\n2. Click 'Hire Agent'\n3. Set name, role, and AI model\n4. Assign to a specialty\n\nEach agent supports custom system prompt, Skills, and Memory configuration.",
            ja: "1. 👤アイコンをクリック\n2. 「Hire Agent」をクリック\n3. 名前・役割・モデルを設定\n4. 専門分野に配置",
            zh: "1. 点击👤图标 → 打开代理管理器\n2. 点击「招聘代理」\n3. 设置名称、角色和模型\n4. 分配到专业领域",
          }),
        },
        {
          heading: t({ ko: "에이전트 상태", en: "Agent Status", ja: "エージェントの状態", zh: "代理状态" }),
          body: t({
            ko: "● 초록 — idle (대기 중)\n● 노랑 — working (실행 중)\n─ — paused (일시 정지)\n✕ — error (오류 발생)\n\nAgents 위젯이나 Agent Manager 창에서 실시간 상태를 확인합니다.",
            en: "● Green — idle\n● Yellow — working\n─ — paused\n✕ — error\n\nCheck real-time status in the Agents widget or Agent Manager window.",
            ja: "● 緑=idle · ● 黄=working · ─=paused · ✕=error",
            zh: "● 绿=空闲 · ● 黄=工作中 · ─=暂停 · ✕=错误",
          }),
        },
        {
          heading: t({ ko: "에이전트 상세 패널", en: "Agent Detail Panel", ja: "エージェント詳細パネル", zh: "代理详情面板" }),
          body: t({
            ko: "에이전트를 클릭하면 우측 상세 패널이 열립니다.\n• 현재 실행 중인 태스크 진행 상황\n• 최근 실행 이력 및 성과 지표\n• 배정된 Skills · Rules\n• 태스크 직접 배정 기능",
            en: "Click an agent to open the detail panel on the right.\n• Current task progress in real time\n• Recent run history and performance metrics\n• Assigned Skills & Rules\n• Directly assign a new task",
            ja: "エージェントをクリックして詳細パネルを開きます。",
            zh: "点击代理打开详情面板，查看实时任务进度和历史记录。",
          }),
          callout: {
            type: "info",
            text: t({ ko: "Library → Performance 탭에서 에이전트별 성과 히스토리를 확인할 수 있습니다.", en: "Go to Library → Performance tab to review per-agent performance history.", ja: "Library → Performanceタブでエージェントごとの履歴を確認できます。", zh: "在Library → Performance选项卡中查看每个代理的绩效历史。" }),
          },
        },
      ],
    },

    // ── 태스크 ───────────────────────────────────────────────────────────────
    {
      id: "tasks",
      color: "#bf5af2",
      icon: "📋",
      title: t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" }),
      sections: [
        {
          heading: t({ ko: "태스크 생성", en: "Creating a Task", ja: "タスクの作成", zh: "创建任务" }),
          body: t({
            ko: "• 바탕화면 ▶ 아이콘 클릭\n• 커맨드 팔레트(Ctrl+Shift+K) → N 키\n• TaskBoard 창 → '+ 새 태스크' 버튼\n\n태스크 생성 시 제목·설명·배정 에이전트·우선순위·지식베이스 출처를 설정합니다.",
            en: "• Click ▶ icon on the desktop\n• Command Palette (Ctrl+Shift+K) → press N\n• TaskBoard window → '+ New Task' button\n\nSet title, description, assigned agent, priority, and KB sources.",
            ja: "• ▶アイコン · コマンドパレット(N) · TaskBoardウィンドウ",
            zh: "• ▶图标 · 命令面板(N) · TaskBoard窗口",
          }),
        },
        {
          heading: t({ ko: "TaskBoard (태스크 보드)", en: "TaskBoard", ja: "タスクボード", zh: "任务看板" }),
          body: t({
            ko: "Dock의 📋 버튼으로 TaskBoard 창을 엽니다.\n• Kanban 스타일 컬럼(Pending · Running · Done · Failed)\n• 드래그로 상태 이동\n• 다중 선택 후 일괄 조작 (재시작·삭제)\n• 필터: 에이전트별·우선순위별 정렬",
            en: "Open TaskBoard from the Dock's 📋 button.\n• Kanban columns: Pending · Running · Done · Failed\n• Drag cards to change status\n• Multi-select for batch operations (restart/delete)\n• Filter by agent or priority",
            ja: "DockのTaskBoardでKanbanスタイルのタスク管理。",
            zh: "通过Dock的📋按钮打开TaskBoard，支持拖放和批量操作。",
          }),
        },
        {
          heading: t({ ko: "태스크 실행 모니터링", en: "Execution Monitoring", ja: "実行モニタリング", zh: "执行监控" }),
          body: t({
            ko: "태스크를 클릭하면 실행 로그가 Terminal 패널에 스트리밍됩니다.\n• 분 단위 요약 탭 (Minutes)\n• 진행 힌트 스트립\n• 서브태스크 트리 보기\n\nTasks 위젯을 바탕화면에 추가하면 항상 상태를 한눈에 볼 수 있습니다.",
            en: "Click a task to stream execution logs in the Terminal panel.\n• Minute-level summary tab (Minutes)\n• Progress hints strip\n• Subtask tree view\n\nAdd the Tasks widget to the desktop for an always-visible status overview.",
            ja: "タスクをクリックするとターミナルパネルにログがストリーミングされます。",
            zh: "点击任务后在终端面板中流式显示执行日志。",
          }),
          callout: {
            type: "tip",
            text: t({ ko: "태스크 실행 중 '⏸ 일시정지' 버튼으로 에이전트를 멈추고 재개할 수 있습니다.", en: "Use the '⏸ Pause' button to stop and resume an agent mid-execution.", ja: "実行中に⏸ボタンでエージェントを一時停止・再開できます。", zh: "使用⏸暂停按钮可在执行中途暂停和恢复代理。" }),
          },
        },
      ],
    },

    // ── 워크플로 ─────────────────────────────────────────────────────────────
    {
      id: "workflow",
      color: "#ff453a",
      icon: "⚡",
      title: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }),
      sections: [
        {
          heading: t({ ko: "워크플로 빌더", en: "Workflow Builder", ja: "ワークフロービルダー", zh: "工作流构建器" }),
          body: t({
            ko: "Dock ⚡ 버튼 또는 단축키 g w로 Workflow 창을 엽니다.\n\n1. 왼쪽 패널에서 에이전트 노드를 캔버스로 드래그\n2. 노드 간 연결선을 그어 실행 순서 정의\n3. 각 노드에 프롬프트·입력 변수 설정\n4. '▶ 실행' 버튼으로 파이프라인 시작",
            en: "Open Workflow with Dock ⚡ or shortcut g w.\n\n1. Drag agent nodes from the left panel to the canvas\n2. Draw connections to define execution order\n3. Set prompt & input variables for each node\n4. Click '▶ Run' to start the pipeline",
            ja: "Dock⚡またはg wでワークフロービルダーを開きます。",
            zh: "通过Dock⚡或快捷键g w打开工作流构建器。",
          }),
        },
        {
          heading: t({ ko: "에이전트 컴포지션", en: "Agent Composition", ja: "エージェントコンポジション", zh: "代理组合" }),
          body: t({
            ko: "여러 에이전트를 계층 구조로 조합하는 멀티 에이전트 시스템을 구성합니다.\nLibrary → Composition 탭에서 컴포지션 템플릿을 저장·불러올 수 있습니다.",
            en: "Build hierarchical multi-agent systems by combining multiple agents.\nSave and load composition templates from Library → Composition tab.",
            ja: "複数エージェントを階層構造で組み合わせるマルチエージェントシステムを構成します。",
            zh: "构建多代理层次系统，在Library → Composition选项卡中保存和加载模板。",
          }),
        },
        {
          heading: t({ ko: "예약 실행 (Cron)", en: "Scheduled Execution (Cron)", ja: "スケジュール実行", zh: "定时执行" }),
          body: t({
            ko: "Workflow 창 → 'Scheduled' 탭에서 cron 표현식으로 태스크를 예약합니다.",
            en: "In Workflow → 'Scheduled' tab, schedule tasks using cron expressions.",
            ja: "ワークフロー → 「Scheduled」タブでcron式を使用します。",
            zh: "在工作流 → 「Scheduled」选项卡中使用cron表达式安排任务。",
          }),
          callout: {
            type: "info",
            text: t({ ko: "예: 0 9 * * 1-5  →  평일 오전 9시 자동 실행", en: "Example: 0 9 * * 1-5  →  runs at 9 AM on weekdays", ja: "例: 0 9 * * 1-5 → 平日の午前9時に自動実行", zh: "示例：0 9 * * 1-5 → 工作日上午9点自动执行" }),
          },
        },
      ],
    },

    // ── Synapse (지식베이스) ──────────────────────────────────────────────────
    {
      id: "synapse",
      color: "#a78bfa",
      icon: "🧠",
      title: t({ ko: "Synapse (지식베이스)", en: "Synapse (Knowledge Base)", ja: "Synapse（知識ベース）", zh: "Synapse（知识库）" }),
      sections: [
        {
          heading: t({ ko: "Synapse란?", en: "What is Synapse?", ja: "Synapseとは？", zh: "什么是Synapse？" }),
          body: t({
            ko: "Synapse는 외부 지식 소스를 AgentDesk에 연결하는 모듈입니다.\nNotion · Obsidian · NotebookLM에서 자동으로 정보를 가져와 에이전트 프롬프트에 컨텍스트로 주입합니다.",
            en: "Synapse connects external knowledge sources to AgentDesk.\nIt automatically pulls content from Notion, Obsidian, and NotebookLM and injects it as context into agent prompts.",
            ja: "SynapseはNotion・Obsidian・NotebookLMからコンテンツを取得し、エージェントのプロンプトに注入します。",
            zh: "Synapse连接外部知识源，自动从Notion、Obsidian、NotebookLM提取内容并注入代理提示词。",
          }),
        },
        {
          heading: t({ ko: "연결 설정", en: "Connection Setup", ja: "接続設定", zh: "连接设置" }),
          features: [
            { icon: "📄", label: "Notion", desc: t({ ko: "Integration Token 입력 → 데이터베이스 URL로 연결", en: "Enter Integration Token → connect via database URL", ja: "Integration Tokenを入力してデータベースURLで接続", zh: "输入集成令牌→通过数据库URL连接" }) },
            { icon: "🗂️", label: "Obsidian", desc: t({ ko: "로컬 Vault 경로 또는 REST API 플러그인으로 연결", en: "Connect via local vault path or REST API plugin", ja: "ローカルVaultパスまたはRESTプラグインで接続", zh: "通过本地保管库路径或REST API插件连接" }) },
            { icon: "📓", label: "NotebookLM", desc: t({ ko: "수동 스냅샷을 업로드하여 컨텍스트 공급", en: "Upload manual snapshots to supply context", ja: "手動スナップショットをアップロード", zh: "上传手动快照以提供上下文" }) },
          ],
        },
        {
          heading: t({ ko: "자동화 규칙", en: "Automation Rules", ja: "自動化ルール", zh: "自动化规则" }),
          body: t({
            ko: "Synapse 설정 → 'Rules' 탭에서 트리거 규칙을 만들 수 있습니다.\n\n• 트리거 조건: 파일 변경 · Notion 페이지 수정 · 키워드 패턴 매칭\n• 액션: 특정 에이전트에게 태스크 자동 생성\n• 템플릿 변수: {{filename}} · {{path}} · {{title}} 사용 가능\n• 60초 쿨다운으로 중복 트리거 방지",
            en: "Create trigger rules in Synapse Settings → 'Rules' tab.\n\n• Triggers: file change · Notion page edit · keyword pattern matching\n• Action: auto-create a task for a specific agent\n• Template variables: {{filename}} · {{path}} · {{title}}\n• 60s cooldown prevents duplicate triggers",
            ja: "Synapse設定 → 「Rules」タブでトリガールールを作成します。",
            zh: "在Synapse设置 → 「Rules」选项卡中创建触发规则。",
          }),
          callout: {
            type: "tip",
            text: t({ ko: "Notion은 30초마다 자동 폴링되고, Obsidian은 fs.watch로 실시간 감지됩니다.", en: "Notion is polled every 30s. Obsidian changes are detected in real time via fs.watch.", ja: "Notionは30秒ごとにポーリング、Obsidianはリアルタイムでchangesを検出します。", zh: "Notion每30秒轮询一次，Obsidian通过fs.watch实时检测变化。" }),
          },
        },
        {
          heading: t({ ko: "컨텍스트 주입", en: "Context Injection", ja: "コンテキスト注入", zh: "上下文注入" }),
          body: t({
            ko: "태스크 실행 시 연결된 지식베이스에서 자동으로 관련 내용을 추출하여 에이전트 프롬프트 앞에 첨부합니다.\n태스크 생성 시 'KB 출처' 섹션에서 사용할 지식베이스를 직접 선택할 수도 있습니다.",
            en: "When a task runs, relevant content is extracted from connected KBs and prepended to the agent prompt.\nIn task creation, you can manually select KB sources in the 'KB Sources' section.",
            ja: "タスク実行時に関連コンテンツがエージェントプロンプトの先頭に挿入されます。",
            zh: "任务执行时，相关内容自动提取并添加到代理提示词前面。",
          }),
        },
      ],
    },

    // ── Local LLM ────────────────────────────────────────────────────────────
    {
      id: "local-llm",
      color: "#64d2ff",
      icon: "🔧",
      title: t({ ko: "로컬 LLM", en: "Local LLM", ja: "ローカルLLM", zh: "本地LLM" }),
      sections: [
        {
          heading: t({ ko: "로컬 LLM이란?", en: "What is Local LLM?", ja: "ローカルLLMとは？", zh: "什么是本地LLM？" }),
          body: t({
            ko: "외부 API 없이 PC에서 직접 AI 모델을 실행합니다.\nLM Studio · Ollama · Jan · LlamaCPP 백엔드를 지원하며 에이전트 모델로 선택 가능합니다.",
            en: "Run AI models locally on your PC without external APIs.\nSupports LM Studio, Ollama, Jan, and LlamaCPP backends — selectable as agent models.",
            ja: "外部APIなしにPCでAIモデルを直接実行します。LM Studio・Ollama・Jan・LlamaCPPをサポート。",
            zh: "无需外部API直接在PC上运行AI模型，支持LM Studio、Ollama、Jan、LlamaCPP。",
          }),
        },
        {
          heading: t({ ko: "백엔드 설정", en: "Backend Setup", ja: "バックエンド設定", zh: "后端设置" }),
          features: [
            { icon: "🎯", label: "LM Studio", desc: t({ ko: "포트 1234에서 실행 중인 LM Studio 자동 감지", en: "Auto-detects LM Studio running on port 1234", ja: "ポート1234でLM Studioを自動検出", zh: "自动检测运行在端口1234的LM Studio" }) },
            { icon: "🦙", label: "Ollama", desc: t({ ko: "포트 11434, ollama pull 명령으로 모델 다운로드", en: "Port 11434, download models with ollama pull", ja: "ポート11434、ollama pullでモデルダウンロード", zh: "端口11434，用ollama pull下载模型" }) },
            { icon: "🌟", label: "Jan", desc: t({ ko: "Jan 앱 실행 후 API 서버 모드 활성화 필요", en: "Start Jan app and enable API server mode", ja: "JanアプリでAPIサーバーモードを有効化", zh: "启动Jan应用并开启API服务器模式" }) },
            { icon: "⚙️", label: "LlamaCPP", desc: t({ ko: "llama-server 직접 실행, 포트 8080 기본값", en: "Run llama-server directly, default port 8080", ja: "llama-serverを直接実行、デフォルトポート8080", zh: "直接运行llama-server，默认端口8080" }) },
          ],
        },
        {
          heading: t({ ko: "Local LLM 위젯", en: "Local LLM Widget", ja: "ローカルLLMウィジェット", zh: "本地LLM小组件" }),
          body: t({
            ko: "Local LLM 위젯을 바탕화면에 추가하면 실행 중인 백엔드 상태와 모델 목록을 실시간으로 확인할 수 있습니다.\n위젯에서 직접 모델을 로드·언로드할 수 있습니다.",
            en: "Add the Local LLM widget to your desktop to see backend status and model list in real time.\nLoad and unload models directly from the widget.",
            ja: "Local LLMウィジェットでバックエンドの状態とモデルリストをリアルタイムで確認できます。",
            zh: "添加Local LLM小组件可实时查看后端状态和模型列表，并直接加载/卸载模型。",
          }),
          callout: {
            type: "warn",
            text: t({ ko: "로컬 LLM은 충분한 VRAM이 필요합니다. 모델 크기에 따라 최소 8GB ~ 24GB GPU 메모리가 필요합니다.", en: "Local LLM requires sufficient VRAM — typically 8–24GB GPU memory depending on model size.", ja: "ローカルLLMは十分なVRAMが必要です（モデルサイズにより8〜24GB）。", zh: "本地LLM需要足够的VRAM，根据模型大小通常需要8-24GB显存。" }),
          },
        },
      ],
    },

    // ── 위젯 ─────────────────────────────────────────────────────────────────
    {
      id: "widgets",
      color: "#ff9f0a",
      icon: "📦",
      title: t({ ko: "위젯", en: "Widgets", ja: "ウィジェット", zh: "小组件" }),
      sections: [
        {
          heading: t({ ko: "위젯이란?", en: "What are Widgets?", ja: "ウィジェットとは？", zh: "什么是小组件？" }),
          body: t({
            ko: "위젯은 바탕화면에 고정하는 미니 뷰입니다.\n드래그로 위치를 이동하고 모서리를 끌어 크기를 조정합니다.\n• 추가: 앱 메뉴(AgentDesk 클릭) → '위젯 추가...'\n• 제거: 위젯 헤더 오른쪽 ✕ 버튼 클릭",
            en: "Widgets are mini views pinned to the desktop.\nDrag to reposition, pull corners to resize.\n• Add: App menu (click AgentDesk) → 'Add Widget...'\n• Remove: click ✕ in the widget header",
            ja: "ウィジェットはデスクトップに固定されたミニビューです。",
            zh: "小组件是固定在桌面上的迷你视图，可拖动位置和调整大小。",
          }),
        },
        {
          heading: t({ ko: "사용 가능한 위젯", en: "Available Widgets", ja: "利用可能なウィジェット", zh: "可用小组件" }),
          features: [
            { icon: "🤖", label: t({ ko: "Agents", en: "Agents", ja: "Agents", zh: "代理" }), desc: t({ ko: "에이전트 실시간 상태·전문 분야 현황", en: "Live agent status & specialties", ja: "エージェントのリアルタイム状態", zh: "实时代理状态" }) },
            { icon: "📋", label: t({ ko: "Tasks", en: "Tasks", ja: "Tasks", zh: "任务" }), desc: t({ ko: "진행 중인 태스크 목록", en: "Active task list", ja: "進行中のタスク一覧", zh: "活动任务列表" }) },
            { icon: "🔔", label: t({ ko: "Alerts", en: "Alerts", ja: "Alerts", zh: "警报" }), desc: t({ ko: "이상 감지 알림 및 시스템 경고", en: "Anomaly alerts & system warnings", ja: "異常検知アラート", zh: "异常警报和系统警告" }) },
            { icon: "💰", label: t({ ko: "CLI Cost", en: "CLI Cost", ja: "CLI Cost", zh: "CLI成本" }), desc: t({ ko: "오늘의 AI API 사용 비용 요약", en: "Today's AI API usage cost", ja: "今日のAIコスト概要", zh: "今日AI API使用费用" }) },
            { icon: "🌊", label: t({ ko: "Flow Graph", en: "Flow Graph", ja: "Flow Graph", zh: "流程图" }), desc: t({ ko: "에이전트 통신 흐름 시각화", en: "Agent communication flow visualization", ja: "エージェント通信フロー可視化", zh: "代理通信流程可视化" }) },
            { icon: "📁", label: t({ ko: "File Explorer", en: "File Explorer", ja: "ファイルエクスプローラー", zh: "文件浏览器" }), desc: t({ ko: "PC 파일 탐색기 (Windows 탐색기처럼)", en: "PC filesystem browser like Windows Explorer", ja: "PCファイルエクスプローラー", zh: "PC文件资源管理器" }) },
            { icon: "🔧", label: t({ ko: "Local LLM", en: "Local LLM", ja: "Local LLM", zh: "本地LLM" }), desc: t({ ko: "로컬 AI 백엔드 상태 모니터", en: "Local AI backend status monitor", ja: "ローカルAIバックエンド状態", zh: "本地AI后端状态监控" }) },
            { icon: "🧠", label: t({ ko: "Synapse", en: "Synapse", ja: "Synapse", zh: "Synapse" }), desc: t({ ko: "지식베이스 연결 현황 및 규칙 수", en: "KB connection status & rule count", ja: "知識ベース接続状況", zh: "知识库连接状态" }) },
          ],
        },
        {
          heading: t({ ko: "커스텀 위젯", en: "Custom Widgets", ja: "カスタムウィジェット", zh: "自定义小组件" }),
          body: t({
            ko: "위젯 추가 → '새 기능 만들기'에서 AI 빌더 또는 템플릿으로 커스텀 위젯을 생성할 수 있습니다.\nHTML/CSS/JS로 직접 작성하거나 AI에게 설명을 입력하면 자동으로 생성됩니다.",
            en: "In Add Widget → 'Create New Feature', build custom widgets with the AI builder or templates.\nWrite HTML/CSS/JS directly, or describe what you want and the AI generates it.",
            ja: "ウィジェット追加→「新しい機能を作る」でカスタムウィジェットを作成できます。",
            zh: "在添加小组件 → 「创建新功能」中，使用AI构建器或模板创建自定义小组件。",
          }),
          callout: {
            type: "tip",
            text: t({ ko: "커스텀 위젯은 /api/* 엔드포인트에 직접 fetch 요청을 보낼 수 있습니다.", en: "Custom widgets can directly fetch from /api/* endpoints.", ja: "カスタムウィジェットは/api/*エンドポイントに直接fetchリクエストを送れます。", zh: "自定义小组件可以直接向/api/*端点发送fetch请求。" }),
          },
        },
      ],
    },

    // ── 채팅 & 알림 ──────────────────────────────────────────────────────────
    {
      id: "chat",
      color: "#30d158",
      icon: "💬",
      title: t({ ko: "채팅 & 알림", en: "Chat & Notifications", ja: "チャットと通知", zh: "聊天和通知" }),
      sections: [
        {
          heading: t({ ko: "그룹 채팅 패널", en: "Group Chat Panel", ja: "グループチャット", zh: "群聊面板" }),
          body: t({
            ko: "Dock의 💬 버튼으로 Chat 창을 엽니다.\n• 프로젝트별·에이전트별 채널 분리\n• @에이전트 멘션으로 직접 메시지 전달\n• 채팅 내 메시지 검색 (Ctrl+F)\n• 중요 메시지 핀 고정",
            en: "Open Chat from the Dock's 💬 button.\n• Channels separated by project and agent\n• @mention agents directly in chat\n• In-chat message search (Ctrl+F)\n• Pin important messages",
            ja: "Dock💬でチャットウィンドウを開きます。",
            zh: "通过Dock的💬按钮打开聊天窗口。",
          }),
        },
        {
          heading: t({ ko: "KB 멘션 (@지식베이스)", en: "KB Mention (@knowledge base)", ja: "KBメンション", zh: "KB提及" }),
          body: t({
            ko: "채팅 입력창에서 @ 키를 누르면 연결된 지식베이스 목록이 드롭다운으로 표시됩니다.\n선택하면 해당 KB의 컨텍스트가 자동으로 메시지에 첨부됩니다.",
            en: "Press @ in the chat input to see a dropdown of connected knowledge bases.\nSelecting one automatically attaches its context to the message.",
            ja: "チャット入力で@キーを押すと接続済みKBリストが表示されます。",
            zh: "在聊天输入框中按@键显示已连接知识库的下拉列表。",
          }),
        },
        {
          heading: t({ ko: "알림 센터", en: "Notification Center", ja: "通知センター", zh: "通知中心" }),
          body: t({
            ko: "메뉴바 우상단 🔔 아이콘을 클릭하면 알림 패널이 슬라이드됩니다.\n• 미읽음/전체 필터 전환\n• 날짜별 그룹 (오늘·어제·이전)\n• 알림 클릭으로 관련 창 바로 열기\n• '모두 읽음' 버튼으로 일괄 처리",
            en: "Click the 🔔 bell in the top-right menubar to open the notification panel.\n• Toggle unread/all filter\n• Grouped by date: Today · Yesterday · Earlier\n• Click a notification to open the related window\n• 'Mark all read' for bulk action",
            ja: "メニューバーの🔔アイコンで通知パネルを開きます。",
            zh: "点击菜单栏右上角🔔图标打开通知面板。",
          }),
        },
      ],
    },

    // ── 단축키 ───────────────────────────────────────────────────────────────
    {
      id: "shortcuts",
      color: "#ff453a",
      icon: "⌨️",
      title: t({ ko: "단축키", en: "Shortcuts", ja: "ショートカット", zh: "快捷键" }),
      sections: [
        {
          heading: t({ ko: "전역 단축키", en: "Global Shortcuts", ja: "グローバルショートカット", zh: "全局快捷键" }),
          keys: [
            { keys: ["Ctrl", "Shift", "K"], desc: t({ ko: "커맨드 팔레트 (Spotlight) 열기", en: "Open Command Palette (Spotlight)", ja: "コマンドパレット", zh: "打开命令面板" }) },
            { keys: ["Cmd", "K"], desc: t({ ko: "커맨드 팔레트 열기 (macOS)", en: "Command Palette (macOS)", ja: "コマンドパレット (macOS)", zh: "命令面板 (macOS)" }) },
            { keys: ["Ctrl", "↑"], desc: t({ ko: "Mission Control — 열린 창 오버뷰", en: "Mission Control — window overview", ja: "ミッションコントロール", zh: "Mission Control" }) },
            { keys: ["?"], desc: t({ ko: "유저 가이드 열기/닫기", en: "Toggle user guide", ja: "ユーザーガイド開閉", zh: "切换用户指南" }) },
            { keys: ["Esc"], desc: t({ ko: "패널 닫기 / Jiggle 해제 / Quick Look 닫기", en: "Close panel / exit Jiggle / close Quick Look", ja: "パネルを閉じる", zh: "关闭面板" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "g + 키 — 앱 창 토글 (VIM 스타일)", en: "g + key — window toggle (VIM style)", ja: "g + キー（VIMスタイル）", zh: "g + 键（VIM风格）" }),
          keys: [
            { keys: ["g", "w"], desc: t({ ko: "Workflow 창 토글", en: "Toggle Workflow", ja: "ワークフロー切替", zh: "切换工作流" }) },
            { keys: ["g", "l"], desc: t({ ko: "Library 창 토글", en: "Toggle Library", ja: "ライブラリ切替", zh: "切换库" }) },
            { keys: ["g", "s"], desc: t({ ko: "Settings 창 토글", en: "Toggle Settings", ja: "設定切替", zh: "切换设置" }) },
            { keys: ["g", "c"], desc: t({ ko: "Chat 창 토글", en: "Toggle Chat", ja: "チャット切替", zh: "切换聊天" }) },
            { keys: ["g", "a"], desc: t({ ko: "에이전트 설정 창 토글", en: "Toggle Agent Manager", ja: "エージェント設定切替", zh: "切换代理管理器" }) },
            { keys: ["g", "e"], desc: t({ ko: "REPL 창 토글", en: "Toggle REPL", ja: "REPL切替", zh: "切换REPL" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "바탕화면", en: "Desktop", ja: "デスクトップ", zh: "桌面" }),
          keys: [
            { keys: ["Space"], desc: t({ ko: "선택된 프로젝트 아이콘 Quick Look", en: "Quick Look selected icon", ja: "クイックルック", zh: "快速预览" }) },
            { keys: ["Long Press (600ms)"], desc: t({ ko: "Jiggle Mode ON", en: "Activate Jiggle Mode", ja: "Jiggleモード有効", zh: "激活Jiggle模式" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "커맨드 팔레트 내", en: "Inside Command Palette", ja: "コマンドパレット内", zh: "命令面板内" }),
          keys: [
            { keys: ["↑", "↓"], desc: t({ ko: "항목 이동", en: "Navigate items", ja: "項目移動", zh: "导航" }) },
            { keys: ["↵"], desc: t({ ko: "선택 / 실행", en: "Select / execute", ja: "選択 / 実行", zh: "选择 / 执行" }) },
            { keys: ["N"], desc: t({ ko: "새 태스크 생성", en: "New task", ja: "新しいタスク", zh: "新建任务" }) },
            { keys: ["T"], desc: t({ ko: "태스크 보드 열기", en: "Open Task board", ja: "タスクボード", zh: "任务看板" }) },
            { keys: ["A"], desc: t({ ko: "에이전트 관리", en: "Agents", ja: "エージェント", zh: "代理" }) },
            { keys: ["S"], desc: t({ ko: "스킬 관리", en: "Skills", ja: "スキル", zh: "技能" }) },
            { keys: ["M"], desc: t({ ko: "메모리 관리", en: "Memory", ja: "メモリ", zh: "记忆" }) },
            { keys: [","], desc: t({ ko: "설정 열기", en: "Open Settings", ja: "設定を開く", zh: "打开设置" }) },
          ],
          body: "",
        },
      ],
    },

    // ── 설정 ─────────────────────────────────────────────────────────────────
    {
      id: "settings",
      color: "#8e8e93",
      icon: "⚙️",
      title: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }),
      sections: [
        {
          heading: t({ ko: "API 키 설정", en: "API Keys", ja: "APIキー設定", zh: "API密钥设置" }),
          body: t({
            ko: "Settings(g s) → API 탭\n• OpenAI · Anthropic · Gemini · Groq 등 주요 모델 제공사 키 등록\n• 키는 로컬 DB에 암호화 저장됩니다\n• 에이전트 생성 시 등록된 모델 중 하나를 선택합니다",
            en: "Settings (g s) → API tab\n• Register keys for OpenAI, Anthropic, Gemini, Groq, etc.\n• Keys are encrypted and stored in the local DB\n• Select registered models when creating agents",
            ja: "Settings → APIタブでOpenAI/Anthropic/Gemini/Groqなどのキーを登録します。キーはローカルDBに暗号化保存され、エージェント作成時にモデルを選べます。",
            zh: "设置(g s) → API选项卡，注册主要模型提供商的API密钥。密钥加密保存在本地数据库，创建代理时可选择已注册模型。",
          }),
        },
        {
          heading: t({ ko: "OAuth / 채널 연동", en: "OAuth / Channel Integration", ja: "OAuth / チャンネル連携", zh: "OAuth / 频道集成" }),
          body: t({
            ko: "Settings → OAuth 탭\n• Discord · Slack 채널을 AgentDesk에 연결합니다\n• 에이전트 알림·메시지를 외부 채널로 발송할 수 있습니다\n• 채널 가이드 아이콘(?) 클릭으로 설정 방법을 확인하세요",
            en: "Settings → OAuth tab\n• Connect Discord or Slack channels to AgentDesk\n• Send agent notifications and messages to external channels\n• Click the guide icon (?) for setup instructions",
            ja: "Settings → OAuthでDiscord/Slackを連携し、通知やメッセージを外部チャンネルへ送れます。",
            zh: "设置 → OAuth选项卡连接Discord或Slack频道，可将代理通知与消息发送到外部频道。",
          }),
        },
        {
          heading: t({ ko: "데이터보내기", en: "Data Export", ja: "データエクスポート", zh: "数据导出" }),
          body: t({
            ko: "앱 메뉴(AgentDesk 클릭) → '보내기...'\n• 에이전트·태스크·워크플로 데이터를 CSV/JSON으로 보냅니다\n• 날짜 범위와 데이터 유형을 선택해 필요한 부분만 추출합니다",
            en: "App menu (click AgentDesk) → 'Export...'\n• Export agents, tasks, and workflow data as CSV or JSON\n• Select date range and data types to export only what you need",
            ja: "アプリメニューから「エクスポート…」でCSV/JSONに出力できます。",
            zh: "应用菜单 → 「导出…」可将代理、任务、工作流数据导出为CSV或JSON。",
          }),
        },
      ],
    },

    // ── Image Studio ─────────────────────────────────────────────────────────
    {
      id: "image-studio",
      color: "#ec4899",
      icon: "🖼️",
      title: t({ ko: "Image Studio", en: "Image Studio", ja: "Image Studio", zh: "图像工作室" }),
      sections: [
        {
          heading: t({ ko: "Image Studio란?", en: "What is Image Studio?", ja: "Image Studioとは？", zh: "什么是图像工作室？" }),
          body: t({
            ko: "Image Studio는 AI 이미지 생성 도구입니다.\n바탕화면 Image Studio 아이콘을 클릭하거나 단축키 g i 로 창을 엽니다.\n\n• Generate — 프롬프트로 이미지 생성\n• Gallery — 생성된 이미지 관리·저장·삭제",
            en: "Image Studio is an AI image generation tool.\nOpen it from the desktop icon or press g i.\n\n• Generate tab — create images from text prompts\n• Gallery tab — manage, save, and delete generated images",
            ja: "AI画像生成ツールです。デスクトップのアイコンまたは g i で開きます。",
            zh: "AI图像生成工具。点击桌面图标或按 g i 打开。",
          }),
        },
        {
          heading: t({ ko: "준비 — 이미지 생성 프로바이더 추가", en: "Setup — Add an Image Generation Provider", ja: "準備 — 画像生成プロバイダー追加", zh: "准备 — 添加图像生成提供商" }),
          body: t({
            ko: "Image Studio는 Settings → API 제공자에 등록된 프로바이더를 사용합니다.\nClaude / Ollama 같은 텍스트 전용 모델로는 이미지 생성이 불가합니다.\n\n지원 예:\n• OpenAI — DALL-E 3, DALL-E 2 (권장)\n• Azure OpenAI — DALL-E 3\n• Together.ai — Flux, Stable Diffusion XL\n• 로컬 Stable Diffusion — AUTOMATIC1111 또는 ComfyUI\n\n등록: Settings(g s) → API 제공자 → '+ 추가' → 유형·이름·API 키·Base URL 입력 → '연결 테스트'로 모델 캐시",
            en: "Image Studio uses providers registered in Settings → API Providers.\nText-only models like Claude or Ollama cannot generate images.\n\nExamples:\n• OpenAI — DALL-E 3, DALL-E 2 (recommended)\n• Azure OpenAI — DALL-E 3\n• Together.ai — Flux, Stable Diffusion XL\n• Local SD — AUTOMATIC1111 or ComfyUI\n\nAdd: Settings (g s) → API Providers → '+ Add' → type, name, key, Base URL → 'Test Connection' to cache models",
            ja: "Settings → APIプロバイダーに登録したプロバイダーを使います。テキスト専用モデルでは画像は生成できません。",
            zh: "使用在设置 → API提供商中注册的提供商。纯文本模型无法生成图像。",
          }),
          callout: {
            type: "tip",
            text: t({
              ko: "Together.ai는 무료 크레딧을 제공하며 Flux 등 고품질 이미지 생성에 활용할 수 있습니다. OpenAI 계정 없이 시작하기에도 적합합니다.",
              en: "Together.ai offers free credits and Flux models for high-quality images — useful without an OpenAI account.",
              ja: "Together.aiは無料クレジットとFluxモデルで高品質な画像生成が可能です。",
              zh: "Together.ai 提供免费额度和 Flux 模型，可无 OpenAI 账号起步。",
            }),
          },
        },
        {
          heading: t({ ko: "이미지 생성하기", en: "Generating Images", ja: "画像を生成する", zh: "生成图像" }),
          body: t({
            ko: "1. Generate 탭 좌측 패널에 프롬프트 입력\n2. 프로바이더·모델·크기 선택\n3. 생성 버튼 또는 Ctrl+Enter\n4. 중앙 캔버스에 결과가 표시됩니다\n\n옵션(DALL-E 3 예): 크기 1024×1024 등, 품질 Standard/HD, 스타일 Vivid/Natural",
            en: "1. Enter a prompt in the Generate tab's left panel\n2. Choose provider, model, and size\n3. Click Generate or Ctrl+Enter\n4. Result appears in the center canvas\n\nOptions (e.g. DALL-E 3): size, quality Standard/HD, style Vivid/Natural",
            ja: "Generateタブ左でプロンプトを入力し、プロバイダーとモデルを選んで生成します。",
            zh: "在生成选项卡左侧输入提示词，选择提供商与模型后生成。",
          }),
        },
        {
          heading: t({ ko: "이미지 저장하기", en: "Saving Images", ja: "画像を保存する", zh: "保存图像" }),
          body: t({
            ko: "생성 이미지는 서버에 자동 저장되며 Gallery 탭에서 항상 확인할 수 있습니다.\n로컬 저장: 이미지 우상단 다운로드 버튼, Generate 좌측 Output의 '이미지 저장', Gallery에서 선택 후 우측 패널 저장 등",
            en: "Images are saved on the server automatically and always visible in Gallery.\nDownload locally via the image toolbar, Generate Output section, or Gallery right panel.",
            ja: "画像はサーバーに自動保存され、Galleryで確認できます。ツールバーや右パネルからローカル保存できます。",
            zh: "图像自动保存在服务器，画廊中可查看；可通过工具栏或右侧面板下载到本地。",
          }),
        },
        {
          heading: t({ ko: "갤러리 관리", en: "Gallery Management", ja: "ギャラリー管理", zh: "画廊管理" }),
          body: t({
            ko: "• 프롬프트 검색으로 빠르게 찾기\n• 이미지 클릭 시 우측에서 프롬프트·모델·해상도·날짜 확인\n• 썸네일에서 다운로드/삭제\n• 삭제 시 서버 파일도 함께 제거됩니다",
            en: "• Search prompts to find images\n• Click for details in the right panel\n• Hover thumbnails for download/delete\n• Deleting removes the server file too",
            ja: "プロンプト検索、詳細表示、サムネイルからの保存/削除が可能です。",
            zh: "可搜索提示词、查看详情、从缩略图下载或删除。",
          }),
          callout: {
            type: "info",
            text: t({
              ko: "이미지는 AgentDesk 데이터 폴더(image-studio/)에 PNG로 저장되며 재시작 후에도 유지됩니다.",
              en: "Images are stored as PNG under the AgentDesk data folder (image-studio/) and persist across restarts.",
              ja: "画像は image-studio/ にPNGで保存され、再起動後も保持されます。",
              zh: "图像以 PNG 保存在 image-studio/ 目录，重启后仍保留。",
            }),
          },
        },
      ],
    },
  ];
}