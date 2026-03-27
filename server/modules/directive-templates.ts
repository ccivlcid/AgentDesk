/**
 * Project Directive Templates
 *
 * 프로젝트 유형별 기본 디렉티브 마크다운 템플릿.
 * 유저가 프로젝트 생성 시 유형 선택하면 해당 템플릿이 자동 채워지고,
 * 자유롭게 수정 가능하다.
 *
 * 템플릿 본문은 prompts/directives/<slug>.md 파일에서 로드한다.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "node:url";

export interface DirectiveTemplate {
  slug: string;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description: string;
  description_ko: string;
  pack_key: string;
  departments: string[];
  template: string;
}

/* ------------------------------------------------------------------ */
/*  Load .md template files at module init                             */
/* ------------------------------------------------------------------ */

const DIRECTIVES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../prompts/directives");

function loadTemplate(slug: string): string {
  try {
    return readFileSync(join(DIRECTIVES_DIR, `${slug}.md`), "utf-8").trim();
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Template metadata + loaded content                                 */
/* ------------------------------------------------------------------ */

export const DIRECTIVE_TEMPLATES: DirectiveTemplate[] = [
  {
    slug: "mvp",
    name: "MVP / Rapid Validation",
    name_ko: "MVP / 빠른 검증",
    icon: "🚀",
    color: "#f97316",
    description: "Build fast, validate hypotheses, iterate",
    description_ko: "최소 기능, 빠른 배포, 가설 검증 후 피벗",
    pack_key: "development",
    departments: ["dev", "planning"],
    template: loadTemplate("mvp"),
  },
  {
    slug: "fullstack",
    name: "Full-Stack Product",
    name_ko: "풀스택 프로덕트",
    icon: "🏗️",
    color: "#3b82f6",
    description: "Production-grade full-stack application",
    description_ko: "프론트 + 백 + DB + 인증, 프로덕션 수준 코드",
    pack_key: "development",
    departments: ["dev", "qa", "design", "operations", "devsecops", "planning"],
    template: loadTemplate("fullstack"),
  },
  {
    slug: "mobile",
    name: "Mobile App",
    name_ko: "모바일 앱",
    icon: "📱",
    color: "#a855f7",
    description: "iOS/Android/React Native/Flutter app",
    description_ko: "터치 UX 중심, 오프라인 대비, 플랫폼 가이드라인 준수",
    pack_key: "development",
    departments: ["dev", "design", "qa"],
    template: loadTemplate("mobile"),
  },
  {
    slug: "ai-ml",
    name: "AI / ML Pipeline",
    name_ko: "AI / ML 파이프라인",
    icon: "🤖",
    color: "#8b5cf6",
    description: "Data processing, model training, inference",
    description_ko: "재현 가능성 최우선, 실험 추적, 데이터 버전 관리",
    pack_key: "development",
    departments: ["dev", "planning", "qa"],
    template: loadTemplate("ai-ml"),
  },
  {
    slug: "research",
    name: "Research / PoC",
    name_ko: "리서치 / PoC",
    icon: "🔬",
    color: "#eab308",
    description: "Experiments, prototypes, proof of concept",
    description_ko: "결론보다 과정 기록, 실패도 문서화, 빠른 실험 루프",
    pack_key: "web_research_report",
    departments: ["planning", "dev"],
    template: loadTemplate("research"),
  },
  {
    slug: "custom",
    name: "Custom",
    name_ko: "커스텀",
    icon: "custom",
    color: "#6b7280",
    description: "Custom project type",
    description_ko: "자유 형식 프로젝트",
    pack_key: "development",
    departments: ["dev", "planning"],
    template: loadTemplate("custom"),
  },
];



/* ------------------------------------------------------------------ */
/*  Directive-driven execution parameters                              */
/* ------------------------------------------------------------------ */

/** Per-project review round limits based on directive type */
const DIRECTIVE_REVIEW_ROUNDS: Record<string, number> = {
  mvp: 1,
  research: 1,
  mobile: 2,
  "ai-ml": 2,
  custom: 2,
  fullstack: 3,
};

/**
 * Returns the max review rounds for a given directive type slug.
 * Falls back to the global default if slug is unknown or null.
 */
export function getDirectiveReviewMaxRounds(slug: string | null | undefined, globalDefault: number): number {
  if (!slug) return globalDefault;
  return DIRECTIVE_REVIEW_ROUNDS[slug] ?? globalDefault;
}

/** Per-project task decomposition hints injected into subtask seeding prompts */
const DIRECTIVE_DECOMPOSITION_HINTS: Record<string, string> = {
  mvp: "사용자 시나리오 단위(end-to-end flow)로 태스크를 쪼개라. 한 태스크가 독립적으로 동작하는 것을 우선한다.",
  fullstack: "레이어별(DB → API → 비즈니스 로직 → UI → 통합 테스트)로 분리하되, 병렬 가능한 작업은 동시 진행한다.",
  mobile: "화면(Screen) 단위로 쪼개라. 공통 컴포넌트를 먼저, 그 다음 개별 화면, 마지막으로 네비게이션 통합.",
  "ai-ml": "데이터 전처리 → 베이스라인 → 실험 → 평가 → 서빙 파이프라인 단계별로 독립 실행 가능하게 구성한다.",
  research: "가설 정의 → 실험 → 결과 기록 → 다음 가설. 선형이 아닌 반복 루프로 구성한다.",
  custom: "목표 기반으로 자유롭게 태스크를 구성한다. 특별한 제약 없이 유연하게 분리한다.",
};

/**
 * Returns a decomposition hint string for the given directive type slug.
 * Returns null if slug is unknown or null.
 */
export function getDirectiveDecompositionHint(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return DIRECTIVE_DECOMPOSITION_HINTS[slug] ?? null;
}
