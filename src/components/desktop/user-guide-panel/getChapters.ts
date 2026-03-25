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
            ko: "• 상단 메뉴바 — 로고 · 프로젝트 선택 · AI 비용 · 알림 · 시각\n• 바탕화면 — 아이콘 + 위젯 자유 배치\n• 하단 Dock — Library · Settings\n• 앱 창 — 트래픽 라이트 (닫기·최소화·최대화)\n• 알림 센터 — 우상단 벨 아이콘 클릭",
            en: "• Menubar — logo · project · cost · alerts · clock\n• Desktop — icons + freely placed widgets\n• Bottom Dock — Library · Settings\n• App windows — traffic light style\n• Notification Center — click the bell icon",
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
            ko: "• 프로젝트 폴더 창 → 킥오프 또는 추가 업무 요청\n• PM이 LLM을 사용하여 태스크를 자동 생성하고 에이전트에 배정합니다.",
            en: "• Project folder window → Kickoff or Add Tasks\n• PM uses LLM to auto-generate tasks and assign agents.",
            ja: "• プロジェクトフォルダ → キックオフまたは追加タスク",
            zh: "• 项目文件夹窗口 → 启动或添加任务",
          }),
        },
        {
          heading: t({ ko: "태스크 실행 모니터링", en: "Execution Monitoring", ja: "実行モニタリング", zh: "执行监控" }),
          body: t({
            ko: "프로젝트 폴더 창의 Tasks 탭에서 태스크 상태를 확인합니다.\n• 진행 상태: planned, in_progress, review, done\n• PM이 자동으로 리뷰하고 승인/수정 결정\n\nOrchestration Timeline(구현 예정)에서 실시간 모니터링이 가능합니다.",
            en: "Check task status in the project folder window's Tasks tab.\n• Status flow: planned, in_progress, review, done\n• PM auto-reviews and decides approve/revise\n\nOrchestration Timeline (coming soon) will provide real-time monitoring.",
            ja: "プロジェクトフォルダのTasksタブでタスク状態を確認します。",
            zh: "在项目文件夹窗口的Tasks标签中查看任务状态。",
          }),
          callout: {
            type: "tip",
            text: t({ ko: "Orchestration Timeline이 메인 모니터링 뷰로 구현 예정입니다.", en: "Orchestration Timeline is planned as the main monitoring view.", ja: "Orchestration Timelineがメインモニタリングビューとして実装予定です。", zh: "Orchestration Timeline计划作为主要监控视图实现。" }),
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
            { keys: ["g", "l"], desc: t({ ko: "Library 창 토글", en: "Toggle Library", ja: "ライブラリ切替", zh: "切换库" }) },
            { keys: ["g", "s"], desc: t({ ko: "Settings 창 토글", en: "Toggle Settings", ja: "設定切替", zh: "切换设置" }) },
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
          heading: t({ ko: "OAuth 연동", en: "OAuth Integration", ja: "OAuth連携", zh: "OAuth集成" }),
          body: t({
            ko: "Settings → OAuth 탭\n• GitHub Copilot 등 외부 제공자를 OAuth로 연결합니다\n• 연결된 계정은 에이전트 실행에 사용됩니다",
            en: "Settings → OAuth tab\n• Connect external providers like GitHub Copilot via OAuth\n• Connected accounts are used for agent execution",
            ja: "Settings → OAuthタブで外部プロバイダーをOAuth連携できます。",
            zh: "设置 → OAuth选项卡通过OAuth连接外部提供商。",
          }),
        },
        {
          heading: t({ ko: "데이터보내기", en: "Data Export", ja: "データエクスポート", zh: "数据导出" }),
          body: t({
            ko: "앱 메뉴(AgentDesk 클릭) → '보내기...'\n• 에이전트·태스크 데이터를 CSV/JSON으로 보냅니다\n• 날짜 범위와 데이터 유형을 선택해 필요한 부분만 추출합니다",
            en: "App menu (click AgentDesk) → 'Export...'\n• Export agents and tasks data as CSV or JSON\n• Select date range and data types to export only what you need",
            ja: "アプリメニューから「エクスポート…」でCSV/JSONに出力できます。",
            zh: "应用菜单 → 「导出…」可将代理、任务数据导出为CSV或JSON。",
          }),
        },
      ],
    },

  ];
}