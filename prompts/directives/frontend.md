## 기술스택
- 프레임워크: (예: React, Vue, Svelte, Angular 등)
- 스타일링: (예: Tailwind CSS, CSS Modules, styled-components 등)
- 상태관리: (예: Zustand, Redux, Pinia 등)
- 빌드: (예: Vite, Webpack, Turbopack 등)
- 테스트: (예: Vitest, Jest, Playwright 등)

## 목표
사용자가 **직관적이고 쾌적하게 사용**할 수 있는 웹 프론트엔드를 구축한다.
컴포넌트 기반 설계, 접근성(a11y), 반응형 레이아웃, 성능을 핵심 가치로 한다.

## 작업 원칙
- **컴포넌트 기반 설계**: 재사용 가능한 단위로 UI를 구성한다. 한 컴포넌트의 책임은 하나.
- 접근성(a11y)을 기본으로 고려한다. 시맨틱 HTML, ARIA 속성, 키보드 네비게이션은 선택이 아니라 기본이다.
- 반응형 레이아웃을 지원한다. mobile-first 접근을 권장한다 (min-width 기준 미디어 쿼리).
- 디자인 시스템/토큰이 있다면 반드시 따른다. 임의의 색상값(`#ff3366`), 임의의 폰트 사이즈(`15px`) 금지.
- 상태를 서버 상태(react-query, SWR, tanstack-query)와 클라이언트 상태(zustand, redux 등)로 명확히 분리한다.
- 정적 스타일(Tailwind, CSS Modules)을 선호한다. CSS-in-JS(styled-components, emotion)는 런타임 비용이 있으므로 명확한 이유가 있을 때만 사용.
- 컴포넌트 하나가 200줄을 넘으면 분리를 고려한다. 500줄을 넘으면 반드시 분리한다.
- `useEffect` 남용을 경계한다. 파생 상태는 `useMemo`로, 이벤트 핸들링은 이벤트 핸들러에서 처리한다.
- 이미지에 `alt` 속성을 반드시 작성한다. 장식용 이미지에는 `alt=""`.
- 폼은 비제어(uncontrolled) 컴포넌트 또는 react-hook-form 등 라이브러리를 사용해 불필요한 리렌더링을 줄인다.

## 태스크 분해
- 순서:
  1. **디자인 토큰 + 공통 컴포넌트**: Button, Input, Card, Modal, Layout, Toast, Loading
  2. **페이지 레이아웃 + 라우팅 구조**: 페이지 스켈레톤, 네비게이션, 인증 가드
  3. **개별 페이지/기능 구현** (병렬 가능)
  4. **인터랙션, 애니메이션, 마이크로 UX**: hover, focus, transition, skeleton loading
  5. **크로스 브라우저 테스트 + 접근성 감사**
- 상태 관리 구조(스토어 설계)는 1단계에서 확정한다. 구현 중 스토어 구조를 바꾸면 연쇄 수정이 발생한다.
- API 연동은 react-query/SWR 등 서버 상태 라이브러리로 통일한다. `useEffect` + `fetch` 패턴 금지.
- 로딩/에러/빈 상태(empty state) UI를 모든 데이터 패칭 컴포넌트에 포함한다.

## 품질 기준
- 시맨틱 HTML 사용. `<div>` 남용 금지. `<button>`, `<a>`, `<nav>`, `<main>`, `<section>`, `<article>` 적절히 사용.
- **키보드만으로** 모든 주요 기능을 사용할 수 있어야 한다. Tab, Enter, Escape, Arrow 키.
- Lighthouse 접근성 점수 90+.
- 주요 브라우저(Chrome, Firefox, Safari) 최신 2개 버전 호환.
- Core Web Vitals 목표: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- 이미지: lazy loading + 적절한 포맷(WebP/AVIF) + srcset 반응형 + width/height 명시(CLS 방지).
- 번들 사이즈를 의식한다. 큰 라이브러리(moment.js, lodash 전체 등) 추가 시 tree-shakeable 대안을 먼저 확인.
- 컴포넌트에 prop 타입을 정확히 정의한다. `any` 금지.

## 리뷰
- **design 에이전트**가 시각적 일관성을 리뷰한다. 리뷰 관점:
  - 디자인 시스템(색상, 간격, 폰트)을 따르고 있는가?
  - 접근성: 색상 대비, 포커스 표시, 스크린 리더 호환?
  - 반응형: 모바일/태블릿/데스크톱에서 정상 표시?
- 크로스 브라우저 동작 확인. 특히 Safari의 flexbox, grid, date input 이슈 주의.
- 번들 사이즈 영향 확인. 새 라이브러리 추가 시 사이즈 증가분을 정당화해야 한다.

## 우선순위
```
UX ≈ 접근성 > 성능 > 코드 품질 > 기능 수
```
- "10개 페이지가 어설프게" 보다 "5개 페이지가 완벽하게".
- 기능을 추가하기 전에 기존 페이지의 접근성과 반응형을 먼저 완성한다.
