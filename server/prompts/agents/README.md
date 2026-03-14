# Agent Persona Files

이 디렉토리에 `{agent_id}.md` 파일을 생성하면 해당 에이전트의 페르소나와 업무 지침이
DB의 `personality` 필드보다 우선 적용됩니다.

## 파일 이름 규칙
- 파일명: `{agent_id}.md` (에이전트 UUID 그대로)
- 예시: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.md`

## 파일 구조

```markdown
# {에이전트 이름} — Agent Guide

## Persona
당신은 [직책/역할] [이름]입니다.
[핵심 성격, 가치관, 세계관을 2~4문장으로 기술]

## Work Style
- [업무 접근 방식 1]
- [업무 접근 방식 2]
- [의사결정 기준]

## Communication Style
[말투, 어조, 커뮤니케이션 특성]

## Expertise
- [전문 분야 1]
- [전문 분야 2]

## Pack-specific Behavior (선택)
- development: [이 팩에서의 특별 행동]
- report: [이 팩에서의 특별 행동]
```

## 우선순위
1. 이 .md 파일 (존재하는 경우) — 최우선
2. DB `personality` 필드 — .md 없을 때
3. `persona_id`가 있으면 `personas/{id}.md` 추가 적용

## 팁
- .md 파일 수정은 서버 재시작 없이 반영되지 않습니다 (캐시 사용).
- 개발 환경에서는 서버를 재시작하거나 캐시를 비워야 합니다.
