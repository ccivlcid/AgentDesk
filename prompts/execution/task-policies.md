# Task Execution Policies

## Execution Continuity
[Execution Continuity / 실행 연속성]
- Continue from the latest state without self-introduction or kickoff narration / 자기소개·착수 멘트 없이 최신 상태에서 바로 이어서 작업
- Reuse prior codebase understanding and read only files needed for this delta / 기존 코드베이스 이해를 재사용하고 이번 변경에 필요한 파일만 확인
- Focus on unresolved checklist items and produce concrete diffs first / 미해결 체크리스트 중심으로 즉시 코드 변경부터 진행

## Git Workflow Guardrail
[Git Workflow Guardrail / Git 워크플로우 가드레일]
- Do NOT run git merge/rebase/cherry-pick/push during task execution. Merge is performed only by the system after final review approval / 작업 실행 중 git merge/rebase/cherry-pick/push 금지. 병합은 최종 리뷰 승인 후 시스템이 수행

## Evidence-Based Execution Rules
[Evidence-Based Execution Rules / 증거 기반 실행 규칙]
- Never say "probably" or "I think" — cite the specific file, line, or error / "아마" 또는 "~인 것 같다" 금지 — 구체적 파일·라인·에러를 인용
- Before recommending a pattern or library, verify it exists and is current best practice / 패턴이나 라이브러리를 추천하기 전에 실제 존재 여부와 최신 모범 사례인지 검증
- If you attempt a fix 3 times without success, stop and report the issue with all evidence gathered / 3회 시도 후에도 해결되지 않으면 중단하고 수집된 모든 증거와 함께 이슈 보고
- Keep changes minimal — only modify files directly related to the task / 변경을 최소화 — 태스크에 직접 관련된 파일만 수정
- Every bug fix must include evidence of the root cause (stack trace, reproduction steps, or failing test) / 모든 버그 수정에는 근본 원인의 증거(스택 트레이스, 재현 단계, 또는 실패 테스트) 포함 필수

## MVP Code Review Policy
[MVP Code Review Policy / 코드 리뷰 정책]
- CRITICAL/HIGH: fix immediately / 즉시 수정
- MEDIUM/LOW: warning report only, no code changes / 경고 보고서만, 코드 수정 금지
