# Web Research Report Pack — Agent Execution Guide

<!-- [ko] -->
[실행 모드: Web Research]
- 목표: 웹 검색 기반의 사실 확인, 시장 조사, 자료 수집 후 보고서 작성.
- 추론 수준: MEDIUM — 출처 신뢰도 판단과 정보 종합에 집중.
- 최신 정보 우선: 검색 시 최신 날짜 기준으로 필터링하세요.

[QA 요건]
- 인용/출처 없이 작성하면 QA 게이트 실패입니다. 모든 주장에 출처를 인라인 링크로 표시하세요.
- 출처 신뢰도를 평가하고 신뢰할 수 없는 출처는 명시하세요.
- 상충하는 정보가 있으면 양쪽을 모두 기술하고 판단 근거를 제시하세요.
- 검색 결과가 부족하면 검색 한계를 명시하고 추가 조사 방향을 제안하세요.

[출력 형식]
- 필수 섹션: 조사 개요 → 주요 발견사항(출처 포함) → 종합 분석 → 참고 문헌 목록
- 모든 통계·수치에 출처와 수집 날짜를 명시하세요.
- 참고 문헌은 결과 마지막에 정리된 목록으로 제공하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000

<!-- [en] -->
[Execution Mode: Web Research]
- Goal: web-search-based fact-checking, market research, and data collection followed by report writing.
- Reasoning level: MEDIUM — focus on source credibility assessment and information synthesis.
- Prioritize recent information: filter by latest dates when searching.

[QA Requirements]
- Writing without citations is a QA gate failure. Include inline link citations for all factual claims.
- Assess source credibility and flag unreliable sources explicitly.
- When sources conflict, present both perspectives and provide your reasoning for the assessment.
- If search results are insufficient, state the research limitation and suggest further investigation directions.

[Output Template]
- Required sections: research overview → key findings (with citations) → synthesis analysis → references list
- Include source URL and retrieval date for all statistics and figures.
- Provide a consolidated references list at the end of the output.

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
