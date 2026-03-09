import type { PackPreset, WorkflowPackKey } from "./types";
import { DEV_THEMES } from "./themes";

/** First part of PACK_PRESETS: development, report, web_research_report, novel. */
export const PACK_PRESETS_A: Partial<Record<WorkflowPackKey, PackPreset>> = {
  development: {
    key: "development",
    slug: "DEV",
    label: {
      ko: "개발 오피스",
      en: "Development Office",
      ja: "開発オフィス",
      zh: "开发办公室",
    },
    summary: {
      ko: "기본 개발 조직 구조",
      en: "Default engineering organization",
      ja: "標準の開発組織",
      zh: "默认开发组织",
    },
    roomThemes: DEV_THEMES,
    departments: {},
  },
  report: {
    key: "report",
    slug: "RPT",
    label: {
      ko: "보고서 오피스",
      en: "Report Office",
      ja: "レポートオフィス",
      zh: "报告办公室",
    },
    summary: {
      ko: "리서치/문서화 중심 팀 구성",
      en: "Research and documentation focused crew",
      ja: "調査・文書化中心の構成",
      zh: "以调研与文档为核心的团队",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xf0e8dc, floor2: 0xebdfce, wall: 0x8f7a63, accent: 0xbd8b57 },
      planning: { floor1: 0xe6ecf6, floor2: 0xdde5f1, wall: 0x5f7394, accent: 0x7090bd },
      dev: { floor1: 0xe7f0ed, floor2: 0xddeae5, wall: 0x5c7d73, accent: 0x6ea495 },
      design: { floor1: 0xf4ecf4, floor2: 0xece2ed, wall: 0x82658a, accent: 0xa076ab },
      qa: { floor1: 0xf8efe9, floor2: 0xf0e3d8, wall: 0x8c6c5f, accent: 0xb67b63 },
      devsecops: { floor1: 0xe8edf0, floor2: 0xdee5ea, wall: 0x596778, accent: 0x6f85a0 },
      operations: { floor1: 0xe9f1e7, floor2: 0xe0ebdc, wall: 0x5f7d5b, accent: 0x76a06b },
      breakRoom: { floor1: 0xf5efe4, floor2: 0xede4d3, wall: 0x8f866d, accent: 0xc2a26b },
    },
    departments: {
      planning: {
        name: { ko: "편집기획실", en: "Editorial Planning", ja: "編集企画室", zh: "编辑企划室" },
        icon: "📚",
        agentPrefix: { ko: "편집 PM", en: "Editorial PM", ja: "編集PM", zh: "编辑PM" },
        avatarPool: ["📚", "🗂️", "🧭"],
      },
      dev: {
        name: { ko: "리서치엔진팀", en: "Research Engine", ja: "リサーチエンジン", zh: "调研引擎组" },
        icon: "🧠",
        agentPrefix: { ko: "리서처", en: "Researcher", ja: "リサーチャー", zh: "研究员" },
        avatarPool: ["🧠", "📊", "📝"],
      },
      design: {
        name: { ko: "문서디자인팀", en: "Doc Design", ja: "ドキュメントデザイン", zh: "文档设计组" },
        icon: "🧾",
        agentPrefix: { ko: "문서 디자이너", en: "Doc Designer", ja: "資料デザイナー", zh: "文档设计师" },
        avatarPool: ["🧾", "🎨", "📐"],
      },
      qa: {
        name: { ko: "검수팀", en: "Review Desk", ja: "レビュー班", zh: "审校组" },
        icon: "🔎",
        agentPrefix: { ko: "검수관", en: "Reviewer", ja: "レビュア", zh: "审校员" },
        avatarPool: ["🔎", "✅", "🧪"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "planning", "dev", "qa", "design", "planning", "dev", "qa", "operations"],
    },
  },
  web_research_report: {
    key: "web_research_report",
    slug: "WEB",
    label: {
      ko: "웹 리서치 오피스",
      en: "Web Research Office",
      ja: "Web調査オフィス",
      zh: "网页调研办公室",
    },
    summary: {
      ko: "소스 수집과 근거 검증 중심",
      en: "Source collection and citation verification",
      ja: "情報源収集と根拠検証中心",
      zh: "以来源收集与证据校验为核心",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xddebf1, floor2: 0xd2e3eb, wall: 0x4e6f7f, accent: 0x3d90b5 },
      planning: { floor1: 0xe2eef6, floor2: 0xd8e7f1, wall: 0x55728d, accent: 0x5f95c6 },
      dev: { floor1: 0xe2f1ef, floor2: 0xd8ebe8, wall: 0x4d7a72, accent: 0x4fa69a },
      design: { floor1: 0xeceff7, floor2: 0xe2e8f2, wall: 0x606c88, accent: 0x748ec5 },
      qa: { floor1: 0xf0f3f7, floor2: 0xe6ecf2, wall: 0x5d6f80, accent: 0x7a93b0 },
      devsecops: { floor1: 0xe4edf5, floor2: 0xd9e4ef, wall: 0x4e617a, accent: 0x5f7fa5 },
      operations: { floor1: 0xe5f3ec, floor2: 0xdbeadf, wall: 0x52755d, accent: 0x5fa777 },
      breakRoom: { floor1: 0xe8f0f4, floor2: 0xdce8ef, wall: 0x5f7380, accent: 0x7ca0b9 },
    },
    departments: {
      planning: {
        name: { ko: "조사전략실", en: "Research Strategy", ja: "調査戦略室", zh: "调研战略室" },
        icon: "🧭",
        agentPrefix: { ko: "전략 분석가", en: "Strategy Analyst", ja: "戦略アナリスト", zh: "策略分析师" },
        avatarPool: ["🧭", "🗺️", "📌"],
      },
      dev: {
        name: { ko: "크롤링팀", en: "Crawler Team", ja: "クロール班", zh: "爬取组" },
        icon: "🕸️",
        agentPrefix: { ko: "수집 엔지니어", en: "Collection Engineer", ja: "収集エンジニア", zh: "采集工程师" },
        avatarPool: ["🕸️", "🔗", "🧠"],
      },
      qa: {
        name: { ko: "팩트체크팀", en: "Fact Check", ja: "ファクトチェック", zh: "事实核验组" },
        icon: "✅",
        agentPrefix: { ko: "검증관", en: "Verifier", ja: "検証官", zh: "核验员" },
        avatarPool: ["✅", "🔍", "📎"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "dev", "qa", "dev", "planning", "qa", "operations", "devsecops"],
    },
  },
  novel: {
    key: "novel",
    slug: "NOV",
    label: {
      ko: "소설 스튜디오",
      en: "Novel Studio",
      ja: "小説スタジオ",
      zh: "小说工作室",
    },
    summary: {
      ko: "세계관/캐릭터/서사 중심 구성",
      en: "Worldbuilding, character and narrative setup",
      ja: "世界観・キャラ・物語中心",
      zh: "世界观/角色/叙事导向",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xefe3d8, floor2: 0xe7d6c9, wall: 0x7c5d4b, accent: 0xb86b45 },
      planning: { floor1: 0xf2e7dc, floor2: 0xebddcf, wall: 0x7f624e, accent: 0xb97c4f },
      dev: { floor1: 0xe8e0f2, floor2: 0xdfd6eb, wall: 0x6e5a90, accent: 0x8d76bb },
      design: { floor1: 0xf6e3ea, floor2: 0xf0d8e1, wall: 0x885a6d, accent: 0xbc708f },
      qa: { floor1: 0xf3ece4, floor2: 0xece1d7, wall: 0x7f6b5a, accent: 0xa88468 },
      devsecops: { floor1: 0xe8e6ef, floor2: 0xddd9e8, wall: 0x5f5f7f, accent: 0x7b7ca8 },
      operations: { floor1: 0xe6efe8, floor2: 0xdce8e0, wall: 0x58735f, accent: 0x6b9a79 },
      breakRoom: { floor1: 0xf0e3cf, floor2: 0xe8d6bd, wall: 0x8a6f55, accent: 0xbc8b58 },
    },
    departments: {
      planning: {
        name: { ko: "세계관실", en: "Worldbuilding", ja: "世界観室", zh: "世界观组" },
        icon: "🌌",
        agentPrefix: { ko: "세계관 작가", en: "Lore Writer", ja: "設定作家", zh: "设定作者" },
        avatarPool: ["🌌", "📜", "🧭"],
      },
      dev: {
        name: { ko: "서사엔진팀", en: "Narrative Engine", ja: "物語エンジン", zh: "叙事引擎组" },
        icon: "✍️",
        agentPrefix: { ko: "서사 설계자", en: "Narrative Architect", ja: "物語設計者", zh: "叙事架构师" },
        avatarPool: ["✍️", "🖋️", "📘"],
      },
      design: {
        name: { ko: "캐릭터 아트팀", en: "Character Art", ja: "キャラアート", zh: "角色美术组" },
        icon: "🎭",
        agentPrefix: { ko: "캐릭터 디자이너", en: "Character Designer", ja: "キャラデザ", zh: "角色设计师" },
        avatarPool: ["🎭", "🧵", "🎨"],
      },
      qa: {
        name: { ko: "톤 검수팀", en: "Tone QA", ja: "トーン検証", zh: "语气审校组" },
        icon: "🪶",
        agentPrefix: { ko: "문체 검수관", en: "Style Reviewer", ja: "文体レビュア", zh: "文风审校员" },
        avatarPool: ["🪶", "📖", "✅"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "dev", "design", "planning", "qa", "design", "operations"],
    },
  },
};
