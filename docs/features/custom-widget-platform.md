# Custom Widget Platform — 기획 문서

> 작성일: 2026-03-16
> 상태: ✅ 완료 (Phase 1~5 전체 구현 완료 — 2026-03-16)

---

## 1. 한 줄 정의

사용자가 **코드 없이** 자연어 또는 템플릿으로 새 기능(위젯 / 앱 창)을 만들고,
AgentDesk 바탕화면에 영구 배치할 수 있는 플랫폼.

---

## 2. 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **No Code** | 사용자에게 코드는 절대 노출하지 않는다 |
| **AI 위임** | 기능 구현은 Settings에 설정된 기본 프로바이더(AI)가 담당 |
| **두 가지 결과물** | 바탕화면 위젯(Widget) 또는 Dock 앱 창(Mini App) |
| **두 가지 생성 방법** | 템플릿 선택 또는 AI 자연어 생성 |
| **영구 등록** | DB에 저장, 앱 재시작 후에도 유지 |

---

## 3. 결과물 두 가지

### 3-1. Mini Widget
- 기존 AgentDesk 위젯과 동일한 바탕화면 플로팅 패널
- drag / resize / pop 기능 기존 `Widget.tsx` 컨테이너 그대로 재사용
- WidgetPicker "내 위젯" 섹션에서 추가

### 3-2. Mini App (앱 창)
- Dock 오른쪽 끝에 새 아이콘으로 등록
- 클릭 시 전용 AppWindow 창 오픈
- 기존 Dock 앱(Workflow, Library, Settings, Chat, Agent Manager)과 동일한 UX

---

## 4. 생성 방법 두 가지

### 4-1. 템플릿 기반

미리 준비된 템플릿을 골라 파라미터만 설정. 빠르고 안정적.

| 카테고리 | 템플릿 이름 | 핵심 파라미터 |
|----------|------------|-------------|
| 에이전트 | 부서별 상태 요약 | 표시할 부서, 상태 필터 |
| 에이전트 | 특정 에이전트 전용 모니터 | 에이전트 선택 |
| 태스크 | 오늘의 완료 카운터 | 표시 형식(숫자/진행률) |
| 태스크 | 담당자별 진행 현황 | 에이전트 목록 |
| 알림 | 타입 필터 알림 피드 | 알림 타입 선택 |
| 메트릭 | CLI 비용 요약 | 기간(오늘/이번주) |
| 메모 | 팀 공지판 | 제목, 내용(Markdown) |

### 4-2. AI 자연어 생성

사용자가 원하는 기능을 자연어로 설명하면 AI가 구현.

```
입력: "에이전트별 오늘 완료된 태스크 수를 카드로 보여줘"
 ↓
Settings.defaultProvider CLI(Claude/Codex/Gemini 등)로 프롬프트 전송
 ↓
AI가 React 컴포넌트 코드 생성
 ↓
서버에서 안전성 검증
 ↓
미리보기 (사용자에게 코드 비노출)
 ↓
승인 → DB 저장 → 위젯/앱창으로 등록
```

---

## 5. UX 흐름

### 진입점
```
Desktop → "+ 위젯 추가" 버튼
       → WidgetPicker 모달 → "✦ 새 기능 만들기" 탭
```

### 빌더 모달 흐름 (4단계)

```
[Step 1] 생성 방법 선택
  ┌────────────────────────────────┐
  │  어떻게 만드시겠어요?            │
  │                                │
  │  [📋 템플릿으로]  [✦ AI에게]    │
  └────────────────────────────────┘

[Step 2A] 템플릿 경로
  카테고리 탭 → 템플릿 카드 선택 → 파라미터 폼

[Step 2B] AI 경로
  자연어 입력창 → "생성하기" 버튼 → 로딩 (AI 응답 대기)

[Step 3] 미리보기 & 옵션
  ┌────────────────────────────────┐
  │  [라이브 미리보기 영역]          │
  │                                │
  │  이름:        [____________]   │
  │  결과물:      ○ 위젯  ○ 앱창   │
  │  크기:        소 / 중 / 대      │
  │  새로고침:    5s / 30s / 1m    │
  └────────────────────────────────┘

[Step 4] 등록
  [등록하기] → 위젯이면 바탕화면에 배치 / 앱창이면 Dock에 추가
```

---

## 6. 사용자가 조정할 수 있는 옵션

코드는 절대 노출하지 않으며, 아래 UI 옵션만 제공:

| 옵션 | 선택지 |
|------|--------|
| 이름 | 텍스트 입력 (최대 40자) |
| 결과물 종류 | 위젯 / 앱 창 |
| 크기 프리셋 | 소(320×240) / 중(420×280) / 대(560×360) |
| 새로고침 주기 | 수동 / 5s / 30s / 1m / 5m |
| 색상 테마 | 기본 / 강조(Amber) / 성공(Green) / 경고(Red) |

---

## 7. 등록 후 관리

- WidgetPicker "내 커스텀 기능" 섹션에서 목록 확인
- 각 항목: 이름, 생성 방법 뱃지(템플릿/AI), 편집 버튼, 삭제 버튼
- 편집: 이름/옵션만 수정 가능 (기능 자체 재생성은 새로 만들기)

---

## 8. 구현 완료 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| **1** | DB 스키마(`custom_features`) + REST API CRUD | ✅ 완료 |
| **2** | 템플릿 7종 + 빌더 UI 4단계(`WidgetBuilderModal`) | ✅ 완료 |
| **3** | `CustomFeatureRenderer` + `CustomFeatureWidget` + `CustomFeatureWindow` + WidgetPicker/Dock 통합 | ✅ 완료 |
| **4** | AI 생성 파이프라인 — `defaultProvider` 연동, 안전성 검증, `StepAiGenerate` 폴링 UI | ✅ 완료 |
| **5** | esbuild TSX→IIFE 번들 컴파일 + sandbox iframe 렌더러(`AiBundleRenderer`) | ✅ 완료 |

### 핵심 구현 파일

| 파일 | 역할 |
|------|------|
| `server/modules/routes/ops/custom-features.ts` | CRUD + bundle.js + render HTML 엔드포인트 |
| `server/modules/routes/ops/custom-features-ai.ts` | AI 생성 파이프라인 + esbuild 컴파일 |
| `src/components/widget-builder/WidgetBuilderModal.tsx` | 빌더 UI 4단계 스텝 |
| `src/components/widget-builder/StepAiGenerate.tsx` | 자연어 입력 + 폴링 UI |
| `src/components/widget-builder/AiBundleRenderer.tsx` | sandbox iframe 렌더러 |
| `src/components/widget-builder/CustomFeatureRenderer.tsx` | template/ai 분기 렌더러 |
| `src/components/desktop/widgets/CustomFeatureWidget.tsx` | 위젯 래퍼 (자동 새로고침) |
| `src/components/windows/CustomFeatureWindow.tsx` | Dock 앱창 래퍼 |
