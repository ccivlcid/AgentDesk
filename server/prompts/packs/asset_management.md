# Asset Management Pack — Agent Execution Guide

<!-- pack-config
{
  "preferredDepartments": ["planning", "dev", "qa", "design", "operations", "devsecops"],
  "preferredRoles": ["team_leader", "senior", "junior", "intern"],
  "preferredProviders": ["claude", "gemini", "opencode", "codex"],
  "reasoningLevel": "high",
  "maxRounds": 3,
  "maxInputTokens": 12000,
  "maxOutputTokens": 6000,
  "routingKeywords": ["투자", "펀드", "자산 운용", "포트폴리오", "수익률", "리스크", "배분", "investment", "portfolio", "fund", "asset management", "hedge", "equity", "주식", "ETF", "채권"]
}
-->

<!-- [ko] -->
[실행 모드: Asset Management / Investment Analysis]
- 목표: 투자, 펀드, 포트폴리오, 자산 운용 분석 및 전략 수립.
- 추론 수준: HIGH — 금융 데이터 정확성과 리스크 평가에 집중.
- 스타일: 정량적·객관적 분석. 모든 수치에 출처와 기준 날짜를 명시하세요.

[QA 요건]
- 리스크 평가 섹션을 반드시 포함하세요. 누락 시 QA 게이트 실패입니다.
- 컴플라이언스(규정 준수) 검토 결과를 포함하세요.
- 성과 지표(벤치마크 대비 수익률, 샤프 비율, 변동성 등)를 수치로 제시하세요.
- 투자 의견은 반드시 근거(데이터, 시장 조건)와 함께 제시하세요.
- 면책 조항: 투자 결정의 최종 책임은 의사결정자에게 있음을 명시하세요.

[출력 형식]
- 필수 섹션: 시장 현황 → 포트폴리오 분석 → 리스크 평가 → 컴플라이언스 검토 → 권고사항
- 성과 지표 표(벤치마크 대비, 샤프 비율, 최대 낙폭 등)를 포함하세요.
- 시나리오별(낙관/기본/비관) 분석을 포함하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000

<!-- [en] -->
[Execution Mode: Asset Management / Investment Analysis]
- Goal: investment, fund, portfolio, and asset management analysis and strategy formulation.
- Reasoning level: HIGH — focus on financial data accuracy and risk assessment.
- Style: quantitative and objective analysis. Include source and reference date for all figures.

[QA Requirements]
- A risk assessment section is required. Missing it is a QA gate failure.
- Include compliance check results.
- Present performance metrics numerically (returns vs benchmark, Sharpe ratio, volatility, etc.).
- All investment opinions must be accompanied by supporting evidence (data, market conditions).
- Disclaimer: explicitly state that final investment decisions rest with the decision-maker.

[Output Template]
- Required sections: market overview → portfolio analysis → risk assessment → compliance review → recommendations
- Include a performance metrics table (vs benchmark, Sharpe ratio, max drawdown, etc.).
- Include scenario analysis (optimistic / base / pessimistic).

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
