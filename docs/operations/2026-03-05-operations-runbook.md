# 운영팀 산출물 (2026-03-05)

## 1) [보완계획] 파이프라인 게이트 + SLA 자동 트래킹 기준

### 1.1 운영 파이프라인 게이트(고정 순서)
1. 데이터 확정
2. 시각화 반영
3. 팩트체크
4. 보안검증

- 게이트 순서는 팩트체크팀 검증 산출물과 동일하게 고정한다.
  - 참조: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\837442dc\docs\factcheck\2026-03-05-factcheck-report.md`
  - 참조: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\837442dc\docs\factcheck\2026-03-05-slide-evidence-map.csv`
- 운영팀은 각 게이트에 대해 `시작시각`, `완료시각`, `담당`, `SLA(시간)`, `상태`, `블로커`, `에스컬레이션 시각`을 강제 기록한다.

### 1.2 단계별 SLA 기준(라운드 1 운영안)

| Gate | 담당 부서 | 목표 리드타임(SLA) | 에스컬레이션 트리거 |
|---|---|---:|---|
| 데이터 확정 | 조사전략실/크롤링 협업 | 4h | 시작 후 3h 경과 시 경고, 4h 초과 시 즉시 에스컬레이션 |
| 시각화 반영 | 문서디자인팀 | 6h | 시작 후 5h 경과 시 경고, 6h 초과 시 즉시 에스컬레이션 |
| 팩트체크 | 팩트체크팀 | 3h | 시작 후 2h 경과 시 경고, 3h 초과 시 즉시 에스컬레이션 |
| 보안검증 | 인프라보안팀 | 2h | 시작 후 1h 경과 시 경고, 2h 초과 시 즉시 에스컬레이션 |

- 운영 KPI
  - `Gate On-Time Rate = SLA 내 완료 게이트 수 / 전체 게이트 수`
  - `SLA Breach Count = SLA 초과 건수`
  - `Mean Lead Time = gate별 (완료시각-시작시각) 평균`

## 2) [협업] 운영팀 결과물 작성

### 2.1 자동 트래킹 산출물
- 파일: `docs/reports/operations/2026-03-05-gate-sla-tracking.csv`
- 목적: 4단계 게이트 진행 상태, 리드타임, SLA 위반 여부를 단일 표로 추적
- 상태값 표준: `pending`, `in_progress`, `passed`, `blocked`, `breached`

### 2.2 일 2회 운영 모니터링 규칙
- 고정 점검 시각: `10:00`, `16:00` (로컬 시간)
- 점검 항목
  - 게이트별 상태/지연 여부
  - 신규 블로커 발생 여부
  - 에스컬레이션 실행/해소 상태
- 기록 파일: `docs/reports/operations/2026-03-05-monitoring-log.md`

### 2.3 블로커 1시간 내 에스컬레이션 규칙
- 블로커 최초 인지 시각을 `t0`로 기록
- `t0 + 30분`: 담당 부서 리드 알림
- `t0 + 60분`: 팀장/조사전략실 동시 에스컬레이션
- 해소 전까지 모니터링 로그에 30분 간격 업데이트

## 3) 제출 증빙 체크항목(운영팀)

| 증빙 항목 | 파일/위치 | 판정 |
|---|---|---|
| 게이트 통과 로그 | `docs/reports/operations/2026-03-05-gate-sla-tracking.csv` | 준비완료 |
| 단계별 리드타임 | `docs/reports/operations/2026-03-05-gate-sla-tracking.csv` | 준비완료 |
| SLA 미준수/에스컬레이션 로그 | `docs/reports/operations/2026-03-05-monitoring-log.md` | 준비완료 |

## 4) 라운드 1 운영 판정
- 운영팀 체크리스트 1~2번 산출물 작성 완료
- 현재 보안팀 산출물 blocked 상태를 반영해, 보안검증 게이트는 `blocked`로 추적 개시
- 운영팀 관점 결과: `IN_PROGRESS` (교차부서 blocked 해소 대기)
