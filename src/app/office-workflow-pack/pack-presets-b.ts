import type { PackPreset, WorkflowPackKey } from "./types";

/** Second part of PACK_PRESETS: video_preprod, roleplay, asset_management. */
export const PACK_PRESETS_B: Partial<Record<WorkflowPackKey, PackPreset>> = {
  video_preprod: {
    key: "video_preprod",
    slug: "VID",
    label: {
      ko: "영상 프리프로덕션",
      en: "Video Pre-production",
      ja: "映像プリプロ",
      zh: "视频前期策划",
    },
    summary: {
      ko: "콘티/샷리스트/편집 노트 중심",
      en: "Storyboard and shot-list focused setup",
      ja: "コンテ・ショットリスト中心",
      zh: "分镜与镜头清单导向",
    },
    roomThemes: {
      ceoOffice: { floor1: 0x1f1f25, floor2: 0x17171c, wall: 0x343748, accent: 0xd18d35 },
      planning: { floor1: 0x25212b, floor2: 0x1c1923, wall: 0x44405b, accent: 0xbc7d47 },
      dev: { floor1: 0x1d2631, floor2: 0x17202a, wall: 0x334961, accent: 0x4c8fca },
      design: { floor1: 0x2a2230, floor2: 0x211a27, wall: 0x544063, accent: 0xc274b7 },
      qa: { floor1: 0x2a2425, floor2: 0x211d1f, wall: 0x5a494b, accent: 0xb98862 },
      devsecops: { floor1: 0x1f242c, floor2: 0x182028, wall: 0x3b4d62, accent: 0x6f8fb0 },
      operations: { floor1: 0x1f2a25, floor2: 0x18211d, wall: 0x3e5d50, accent: 0x62a789 },
      breakRoom: { floor1: 0x2a2622, floor2: 0x211d1a, wall: 0x564c43, accent: 0xbd8a49 },
    },
    departments: {
      planning: {
        name: { ko: "프리프로덕션팀", en: "Pre-production", ja: "プリプロ班", zh: "前期策划组" },
        icon: "🎬",
        agentPrefix: { ko: "프로듀서", en: "Producer", ja: "プロデューサ", zh: "制片" },
        avatarPool: ["🎬", "📽️", "🧭"],
      },
      dev: {
        name: { ko: "씬 엔진팀", en: "Scene Engine", ja: "シーン設計", zh: "场景引擎组" },
        icon: "🎞️",
        agentPrefix: { ko: "씬 디렉터", en: "Scene Director", ja: "シーン監督", zh: "场景导演" },
        avatarPool: ["🎞️", "🧱", "🔧"],
      },
      design: {
        name: { ko: "아트/촬영팀", en: "Art & Camera", ja: "アート撮影", zh: "美术摄影组" },
        icon: "📷",
        agentPrefix: { ko: "촬영 디자이너", en: "Camera Designer", ja: "撮影デザイナ", zh: "摄影设计师" },
        avatarPool: ["📷", "🎨", "💡"],
      },
      qa: {
        name: { ko: "컷 검수팀", en: "Cut QA", ja: "カット検証", zh: "镜头审校组" },
        icon: "🧪",
        agentPrefix: { ko: "컷 검수관", en: "Cut Reviewer", ja: "カットレビュア", zh: "镜头审校员" },
        avatarPool: ["🧪", "✅", "📌"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "operations", "dev", "design", "planning", "qa", "operations"],
    },
  },
  roleplay: {
    key: "roleplay",
    slug: "RPG",
    label: {
      ko: "롤플레이 스튜디오",
      en: "Roleplay Studio",
      ja: "ロールプレイスタジオ",
      zh: "角色扮演工作室",
    },
    summary: {
      ko: "캐릭터 연기와 대사 몰입 중심",
      en: "Character role and dialogue immersion",
      ja: "キャラ演技と会話没入",
      zh: "角色演绎与对话沉浸",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xf3e7dc, floor2: 0xebdbc9, wall: 0x7d5c4d, accent: 0xbe6f53 },
      planning: { floor1: 0xefe6f6, floor2: 0xe5dbef, wall: 0x6a5d91, accent: 0x8a74c0 },
      dev: { floor1: 0xe6edf8, floor2: 0xdce6f4, wall: 0x576d91, accent: 0x6f8fd1 },
      design: { floor1: 0xf6e3f2, floor2: 0xefd8e9, wall: 0x835b80, accent: 0xc36eb4 },
      qa: { floor1: 0xf5efe6, floor2: 0xeee3d8, wall: 0x7f6d5c, accent: 0xb7956d },
      devsecops: { floor1: 0xe8ecf5, floor2: 0xdde4ef, wall: 0x566479, accent: 0x6d86ab },
      operations: { floor1: 0xe9f2ea, floor2: 0xdfeadf, wall: 0x5b7660, accent: 0x6fae7e },
      breakRoom: { floor1: 0xf4e8d5, floor2: 0xecdcc3, wall: 0x8a7458, accent: 0xc59a5e },
    },
    departments: {
      planning: {
        name: { ko: "캐릭터기획실", en: "Character Planning", ja: "キャラ企画室", zh: "角色企划室" },
        icon: "🎭",
        agentPrefix: { ko: "캐릭터 플래너", en: "Character Planner", ja: "キャラ企画", zh: "角色策划" },
        avatarPool: ["🎭", "🧠", "📜"],
      },
      dev: {
        name: { ko: "대사엔진팀", en: "Dialogue Engine", ja: "会話エンジン", zh: "对话引擎组" },
        icon: "🗣️",
        agentPrefix: { ko: "대사 연출가", en: "Dialogue Director", ja: "台詞演出", zh: "台词导演" },
        avatarPool: ["🗣️", "💬", "🎙️"],
      },
      design: {
        name: { ko: "연출아트팀", en: "Stage Art", ja: "演出アート", zh: "演出美术组" },
        icon: "🎨",
        agentPrefix: { ko: "연출 디자이너", en: "Stage Designer", ja: "演出デザイナ", zh: "演出设计师" },
        avatarPool: ["🎨", "✨", "🎬"],
      },
      qa: {
        name: { ko: "캐릭터검수팀", en: "Character QA", ja: "キャラ検証", zh: "角色审校组" },
        icon: "🔐",
        agentPrefix: { ko: "설정 검수관", en: "Lore Reviewer", ja: "設定レビュア", zh: "设定审校员" },
        avatarPool: ["🔐", "✅", "🧪"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "dev", "design", "qa", "planning", "operations", "design"],
    },
  },
  asset_management: {
    key: "asset_management",
    slug: "AMC",
    label: {
      ko: "자산운용 오피스",
      en: "Asset Management Office",
      ja: "資産運用オフィス",
      zh: "资产管理办公室",
    },
    summary: {
      ko: "투자 전략 및 포트폴리오 운용 중심",
      en: "Investment strategy and portfolio management",
      ja: "投資戦略とポートフォリオ運用中心",
      zh: "投资策略与组合管理为核心",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xe8dcc8, floor2: 0xe0d1b8, wall: 0x7a6844, accent: 0xc9a84c },
      planning: { floor1: 0xdce5ef, floor2: 0xd2dce8, wall: 0x4a5f7a, accent: 0x2e5090 },
      dev: { floor1: 0xdde8e6, floor2: 0xd3e0dd, wall: 0x4a6b65, accent: 0x1a7a5c },
      design: { floor1: 0xe4e1ee, floor2: 0xdad6e7, wall: 0x5c5680, accent: 0x6b5ba8 },
      qa: { floor1: 0xeee0d8, floor2: 0xe6d4c8, wall: 0x7a5540, accent: 0xb05030 },
      devsecops: { floor1: 0xe0e4ea, floor2: 0xd5dbe3, wall: 0x4e5a6e, accent: 0x3a506b },
      operations: { floor1: 0xdceae0, floor2: 0xd2e2d6, wall: 0x4a6e58, accent: 0x2a7850 },
      breakRoom: { floor1: 0xf0e8d8, floor2: 0xe8ddc8, wall: 0x8a7a5a, accent: 0xd4a84a },
    },
    departments: {
      planning: {
        name: { ko: "투자전략실", en: "Investment Strategy", ja: "投資戦略室", zh: "投资战略室" },
        icon: "📈",
        agentPrefix: { ko: "투자 전략가", en: "Investment Strategist", ja: "投資ストラテジスト", zh: "投资策略师" },
        avatarPool: ["📈", "🧭", "💡"],
      },
      dev: {
        name: { ko: "퀀트분석팀", en: "Quant Analysis", ja: "クオンツ分析", zh: "量化分析组" },
        icon: "🔢",
        agentPrefix: { ko: "퀀트 애널리스트", en: "Quant Analyst", ja: "クオンツアナリスト", zh: "量化分析师" },
        avatarPool: ["🔢", "📊", "🧠"],
      },
      design: {
        name: { ko: "리서치팀", en: "Investment Research", ja: "投資リサーチ", zh: "投研组" },
        icon: "📋",
        agentPrefix: { ko: "리서치 애널리스트", en: "Research Analyst", ja: "リサーチアナリスト", zh: "研究分析师" },
        avatarPool: ["📋", "🔍", "📝"],
      },
      qa: {
        name: { ko: "리스크관리팀", en: "Risk Management", ja: "リスク管理", zh: "风控组" },
        icon: "⚠️",
        agentPrefix: { ko: "리스크 매니저", en: "Risk Manager", ja: "リスクマネージャー", zh: "风控经理" },
        avatarPool: ["⚠️", "🛡️", "📉"],
      },
      devsecops: {
        name: { ko: "컴플라이언스팀", en: "Compliance", ja: "コンプライアンス", zh: "合规组" },
        icon: "⚖️",
        agentPrefix: { ko: "컴플라이언스 담당", en: "Compliance Officer", ja: "コンプライアンス担当", zh: "合规专员" },
        avatarPool: ["⚖️", "📜", "🔒"],
      },
      operations: {
        name: { ko: "펀드운용팀", en: "Fund Operations", ja: "ファンド運用", zh: "基金运营组" },
        icon: "💰",
        agentPrefix: { ko: "펀드 매니저", en: "Fund Manager", ja: "ファンドマネージャー", zh: "基金经理" },
        avatarPool: ["💰", "🏦", "⚙️"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "dev", "qa", "design", "planning", "dev", "operations", "devsecops"],
    },
  },
};
