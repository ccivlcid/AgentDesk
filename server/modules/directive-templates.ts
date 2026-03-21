/**
 * Project Directive Templates
 *
 * 프로젝트 유형별 기본 디렉티브 마크다운 템플릿.
 * 유저가 프로젝트 생성 시 유형 선택하면 해당 템플릿이 자동 채워지고,
 * 자유롭게 수정 가능하다.
 */

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
    template: `## 작업 원칙
- 최소 동작 가능한 버전을 만든다
- 엣지케이스는 무시한다. 하드코딩 허용
- 외부 라이브러리를 적극 활용해 시간을 절약한다
- TODO 주석을 남기고 넘어가도 된다
- 리팩토링은 나중에 한다

## 태스크 분해
- 기능 단위가 아닌 사용자 시나리오 단위로 쪼갠다
- "가입 → 핵심 기능 사용 → 결과 확인" 하나의 flow = 하나의 태스크
- 한 태스크가 end-to-end로 동작하는 것을 우선한다

## 품질 기준
- 돌아가면 통과
- 테스트는 핵심 경로(happy path) 1개만
- 코드 스타일, 린트 경고는 무시해도 된다

## 리뷰
- 리뷰 1라운드 (또는 스킵 가능)
- 코드 품질이 아닌 "이것이 핵심 가설을 검증하는가?" 관점으로만 본다

## 우선순위
- 속도 ≫ 품질 ≫ 확장성
- 기술 부채를 허용한다`,
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
    template: `## 작업 원칙
- 프로덕션 수준의 코드를 작성한다
- 테스트, 에러 핸들링, 로깅을 필수로 포함한다
- 아키텍처 결정에는 이유를 주석이나 문서로 남긴다
- DRY 원칙을 따르되, 과도한 추상화는 피한다

## 태스크 분해
- 레이어별로 분리한다: DB 스키마 → API → 비즈니스 로직 → UI → 통합 테스트
- 병렬 가능한 작업은 동시에 진행한다
- API 계약을 먼저 확정한 후 프론트엔드를 착수한다

## 품질 기준
- 비즈니스 로직에 단위 테스트 필수
- API에 입력 검증과 에러 핸들링 필수
- DB 마이그레이션은 반드시 리뷰를 거친다

## 리뷰
- 3라운드: dev → qa → devsecops
- 각자의 관점에서 본다 (기능 정확성 / 안정성 / 보안)
- 머지 전 테스트 통과 필수

## 우선순위
- 품질 ≈ 확장성 > 속도
- 기술 부채를 최소화한다`,
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
    template: `## 작업 원칙
- 터치 UX를 최우선으로 고려한다
- 네트워크 불안정 상황에 대비한다 (오프라인 모드)
- 60fps 유지를 목표로 한다
- 플랫폼 가이드라인(HIG/Material)을 준수한다

## 태스크 분해
- 화면(Screen) 단위로 쪼갠다
- 네비게이션 구조를 먼저 잡고, 화면별로 구현한 뒤 통합한다
- 공통 컴포넌트(버튼, 입력, 카드)를 먼저 만든다

## 품질 기준
- 모든 터치 타겟 최소 44pt
- 리스트는 가상화(FlatList/FlashList) 기본
- 상태 관리: 로컬 캐시 + 서버 동기화 패턴
- 앱 시작 시간 3초 이내

## 리뷰
- design 에이전트가 모든 UI 태스크에 참여
- "시각적으로 맞는가 + 터치 영역 충분한가" 관점
- 성능 프로파일링 리뷰 (스크롤, 앱 시작)

## 우선순위
- UX > 성능 > 기능 수
- 적은 기능이라도 매끄럽게`,
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
    template: `## 작업 원칙
- 스키마 퍼스트: OpenAPI 또는 GraphQL 스키마를 먼저 정의한 후 구현한다
- 모든 응답에 일관된 에러 포맷을 사용한다
- 인증과 인가를 모든 라우트에 적용한다
- Rate limiting을 고려한다

## 태스크 분해
- API 스키마 정의 → 미들웨어/인증 → 각 엔드포인트 구현 → 통합 테스트 → 부하 테스트
- 스키마 확정 전 구현 시작을 금지한다

## 품질 기준
- 모든 엔드포인트에 입력 검증
- 에러 응답은 일관된 구조 (status, code, message)
- API 계약 테스트(contract test) 통과 필수
- SQL injection, XSS 등 OWASP Top 10 점검

## 리뷰
- devsecops가 모든 라우트를 리뷰한다
- "인증 누락은 없는가? 인젝션 가능성은?" 관점
- 스키마 변경 시 하위 호환성 확인

## 우선순위
- 보안 ≫ 안정성 > 성능 > 속도`,
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
    template: `## 작업 원칙
- 컴포넌트 기반으로 설계한다
- 접근성(a11y)을 기본으로 고려한다
- 반응형 레이아웃을 지원한다
- 디자인 시스템/토큰이 있다면 반드시 따른다

## 태스크 분해
- 디자인 토큰/공통 컴포넌트 → 페이지 레이아웃 → 개별 기능 → 인터랙션/애니메이션
- 상태 관리 구조를 먼저 잡는다

## 품질 기준
- 시맨틱 HTML 사용
- 키보드 네비게이션 지원
- Lighthouse 접근성 점수 90+
- 주요 브라우저(Chrome, Firefox, Safari) 호환

## 리뷰
- design 에이전트가 시각적 일관성 리뷰
- "디자인 시스템을 따르는가? 접근성은?" 관점
- 반응형 레이아웃 크로스 브라우저 확인

## 우선순위
- UX ≈ 접근성 > 성능 > 기능 수`,
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
    template: `## 작업 원칙
- 재현 가능성이 최우선이다
- 모든 실험에 파라미터와 결과를 기록한다
- 랜덤 시드를 고정한다
- 노트북보다 스크립트를 우선한다
- 데이터 전처리는 멱등성을 보장한다

## 태스크 분해
- 데이터 수집/전처리 → 베이스라인 모델 → 실험 루프 → 평가 → 서빙/배포
- 파이프라인 단계별로 독립 실행 가능하게 구성한다

## 품질 기준
- 데이터 품질 검증 후 모델 학습 착수
- 평가 지표가 베이스라인 이상일 때만 배포 진행
- 실험 로그: 하이퍼파라미터, 데이터 버전, 결과 메트릭 필수

## 리뷰
- 코드 리뷰보다 실험 설계 리뷰가 핵심
- "이 실험 설계가 가설을 검증하는가?" 관점
- 데이터 누수(data leakage) 점검

## 우선순위
- 재현성 > 정확도 > 속도
- 블랙박스 금지, 설명 가능해야 한다`,
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
    template: `## 작업 원칙
- 공개 API 표면적을 최소화한다
- 모든 public 함수에 JSDoc/docstring을 작성한다
- README, CHANGELOG, 사용 예제를 필수로 포함한다
- 시맨틱 버저닝을 따른다

## 태스크 분해
- API 설계 → 핵심 구현 → 테스트(커버리지 90%+) → 문서화 → 배포 설정
- 문서 없는 기능은 완료로 간주하지 않는다

## 품질 기준
- 테스트 커버리지 90% 이상
- 모든 exported 함수에 예제 코드 포함
- 타입 정의 정확성 (TypeScript d.ts 또는 py.typed)
- 브레이킹 체인지 시 마이그레이션 가이드 필수

## 리뷰
- "이걸 처음 보는 외부 개발자가 이해할 수 있는가?" 관점
- public API 변경 시 반드시 전원 리뷰
- 브레이킹 체인지는 별도 승인

## 우선순위
- DX(개발자 경험) > 기능 수 > 성능`,
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
    template: `## 작업 원칙
- 멱등성을 필수로 보장한다
- 실패 시 롤백 가능해야 한다
- 모든 단계에 로깅과 알림을 포함한다
- dry-run 모드를 기본 제공한다

## 태스크 분해
- 각 스크립트/파이프라인 스텝이 독립적으로 실행·실패 가능하게 구성
- 인프라 변경과 애플리케이션 변경을 분리한다

## 품질 기준
- dry-run 테스트 통과 필수
- 프로덕션 적용 전 스테이징 검증
- 실패 시 알림(Slack, 이메일 등) 동작 확인
- 시크릿은 환경 변수 또는 시크릿 매니저로만 관리

## 리뷰
- "이게 새벽 3시에 실패하면 어떻게 되는가?" 관점
- 에러 핸들링과 알림 중심 리뷰
- 롤백 시나리오 검증

## 우선순위
- 신뢰성 ≫ 성능 > 편의성`,
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
    template: `## 작업 원칙
- 기존 시스템 호환성을 최우선으로 한다
- 변경 범위를 최소화한다
- 점진적 마이그레이션 전략을 따른다
- 기존 코드를 깨뜨리지 않는다

## 태스크 분해
- 영향 분석 → 변경 계획 → 구현 → 회귀 테스트 → 롤백 계획
- 매 태스크마다 이 사이클을 따른다
- 한 번에 큰 변경보다 작은 변경을 여러 번 한다

## 품질 기준
- 영향 분석 문서 없이 구현 착수 금지
- 회귀 테스트 전체 통과 필수
- 하위 호환성 보장
- 변경 로그 상세 기록

## 리뷰
- 가장 깐깐한 리뷰. 전 부서 참여
- "이 변경이 다른 팀의 코드를 깨뜨릴 수 있는가?" 관점
- 롤백 계획 존재 여부 확인

## 우선순위
- 안정성 ≫ 보안 > 기능 > 속도
- 새 기능보다 기존 기능 보호`,
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
    template: `## 작업 원칙
- 결론보다 과정을 기록한다
- 실패한 접근법도 문서화한다
- 코드 품질보다 발견(finding)의 질이 중요하다
- 빠르게 시도하고, 배운 것을 기록한다

## 태스크 분해
- 가설 정의 → 실험 → 결과 기록 → 다음 가설
- 선형 진행이 아닌 반복 루프
- 각 실험은 독립적으로 실행 가능해야 한다

## 품질 기준
- "이 실험으로 뭘 알게 됐는가?"에 답할 수 없으면 다음 단계 금지
- 결과 문서에 시도한 것, 결과, 배운 것을 기록
- 코드 품질은 읽을 수 있는 수준이면 충분

## 리뷰
- 코드 리뷰 대신 결과 리뷰
- "이 발견이 의미 있는가? 다음 가설은 뭔가?" 관점
- planning 에이전트가 방향성 판단

## 우선순위
- 학습 > 속도 > 품질
- 빠르게 검증하되, 배운 것은 반드시 기록`,
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
