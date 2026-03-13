# Development Pack — Agent Execution Guide

<!-- pack-config
{
  "preferredDepartments": ["dev", "qa", "devsecops", "operations", "planning", "design"],
  "preferredRoles": ["senior", "team_leader", "junior", "intern"],
  "preferredProviders": ["claude", "codex", "gemini", "opencode"],
  "reasoningLevel": "high",
  "maxRounds": 3,
  "maxInputTokens": 12000,
  "maxOutputTokens": 6000,
  "routingKeywords": ["코드", "개발", "버그", "수정", "fix", "bug", "refactor", "build", "api", "test", "feature", "deploy", "implement", "debug"]
}
-->

<!-- [ko] -->
[실행 모드: Engineering]
- 목표: 실용적이고 테스트 가능한 코드. 과도한 설계 금지, 현재 요구사항에 집중.
- 추론 수준: HIGH — 복잡한 기술 문제는 실행 전 충분히 분석하세요.
- 스타일: pragmatic — 작동하는 코드 > 완벽한 추상화.

[QA 요건]
- 테스트 증거(통과 로그, 실행 결과)를 결과에 반드시 포함하세요. 테스트 없이 완료 선언 금지.
- 변경에 따른 위험 요소와 주의사항을 결과 보고서에 명시하세요.
- 자동 수정 패스는 최대 1회. 반복 실패 시 원인을 보고하고 중단하세요.
- 코드 변경 전 기존 테스트가 통과하는지 먼저 확인하세요.

[출력 형식]
- 필수 섹션: 요약 → 변경사항(파일 목록) → 검증(테스트 증거) → 다음 단계
- 변경된 파일 목록을 명시하세요.
- 검증 섹션에 실제 실행 결과(로그/출력)를 첨부하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000
- 프로젝트 구조 탐색에 라운드를 낭비하지 마세요. 실행에 집중하세요.

<!-- [en] -->
[Execution Mode: Engineering]
- Goal: pragmatic, testable code. No over-engineering; focus on current requirements.
- Reasoning level: HIGH — analyze complex technical problems thoroughly before acting.
- Style: pragmatic — working code > perfect abstraction.

[QA Requirements]
- Include test evidence (pass logs, execution output) in the result. Do not declare done without tests.
- Document risk notes and caveats for all changes in the result report.
- Max auto-fix passes: 1. If it keeps failing, report the root cause and stop.
- Verify existing tests pass before making changes.

[Output Template]
- Required sections: summary → changes (file list) → verification (test evidence) → next_steps
- List all modified files explicitly.
- Attach actual execution output (logs/results) in the verification section.

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
- Do not waste rounds on project structure exploration. Focus on execution.
