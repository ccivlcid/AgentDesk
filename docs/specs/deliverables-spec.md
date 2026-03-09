# 결과물 (Deliverables) 화면 기획서

## 1. 개요

완료(done) / 리뷰(review) 상태의 **루트 업무**에서 생성된 산출물(파일, Git diff, 결과 요약)을 관리하는 화면.
- 협업(collaborating)에서 위임된 하위 업무(`source_task_id`가 있는 업무)는 **목록에서 제외**
- 루트 업무 단위로 카드를 표시
- 각 카드 내에서 **협업 참여자 정보**(누가 어떤 부서에서 어떤 결과를 냈는지)를 섹션으로 표시

## 2. 데이터 소스

| 항목 | API / 출처 |
|------|-----------|
| 업무 목록 | `GET /api/deliverables` — `status IN ('done','review')` AND `source_task_id IS NULL` |
| 결과 요약 | `task.result` 필드 |
| 협업 정보 | `GET /api/task-reports/:taskId` → `team_reports` 배열 + `subtasks` 배열 |
| 산출물 파일 | `GET /api/task-reports/:taskId/artifacts` — project_path 내 파일 스캔 |
| Git 변경사항 | `getTaskDiff(taskId)` |
| 병합/폐기 | `mergeTask(taskId)`, `discardTask(taskId)` |

## 3. 화면 레이아웃

```
+----------------------------------------------------------+
|  결과물                              [상태: 전체 v] [새로고침] |
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  | [Avatar] 마케팅 전략 보고서 작성          [v 완료]   |  |
|  |          Mina (기획팀) · 2026-03-04                 |  |
|  |          2 파일 (2.3 MB) · 협업 3명                 |  |
|  |                                          [v 펼치기] |  |
|  +----------------------------------------------------+  |
|  | 결과 요약                                           |  |
|  | +------------------------------------------------+ |  |
|  | | Q2 마케팅 전략 보고서를 작성했습니다.             | |  |
|  | | 핵심 포인트: SNS 집중, B2B 확대...               | |  |
|  | +------------------------------------------------+ |  |
|  |                                                    |  |
|  | 협업 참여자                                         |  |
|  | +------------------------------------------------+ |  |
|  | | [Ava] Alex · 개발팀 · senior      [v 완료]      | |  |
|  | |       API 엔드포인트 추가 완료                    | |  |
|  | | [Ava] Juno · 디자인팀 · junior     [v 완료]      | |  |
|  | |       랜딩 페이지 디자인 작업 완료                 | |  |
|  | | [Ava] Sora · QA팀 · senior         [v 완료]      | |  |
|  | |       테스트 커버리지 90% 달성                     | |  |
|  | +------------------------------------------------+ |  |
|  |                                                    |  |
|  | 산출물 파일                                         |  |
|  | +------------------------------------------------+ |  |
|  | | PPT  marketing_strategy.pptx  2.3MB     [다운]  | |  |
|  | | TXT  summary.md               12KB  [보기][다운] | |  |
|  | +------------------------------------------------+ |  |
|  |                                                    |  |
|  | Git 변경사항                                        |  |
|  | +------------------------------------------------+ |  |
|  | | branch/task-42  +45 -12  3 files                | |  |
|  | | [Diff 보기]  [병합]  [폐기]                      | |  |
|  | +------------------------------------------------+ |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

## 4. 카드 구조 (DeliverableCard)

### 4-1. 접힌 상태 (기본)
- 좌측: AgentAvatar (40px)
- 제목: `task.title`
- 상태 배지: done=초록, review=노랑
- 담당자 이름 + 부서 + 완료일
- 파일 수 + 총 크기 (산출물이 있을 때만)
- 협업자 수 (2명 이상일 때만 표시: "협업 N명")
- 우측: 펼치기/접기 화살표

### 4-2. 펼친 상태 — 4개 섹션

#### A. 결과 요약 (task.result)
- 터미널 스타일 박스 (emerald 테두리)
- 최대 600자, 넘으면 "..." 표시
- result가 없으면 섹션 숨김

#### B. 협업 참여자 (CollaboratorSection)
- `GET /api/task-reports/:taskId`의 `team_reports` 배열에서 루트 업무 제외한 나머지
- 각 참여자 행:
  - AgentAvatar (28px) + 에이전트 이름 + 부서명 + 역할
  - 상태 배지: done=초록, review=노랑, in_progress=파랑
  - 결과 요약 (summary 또는 result, 1줄 미리보기)
- 협업자가 0명(루트 업무만 있는 경우)이면 섹션 숨김
- 데이터: team_reports 중 `source_task_id`가 있는 항목들

#### C. 산출물 파일 (ArtifactList)
- 파일 아이콘 + 파일명 + 크기
- 파일 유형별 액션:

| 파일 유형 | 아이콘 | 액션 |
|-----------|--------|------|
| .pptx, .docx, .xlsx | PPT/DOC/XLS | [다운로드] |
| .pdf | PDF | [다운로드] |
| .mp4 | VID | [다운로드] |
| .md, .txt, .json, .csv | TXT | [보기] [다운로드] |
| .html | HTML | [미리보기] [다운로드] |
| .png, .jpg, .gif, .svg | IMG | [미리보기] [다운로드] |

- 산출물 0건이면 "산출물 파일 없음" 표시

#### D. Git 변경사항 (GitSection)
- project_path가 있을 때만 표시
- `getTaskDiff(taskId)` 호출
- 브랜치명, 변경 통계 (+lines -lines, N files)
- 액션 버튼: [Diff 보기] [병합] [폐기]
- hasWorktree=false이면 "Git worktree 없음" 표시
- DiffModal 재사용

## 5. 협업 데이터 구조

### DB 관계
```
[루트 업무] ──1:N──> [subtasks] ──1:1──> [위임 업무 (source_task_id = 루트)]
     │                                       │
     └── assigned_agent_id                   └── assigned_agent_id (협업자)
```

### API 응답 활용 (GET /api/task-reports/:taskId)
```typescript
{
  team_reports: [
    {
      task_id: string,          // 위임 업무 ID
      source_task_id: string,   // 루트 업무 ID (있으면 협업자)
      agent_name: string,
      agent_name_ko: string,
      agent_role: string,
      department_name: string,
      department_name_ko: string,
      status: string,
      summary: string,          // 결과 요약 (1줄)
      completed_at: number,
      documents: [...],         // 해당 협업자가 생성한 문서들
    },
    ...
  ],
  subtasks: [
    {
      title: string,
      status: string,
      agent_name: string,
      target_dept_name: string,
      delegated_task_id: string,  // team_reports의 task_id와 매칭
    },
    ...
  ]
}
```

### 표시 로직
1. `team_reports`에서 `source_task_id`가 있는 항목 = 협업자
2. 해당 항목의 `agent_name`, `department_name`, `agent_role`, `status`, `summary` 표시
3. 협업자 수 = `team_reports.length - 1` (루트 업무 자신 제외)

## 6. 필터

- 상태: 전체 / done / review
- (향후 확장: 에이전트별, 프로젝트별)

## 7. 서버 API

### GET /api/deliverables
- 조건: `status IN ('done','review')` AND (`source_task_id IS NULL OR TRIM(source_task_id) = ''`)
- 정렬: completed_at DESC
- LIMIT 100
- 응답 필드: id, title, description, status, project_path, result, output_format,
  agent_name, agent_name_ko, agent_role, agent_avatar, dept_name, dept_name_ko, project_name

### GET /api/task-reports/:taskId (기존 API 재사용)
- team_reports 배열에서 협업 참여자 정보 추출
- 카드 펼칠 때 lazy-load

### GET /api/task-reports/:taskId/artifacts
- project_path 기반 파일 스캔
- 스캔 대상:
  1. video_output/, out/, output/, reports/, dist/, build/, docs/ 디렉토리 (깊이 3)
  2. 프로젝트 루트 (깊이 1)
  3. task description/result/logs에서 파일 경로 패턴 추출
- 응답: { ok, artifacts: [{ id, title, relativePath, mime, size, updatedAt, type }] }

### GET /api/task-reports/:taskId/artifacts/download?path=<rel>&inline=0|1
- 파일 스트림 응답
- path traversal 방지 (resolved path가 project_path 내인지 검증)
- inline=1이면 Content-Disposition: inline (미리보기용)

## 8. 프론트엔드 컴포넌트

```
src/components/deliverables/
  Deliverables.tsx           메인 화면 (리스트 + 필터)
  DeliverableCard.tsx        개별 카드 (접기/펼치기, 4개 섹션)
  CollaboratorSection.tsx    협업 참여자 목록 섹션 (NEW)
  ArtifactList.tsx           산출물 파일 목록
  TextPreviewModal.tsx       텍스트 파일 미리보기 모달
  GitSection.tsx             Git 변경사항 섹션 (diff 통계 + 액션)
```

기존 재사용:
- `taskboard/DiffModal.tsx` — Git diff 상세 모달
- `AgentAvatar.tsx` — 에이전트 아바타
- `GET /api/task-reports/:taskId` — 협업 정보용 기존 API

## 9. 엣지케이스

- 결과물 0건: 📦 아이콘 + "완료된 업무가 없습니다"
- project_path 없음: Git 섹션 숨김, 산출물 비어있을 수 있음
- result 없음: 결과 요약 섹션 숨김
- 협업자 0명 (단독 업무): 협업 참여자 섹션 숨김
- 산출물 로딩 중: 스켈레톤/스피너 표시
- 파일 없음: "산출물 파일 없음" 텍스트
- team_reports 로딩 실패: 협업 섹션에 에러 메시지 표시
