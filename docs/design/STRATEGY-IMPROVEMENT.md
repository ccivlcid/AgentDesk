# AgentDesk Ultra-Modern Design Strategy (v2.0)

이 문서는 AgentDesk를 단순한 도구를 넘어, 전 세계에서 가장 세련된 **"High-End AI Agent OS"**로 진화시키기 위한 초현대적 디자인 가이드라인입니다. 

---

## 🏛️ 1. 핵심 디자인 철학: "The Intelligent Canvas"
- **Bento-Grid Orchestration**: 고정된 칸반(Kanban) 구조를 탈피하여, 작업의 중요도와 에이전트 활동량에 따라 유동적으로 변하는 모듈형 그리드 레이아웃 지향.
- **Physics-Based Fluidity**: 모든 인터랙션은 실제 물리 법칙에 기반한 스프링 애니메이션(Spring Physics)을 적용하여 '찰진' 반응성 제공.
- **Adaptive Luminance**: 단순한 다크/라이트 모드를 넘어, 에이전트의 상태와 작업의 긴급도에 따라 UI의 조명(Glow)과 보더(Border)가 실시간으로 반응.

---

## 🎨 2. 비주얼 언어 (Visual Language)

### 🌓 색상 및 질감 (Color & Texture)
- **Deep Sea Dark Theme**: 완전한 블랙보다는 깊이감 있는 네이비-그레이(`#0A0C10`)를 베이스로 하고, 형광색 포인트(Neon Amber, Electric Blue)로 시인성 극대화.
- **Dynamic Gradient Borders**: 에이전트가 작업 중일 때 테두리에 미세하게 흐르는 그라디언트 애니메이션 적용.
- **Ultra-Glassmorphism**: 블러 값을 40px 이상으로 높이고 `saturate`를 180% 이상으로 설정하여 투명하면서도 묵직한 유리 질감 구현.

### ✍️ 타이포그래피 (Typography)
- **Sans-Serif First**: UI 전체의 가독성을 위해 **Geist** 또는 **Inter** 폰트를 기본으로 사용 (대담한 Weight 활용).
- **Surgical Mono**: 실제 데이터, 코드, 에이전트의 사고 과정 등 **'전문적 지식'**이 담긴 영역에만 **JetBrains Mono**를 적용하여 시각적 위계 확립.

---

## 🚀 3. 현대적 컴포넌트 로드맵 (Modern Roadmap)

### Phase 1: Bento-Board & Live Stream (Task Management)
- [ ] **Bento-Grid Task View**: 칸반의 '열' 구조 대신, 작업 상태를 직관적인 크기의 카드들로 배치하는 그리드 레이아웃 구현.
- [ ] **Live Activity Feed**: 에이전트들의 활동을 타임라인 형태로 보여주는 실시간 피드(Live Stream) 도입.
- [ ] **Interactive DAG Graph**: 작업 간의 의존성을 선으로 연결하고, 드래그앤드롭으로 관계를 조절하는 인터랙티브 그래프 강화.

### Phase 2: High-End Pro Interface (Interaction)
- [ ] **Spring Physics Navigation**: 윈도우 최소화/최대화 시 `stiffness: 300, damping: 30` 수준의 찰진 스프링 애니메이션 적용.
- [ ] **Cursor-Aware Lighting**: 마우스 커서 위치에 따라 버튼이나 카드의 내부 조명이 미세하게 따라오는 반응형 라이팅 효과.
- [ ] **Floating Dock & MenuBar**: 화면 끝에 붙어있지 않고 공중에 떠 있는 듯한(Floating) 디자인과 더 넓은 여백(Padding) 확보.

### Phase 3: AI Presence Visualization (Monitoring)
- [ ] **Agent Aura System**: 에이전트의 상태(Success, Failure, Critical)에 따라 화면 전체나 특정 윈도우 주변에 은은한 컬러 광광(Glow) 효과 적용.
- [ ] **Streaming CLI Visualizer**: 단순 텍스트 스트리밍을 넘어, 토큰 생성 속도와 사고의 흐름을 시각적인 파동(Wave)으로 표현.

---

## ✅ 4. 초현대적 검증 기준 (Ultra-Modern Validation)
1. **The "Apple Test"**: 인터페이스가 충분히 부드럽고(60fps+), 여백이 충분하여 답답하지 않은가?
2. **The "Linear Test"**: 마우스 없이 모든 조작이 가능하며, 폰트와 컬러의 대비가 완벽하게 계산되어 있는가?
3. **The "OS Test"**: 사용자가 이 앱을 켰을 때, 웹사이트가 아니라 **지능형 하드웨어**를 다루는 듯한 몰입감을 느끼는가?

---

## 📂 주요 변경 대상 파일
- **작업 보드 개편**: `src/components/task-board/` → `BentoBoard.tsx` 신설 제안.
- **전체 폰트 위계**: `src/styles/index.part01.css` (Geist/Inter 도입).
- **애니메이션 설정**: `src/app/constants.ts` (Spring config 정의).
