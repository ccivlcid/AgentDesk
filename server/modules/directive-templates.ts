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
    slug: "api-backend",
    name: "API / Backend",
    name_ko: "API / 백엔드",
    icon: "🔌",
    color: "#10b981",
    description: "REST/GraphQL API, microservices",
    description_ko: "스키마 퍼스트, 보안 우선, 계약 기반 개발",
    pack_key: "development",
    departments: ["dev", "qa", "devsecops"],
    template: loadTemplate("api-backend"),
  },
  {
    slug: "frontend",
    name: "Frontend",
    name_ko: "프론트엔드",
    icon: "🎨",
    color: "#ec4899",
    description: "SPA, static sites, component libraries",
    description_ko: "컴포넌트 기반, 접근성, 반응형 레이아웃",
    pack_key: "development",
    departments: ["dev", "design", "qa"],
    template: loadTemplate("frontend"),
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
    slug: "open-source",
    name: "Open-Source Library",
    name_ko: "오픈소스 라이브러리",
    icon: "📦",
    color: "#06b6d4",
    description: "SDK, packages, public APIs",
    description_ko: "API 표면적 최소화, 문서 필수, DX 최우선",
    pack_key: "development",
    departments: ["dev", "qa", "planning"],
    template: loadTemplate("open-source"),
  },
  {
    slug: "devops",
    name: "Automation / DevOps",
    name_ko: "자동화 / DevOps",
    icon: "⚙️",
    color: "#64748b",
    description: "CI/CD, scripts, infrastructure",
    description_ko: "멱등성 필수, 실패 시 롤백, 로깅과 알림",
    pack_key: "development",
    departments: ["dev", "operations", "devsecops"],
    template: loadTemplate("devops"),
  },
  {
    slug: "enterprise",
    name: "Enterprise / Legacy",
    name_ko: "엔터프라이즈 / 레거시",
    icon: "🏢",
    color: "#78716c",
    description: "Large systems, compliance, migration",
    description_ko: "기존 시스템 호환, 변경 최소화, 점진적 마이그레이션",
    pack_key: "development",
    departments: ["dev", "qa", "planning", "operations", "devsecops"],
    template: loadTemplate("enterprise"),
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
];

/** slug → template lookup */
export function getDirectiveTemplate(slug: string): DirectiveTemplate | undefined {
  return DIRECTIVE_TEMPLATES.find((t) => t.slug === slug);
}

/* ------------------------------------------------------------------ */
/*  Directive-driven execution parameters                              */
/* ------------------------------------------------------------------ */

/** Per-project review round limits based on directive type */
const DIRECTIVE_REVIEW_ROUNDS: Record<string, number> = {
  mvp: 1,
  research: 1,
  frontend: 2,
  mobile: 2,
  "api-backend": 2,
  "ai-ml": 2,
  "open-source": 2,
  devops: 2,
  fullstack: 3,
  enterprise: 3,
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
  "api-backend": "API 스키마 정의 → 미들웨어 → 엔드포인트 구현 → 통합 테스트 순서를 엄격히 따르라.",
  frontend: "디자인 토큰/공통 컴포넌트 → 페이지 레이아웃 → 개별 기능 → 인터랙션 순서로 분리한다.",
  "ai-ml": "데이터 전처리 → 베이스라인 → 실험 → 평가 → 서빙 파이프라인 단계별로 독립 실행 가능하게 구성한다.",
  "open-source": "API 설계 → 핵심 구현 → 테스트 → 문서화 → 배포 설정. 문서 없는 기능은 완료가 아니다.",
  devops: "각 스크립트/파이프라인 스텝이 독립적으로 실행·실패 가능하게 구성한다.",
  enterprise: "영향 분석 → 변경 계획 → 구현 → 회귀 테스트 → 롤백 계획. 매 태스크마다 이 사이클을 따른다.",
  research: "가설 정의 → 실험 → 결과 기록 → 다음 가설. 선형이 아닌 반복 루프로 구성한다.",
};

/**
 * Returns a decomposition hint string for the given directive type slug.
 * Returns null if slug is unknown or null.
 */
export function getDirectiveDecompositionHint(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return DIRECTIVE_DECOMPOSITION_HINTS[slug] ?? null;
}
