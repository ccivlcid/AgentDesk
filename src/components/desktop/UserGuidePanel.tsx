import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";

interface Section {
  heading: string;
  body: string;
  keys?: { keys: string[]; desc: string }[];
}

interface Chapter {
  id: string;
  emoji: string;
  title: string;
  sections: Section[];
}

type T = (v: { ko: string; en: string; ja: string; zh: string }) => string;

function getChapters(t: T): Chapter[] {
  return [
    {
      id: "getting-started",
      emoji: "🚀",
      title: t({ ko: "시작하기", en: "Getting Started", ja: "はじめに", zh: "快速开始" }),
      sections: [
        {
          heading: t({ ko: "AgentDesk란?", en: "What is AgentDesk?", ja: "AgentDeskとは？", zh: "AgentDesk是什么？" }),
          body: t({
            ko: "AgentDesk는 여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS입니다. macOS 바탕화면 은유로 설계되어 메뉴바, 데스크톱 아이콘, 위젯, Dock, 앱 창 등으로 구성됩니다.",
            en: "AgentDesk is a developer OS for running, monitoring, and controlling multiple AI agents simultaneously. Designed with a macOS desktop metaphor — menubar, desktop icons, widgets, Dock, and app windows.",
            ja: "AgentDeskは、複数のAIエージェントを同時に実行・監視・制御する開発者向けOSです。macOSのデスクトップ比喩で設計されており、メニューバー、デスクトップアイコン、ウィジェット、Dock、アプリウィンドウなどで構成されます。",
            zh: "AgentDesk是一个开发者操作系统，可同时运行、监控和控制多个AI代理。采用macOS桌面隐喻设计——菜单栏、桌面图标、小组件、Dock和应用窗口。",
          }),
        },
        {
          heading: t({ ko: "첫 프로젝트 만들기", en: "Creating Your First Project", ja: "最初のプロジェクト作成", zh: "创建第一个项目" }),
          body: t({
            ko: "1. 데스크탑 아이콘 📁(프로젝트 생성)을 클릭합니다.\n2. 프로젝트 이름과 목표를 입력합니다.\n3. 에이전트를 배정하고 태스크를 실행합니다.\n\n또는 상단 메뉴바의 프로젝트 선택기에서 새 프로젝트를 생성할 수 있습니다.",
            en: "1. Click the 📁 (New Project) desktop icon.\n2. Enter a project name and goal.\n3. Assign agents and run tasks.\n\nAlternatively, create a new project from the project selector in the top menubar.",
            ja: "1. デスクトップアイコン📁（プロジェクト作成）をクリックします。\n2. プロジェクト名と目標を入力します。\n3. エージェントを割り当て、タスクを実行します。\n\nまたは、上部メニューバーのプロジェクトセレクターから新規プロジェクトを作成できます。",
            zh: "1. 点击桌面图标 📁（新建项目）。\n2. 输入项目名称和目标。\n3. 分配代理并运行任务。\n\n也可以通过顶部菜单栏的项目选择器创建新项目。",
          }),
        },
        {
          heading: t({ ko: "화면 구성 한눈에 보기", en: "Interface Overview", ja: "画面構成の概要", zh: "界面概览" }),
          body: t({
            ko: "• 상단 메뉴바 — 로고, 프로젝트 선택, 비용, 알림, 시각\n• 바탕화면 — 아이콘 + 위젯 배치 영역\n• 하단 Dock — ⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat\n• 앱 창 — 트래픽 라이트(닫기·최소화·최대화) 스타일",
            en: "• Top menubar — logo, project selector, cost, alerts, clock\n• Desktop — icons + widget placement area\n• Bottom Dock — ⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat\n• App windows — traffic light style (close · minimize · maximize)",
            ja: "• 上部メニューバー — ロゴ、プロジェクト選択、コスト、通知、時計\n• デスクトップ — アイコン + ウィジェット配置エリア\n• 下部Dock — ⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat\n• アプリウィンドウ — トラフィックライトスタイル",
            zh: "• 顶部菜单栏 — 标志、项目选择器、费用、通知、时钟\n• 桌面 — 图标 + 小组件放置区域\n• 底部 Dock — ⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat\n• 应用窗口 — 交通灯样式（关闭·最小化·最大化）",
          }),
        },
      ],
    },
    {
      id: "desktop",
      emoji: "🖥️",
      title: t({ ko: "바탕화면", en: "Desktop", ja: "デスクトップ", zh: "桌面" }),
      sections: [
        {
          heading: t({ ko: "데스크톱 아이콘", en: "Desktop Icons", ja: "デスクトップアイコン", zh: "桌面图标" }),
          body: t({
            ko: "바탕화면 아이콘을 클릭하면 해당 기능이 열립니다.\n\n• 👤 에이전트 설정 — 에이전트·부서 관리\n• 📁 프로젝트 생성 — 프로젝트 마법사\n• ▶ 태스크 실행 — 즉시 태스크 생성\n• ⚡ 워크플로 빌더 — 파이프라인 편집\n• 📋 라이브러리 — Skills·Rules·Memory\n• 💬 채팅 — 팀 채널",
            en: "Click a desktop icon to open its feature.\n\n• 👤 Agents — manage agents & departments\n• 📁 New Project — project wizard\n• ▶ Run Task — create a task instantly\n• ⚡ Workflow Builder — pipeline editor\n• 📋 Library — Skills · Rules · Memory\n• 💬 Chat — team channels",
            ja: "デスクトップアイコンをクリックすると対応する機能が開きます。\n\n• 👤 エージェント設定 — エージェント・部署管理\n• 📁 プロジェクト作成 — プロジェクトウィザード\n• ▶ タスク実行 — 即時タスク作成\n• ⚡ ワークフロービルダー — パイプライン編集\n• 📋 ライブラリ — Skills・Rules・Memory\n• 💬 チャット — チームチャンネル",
            zh: "点击桌面图标打开对应功能。\n\n• 👤 代理设置 — 管理代理和部门\n• 📁 新建项目 — 项目向导\n• ▶ 运行任务 — 立即创建任务\n• ⚡ 工作流构建器 — 流水线编辑\n• 📋 库 — Skills·Rules·Memory\n• 💬 聊天 — 团队频道",
          }),
        },
        {
          heading: t({ ko: "아이콘 이동", en: "Moving Icons", ja: "アイコンの移動", zh: "移动图标" }),
          body: t({
            ko: "아이콘을 드래그하면 바탕화면 어디든 자유롭게 배치할 수 있습니다. 위치는 브라우저를 닫아도 저장됩니다.",
            en: "Drag icons to place them anywhere on the desktop. Positions are saved even after closing the browser.",
            ja: "アイコンをドラッグしてデスクトップ上の任意の場所に配置できます。位置はブラウザを閉じても保存されます。",
            zh: "拖动图标可将其放置在桌面的任意位置。即使关闭浏览器，位置也会被保存。",
          }),
        },
        {
          heading: t({ ko: "Jiggle Mode (흔들기 모드)", en: "Jiggle Mode", ja: "Jiggleモード（揺れモード）", zh: "Jiggle模式（抖动模式）" }),
          body: t({
            ko: "빈 바탕화면을 600ms 이상 길게 누르면 Jiggle Mode가 활성화됩니다.\n\n• 프로젝트 아이콘 좌상단에 빨간 ✕ 배지가 나타납니다.\n• ✕를 클릭하면 해당 프로젝트가 삭제됩니다.\n• Esc 키를 누르거나 바탕화면 빈 곳을 클릭하면 해제됩니다.",
            en: "Long-press an empty area of the desktop for 600ms to activate Jiggle Mode.\n\n• A red ✕ badge appears on the top-left of project icons.\n• Click ✕ to delete that project.\n• Press Esc or click an empty area to deactivate.",
            ja: "デスクトップの空のエリアを600ms長押しするとJiggleモードが有効になります。\n\n• プロジェクトアイコンの左上に赤い✕バッジが表示されます。\n• ✕をクリックするとそのプロジェクトが削除されます。\n• Escキーを押すか空白エリアをクリックすると解除されます。",
            zh: "在桌面空白区域长按600ms以上可激活Jiggle模式。\n\n• 项目图标左上角会出现红色✕徽标。\n• 点击✕可删除该项目。\n• 按Esc键或点击空白区域可退出。",
          }),
        },
        {
          heading: t({ ko: "Quick Look (빠른 미리보기)", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
          body: t({
            ko: "프로젝트 아이콘을 클릭해 선택한 뒤 Space 키를 누르면 빠른 미리보기 패널이 열립니다.\n\n• 프로젝트명, 경로, 목표, 태스크 수, 담당 에이전트 등을 확인합니다.\n• Esc 키 또는 패널 바깥 클릭으로 닫습니다.\n\n프로젝트 아이콘을 우클릭해도 '빠른 미리보기' 메뉴를 사용할 수 있습니다.",
            en: "Click a project icon to select it, then press Space to open the Quick Look panel.\n\n• Shows project name, path, goal, task count, and assigned agents.\n• Close with Esc or click outside the panel.\n\nYou can also right-click a project icon and choose 'Quick Look'.",
            ja: "プロジェクトアイコンをクリックして選択し、Spaceキーを押すとクイックルックパネルが開きます。\n\n• プロジェクト名、パス、目標、タスク数、担当エージェントを確認できます。\n• Escキーまたはパネル外クリックで閉じます。\n\nプロジェクトアイコンを右クリックして「クイックルック」を選択することもできます。",
            zh: "点击项目图标选中它，然后按Space键打开快速预览面板。\n\n• 显示项目名称、路径、目标、任务数量和分配的代理。\n• 按Esc或点击面板外部关闭。\n\n也可以右键点击项目图标选择「快速预览」。",
          }),
        },
      ],
    },
    {
      id: "agents",
      emoji: "🤖",
      title: t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" }),
      sections: [
        {
          heading: t({ ko: "에이전트란?", en: "What is an Agent?", ja: "エージェントとは？", zh: "代理是什么？" }),
          body: t({
            ko: "에이전트는 특정 역할을 자동으로 수행하는 AI 작업자입니다. 각 에이전트는 독립적으로 실행되며 태스크를 배정받아 결과를 보고합니다.",
            en: "An agent is an AI worker that automatically performs a specific role. Each agent runs independently, receives assigned tasks, and reports results.",
            ja: "エージェントは特定の役割を自動的に実行するAIワーカーです。各エージェントは独立して実行され、タスクを割り当てられて結果を報告します。",
            zh: "代理是自动执行特定角色的AI工作者。每个代理独立运行，接收分配的任务并报告结果。",
          }),
        },
        {
          heading: t({ ko: "에이전트 상태 표시", en: "Agent Status Indicators", ja: "エージェントステータス表示", zh: "代理状态显示" }),
          body: t({
            ko: "• ● (초록) — idle: 대기 중\n• ● (노랑) — working: 작업 중\n• ─ — paused: 일시 정지\n• ✕ — error: 오류 발생\n\n에이전트 위젯 또는 AgentManager 창에서 실시간 상태를 확인합니다.",
            en: "• ● (green) — idle: waiting\n• ● (yellow) — working: in progress\n• ─ — paused: temporarily stopped\n• ✕ — error: an error occurred\n\nCheck real-time status in the Agents widget or Agent Manager window.",
            ja: "• ● (緑) — idle: 待機中\n• ● (黄) — working: 作業中\n• ─ — paused: 一時停止\n• ✕ — error: エラー発生\n\nエージェントウィジェットまたはAgentManagerウィンドウでリアルタイム状態を確認します。",
            zh: "• ● (绿色) — idle: 等待中\n• ● (黄色) — working: 工作中\n• ─ — paused: 已暂停\n• ✕ — error: 发生错误\n\n在代理小组件或代理管理器窗口中查看实时状态。",
          }),
        },
        {
          heading: t({ ko: "에이전트 만들기", en: "Creating an Agent", ja: "エージェントの作成", zh: "创建代理" }),
          body: t({
            ko: "1. 데스크탑 아이콘 👤(에이전트 설정)를 클릭합니다.\n2. '새 에이전트' 버튼을 클릭합니다.\n3. 이름, 역할(Role), 모델을 설정합니다.\n4. 부서(Department)에 배치합니다.",
            en: "1. Click the 👤 (Agents) desktop icon.\n2. Click the 'Hire Agent' button.\n3. Set the name, role, and model.\n4. Assign to a department.",
            ja: "1. デスクトップアイコン👤（エージェント設定）をクリックします。\n2. 「新しいエージェント」ボタンをクリックします。\n3. 名前、役割（Role）、モデルを設定します。\n4. 部署（Department）に配置します。",
            zh: "1. 点击桌面图标 👤（代理设置）。\n2. 点击「招聘代理」按钮。\n3. 设置名称、角色和模型。\n4. 分配到部门。",
          }),
        },
      ],
    },
    {
      id: "tasks",
      emoji: "📋",
      title: t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" }),
      sections: [
        {
          heading: t({ ko: "태스크란?", en: "What is a Task?", ja: "タスクとは？", zh: "任务是什么？" }),
          body: t({
            ko: "태스크는 에이전트에게 부여하는 작업 단위입니다. 각 태스크는 상태(pending → running → done)를 가지며 서브태스크로 분해될 수 있습니다.",
            en: "A task is a unit of work assigned to an agent. Each task has a status (pending → running → done) and can be broken down into subtasks.",
            ja: "タスクはエージェントに割り当てる作業単位です。各タスクはステータス（pending → running → done）を持ち、サブタスクに分解できます。",
            zh: "任务是分配给代理的工作单元。每个任务都有状态（pending → running → done），可以分解为子任务。",
          }),
        },
        {
          heading: t({ ko: "태스크 생성", en: "Creating a Task", ja: "タスクの作成", zh: "创建任务" }),
          body: t({
            ko: "• 데스크탑 아이콘 ▶(태스크 실행)을 클릭합니다.\n• 커맨드 팔레트(Ctrl+Shift+K)에서 N 키를 눌러 빠르게 생성합니다.\n\n태스크 생성 시 제목, 설명, 배정 에이전트, 우선순위를 설정합니다.",
            en: "• Click the ▶ (Run Task) desktop icon.\n• Press N in the Command Palette (Ctrl+Shift+K) for quick creation.\n\nWhen creating a task, set the title, description, assigned agent, and priority.",
            ja: "• デスクトップアイコン▶（タスク実行）をクリックします。\n• コマンドパレット（Ctrl+Shift+K）でNキーを押して素早く作成します。\n\nタスク作成時にタイトル、説明、担当エージェント、優先度を設定します。",
            zh: "• 点击桌面图标 ▶（运行任务）。\n• 在命令面板（Ctrl+Shift+K）中按N键快速创建。\n\n创建任务时设置标题、描述、分配的代理和优先级。",
          }),
        },
        {
          heading: t({ ko: "태스크 모니터링", en: "Task Monitoring", ja: "タスクのモニタリング", zh: "任务监控" }),
          body: t({
            ko: "Tasks 위젯을 바탕화면에 추가하면 실시간으로 진행 상황을 볼 수 있습니다.\n위젯 추가: 앱 메뉴(AgentDesk 클릭) → '위젯 추가...'",
            en: "Add the Tasks widget to the desktop to monitor progress in real time.\nAdd widget: App menu (click AgentDesk) → 'Add Widget...'",
            ja: "Tasks ウィジェットをデスクトップに追加すると、リアルタイムで進捗を確認できます。\nウィジェット追加: アプリメニュー（AgentDeskクリック） → 「ウィジェット追加...」",
            zh: "将Tasks小组件添加到桌面，即可实时监控进度。\n添加小组件：应用菜单（点击AgentDesk）→ 「添加小组件...」",
          }),
        },
      ],
    },
    {
      id: "workflow",
      emoji: "⚡",
      title: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }),
      sections: [
        {
          heading: t({ ko: "워크플로란?", en: "What is a Workflow?", ja: "ワークフローとは？", zh: "工作流是什么？" }),
          body: t({
            ko: "워크플로는 여러 태스크를 연결한 자동화 파이프라인입니다. 한 태스크의 결과를 다음 태스크의 입력으로 전달할 수 있습니다.",
            en: "A workflow is an automation pipeline that connects multiple tasks. The output of one task can be passed as input to the next.",
            ja: "ワークフローは複数のタスクを連結した自動化パイプラインです。あるタスクの結果を次のタスクの入力として渡すことができます。",
            zh: "工作流是连接多个任务的自动化流水线。一个任务的结果可以作为下一个任务的输入传递。",
          }),
        },
        {
          heading: t({ ko: "워크플로 빌더 사용법", en: "Using the Workflow Builder", ja: "ワークフロービルダーの使い方", zh: "使用工作流构建器" }),
          body: t({
            ko: "1. Dock의 ⚡ 버튼 또는 데스크탑 아이콘 ⚡를 클릭합니다.\n2. 캔버스에 에이전트 노드를 드래그합니다.\n3. 노드 간 연결선을 그어 흐름을 정의합니다.\n4. '실행' 버튼으로 파이프라인을 시작합니다.",
            en: "1. Click the ⚡ button in the Dock or the ⚡ desktop icon.\n2. Drag agent nodes onto the canvas.\n3. Draw connections between nodes to define the flow.\n4. Click 'Run' to start the pipeline.",
            ja: "1. Dockの⚡ボタンまたはデスクトップアイコン⚡をクリックします。\n2. キャンバスにエージェントノードをドラッグします。\n3. ノード間の接続線を引いてフローを定義します。\n4. 「実行」ボタンでパイプラインを開始します。",
            zh: "1. 点击Dock中的⚡按钮或桌面图标⚡。\n2. 将代理节点拖到画布上。\n3. 在节点之间绘制连线以定义流程。\n4. 点击「运行」按钮启动流水线。",
          }),
        },
        {
          heading: t({ ko: "예약 태스크", en: "Scheduled Tasks", ja: "スケジュールタスク", zh: "定时任务" }),
          body: t({
            ko: "Workflow 창 → 'Scheduled' 탭에서 cron 표현식으로 태스크를 예약합니다.\n예: `0 9 * * 1-5` — 평일 오전 9시 자동 실행",
            en: "In the Workflow window → 'Scheduled' tab, schedule tasks using cron expressions.\nExample: `0 9 * * 1-5` — runs automatically at 9 AM on weekdays.",
            ja: "ワークフローウィンドウ → 「Scheduled」タブでcron式を使用してタスクをスケジュールします。\n例: `0 9 * * 1-5` — 平日の午前9時に自動実行",
            zh: "在工作流窗口 → 「Scheduled」选项卡中，使用cron表达式安排任务。\n示例：`0 9 * * 1-5` — 工作日上午9点自动执行",
          }),
        },
      ],
    },
    {
      id: "shortcuts",
      emoji: "⌨️",
      title: t({ ko: "단축키", en: "Shortcuts", ja: "ショートカット", zh: "快捷键" }),
      sections: [
        {
          heading: t({ ko: "전역 단축키", en: "Global Shortcuts", ja: "グローバルショートカット", zh: "全局快捷键" }),
          keys: [
            { keys: ["Ctrl", "Shift", "K"], desc: t({ ko: "커맨드 팔레트 (Spotlight) 열기", en: "Open Command Palette (Spotlight)", ja: "コマンドパレット (Spotlight) を開く", zh: "打开命令面板 (Spotlight)" }) },
            { keys: ["Cmd", "K"], desc: t({ ko: "커맨드 팔레트 열기 (macOS)", en: "Open Command Palette (macOS)", ja: "コマンドパレットを開く (macOS)", zh: "打开命令面板 (macOS)" }) },
            { keys: ["Ctrl", "↑"], desc: t({ ko: "Mission Control — 열린 창 오버뷰", en: "Mission Control — open windows overview", ja: "ミッションコントロール — 開いているウィンドウ一覧", zh: "Mission Control — 打开窗口概览" }) },
            { keys: ["?"], desc: t({ ko: "유저 가이드 열기/닫기", en: "Open/close user guide", ja: "ユーザーガイドを開く/閉じる", zh: "打开/关闭用户指南" }) },
            { keys: ["Esc"], desc: t({ ko: "패널 닫기 / Jiggle 해제 / Quick Look 닫기", en: "Close panel / exit Jiggle / close Quick Look", ja: "パネルを閉じる / Jiggle解除 / Quick Lookを閉じる", zh: "关闭面板 / 退出Jiggle / 关闭快速预览" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "g + 키 — 앱 창 토글 (VIM 스타일)", en: "g + key — toggle app windows (VIM style)", ja: "g + キー — アプリウィンドウのトグル (VIMスタイル)", zh: "g + 键 — 切换应用窗口（VIM风格）" }),
          keys: [
            { keys: ["g", "w"], desc: t({ ko: "Workflow 창 토글", en: "Toggle Workflow window", ja: "ワークフローウィンドウをトグル", zh: "切换工作流窗口" }) },
            { keys: ["g", "l"], desc: t({ ko: "Library 창 토글", en: "Toggle Library window", ja: "ライブラリウィンドウをトグル", zh: "切换库窗口" }) },
            { keys: ["g", "s"], desc: t({ ko: "Settings 창 토글", en: "Toggle Settings window", ja: "設定ウィンドウをトグル", zh: "切换设置窗口" }) },
            { keys: ["g", "c"], desc: t({ ko: "Chat 창 토글", en: "Toggle Chat window", ja: "チャットウィンドウをトグル", zh: "切换聊天窗口" }) },
            { keys: ["g", "a"], desc: t({ ko: "에이전트 설정 창 토글", en: "Toggle Agent Manager window", ja: "エージェント設定ウィンドウをトグル", zh: "切换代理管理器窗口" }) },
            { keys: ["g", "e"], desc: t({ ko: "에이전트 REPL 창 토글", en: "Toggle Agent REPL window", ja: "エージェントREPLウィンドウをトグル", zh: "切换代理REPL窗口" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "바탕화면", en: "Desktop", ja: "デスクトップ", zh: "桌面" }),
          keys: [
            { keys: ["Space"], desc: t({ ko: "선택된 프로젝트 아이콘 Quick Look", en: "Quick Look selected project icon", ja: "選択中のプロジェクトアイコンをクイックルック", zh: "快速预览选中的项目图标" }) },
            { keys: ["Long Press (600ms)"], desc: t({ ko: "빈 바탕화면 — Jiggle Mode ON", en: "Empty desktop — activate Jiggle Mode", ja: "空のデスクトップ — Jiggleモード有効", zh: "空桌面 — 激活Jiggle模式" }) },
          ],
          body: "",
        },
        {
          heading: t({ ko: "커맨드 팔레트 내", en: "Inside Command Palette", ja: "コマンドパレット内", zh: "命令面板内" }),
          keys: [
            { keys: ["↑", "↓"], desc: t({ ko: "항목 이동", en: "Navigate items", ja: "項目を移動", zh: "导航项目" }) },
            { keys: ["↵"], desc: t({ ko: "선택 / 실행", en: "Select / execute", ja: "選択 / 実行", zh: "选择 / 执行" }) },
            { keys: ["N"], desc: t({ ko: "(빈 검색) 새 태스크 생성", en: "(empty search) New task", ja: "（空検索）新しいタスク作成", zh: "（空搜索）新建任务" }) },
            { keys: ["T"], desc: t({ ko: "(빈 검색) 태스크 보드", en: "(empty search) Task board", ja: "（空検索）タスクボード", zh: "（空搜索）任务看板" }) },
            { keys: ["A"], desc: t({ ko: "(빈 검색) 에이전트", en: "(empty search) Agents", ja: "（空検索）エージェント", zh: "（空搜索）代理" }) },
            { keys: ["S"], desc: t({ ko: "(빈 검색) 스킬", en: "(empty search) Skills", ja: "（空検索）スキル", zh: "（空搜索）技能" }) },
            { keys: ["M"], desc: t({ ko: "(빈 검색) 메모리", en: "(empty search) Memory", ja: "（空検索）メモリ", zh: "（空搜索）记忆" }) },
            { keys: [","], desc: t({ ko: "(빈 검색) 설정", en: "(empty search) Settings", ja: "（空検索）設定", zh: "（空搜索）设置" }) },
          ],
          body: "",
        },
      ],
    },
    {
      id: "widgets",
      emoji: "📦",
      title: t({ ko: "위젯", en: "Widgets", ja: "ウィジェット", zh: "小组件" }),
      sections: [
        {
          heading: t({ ko: "위젯이란?", en: "What is a Widget?", ja: "ウィジェットとは？", zh: "小组件是什么？" }),
          body: t({
            ko: "위젯은 바탕화면에 고정된 미니 뷰입니다. 드래그로 이동하고 모서리를 끌어 크기를 조정할 수 있습니다.",
            en: "Widgets are mini views pinned to the desktop. Drag to move them and pull corners to resize.",
            ja: "ウィジェットはデスクトップに固定されたミニビューです。ドラッグで移動し、コーナーを引いてサイズを変更できます。",
            zh: "小组件是固定在桌面上的迷你视图。可以拖动移动，拉动角落调整大小。",
          }),
        },
        {
          heading: t({ ko: "사용 가능한 위젯", en: "Available Widgets", ja: "利用可能なウィジェット", zh: "可用小组件" }),
          body: t({
            ko: "• 🤖 Agents 위젯 — 에이전트 실시간 상태\n• 📋 Tasks 위젯 — 진행 중인 태스크 목록\n• 🔔 Alerts 위젯 — 주요 알림 표시\n• 💰 CLI Cost 위젯 — 오늘의 AI 사용 비용\n• 🌊 Flow Graph 위젯 — 에이전트 흐름 그래프",
            en: "• 🤖 Agents widget — live agent status\n• 📋 Tasks widget — active task list\n• 🔔 Alerts widget — key notifications\n• 💰 CLI Cost widget — today's AI usage cost\n• 🌊 Flow Graph widget — agent communication flow",
            ja: "• 🤖 Agents ウィジェット — エージェントのリアルタイム状態\n• 📋 Tasks ウィジェット — 進行中のタスク一覧\n• 🔔 Alerts ウィジェット — 主要通知\n• 💰 CLI Cost ウィジェット — 今日のAI使用コスト\n• 🌊 Flow Graph ウィジェット — エージェントフローグラフ",
            zh: "• 🤖 代理小组件 — 实时代理状态\n• 📋 任务小组件 — 活动任务列表\n• 🔔 警报小组件 — 重要通知\n• 💰 CLI成本小组件 — 今日AI使用费用\n• 🌊 流程图小组件 — 代理通信流程图",
          }),
        },
        {
          heading: t({ ko: "위젯 추가 방법", en: "How to Add Widgets", ja: "ウィジェットの追加方法", zh: "如何添加小组件" }),
          body: t({
            ko: "1. 상단 메뉴바 'AgentDesk' 클릭 → '위젯 추가...'\n2. 또는 우클릭 컨텍스트 메뉴 → '위젯 추가'\n3. 원하는 위젯을 선택하면 바탕화면에 배치됩니다.\n\n위젯 헤더 오른쪽 ✕ 버튼으로 제거합니다.",
            en: "1. Click 'AgentDesk' in the top menubar → 'Add Widget...'\n2. Or right-click the desktop → 'Add Widget'\n3. Select the desired widget to place it on the desktop.\n\nClick the ✕ button in the widget header to remove it.",
            ja: "1. 上部メニューバーの「AgentDesk」をクリック → 「ウィジェット追加...」\n2. またはデスクトップを右クリック → 「ウィジェット追加」\n3. 希望するウィジェットを選択するとデスクトップに配置されます。\n\nウィジェットヘッダーの✕ボタンで削除します。",
            zh: "1. 点击顶部菜单栏中的「AgentDesk」 → 「添加小组件...」\n2. 或右键点击桌面 → 「添加小组件」\n3. 选择所需小组件后将其放置在桌面上。\n\n点击小组件标题栏的✕按钮可将其移除。",
          }),
        },
      ],
    },
  ];
}

interface UserGuidePanelProps {
  open: boolean;
  onClose: () => void;
  initialChapter?: string;
}

const mono = "var(--th-font-mono)";

const kbdStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10,
  color: "var(--th-text-secondary)",
  background: "var(--th-bg-elevated)",
  border: "1px solid var(--th-border)",
  borderRadius: 4,
  padding: "2px 6px",
  boxShadow: "0 1px 0 var(--th-border)",
  display: "inline-block",
};

export default function UserGuidePanel({ open, onClose, initialChapter }: UserGuidePanelProps) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(initialChapter ?? "getting-started");

  useEffect(() => {
    if (initialChapter) setSelectedId(initialChapter);
  }, [initialChapter]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const chapters = getChapters(t);
  const chapter = chapters.find((c) => c.id === selectedId) ?? chapters[0];

  const panel = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 949,
            background: "var(--th-modal-overlay)",
          }}
        />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-label={t({ ko: "AgentDesk 유저 가이드", en: "AgentDesk User Guide", ja: "AgentDeskユーザーガイド", zh: "AgentDesk用户指南" })}
        style={{
          position: "fixed",
          top: 44,
          right: 0,
          bottom: 0,
          width: 480,
          zIndex: 950,
          display: "flex",
          flexDirection: "column",
          background: "var(--th-panel-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid var(--th-border)",
          transform: open ? "translateX(0)" : "translateX(480px)",
          transition: "transform 0.28s cubic-bezier(0.32,0,0.15,1)",
          fontFamily: mono,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            height: 44,
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            background: "var(--th-bg-header)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ff5f57",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)", flex: 1 }}>
            {t({ ko: "AgentDesk 가이드", en: "AgentDesk Guide", ja: "AgentDeskガイド", zh: "AgentDesk指南" })}
          </span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono }}>Esc</span>
        </div>

        {/* Body — 2단 */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* 좌측 챕터 nav */}
          <div
            style={{
              width: 160,
              flexShrink: 0,
              borderRight: "1px solid var(--th-border)",
              overflowY: "auto",
              padding: "8px 0",
              background: "var(--th-bg-sidebar)",
            }}
          >
            {chapters.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 14px",
                    background: active ? "var(--th-accent-glow)" : "transparent",
                    border: "none",
                    borderRight: active ? "2px solid var(--th-accent)" : "2px solid transparent",
                    color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
                    fontFamily: mono,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span>{c.emoji}</span>
                  <span>{c.title}</span>
                </button>
              );
            })}
          </div>

          {/* 우측 콘텐츠 */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 20px 32px",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{chapter.emoji}</div>
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--th-text-heading)",
                fontFamily: mono,
              }}
            >
              {chapter.title}
            </h2>

            {chapter.sections.map((sec) => (
              <div key={sec.heading} style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--th-text-muted)",
                    fontFamily: mono,
                  }}
                >
                  {sec.heading}
                </h3>

                {/* 키보드 단축키 목록 */}
                {sec.keys && sec.keys.length > 0 && (
                  <div style={{ marginBottom: sec.body ? 10 : 0 }}>
                    {sec.keys.map(({ keys, desc }) => (
                      <div
                        key={keys.join("+")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          gap: 12,
                          borderBottom: "1px solid var(--th-border)",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--th-text-secondary)", fontFamily: mono }}>
                          {desc}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {keys.map((k, i) => (
                            <span key={i}>
                              <kbd style={kbdStyle}>{k}</kbd>
                              {i < keys.length - 1 && (
                                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", margin: "0 2px" }}>
                                  +
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 텍스트 본문 */}
                {sec.body && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.75,
                      color: "var(--th-text-secondary)",
                      fontFamily: mono,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {sec.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
