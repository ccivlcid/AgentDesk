# AgentDesk vs Claw-Empire 비교 분석 (Project OS 관점)

작성일: 2026-03-09
비교 대상:
- 내 프로젝트: `C:\project\AgentDesk`

## 1) 결론 요약

- 한 줄 결론: 코드 계보는 매우 가깝지만, AgentDesk는 **Project OS + 사용자 정의 카테고리 시스템**으로 제품 정체성을 분리할 수 있음.
- 현재 유사도(코드/구조): 약 **90~94%**
- 차별화 목표: 기능 추가가 아닌 운영 모델 전환으로 체감 분리

## 2) 공통점

- 저장소 구조/스택/런타임 패턴이 거의 동일 계열
- Express + SQLite + React + Vite + WebSocket 기반
- 오피스 시뮬레이션 + 태스크/에이전트 운영

## 3) 차이점 (현재 코드 상태)

- AgentDesk가 더 큰 코드 표면적(서버/프론트/라우트)
- AgentDesk에만 존재하는 확장 모듈 다수
- 하지만 사용자 관점에선 "같은 계열"로 보일 가능성이 높음

## 4) Project OS 관점에서의 분기 전략

핵심 전환:
- 직책 중심(CEO/CTO) -> 프로젝트 중심(Project OS)
- 고정 도메인(IT/투자만) -> 사용자 정의 카테고리 시스템(Category OS)

필수 요소:
- 카테고리 템플릿 + 커스텀 카테고리 생성
- 카테고리별 KPI/리스크/게이트/산출물 스키마
- 카테고리 버전 고정 실행(재현성)

이 전환이 되면 "기반이 같아도 제품 철학이 다르다"는 인식이 생김.

## 5) 정량 참고 (수집값)

| 항목 | AgentDesk | Claw-Empire |
|---|---:|---:|
| 서버 파일 수 | 248 | 216 |
| 프론트 파일 수 | 316 | 186 |
| 라우트 정의 수 | 227 | 120 |
| `src+server` 파일 수 | 586 | 402 |
| 공통 파일 경로 수 | 395 | 395 |
| Claw 파일 커버리지 | - | 98.26% |

## 6) 수정된 실무 판단

- "기반 유사성": 매우 높음(사실상 같은 계열).
- "브랜드 분리 방법": 시각 리브랜딩만으로는 부족.
- "진짜 분리 방법": Project OS + Category OS로 문제 정의를 바꿔야 함.

실행 계획(데이터 모델, 60일 로드맵, 개발 티켓)은 → [claw-empire-differentiation-plan.md](claw-empire-differentiation-plan.md) 참조.

## 7) 참고 근거 파일

AgentDesk:
- `README.md`, `package.json`, `server/server-main.ts`, `server/db/runtime.ts`

Claw-Empire:
- 동일 경로 (GitHub `GreenSheep01201/claw-empire` 저장소 기준)
