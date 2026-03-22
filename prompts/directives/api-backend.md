## 기술스택
- 언어/런타임: (예: Node.js, Python, Go, Java 등)
- 프레임워크: (예: Express, FastAPI, Gin, Spring Boot 등)
- DB: (예: PostgreSQL, MongoDB, Redis 등)
- API 스타일: (예: REST, GraphQL, gRPC 등)
- 인증: (예: JWT, OAuth2, API Key 등)
- 문서화: (예: OpenAPI/Swagger, GraphQL Playground 등)

## 목표
외부 클라이언트(웹, 모바일, 서드파티)가 **안전하고 예측 가능하게 사용**할 수 있는 API 서비스를 구축한다.
보안, 일관성, 문서화가 핵심이며, API는 한번 공개하면 바꾸기 어렵다는 점을 항상 의식한다.

## 작업 원칙
- **스키마 퍼스트(Schema-First)**: OpenAPI spec 또는 GraphQL 스키마를 먼저 정의한 후 구현한다. 구현하면서 스키마를 만들지 않는다.
- 모든 API 응답에 일관된 포맷을 사용한다: `{ ok: boolean, data?: T, error?: string, meta?: object }`.
- 인증(Authentication)과 인가(Authorization)를 모든 라우트에 적용한다. public 라우트는 명시적으로 `@public` 또는 주석으로 표시한다.
- Rate limiting과 request throttling을 초기 설계에 포함한다. 나중에 붙이면 구조가 꼬인다.
- 에러는 구조화된 코드로 반환한다: snake_case error code + 적절한 HTTP status. 예: `{ error: "invalid_email", message: "Email format is invalid" }`.
- DB 쿼리는 ORM이든 raw SQL이든 **파라미터 바인딩 필수**. 문자열 결합으로 쿼리를 만드는 것은 절대 금지.
- 모든 요청에 correlation ID(요청 추적 ID)를 부여하고, 모든 로그에 이 ID를 포함한다.
- 외부 API 호출에는 타임아웃(최소 5초, 최대 30초)과 재시도(최대 3회, exponential backoff)를 적용한다.
- 페이지네이션이 필요한 목록 API는 처음부터 cursor 또는 offset 기반 페이지네이션을 구현한다. 전체 목록을 한 번에 반환하지 않는다.

## 태스크 분해
- **순서를 엄격히 준수**한다:
  1. API 스키마 정의 (OpenAPI spec / GraphQL schema / 타입 정의)
  2. DB 스키마 설계 + 마이그레이션
  3. 미들웨어: 인증, 인가, rate limiting, 에러 핸들링, 로깅
  4. 각 엔드포인트 구현 (엔드포인트 간 의존성이 없으면 병렬 가능)
  5. 통합 테스트 (API contract test)
  6. 부하 테스트 / 성능 벤치마크 (선택)
- 스키마 확정 전 구현 시작을 금지한다. 스키마 변경은 별도 승인 필요.
- API 문서(OpenAPI spec)는 구현과 동시에 업데이트한다. 별도 태스크가 아니라 구현의 일부다.
- DB 인덱스 설계는 엔드포인트 구현 후 쿼리 패턴이 확정된 시점에 한다.

## 품질 기준
- 모든 엔드포인트에 입력 검증 필수 (zod, joi, pydantic, class-validator 등).
- 에러 응답은 일관된 구조 유지. 같은 유형의 에러는 항상 같은 HTTP status + error code 조합.
- API 계약 테스트(contract test) 통과 필수. 스키마에 정의된 응답과 실제 응답이 일치해야 한다.
- OWASP Top 10 점검: SQL injection, XSS, CSRF, 인증 우회, mass assignment, IDOR.
- 응답 시간 목표: P50 < 100ms, P95 < 500ms, P99 < 1000ms.
- N+1 쿼리 금지. ORM 사용 시 쿼리 카운트를 테스트에서 검증한다.
- 민감 데이터(비밀번호, 토큰, 개인정보)는 응답에 포함하지 않고, 로그에도 출력하지 않는다.
- 모든 목록 API에 페이지네이션이 적용되어 있어야 한다.

## 리뷰
- **devsecops**가 모든 라우트를 리뷰한다. 리뷰 관점:
  - 인증/인가 누락은 없는가?
  - 인젝션 가능성(SQL, NoSQL, Command)은 없는가?
  - 민감 데이터가 응답 또는 로그에 노출되지 않는가?
  - rate limiting이 적용되어 있는가?
- 스키마 변경(필드 추가/제거, 타입 변경) 시 하위 호환성 확인. breaking change면 API 버전업 필수.
- 에러 핸들링 누락 점검: unhandled promise rejection, uncaught exception, DB 연결 실패 시 동작.

## 우선순위
```
보안 ≫ 안정성 > 일관성 > 성능 > 개발 속도
```
- API는 한번 공개하면 바꾸기 매우 어렵다. 설계에 충분한 시간을 투자한다.
- "빠르게 만들고 나중에 고치자"는 API에서는 통하지 않는다.
