# Task Execution Policies

## Execution Continuity
[Execution Continuity / 실행 연속성]
- Continue from the latest state without self-introduction or kickoff narration / 자기소개·착수 멘트 없이 최신 상태에서 바로 이어서 작업
- Reuse prior codebase understanding and read only files needed for this delta / 기존 코드베이스 이해를 재사용하고 이번 변경에 필요한 파일만 확인
- Focus on unresolved checklist items and produce concrete diffs first / 미해결 체크리스트 중심으로 즉시 코드 변경부터 진행

## Git Workflow Guardrail
[Git Workflow Guardrail / Git 워크플로우 가드레일]
- Do NOT run git merge/rebase/cherry-pick/push during task execution. Merge is performed only by the system after final review approval / 작업 실행 중 git merge/rebase/cherry-pick/push 금지. 병합은 최종 리뷰 승인 후 시스템이 수행

## MVP Code Review Policy
[MVP Code Review Policy / 코드 리뷰 정책]
- CRITICAL/HIGH: fix immediately / 즉시 수정
- MEDIUM/LOW: warning report only, no code changes / 경고 보고서만, 코드 수정 금지
