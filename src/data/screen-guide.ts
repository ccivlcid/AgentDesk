import type { LangText } from "../i18n";
import type { View } from "../app/types";

export interface ScreenGuideEntry {
  title: LangText;
  description: LangText;
  tips: LangText[];
}

const guides: Record<View, ScreenGuideEntry> = {
  tasks: {
    title: { ko: "업무", en: "Tasks", ja: "タスク", zh: "任务" },
    description: {
      ko: "업무 보드·스케줄·산출물 등 태스크 관련 화면으로 이동합니다.",
      en: "Navigate to task-related views: board, scheduler, outputs.",
      ja: "タスクボード・スケジュール・成果物などタスク関連画面へ。",
      zh: "进入任务相关视图：看板、调度、产出物。",
    },
    tips: [
      { ko: "좌측에서 보드 / 스케줄 / 산출물 탭 선택", en: "Choose Board / Scheduler / Outputs tab on the left", ja: "左でボード・スケジュール・成果物タブを選択", zh: "在左侧选择看板 / 调度 / 产出物选项卡" },
    ],
  },
  dashboard: {
    title: { ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" },
    description: {
      ko: "현재 프로젝트의 요약과 팀·에이전트 활동을 한눈에 봅니다.",
      en: "View a summary of the current project and team/agent activity at a glance.",
      ja: "現在のプロジェクトの概要とチーム・エージェントの活動を一覧します。",
      zh: "一览当前项目摘要与团队/代理活动。",
    },
    tips: [
      { ko: "프로젝트 목표·팀 패널에서 진행 상황 확인", en: "Check progress in project goal and team panels", ja: "プロジェクト目標・チームパネルで進捗を確認", zh: "在项目目标与团队面板中查看进度" },
      { ko: "에이전트 활동·작업 중인 태스크 확인", en: "See agent activity and tasks in progress", ja: "エージェントの活動・実行中タスクを確認", zh: "查看代理活动与进行中任务" },
      { ko: "설정 탭에서 대시보드 위젯 표시 변경", en: "Change dashboard widget visibility in Settings tab", ja: "設定タブでダッシュボードウィジェットを変更", zh: "在设置选项卡中更改仪表盘小组件" },
    ],
  },
  "project-types": {
    title: { ko: "프로젝트 유형", en: "Project Types", ja: "プロジェクト種別", zh: "项目类型" },
    description: {
      ko: "카테고리(프로젝트 유형)를 보고 관리합니다. 새 프로젝트 생성 시 여기서 유형을 선택할 수 있습니다.",
      en: "View and manage categories (project types). You can choose a type when creating a new project.",
      ja: "カテゴリ（プロジェクト種別）を表示・管理します。新規プロジェクト作成時に種別を選択できます。",
      zh: "查看并管理类别（项目类型）。创建新项目时可在此选择类型。",
    },
    tips: [
      { ko: "카테고리별 목표·게이트·산출물 스키마 확인", en: "See goal, gate, and deliverable schema per category", ja: "カテゴリごとの目標・ゲート・成果物スキーマを確認", zh: "查看各类别的目标、关卡与产出物结构" },
      { ko: "사용자 정의 카테고리 생성·수정", en: "Create or edit custom categories", ja: "ユーザー定義カテゴリの作成・編集", zh: "创建或编辑自定义类别" },
    ],
  },
  "tasks-board": {
    title: { ko: "업무 보드", en: "Task Board", ja: "タスクボード", zh: "任务看板" },
    description: {
      ko: "칸반 보드로 태스크를 관리합니다. 드래그하여 상태를 바꾸고, 에이전트를 배정하고 실행할 수 있습니다.",
      en: "Manage tasks on a Kanban board. Drag to change status, assign agents, and run tasks.",
      ja: "カンバンボードでタスクを管理。ドラッグで状態変更、エージェント割り当て・実行ができます。",
      zh: "在看板上管理任务。可拖拽改状态、分配代理并运行任务。",
    },
    tips: [
      { ko: "N 키 또는 새 태스크 버튼으로 태스크 추가", en: "Press N or use New Task button to add a task", ja: "Nキーまたは新規タスクボタンで追加", zh: "按 N 或使用新建任务按钮添加任务" },
      { ko: "카드 드래그로 TODO → 진행 중 → 완료 이동", en: "Drag cards to move TODO → In progress → Done", ja: "カードをドラッグして TODO→進行中→完了へ", zh: "拖拽卡片在待办→进行中→完成间移动" },
      { ko: "태스크 클릭 후 에이전트 배정·실행", en: "Click a task to assign an agent and run", ja: "タスクをクリックしてエージェント割り当て・実行", zh: "点击任务后可分配代理并运行" },
      { ko: "Esc로 모달·팝업 닫기", en: "Press Esc to close modal or popup", ja: "Escでモーダル・ポップアップを閉じる", zh: "按 Esc 关闭模态框或弹窗" },
    ],
  },
  "tasks-scheduled": {
    title: { ko: "스케줄러", en: "Scheduler", ja: "スケジューラ", zh: "调度器" },
    description: {
      ko: "예약된 태스크를 보고 관리합니다.",
      en: "View and manage scheduled tasks.",
      ja: "予約済みタスクを表示・管理します。",
      zh: "查看并管理已预约任务。",
    },
    tips: [
      { ko: "예약 일시·반복 설정 확인·수정", en: "View or edit schedule and recurrence", ja: "予約日時・繰り返しを確認・編集", zh: "查看或编辑预约时间与重复设置" },
    ],
  },
  "tasks-deliverables": {
    title: { ko: "산출물", en: "Outputs", ja: "成果物", zh: "产出物" },
    description: {
      ko: "태스크 실행 결과물과 프로젝트 산출물을 봅니다.",
      en: "View task run artifacts and project deliverables.",
      ja: "タスク実行の成果物とプロジェクトの成果物を表示します。",
      zh: "查看任务运行产物与项目产出物。",
    },
    tips: [
      { ko: "태스크별 아티팩트·파일·Git 요약", en: "Artifacts, files, and Git summary per task", ja: "タスクごとのアーティファクト・ファイル・Git概要", zh: "每任务的产物、文件与 Git 摘要" },
      { ko: "프로젝트 산출물(계획)과 실행 결과 매칭", en: "Match project deliverables (planned) with run results", ja: "プロジェクト成果物（計画）と実行結果の対応", zh: "将项目产出物（计划）与运行结果对应" },
    ],
  },
  agents: {
    title: { ko: "에이전트 & 부서", en: "Agents & Depts", ja: "エージェント & 部署", zh: "代理与部门" },
    description: {
      ko: "부서와 에이전트를 추가·수정합니다. 에이전트에 CLI 프로바이더와 역할을 지정할 수 있습니다.",
      en: "Add or edit departments and agents. Assign CLI provider and role to each agent.",
      ja: "部門とエージェントを追加・編集。エージェントにCLIプロバイダーと役割を指定できます。",
      zh: "添加或编辑部门与代理。可为每个代理指定 CLI 提供商与角色。",
    },
    tips: [
      { ko: "부서 생성 후 에이전트 추가", en: "Create a department, then add agents", ja: "部門を作成してからエージェントを追加", zh: "先创建部门再添加代理" },
      { ko: "Claude Code, Codex, Gemini 등 프로바이더 선택", en: "Choose provider (Claude Code, Codex, Gemini, etc.)", ja: "Claude Code、Codex、Geminiなどのプロバイダーを選択", zh: "选择提供商（Claude Code、Codex、Gemini 等）" },
      { ko: "프로젝트 팀에 에이전트 배정은 프로젝트/대시보드에서", en: "Assign agents to project team from project/dashboard", ja: "プロジェクトチームへの割り当てはプロジェクト/ダッシュボードで", zh: "在项目/仪表盘中将代理加入项目团队" },
    ],
  },
  heartbeat: {
    title: { ko: "현황 모니터", en: "Heartbeat", ja: "稼働モニタ", zh: "心跳监控" },
    description: {
      ko: "에이전트별 실시간 상태와 실행 중인 태스크를 봅니다.",
      en: "View real-time agent status and tasks in progress.",
      ja: "エージェントごとのリアルタイム状態と実行中タスクを表示。",
      zh: "查看各代理的实时状态与进行中任务。",
    },
    tips: [
      { ko: "작업 중·대기·오류 등 상태 표시", en: "Status indicators: working, idle, error, etc.", ja: "作業中・待機・エラーなどの状態表示", zh: "状态指示：工作中、空闲、错误等" },
      { ko: "실행 중인 태스크 클릭 시 터미널로 이동", en: "Click a running task to open terminal", ja: "実行中タスクをクリックでターミナルへ", zh: "点击运行中任务可打开终端" },
    ],
  },
  "flow-graph": {
    title: { ko: "플로우 그래프", en: "Flow Graph", ja: "フローグラフ", zh: "流程图" },
    description: {
      ko: "에이전트 간 실시간 관계를 SVG 그래프로 시각화합니다. 위임·서브에이전트·크로스부서 전달·미팅 흐름을 한눈에 확인할 수 있습니다.",
      en: "Visualize real-time relationships between agents as an SVG graph. See delegations, sub-agents, cross-dept deliveries, and meetings at a glance.",
      ja: "エージェント間のリアルタイム関係をSVGグラフで可視化します。委任・サブエージェント・部署間配送・ミーティングの流れを一覧できます。",
      zh: "以 SVG 图表可视化代理间的实时关系。一览委派、子代理、跨部门传递与会议流程。",
    },
    tips: [
      { ko: "마우스 휠로 줌, 드래그로 팬, 더블클릭으로 전체 보기", en: "Scroll to zoom, drag to pan, double-click to fit view", ja: "スクロールでズーム、ドラッグでパン、ダブルクリックで全体表示", zh: "滚轮缩放，拖拽平移，双击适应视图" },
      { ko: "노드 클릭 시 에이전트 상세 패널 열기", en: "Click a node to open agent detail panel", ja: "ノードをクリックでエージェント詳細パネルを開く", zh: "点击节点可打开代理详情面板" },
      { ko: "필터로 전체·작업중·미팅중 에이전트만 표시", en: "Use filters to show all, working, or in-meeting agents", ja: "フィルターで全体・作業中・会議中のエージェントを表示", zh: "使用过滤器显示全部、工作中或会议中的代理" },
    ],
  },
  skills: {
    title: { ko: "스킬", en: "Skills", ja: "スキル", zh: "技能" },
    description: {
      ko: "에이전트가 학습한 스킬 카탈로그와 커스텀 스킬을 관리합니다.",
      en: "Manage the skill catalog learned by agents and custom skills.",
      ja: "エージェントが学習したスキルカタログとカスタムスキルを管理します。",
      zh: "管理代理已学技能目录与自定义技能。",
    },
    tips: [
      { ko: "스킬 학습·해제(unlearn)로 에이전트에 반영", en: "Learn or unlearn skills to apply to agents", ja: "スキルの学習・解除でエージェントに反映", zh: "通过学习或解除技能应用到代理" },
      { ko: "커스텀 스킬 업로드·편집", en: "Upload and edit custom skills", ja: "カスタムスキルのアップロード・編集", zh: "上传并编辑自定义技能" },
    ],
  },
  "agent-rules": {
    title: { ko: "에이전트 룰", en: "Agent Rules", ja: "エージェントルール", zh: "代理规则" },
    description: {
      ko: "에이전트 실행 시 적용되는 규칙(지침)을 관리합니다. 범위별·카테고리별로 설정할 수 있습니다.",
      en: "Manage rules (instructions) applied when agents run. You can set them by scope and category.",
      ja: "エージェント実行時に適用されるルール（指示）を管理。範囲・カテゴリ別に設定可能。",
      zh: "管理代理运行时应用的规则（指示）。可按范围与类别设置。",
    },
    tips: [
      { ko: "글로벌·부서·에이전트별 규칙 추가", en: "Add rules globally, per department, or per agent", ja: "グローバル・部門・エージェントごとにルールを追加", zh: "按全局、部门或代理添加规则" },
      { ko: "학습(Learn)으로 규칙 자동 추천", en: "Use Learn to get rule suggestions", ja: "学習でルールの自動提案", zh: "使用学习功能获取规则建议" },
    ],
  },
  memory: {
    title: { ko: "메모리", en: "Memory", ja: "メモリ", zh: "记忆" },
    description: {
      ko: "에이전트가 참조하는 메모리(키-값)를 관리합니다.",
      en: "Manage memory (key-value) that agents reference.",
      ja: "エージェントが参照するメモリ（キー・値）を管理します。",
      zh: "管理代理引用的记忆（键值）。",
    },
    tips: [
      { ko: "범위(글로벌·부서·에이전트)별 메모리", en: "Memory by scope: global, department, or agent", ja: "範囲（グローバル・部門・エージェント）別メモリ", zh: "按范围（全局、部门、代理）管理记忆" },
      { ko: "학습으로 메모리 자동 추천", en: "Use Learn for memory suggestions", ja: "学習でメモリの自動提案", zh: "使用学习功能获取记忆建议" },
    ],
  },
  hooks: {
    title: { ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" },
    description: {
      ko: "이벤트 발생 시 실행되는 훅(URL 호출 등)을 관리합니다.",
      en: "Manage hooks that run on events (e.g. URL calls).",
      ja: "イベント発生時に実行されるフック（URL呼び出し等）を管理します。",
      zh: "管理在事件发生时执行的钩子（如 URL 调用）。",
    },
    tips: [
      { ko: "이벤트 유형별 훅 등록", en: "Register hooks per event type", ja: "イベントタイプごとにフックを登録", zh: "按事件类型注册钩子" },
      { ko: "학습으로 훅 자동 추천", en: "Use Learn for hook suggestions", ja: "学習でフックの自動提案", zh: "使用学习功能获取钩子建议" },
    ],
  },
  "cli-usage": {
    title: { ko: "CLI 사용량", en: "CLI Usage", ja: "CLI使用量", zh: "CLI 使用量" },
    description: {
      ko: "에이전트별 CLI 사용량과 비용 추이를 봅니다.",
      en: "View CLI usage and cost trends per agent.",
      ja: "エージェントごとのCLI使用量・コスト推移を表示。",
      zh: "查看各代理的 CLI 使用量与成本趋势。",
    },
    tips: [
      { ko: "프로바이더별·에이전트별 사용량", en: "Usage by provider and agent", ja: "プロバイダー・エージェント別使用量", zh: "按提供商与代理查看使用量" },
      { ko: "새로고침으로 최신 집계 반영", en: "Refresh to get latest totals", ja: "更新で最新の集計を反映", zh: "刷新以获取最新统计" },
    ],
  },
  "workflow-builder": {
    title: { ko: "워크플로 빌더", en: "Workflow Builder", ja: "ワークフロービルダー", zh: "工作流构建器" },
    description: {
      ko: "노드 기반 UI로 에이전트 파이프라인을 시각적으로 설계합니다.",
      en: "Visually design agent pipelines with a node-based UI.",
      ja: "ノードベースUIでエージェントパイプラインを視覚的に設計します。",
      zh: "使用节点式 UI 可视化设计代理流水线。",
    },
    tips: [
      { ko: "왼쪽 팔레트에서 노드를 드래그하여 캔버스에 추가", en: "Drag nodes from the left palette onto the canvas", ja: "左パレットからノードをキャンバスにドラッグ", zh: "从左侧面板拖动节点到画布" },
      { ko: "노드 핸들을 연결해 실행 흐름을 구성", en: "Connect node handles to define the execution flow", ja: "ノードハンドルを接続して実行フローを構成", zh: "连接节点端口定义执行流程" },
      { ko: "워크플로 이름을 편집하고 저장하면 localStorage에 자동 보존", en: "Edit the workflow name and save — auto-persisted to localStorage", ja: "ワークフロー名を編集して保存するとlocalStorageに自動保存", zh: "编辑工作流名称并保存，自动持久化到 localStorage" },
    ],
  },
  "agent-repl": {
    title: { ko: "에이전트 REPL", en: "Agent REPL", ja: "エージェント REPL", zh: "代理 REPL" },
    description: {
      ko: "터미널 스타일로 에이전트에게 직접 태스크를 입력하고 즉시 실행합니다.",
      en: "Send tasks directly to agents in a terminal-style REPL and execute them immediately.",
      ja: "ターミナル形式でエージェントに直接タスクを送信し、即座に実行します。",
      zh: "以终端方式直接向代理发送任务并立即执行。",
    },
    tips: [
      { ko: "우측 드롭다운에서 대상 에이전트를 선택하거나 :use <이름> 으로 전환", en: "Select the target agent from the dropdown or type :use <name>", ja: "右上ドロップダウンまたは :use <名前> でエージェントを選択", zh: "从右侧下拉框选择代理，或输入 :use <名称> 切换" },
      { ko: ":list 로 전체 에이전트 목록 및 상태 확인", en: ":list shows all agents and their status", ja: ":list で全エージェントと状態を確認", zh: ":list 查看所有代理及其状态" },
      { ko: "↑/↓ 화살표 키로 이전 명령 히스토리 탐색", en: "Use ↑/↓ arrow keys to navigate command history", ja: "↑/↓キーでコマンド履歴を参照", zh: "使用 ↑/↓ 方向键浏览命令历史" },
    ],
  },
  settings: {
    title: { ko: "설정", en: "Settings", ja: "設定", zh: "设置" },
    description: {
      ko: "API 프로바이더, OAuth, 메신저 게이트웨이, 데이터, 카테고리 등 앱 설정을 변경합니다.",
      en: "Change app settings: API providers, OAuth, messenger gateway, data, categories, etc.",
      ja: "APIプロバイダー、OAuth、メッセンジャーゲートウェイ、データ、カテゴリなどのアプリ設定を変更。",
      zh: "修改应用设置：API 提供商、OAuth、消息网关、数据、类别等。",
    },
    tips: [
      { ko: "API 프로바이더에서 Claude·OpenAI 등 키 설정", en: "Set API keys for Claude, OpenAI, etc. in API providers", ja: "APIプロバイダーでClaude・OpenAIなどのキーを設定", zh: "在 API 提供商中设置 Claude、OpenAI 等密钥" },
      { ko: "OAuth 탭에서 GitHub Copilot 등 연동", en: "Connect GitHub Copilot etc. in OAuth tab", ja: "OAuthタブでGitHub Copilotなどを連携", zh: "在 OAuth 选项卡中连接 GitHub Copilot 等" },
      { ko: "게이트웨이에서 Telegram·Discord 채널 설정", en: "Configure Telegram/Discord channels in Gateway", ja: "ゲートウェイでTelegram・Discordチャンネルを設定", zh: "在网关中配置 Telegram、Discord 频道" },
    ],
  },
  library: {
    title: { ko: "라이브러리", en: "Library", ja: "ライブラリ", zh: "库" },
    description: {
      ko: "에이전트에게 부여할 스킬·규칙·메모리·훅과 산출물·템플릿·성과 정보를 한곳에서 관리합니다.",
      en: "Manage skills, rules, memory, hooks, deliverables, templates, and performance data all in one place.",
      ja: "スキル・ルール・メモリ・フック・成果物・テンプレート・実績情報をまとめて管理します。",
      zh: "在一处管理技能、规则、记忆、钩子、产出物、模板与绩效数据。",
    },
    tips: [
      { ko: "【스킬】에이전트에게 코드 리뷰·개발·분석 등 스킬 추가 및 학습(Learn) 가능", en: "【Skills】Add or learn skills (code review, development, analysis, etc.) for agents", ja: "【スキル】コードレビュー・開発・分析などのスキルをエージェントに追加・学習", zh: "【技能】为代理添加或学习代码审查、开发、分析等技能" },
      { ko: "【규칙】글로벌·부서·에이전트별 행동 지침 설정 — 에이전트 실행 시 프롬프트에 자동 주입", en: "【Rules】Set behavior instructions globally, per dept, or per agent — auto-injected at runtime", ja: "【ルール】グローバル・部門・エージェントごとに行動指針を設定 — 実行時に自動注入", zh: "【规则】按全局、部门或代理设置行为指导——运行时自动注入" },
      { ko: "【메모리】에이전트가 참조할 키-값 정보 저장 (범위별 관리)", en: "【Memory】Store key-value info agents can reference, scoped by global / dept / agent", ja: "【メモリ】エージェントが参照するキー・値情報を保存（範囲別管理）", zh: "【记忆】存储代理可引用的键值信息，按全局/部门/代理分范围管理" },
      { ko: "【훅】태스크 시작·완료 등 이벤트에 URL 호출 등 자동 동작 등록", en: "【Hooks】Register automatic actions (URL calls, etc.) triggered by task start, completion, etc.", ja: "【フック】タスク開始・完了などのイベントにURL呼び出しなどの自動動作を登録", zh: "【钩子】为任务开始、完成等事件注册自动动作（如 URL 调用）" },
      { ko: "【산출물】완료된 태스크의 결과물·파일 확인 및 ZIP 다운로드", en: "【Deliverables】View results and files from completed tasks, download as ZIP", ja: "【成果物】完了タスクの結果・ファイルを確認、ZIP一括ダウンロード", zh: "【产出物】查看已完成任务的结果与文件，支持 ZIP 批量下载" },
      { ko: "【템플릿】프로젝트·태스크 재사용 틀 저장 및 관리 (빌트인 + 커스텀)", en: "【Templates】Save and manage reusable project/task templates (built-in + custom)", ja: "【テンプレート】プロジェクト・タスクの再利用テンプレートを保存・管理（組み込み＋カスタム）", zh: "【模板】保存并管理可复用的项目/任务模板（内置 + 自定义）" },
      { ko: "【성과】에이전트별 완료 태스크 수·소요 시간·성공률 등 통계 확인", en: "【Performance】View stats per agent: tasks completed, time spent, success rate, etc.", ja: "【実績】エージェントごとの完了タスク数・所要時間・成功率などの統計を確認", zh: "【绩效】查看每个代理的完成任务数、耗时、成功率等统计数据" },
    ],
  },
};

/** 프로젝트 없을 때 대시보드용 "시작하기" 가이드 (전체 흐름 안내) */
export const dashboardEmptyGuide: ScreenGuideEntry = {
  title: { ko: "시작하기 가이드", en: "Getting Started", ja: "はじめに", zh: "入门指南" },
  description: {
    ko: "프로젝트가 없을 때는 먼저 프로젝트를 만든 뒤, 업무 보드에서 태스크를 추가하고 에이전트를 실행하면 됩니다.",
    en: "When you have no project, create one first, then add tasks on the Task Board and run agents.",
    ja: "プロジェクトがない場合は、まずプロジェクトを作成し、タスクボードでタスクを追加してエージェントを実行します。",
    zh: "没有项目时，请先创建项目，然后在任务看板添加任务并运行代理。",
  },
  tips: [
    { ko: "아래에서 «첫 번째 프로젝트 만들기» 또는 «템플릿으로 시작»으로 프로젝트 생성", en: "Create a project with «Create first project» or «Start from template» below", ja: "下の「最初のプロジェクトを作成」または「テンプレートで開始」でプロジェクトを作成", zh: "使用下方「创建第一个项目」或「从模板开始」创建项目" },
    { ko: "상단 프로젝트 선택기에서 방금 만든 프로젝트 선택", en: "Select the new project in the header project selector", ja: "ヘッダーのプロジェクト選択で作成したプロジェクトを選択", zh: "在顶部项目选择器中选择刚创建的项目" },
    { ko: "좌측에서 «업무» → «업무 보드»로 이동해 태스크 추가 (N 키 또는 새 태스크 버튼)", en: "Go to Tasks → Task Board in the sidebar, add a task (N key or New Task button)", ja: "サイドバーで「タスク」→「タスクボード」に移動し、タスクを追加（Nキーまたは新規タスクボタン）", zh: "在侧栏进入「任务」→「任务看板」，添加任务（N 键或新建任务按钮）" },
    { ko: "태스크 카드에서 에이전트 배정 후 «실행»으로 CLI 에이전트 실행", en: "On the task card assign an agent, then click Run to execute the CLI agent", ja: "タスクカードでエージェントを割り当て、「実行」でCLIエージェントを実行", zh: "在任务卡片上分配代理，点击「运行」执行 CLI 代理" },
    { ko: "설정에서 API 키·OAuth·에이전트를 먼저 설정해 두면 편합니다", en: "Set up API keys, OAuth, and agents in Settings first for a smoother experience", ja: "設定でAPIキー・OAuth・エージェントを先に設定するとスムーズです", zh: "建议先在设置中配置 API 密钥、OAuth 与代理" },
  ],
};

export interface GetScreenGuideOptions {
  /** 대시보드일 때만 사용. false면 "시작하기" 가이드 반환 */
  hasProject?: boolean;
}

export function getScreenGuide(view: View, options?: GetScreenGuideOptions): ScreenGuideEntry {
  const hasProject = options?.hasProject !== false;
  if (view === "dashboard" && !hasProject) return dashboardEmptyGuide;
  return guides[view] ?? guides.dashboard;
}
