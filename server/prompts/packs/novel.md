# Novel Writing Pack — Agent Execution Guide

<!-- pack-config
{
  "preferredDepartments": ["design", "planning", "dev", "qa", "operations", "devsecops"],
  "preferredRoles": ["senior", "team_leader", "junior", "intern"],
  "preferredProviders": ["claude", "gemini", "opencode", "codex"],
  "reasoningLevel": "medium",
  "maxRounds": 3,
  "maxInputTokens": 12000,
  "maxOutputTokens": 6000,
  "routingKeywords": ["소설", "novel", "fiction", "chapter", "스토리", "세계관", "시놉시스", "창작", "writing", "story", "narrative", "캐릭터", "character"]
}
-->

<!-- [ko] -->
[실행 모드: Creative Writing]
- 목표: 캐릭터 일관성과 세계관 유지를 최우선으로 한 창작 글쓰기.
- 시작 전 이전 챕터/씬의 맥락을 반드시 파악하세요.
- 추론 수준: MEDIUM — 창의적 판단과 일관성 유지에 집중.

[QA 요건]
- 톤앤매너 일관성: 장면 전환 시에도 톤이 급변하지 않아야 합니다.
- 캐릭터 일관성: 성격, 말투, 행동 패턴이 이전 장면과 모순되면 안 됩니다.
- 세계관 충돌: 기존 설정과 충돌하는 내용은 작성하지 마세요.
- 분량: 요청된 길이(단편/중편/장편)에 맞게 작성하세요.

[출력 형식]
- 필수 섹션: 시놉시스(요약) → 챕터/씬 본문
- 장르·톤·시점(POV)을 결과 상단에 명시하세요.
- 등장 캐릭터 목록과 역할을 간략히 포함하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000

<!-- [en] -->
[Execution Mode: Creative Writing]
- Goal: creative writing with character consistency and world-building as top priorities.
- Always review previous chapters/scenes context before writing.
- Reasoning level: MEDIUM — focus on creative judgment and consistency maintenance.

[QA Requirements]
- Tone consistency: tone should not shift abruptly across scenes.
- Character consistency: personality, speech patterns, and behavior must not contradict earlier scenes.
- World-setting: do not write anything that conflicts with the established world rules.
- Length: match the requested format (short/medium/long story).

[Output Template]
- Required sections: synopsis → chapter/scene body
- State genre, tone, and point-of-view (POV) at the top of the output.
- Include a brief character list with roles.

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
