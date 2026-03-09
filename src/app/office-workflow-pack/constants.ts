import type { SeedProfile, WorkflowPackKey } from "./types";
import { DEV_THEMES } from "./themes";
import { DEPARTMENT_PERSON_NAME_POOL } from "./name-pool";
import { PACK_PRESETS } from "./pack-presets";

export const OFFICE_SEED_SPRITE_POOL = Array.from({ length: 13 }, (_, idx) => idx + 1);

export { DEV_THEMES };
export { DEPARTMENT_PERSON_NAME_POOL };
export { PACK_PRESETS };

export const PACK_SEED_PROFILE: Partial<Record<WorkflowPackKey, SeedProfile>> = {
  report: {
    nameOffset: 0,
    tone: {
      ko: "근거와 문서 완성도를 최우선으로 판단합니다.",
      en: "Prioritizes evidence quality and document completeness.",
      ja: "根拠の確かさと文書の完成度を最優先します。",
      zh: "以证据质量与文档完整度为最高优先级。",
    },
  },
  web_research_report: {
    nameOffset: 1,
    tone: {
      ko: "출처 신뢰도와 사실 검증을 중심으로 움직입니다.",
      en: "Focused on source credibility and fact verification.",
      ja: "情報源の信頼性と事実検証を中心に進めます。",
      zh: "聚焦来源可信度与事实核验。",
    },
  },
  novel: {
    nameOffset: 2,
    tone: {
      ko: "서사 몰입도와 캐릭터 일관성을 가장 중시합니다.",
      en: "Values narrative immersion and character consistency the most.",
      ja: "物語への没入感とキャラクターの一貫性を最重視します。",
      zh: "最重视叙事沉浸感与角色一致性。",
    },
  },
  video_preprod: {
    nameOffset: 3,
    tone: {
      ko: "콘티, 샷 구성, 제작 효율을 우선합니다.",
      en: "Prioritizes storyboard quality, shot composition, and production efficiency.",
      ja: "コンテ品質、ショット構成、制作効率を優先します。",
      zh: "优先保证分镜质量、镜头构成与制作效率。",
    },
  },
  roleplay: {
    nameOffset: 4,
    tone: {
      ko: "캐릭터 몰입감과 대화 리듬을 우선합니다.",
      en: "Prioritizes character immersion and dialogue rhythm.",
      ja: "キャラクター没入感と会話のテンポを優先します。",
      zh: "优先保障角色沉浸感与对话节奏。",
    },
  },
  asset_management: {
    nameOffset: 5,
    tone: {
      ko: "리스크 대비 수익률과 규제 준수를 최우선으로 판단합니다.",
      en: "Prioritizes risk-adjusted returns and regulatory compliance.",
      ja: "リスク調整済みリターンと規制遵守を最優先します。",
      zh: "以风险调整回报和监管合规为最高优先级。",
    },
  },
};
