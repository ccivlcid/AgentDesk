# AgentDesk System Issues Report

> 2026-03-22 기준 종합 시스템 점검 결과

---

## 1. CRITICAL — 즉시 수정 필요

### 1-1. YOLO 자율모드 레이스 컨디션
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/ops/messages/decision-inbox-routes.ts:357-407` |
| 문제 | `yoloAutopilotInFlight` 플래그가 단순 boolean으로 동시성 제어 없음 |
| 시나리오 | 사용자 수동 승인 + YOLO 자동 승인이 동시에 같은 decision을 처리 → 태스크 중복 실행 |
| 해결안 | DB 기반 row-level lock 또는 mutex 패턴 적용 |

### 1-2. Worktree 격리 실패 시 Silent Fallback
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/core/worktree/lifecycle.ts:206-224` |
| 문제 | Worktree 생성 실패 시 에러 없이 main 브랜치에서 직접 작업 (directMode) |
| 시나리오 | 복수 에이전트가 동일 프로젝트 디렉토리에서 동시 작업 → 코드 충돌 |
| 해결안 | directMode 진입 시 UI에 경고 표시, 동일 경로 동시 실행 방지 |

### 1-3. 서버 재시작 시 상태 손실
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/core/projects/kickoff.ts:229-232` |
| 문제 | `pmOversightProjects`, `enqueuedTaskIds`가 인메모리 — 서버 재시작 시 전부 소실 |
| 시나리오 | 킥오프 후 서버 재시작 → PM oversight 중단, planned 태스크 영구 방치 |
| 해결안 | 활성 sweep 상태를 DB에 persist, 서버 시작 시 복원 |

---

## 2. HIGH — 조기 수정 권장

### 2-1. 실패 태스크 자동 재시도 없음
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/orchestration.ts` (전체) |
| 문제 | exit code != 0 태스크가 ERR 상태로 영구 방치. 자동 재시도 메커니즘 없음 |
| 시나리오 | 일시적 네트워크 오류로 에이전트 실패 → 수동 재실행 필요 |
| 해결안 | 재시도 카운터 (max 2회) + 지수 백오프, `task_execution_meta`에 retry_count 추가 |

### 2-2. Agent Queue 슬롯 누수
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/orchestration/run-complete-handler/core.ts:79-103` |
| 문제 | 태스크가 cancel/pending 상태에서 completion handler 진입 시 early return → `agentQueue.onComplete()` 미호출 |
| 시나리오 | 태스크 취소 반복 → 큐 슬롯 고갈 → 새 태스크 실행 불가 |
| 해결안 | early return 경로에 `agentQueue.onComplete(taskId)` 추가 |

### 2-3. PM Oversight TTL 1시간 제한
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/core/projects/kickoff.ts:238` |
| 문제 | `PM_OVERSIGHT_TTL = 3_600_000` (1시간) — 장시간 프로젝트는 감시 종료 |
| 시나리오 | 7개 태스크 프로젝트에서 각 태스크 15분 소요 → 1시간 45분 필요 → 후반 태스크 미실행 |
| 해결안 | TTL을 진행 중 태스크가 있는 한 자동 연장, 또는 완전 제거 |

### 2-4. Windows 프로세스 종료 불완전
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/agents/cli-runtime.ts:297-304`, `server/ws/hub.ts:226-229` |
| 문제 | `child.kill()`은 Windows에서 cmd.exe 셸만 종료 — 자식 프로세스(vite, node) 잔존 |
| 시나리오 | 태스크 타임아웃 후 좀비 프로세스가 포트/파일 락 점유 |
| 해결안 | `taskkill /F /T /PID` 사용 (CLAUDE.md에 이미 문서화됨, 미적용 부분 존재) |

### 2-5. activeProcesses Map 메모리 누수
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/agents/cli-runtime.ts:317-326` |
| 문제 | `activeProcesses.set(taskId, child)` 후 `close` 이벤트에서 `delete` 미호출 |
| 시나리오 | 장시간 운영 시 수백 개의 죽은 프로세스 참조가 메모리 점유 |
| 해결안 | `child.on("close", ...)` 핸들러에 `activeProcesses.delete(taskId)` 추가 |

### 2-6. enqueuedTaskIds 무한 성장
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/core/projects/kickoff.ts:232, 283-284` |
| 문제 | PM oversight TTL 만료 시 프로젝트별 태스크 ID만 정리 — 글로벌 Set은 계속 성장 |
| 시나리오 | 수십 개 프로젝트 킥오프 → Set에 수천 ID 누적 |
| 해결안 | TTL 만료 시 해당 프로젝트의 모든 taskId를 Set에서 제거 |

### 2-7. 대규모 태스크 목록 무페이징 조회
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/core/projects/kickoff.ts:312-317` |
| 문제 | `SELECT ... FROM tasks WHERE status = 'planned'` — LIMIT 없음 |
| 시나리오 | 10,000건 planned 태스크 → 15초마다 전체 조회 |
| 해결안 | `LIMIT 50` 추가 + 배치 처리 |

---

## 3. MEDIUM — 안정화 단계에서 수정

### 3-1. DB 인덱스 부족
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/bootstrap/schema/versioned-migrations/` |
| 누락 인덱스 | `tasks(project_id, status)`, `subtasks(task_id, status)`, `subtasks(delegated_task_id)`, `subtasks(target_department_id)` |
| 영향 | 서브태스크 위임/완료 시 O(n) 풀스캔 → 태스크 수 증가 시 성능 저하 |

### 3-2. N+1 쿼리 패턴
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/orchestration/run-complete-handler/reconcile-delegated-subtasks.ts:27-89` |
| 문제 | 서브태스크 목록 조회 후 루프 안에서 개별 SELECT — N개면 N+1회 DB 호출 |
| 해결안 | 단일 쿼리로 배치 조회, 또는 `WHERE id IN (...)` 사용 |

### 3-3. 태스크 완료 시 트랜잭션 미사용
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/orchestration/run-complete-handler/core.ts:233-250` |
| 문제 | task status 업데이트, agent status 업데이트, subtask 업데이트가 개별 쿼리로 실행 |
| 시나리오 | 중간에 서버 크래시 → task는 done이지만 subtask는 pending 상태 잔존 |
| 해결안 | `db.exec("BEGIN"); ... db.exec("COMMIT");` 트랜잭션 래핑 |

### 3-4. WebSocket 재연결 시 전체 동기화 없음
| 항목 | 내용 |
|------|------|
| 파일 | `src/app/useRealtimeSync.ts:556-578` |
| 문제 | WS 연결 끊김 → 재연결 시 누락된 이벤트 보상 없음 (폴링은 30초 간격) |
| 시나리오 | 5분 단절 → 그 사이 완료된 태스크, 변경된 상태 미반영 |
| 해결안 | 재연결 시 `lastSyncTimestamp` 이후 변경사항 일괄 fetch |

### 3-5. CLI 출력 배치 큐 메시지 유실
| 항목 | 내용 |
|------|------|
| 파일 | `server/ws/hub.ts:81-88` |
| 문제 | 큐가 60건(MAX_BATCH_QUEUE) 초과 시 가장 오래된 메시지 drop |
| 시나리오 | 빠른 빌드 출력 → 사용자가 터미널에서 중간 줄 누락 |
| 해결안 | 큐 초과 시 즉시 flush 또는 더 큰 버퍼 |

### 3-6. Idle Timeout이 모든 출력에 리셋
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/agents/cli-runtime.ts:306-310` |
| 문제 | stdout/stderr 모든 chunk에서 idle 타이머 리셋 — 스피너/로그 애니메이션도 포함 |
| 시나리오 | 에이전트가 무한 로그 출력 → 타임아웃 불가 → 자원 무한 소비 |
| 해결안 | "의미 있는 출력" 판별 (최소 변경량 체크) 또는 hard timeout 필수 적용 |

### 3-7. 알림 Flood 방지 없음
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/routes/ops/notifications.ts` |
| 문제 | 알림 생성 rate limit 없음 |
| 시나리오 | 버그로 알림 무한 생성 → DB 비대화, UI 렌더링 멈춤 |
| 해결안 | 태스크당 초당 1건 제한, 또는 중복 알림 방지 |

### 3-8. 리뷰 회의 중단 시 DB 정리 미흡
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/orchestration/meetings/review-consensus.ts:201-210` |
| 문제 | 회의 중간 abort 시 이미 기록된 meeting_minute_entries 롤백 안 됨 |
| 시나리오 | 불완전한 회의록이 DB에 잔존 → 다음 회의에 혼란 |
| 해결안 | abort 시 해당 meeting_id의 entries 정리 또는 status를 'aborted'로 변경 |

---

## 4. LOW — 개선 사항

### 4-1. 언어 감지 vs 설정 불일치
| 항목 | 내용 |
|------|------|
| 위치 | 다수 서버 파일 |
| 문제 | `resolveLang(text)` 호출 시 settings를 먼저 확인하지만, settings가 미설정이면 텍스트 기반 감지 사용 |
| 영향 | 한국어 설정인데 영어 태스크 제목 → 에이전트가 영어로 응답 |
| 해결안 | 이미 부분 수정 완료 (review-consensus.ts에 getPreferredLanguage 적용). 나머지 위치도 통일 |

### 4-2. Worktree 브랜치명 충돌 가능성
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/core/worktree/lifecycle.ts:253-304` |
| 문제 | 브랜치 이름 4개 후보 시도 — 동시 실행 시 동일 이름 선택 가능 |
| 해결안 | UUID 기반 브랜치명 또는 DB-level 예약 |

### 4-3. 프론트엔드 메모리: Codex Thread Map 무한 성장
| 항목 | 내용 |
|------|------|
| 파일 | `src/app/useRealtimeSync.ts:327-345` |
| 문제 | `threadMap` 정리가 `cli_output` 이벤트 시에만 발생 |
| 해결안 | 5분 주기 타이머로 만료 항목 정리 |

### 4-4. 프로젝트 컨텍스트 크기 제한
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow/core/project-context-tools.ts:256-279` |
| 문제 | 프로젝트 컨텍스트 6000자 상한 — 대형 프로젝트에서 구조 정보 누락 |
| 해결안 | 모델 컨텍스트 윈도우 기준으로 동적 조절 |

### 4-5. Settings 테이블 캐싱 없음
| 항목 | 내용 |
|------|------|
| 파일 | 다수 위치에서 `db.prepare("SELECT value FROM settings WHERE key = ?")` 반복 호출 |
| 문제 | 설정 변경은 드물지만 매 요청마다 DB 조회 |
| 해결안 | 인메모리 캐시 + settings 변경 시 invalidate |

### 4-6. Graceful Shutdown 미구현
| 항목 | 내용 |
|------|------|
| 파일 | `server/modules/workflow` (전체) |
| 문제 | 서버 종료 시 활성 프로세스 kill, 큐 정리, worktree 정리 없음 |
| 해결안 | `process.on("SIGTERM", ...)` 핸들러에서 `activeProcesses` 순회 종료 |

---

## 5. 이미 수정 완료된 항목 (이번 세션)

| 항목 | 상태 |
|------|------|
| notifications CHECK constraint 누락 (`task_started`, `kickoff`) | ✅ 수정 완료 |
| Decision Inbox `task_review_ready` kind 누락 | ✅ 수정 완료 |
| "기획팀장" → "PM" 용어 통일 (19개 파일) | ✅ 수정 완료 |
| PM 에이전트가 보고 주체 (findProjectPm) | ✅ 수정 완료 |
| PM Activity 보고탭 쿼리 누락 | ✅ 수정 완료 |
| 킥오프 프롬프트 모호함 → ERR 유발 | ✅ 수정 완료 |
| YOLO에서 task_review_ready 자동 승인 | ✅ 수정 완료 |
| 태스크 완료 후 다음 태스크 자동 체이닝 | ✅ 수정 완료 |
| 설정 언어 → 회의/보고 반영 | ✅ 수정 완료 |
| 프롬프트 .md 파일 분리 | ✅ 수정 완료 |
| 창 드래그/리사이즈 성능 (rAF + transition) | ✅ 수정 완료 |
| 자율모드 기본 ON | ✅ 수정 완료 |
| PM 에이전트 오케스트레이션 (이벤트 기반) | ✅ Phase 21 |
| PM oversight sweep 타이머 제거 | ✅ Phase 21 |
| YOLO 정규식 → PM LLM 판단 | ✅ Phase 21 |
| 실패 태스크 PM 재시도/재배정/에스컬레이션 | ✅ Phase 21 |
| 서버 재시작 시 PM oversight 복원 | ✅ Phase 21 |
| AI 에러 분석 (8가지 원인 분류) | ✅ Phase 22 |
| 프롬프트 히스토리 API + UI 탭 | ✅ Phase 22+25 |
| 원클릭 태스크 재실행 | ✅ Phase 22 |
| 자동 Rules/Memory 학습 | ✅ Phase 23 |
| 프로젝트 회고 보고서 | ✅ Phase 23 |
| activeProcesses 메모리 누수 수정 | ✅ Phase 21 |
| DB 성능 인덱스 7개 | ✅ Phase 24 |
| Graceful shutdown (planned 복원) | ✅ Phase 24 |
| 알림 flood 방지 (5초 dedupe) | ✅ Phase 24 |
| 에이전트 적합도 추적 | ✅ Phase 25 |
| TaskCardActions 이모지 → SVG | ✅ 검토 수정 |

---

## 남은 작업 로드맵

### 중기
- [ ] 토큰 예산/비용 관리
- [ ] 프롬프트 버전 관리
- [ ] 동시성 제어 (파일 락, 브랜치 충돌)
- [ ] N+1 쿼리 배치화
- [ ] Settings 캐시

### 장기
- [ ] WebSocket 재연결 동기화
- [ ] 프로젝트 컨텍스트 동적 조절
- [ ] 플러그인 시스템
- [ ] Team/Cloud (SSO, RBAC)
