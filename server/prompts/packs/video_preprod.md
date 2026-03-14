# Video Pre-production Pack — Agent Execution Guide

<!-- pack-config
{
  "preferredDepartments": ["design", "planning", "dev", "operations", "qa", "devsecops"],
  "preferredRoles": ["senior", "team_leader", "junior", "intern"],
  "preferredProviders": ["claude", "codex", "gemini", "opencode"],
  "reasoningLevel": "high",
  "maxRounds": 3,
  "maxInputTokens": 12000,
  "maxOutputTokens": 6000,
  "routingKeywords": ["영상", "video", "콘티", "storyboard", "shot list", "샷리스트", "script for video", "릴스", "쇼츠", "유튜브", "youtube", "광고영상", "홍보영상", "remotion"]
}
-->

<!-- [ko] -->
[실행 모드: Video Pre-production]
- 목표: 실제 영상 파일(mp4) 생성. 기획 문서만 작성하면 완료가 아닙니다.
- 추론 수준: HIGH — 렌더링 파이프라인과 품질 기준을 엄격히 준수하세요.
- 렌더링 엔진: Remotion 고정 (ffmpeg 단독 슬라이드 합성, Python moviepy/Pillow 금지).

[실행 순서]
1. 문서화/기획/회의 반영 작업을 모두 완료하세요.
2. Remotion 런타임을 준비하세요: `pnpm exec remotion browser ensure`
   - 실패 시 fallback: `pnpm --package=@remotion/cli dlx remotion browser ensure`
3. 프로젝트 내에 Remotion 엔트리(`index.ts`, `Root.tsx`, `Composition.tsx`)를 작성하세요.
4. 렌더링 실행: `pnpm exec remotion render <entry-file> <composition-id> {{ARTIFACT_PATH}} --log=verbose`
5. 렌더링 후 파일 존재 여부와 크기를 확인하세요: `ls -lh {{ARTIFACT_PATH}}`

[패키지 버전]
- Remotion 패키지는 반드시 4.0.429 이상을 사용하세요.
- package.json에 `"remotion": "^4.0.429"`, `"@remotion/cli": "^4.0.429"`, `"@remotion/transitions": "^4.0.429"`, `"@remotion/google-fonts": "^4.0.429"` 등 @remotion/* 패키지를 동일 버전으로 통일하세요.

[QA 요건]
- 최종 산출물은 반드시 `{{ARTIFACT_PATH}}` 경로에 저장하세요.
- 다른 태스크 결과를 덮어쓰지 않도록 단일 `final.mp4` 고집 금지.
- 리뷰 보완 라운드에서 재실행 시: 보완 내용 반영 후 같은 출력 파일로 재렌더링하세요.
- `remotion-dev/skills#remotion-best-practices` 스킬이 없으면 시스템이 자동 설치 후 학습 이력으로 기록합니다.

[영상 품질 기준]
- 해상도: 1920×1080 (Full HD) 이상, fps: 30
- Composition 설정: `<Composition width={1920} height={1080} fps={30} />`
- 애니메이션: CSS transition/animation 금지 — 반드시 `useCurrentFrame()` + `interpolate()`/`spring()` 사용
- spring 기본 설정: `{ damping: 200 }` (자연스러운 모션, 바운스 없음)
- 장면 전환: `@remotion/transitions`의 `TransitionSeries` 사용 (fade, slide, wipe 등)
  - 전환 시간: `linearTiming({ durationInFrames: 15 })` 이상
- 텍스트 애니메이션: `spring()` 기반 staggered 입장 효과
- 색상: 프로젝트 브랜드 컬러 활용, 그라데이션/그림자로 깊이감
- 타이포그래피: `@remotion/google-fonts`로 웹폰트 로드
- 각 Sequence에 `premountFor={1 * fps}` 설정 (프리로딩)

[고품질 연출 지침]
- 기본 길이: 55~65초. 장면별 목적(후킹/핵심 가치/신뢰/마무리 CTA) 명시.
- 정적인 슬라이드 나열 금지: 8~12개 이상 샷, 한 샷 3초 이상 정지 금지.
- 컷마다 카메라/레이아웃/텍스트 모션을 분리 설계해 리듬을 만드세요.
- 마스코트/브랜드 캐릭터 이미지가 있으면 시작 2~4초 키비주얼로 활용.
- 자막/텍스트는 safe area(좌우 8%, 상하 10%) 안에 배치, 대비비율과 가독성 보장.
- 화면 텍스트 정제: `\n`, `\t`, 백틱, 마크다운 기호(`#`, `*`, `-`) 원문 그대로 노출 금지.
- 줄바꿈은 이스케이프 문자가 아닌 실제 레이아웃으로 처리.

[출력 형식]
- 필수 섹션: 씬 타임라인(초 단위) → 렌더링 결과(파일 경로·크기) → 품질 체크리스트
- 최종 리포트에 씬 타임라인(초 단위) + 품질 체크리스트 결과를 포함하세요.

[성능 한도]
- 최대 라운드: 3회
- 최대 입력 토큰: 12,000 / 최대 출력 토큰: 6,000

<!-- [en] -->
[Execution Mode: Video Pre-production]
- Goal: produce a real video file (mp4). Planning docs alone do NOT count as completion.
- Reasoning level: HIGH — strictly follow the rendering pipeline and quality standards.
- Rendering engine: Remotion only (ffmpeg-only slide stitching and Python moviepy/Pillow are prohibited).

[Execution Order]
1. Complete all documentation/planning/meeting reflection tasks first.
2. Prepare the Remotion runtime: `pnpm exec remotion browser ensure`
   - Fallback if it fails: `pnpm --package=@remotion/cli dlx remotion browser ensure`
3. Create a Remotion entry (`index.ts`, `Root.tsx`, `Composition.tsx`) inside the project.
4. Render: `pnpm exec remotion render <entry-file> <composition-id> {{ARTIFACT_PATH}} --log=verbose`
5. After rendering, verify file existence and size: `ls -lh {{ARTIFACT_PATH}}`

[Package Versions]
- All Remotion packages MUST be version 4.0.429 or above.
- In package.json, use `"remotion": "^4.0.429"`, `"@remotion/cli": "^4.0.429"`, `"@remotion/transitions": "^4.0.429"`, `"@remotion/google-fonts": "^4.0.429"`, etc. All @remotion/* packages must share the same version.

[QA Requirements]
- Save the final artifact at `{{ARTIFACT_PATH}}`. (project_department_final.mp4 pattern)
- Do not force a single `final.mp4` filename when it can overwrite other tasks.
- On review-remediation reruns: apply fixes first, then re-render to the same output path.
- If `remotion-dev/skills#remotion-best-practices` is missing, the system auto-installs it and records it as learned.

[Video Quality Standards]
- Resolution: 1920×1080 (Full HD) minimum, fps: 30
- Composition config: `<Composition width={1920} height={1080} fps={30} />`
- Animation: NEVER use CSS transition/animation — always use `useCurrentFrame()` + `interpolate()`/`spring()`
- spring defaults: `{ damping: 200 }` (smooth motion, no bounce)
- Scene transitions: use `TransitionSeries` from `@remotion/transitions` (fade, slide, wipe, etc.)
  - Transition timing: `linearTiming({ durationInFrames: 15 })` minimum
- Text animation: use `spring()`-based staggered entrance effects
- Colors: leverage project brand colors, add depth with gradients/shadows
- Typography: load web fonts via `@remotion/google-fonts`
- Add `premountFor={1 * fps}` on each Sequence for preloading

[High Quality Direction]
- Target 55-65 seconds by default; define scene goals (hook/core value/proof/CTA) per shot.
- No static slide-show: use at least 8-12 shots; keep single-shot stillness under 3 seconds.
- Design per-shot motion (camera/layout/text) to avoid template-like pacing.
- Use mascot/brand character image as opening key visual for the first 2-4 seconds if available.
- Keep subtitles/text within safe area (8% horizontal, 10% vertical) with clear hierarchy and contrast.
- Sanitize on-screen text: never render raw `\n`/`\t`, backticks, or markdown tokens (`#`, `*`, `-`).
- Use real layout line breaks, not escaped string literals.

[Output Template]
- Required sections: scene timeline (by second) → render result (file path & size) → quality checklist
- Include a second-by-second scene timeline and quality checklist in the final report.

[Performance Limits]
- Max rounds: 3
- Max input tokens: 12,000 / Max output tokens: 6,000
