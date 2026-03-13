# Report Pack — Agent Execution Guide

<!-- pack-config
{
  "preferredDepartments": ["planning", "qa", "design", "dev", "operations", "devsecops"],
  "preferredRoles": ["team_leader", "senior", "junior", "intern"],
  "preferredProviders": ["claude", "gemini", "opencode", "codex"],
  "reasoningLevel": "medium",
  "maxRounds": 3,
  "maxInputTokens": 12000,
  "maxOutputTokens": 6000,
  "routingKeywords": ["보고서", "리포트", "report", "brief", "summary", "executive summary", "status report", "정리", "분석", "analysis", "요약", "브리핑"]
}
-->

<!-- [ko] -->
[실행 모드: Report Writing]
- 목표: 명확하고 구조적인 보고서·브리핑·요약문 작성.
- 추론 수준: MEDIUM — 데이터 정확성과 논리적 흐름에 집중.
- 스타일: 간결·객관·사실 기반. 불필요한 수식어 제거.

[QA 요건]
- 필수 섹션(executive_summary, findings, recommendations, conclusion)이 모두 포함되어야 합니다.
- 필수 섹션 누락 시 QA 게이트 실패로 처리됩니다.
- 사실 주장에는 근거(데이터, 인용, 출처)를 명시하세요.
- 불확실한 내용은 추정임을 명확히 표시하세요.

[출력 형식]
- 필수 섹션: 개요(executive summary) → 주요 발견사항 → 권고사항 → 결론
- 표·차트 참조가 있으면 명시하세요.
- 최대 페이지 수(있는 경우)를 준수하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000

<!-- [en] -->
[Execution Mode: Report Writing]
- Goal: clear, structured reports, briefings, and summaries.
- Reasoning level: MEDIUM — focus on data accuracy and logical flow.
- Style: concise, objective, fact-based. Remove unnecessary qualifiers.

[QA Requirements]
- Required sections (executive_summary, findings, recommendations, conclusion) must all be present.
- Missing required sections will be treated as a QA gate failure.
- Back factual claims with evidence (data, citations, sources).
- Clearly label uncertain content as estimated or assumed.

[Output Template]
- Required sections: executive summary → key findings → recommendations → conclusion
- Reference any tables or charts explicitly.
- Respect the maximum page count if specified.

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
