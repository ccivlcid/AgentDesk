# Image Studio — 구현 문서

> **상태:** ✅ 완료 (Phase 15, 2026-03-20)
> **단축키:** `g i` (바탕화면 아이콘 + 윈도우 토글)
> **API:** `docs/specs/api.md` § Image Studio API

---

## 개요

Settings → API Providers에 등록된 이미지 API 지원 프로바이더로 AI 이미지를 생성하는 Photoshop형 데스크탑 앱.
바탕화면 아이콘으로 진입하며, 태스크 보드와 연동해 생성 이미지를 태스크에 첨부할 수 있다.

---

## 지원 프로바이더

별도 키 설정 없이 **Settings → API Providers**에 등록된 모든 프로바이더를 자동 감지.

| 프로바이더 타입 | 기본 모델 (models_cache 없을 때) | 이미지 API |
|----------------|----------------------------------|-----------|
| openai | dall-e-3, dall-e-2 | `/v1/images/generations`, `/v1/images/edits` |
| stability | sd3.5-large, sdxl-1.0 | (openai compat) |
| together | FLUX.1-schnell, stable-diffusion-xl | (openai compat) |
| 기타 | models_cache 기반 자동 필터 | openai compat |

모델 목록은 `models_cache`에서 이미지 키워드(dall-e, flux, stable-diffusion, sdxl 등)로 자동 필터링.

> 프로바이더가 없을 때: 좌측 패널에 "⚙ API 설정 열기" 버튼 → Settings API 탭 직행

---

## 생성 모드

| 모드 | 설명 | 필요 입력 |
|------|------|-----------|
| **Text** (txt2img) | 프롬프트 → 이미지 생성 | 프롬프트 |
| **Inpaint** | 업로드 이미지 + 마스크 → 영역 변경 | 이미지 + 프롬프트 + 마스크(선택) |

---

## UI 구조

```
ImageStudioWindow (1100 × 720)
├── 탭 바 (Generate | Gallery | ? 가이드)
├── GenerateTab
│    ├── 좌측 패널 (240px)
│    │    ├── 모드 선택 (Text / Inpaint)
│    │    ├── 프롬프트 textarea
│    │    ├── 입력 이미지 업로드 (inpaint)
│    │    ├── MaskCanvas (inpaint + 이미지 있을 때)
│    │    ├── ▶ 생성 버튼
│    │    ├── [태스크 연동] 접이식 섹션
│    │    ├── 제공자 선택 드롭다운
│    │    ├── 모델 선택 드롭다운
│    │    └── 이미지 설정 (크기 / 품질 / 스타일)
│    ├── 캔버스 영역
│    │    ├── 생성 중: 스피닝 링 애니메이션
│    │    ├── 결과: 이미지 + ↓ 오버레이 버튼
│    │    └── 빈 상태: 안내 아이콘 + 텍스트
│    └── 상태 바 (크기 | 모델 | 프로바이더 | 모드 | 상태)
└── GalleryTab
     ├── 검색 바 + 프로바이더 필터
     ├── auto-fill 썸네일 그리드
     └── 우측 상세 패널 (원본 + 메타데이터 + 저장/삭제)
```

---

## 태스크 연동

- GenerateTab 좌측 "태스크 연동" 섹션 펼치기 → 태스크 드롭다운 선택
- 선택 시 태스크 제목 + 설명이 프롬프트에 자동 채워짐 (수동 편집 가능)
- 생성 완료 → `image_generations.task_id`에 저장
- TaskCard 하단 "Generated Images" 섹션(SVG 사진 아이콘):
  - 썸네일 3열 그리드, 클릭 시 Image Studio 열기
  - 이미지 없을 때 "Open Image Studio" 버튼

---

## 이미지 업로드 UX

- 클릭 또는 드래그 앤 드롭으로 업로드
- 업로드 시 실제 이미지 해상도 자동 감지 → 가장 가까운 지원 사이즈 자동 선택

---

## 파일 구조

```
server/modules/
├── image-studio/
│    ├── image-service.ts          # 파일 저장, 썸네일 (sharp)
│    └── providers/
│         └── openai.ts            # txt2img, inpaint, stripB64Prefix
└── routes/ops/
     └── image-studio.ts           # REST 라우터

src/
├── api/image-studio.ts            # fetch helpers
└── components/
     ├── image-studio/
     │    ├── GenerateTab.tsx
     │    ├── GalleryTab.tsx
     │    └── MaskCanvas.tsx
     └── windows/
          └── ImageStudioWindow.tsx
```

---

## DB 스키마

```sql
CREATE TABLE image_generations (
  id          TEXT    PRIMARY KEY,         -- img_<16hex>
  provider    TEXT    NOT NULL,
  model       TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  neg_prompt  TEXT,
  width       INTEGER NOT NULL DEFAULT 1024,
  height      INTEGER NOT NULL DEFAULT 1024,
  file_path   TEXT    NOT NULL,
  thumb_path  TEXT,
  metadata    TEXT,                        -- JSON: { revisedPrompt? }
  task_id     TEXT,                        -- 태스크 연동 (nullable)
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE INDEX idx_image_generations_created ON image_generations(created_at DESC);
CREATE INDEX idx_image_generations_task    ON image_generations(task_id);
```

이미지 파일 저장 위치: `WRITABLE_DATA_DIR/image-studio/` (원본), `.../thumbs/` (썸네일)
