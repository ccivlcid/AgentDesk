# AgentDesk Design Improvement Strategy

이 문서는 AI 에이전트(또는 개발자)가 **AgentDesk**의 디자인을 체계적으로 개선하고, 일관된 사용자 경험(UX)과 시각적 정체성(Visual Identity)을 유지하며 작업할 수 있도록 안내하는 실행 가이드입니다.

---

## 🏛️ 1. 핵심 디자인 철학: "AI Agent OS"
모든 디자인 결정은 다음의 메타포를 따릅니다.
- **OS as Interface**: 데스크탑, Dock, 윈도우 관리 시스템을 통한 익숙한 멀티태스킹 환경 제공.
- **Radical Transparency**: 에이전트의 모든 사고 과정(LLM), 도구 실행, 상태 변화를 숨김없이 시각화.
- **Pro-Tool Aesthetic**: 불필요한 장식은 배제하고, 고대비와 명확한 타이포그래피를 통해 정보 밀도를 높임.

---

## 🛠️ 2. 기술적 표준 (Technical Standards)
구현 시 반드시 다음 기술 스택과 패턴을 준수합니다.

| 영역 | 기술 / 패턴 | 가이드라인 |
|---|---|---|
| **Styling** | Tailwind CSS v4 | CSS 변수 기반 테마 적용 (`--color-*`), `backdrop-blur` 적극 활용. |
| **Animation** | Framer Motion | 윈도우 전환(Genie effect), 상태 변화(Pulse)에 60fps 부드러운 전환 적용. |
| **Icons** | Lucide React | 선 두께 1.5px~2px 유지, 일관된 크기(16px/20px/24px) 사용. |
| **Typography** | Inter & JetBrains Mono | UI 텍스트는 Inter, 코드 및 CLI 출력은 JetBrains Mono 사용. |
| **A11y** | WCAG AA 준수 | 키보드 내비게이션(`tabindex`), 스크린 리더(`aria-*`), 명확한 포커스 링 보장. |

---

## 🚀 3. 단계별 개선 로드맵 (Actionable Roadmap)

### Phase 1: 파운데이션 및 레이아웃 (Foundation & Layout)
- [ ] **글래스모피즘 테마 시스템**: 데스크탑 배경과 윈도우 사이에 `backdrop-blur-md`와 미세한 투명도(`bg-white/70`, `bg-slate-900/70`) 적용.
- [ ] **섀도우 레이어링**: 윈도우 깊이에 따른 `shadow-xl`(활성), `shadow-md`(비활성) 시스템 구축.
- [ ] **사이드바/Dock 최적화**: 가독성을 위한 간격 조정 및 활성 상태의 시각적 강조 강화.

### Phase 2: 에이전트 존재감 및 모니터링 (Presence & Monitoring)
- [ ] **에이전트 상태 애니메이션**: 'Thinking' 상태에서 아바타 주변에 은은한 펄스 효과 추가.
- [ ] **CLI 윈도우 고도화**:
    - [ ] `write_file`, `run_command` 등 주요 도구 실행 시 별도 아이콘 및 배경색 하이라이팅.
    - [ ] 타임스탬프와 토큰 사용량을 작게 병기하여 정보성 강화.
- [ ] **작업 카드(Task Card) 개선**: 상태(Success, Failure, Running)에 따른 직관적인 보더 및 배경색 변화.

### Phase 3: 데이터 시각화 및 인터랙션 (Visualization & Interaction)
- [ ] **Flow Graph 개선**: `@xyflow/react`를 활용한 데이터 흐름 애니메이션(Moving dotted lines) 적용.
- [ ] **Command Palette (Ctrl+K)**: Spotlight 스타일의 통합 검색 UI 구현 및 단축키 바인딩.
- [ ] **대시보드 위젯**: 토큰 사용량, 성공률 등 핵심 지표를 데스크탑에 배치 가능한 위젯으로 컴포넌트화.

---

## ✅ 4. 작업 완료 및 검증 (Validation)
AI 에이전트는 각 태스크 완료 후 다음을 확인해야 합니다.

1. **시각적 일관성**: `src/styles/`에 정의된 테마 변수를 정확히 사용했는가?
2. **성능**: 저사양 환경에서도 윈도우 이동 및 애니메이션이 끊김 없이 작동하는가?
3. **접근성**: 마우스 없이 `Tab` 키만으로 모든 주요 기능을 수행할 수 있는가?
4. **회귀 테스트**: 기존 기능(에이전트 실행, 작업 할당 등)이 디자인 변경 후에도 정상 작동하는가?

---

## 📂 관련 파일 경로 (Reference Paths)
- **전역 스타일**: `src/index.css`
- **테마 설정**: `vite.config.ts` (Tailwind v4 설정 포함)
- **데스크탑 레이아웃**: `src/app/Desktop.tsx` (예상 경로)
- **에이전트 UI**: `src/components/agent/`
- **상태 관리**: `src/store/`
