# 인프라보안팀 보완계획 (2026-03-05)

## 1) [보완계획] 무결성 검증(SHA-256) + 버전 고정

### 1.1 기준 산출물(타 부서 결과물 연계)
- 분석 기반 PPT 원본: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\488b9ff8\docs\reports\2026-03-05-analysis-based-deck.pptx`
- PPT 생성 스크립트: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\488b9ff8\docs\reports\build-2026-03-05-analysis-ppt.mjs`
- 문서디자인팀 최종 보고서형 PPT: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\2a9d8197\docs\reports\AgentDesk-Analysis-Report.pptx`

### 1.2 버전 고정 정책
- 해시 알고리즘: `SHA-256`
- 버전 라벨: `ppt-security-baseline@2026-03-05`
- 소스 커밋 고정
  - 분석 기반 PPT/빌드 스크립트: `627b790`
  - 문서디자인팀 보고서 PPT: `56d73f6`
- 무결성 기준선 파일: `docs/reports/security/2026-03-05-artifact-integrity.csv`

### 1.3 운영 규칙
- 배포 직전 `Get-FileHash -Algorithm SHA256` 재실행 후 기준선과 100% 일치해야 함
- 불일치 시 즉시 배포 중지 후 운영팀 `보안검증` 게이트를 `blocked`로 유지

## 2) [보완계획] PPT 협업 저장소 권한 최소화(RBAC) 점검

### 2.1 점검 대상
- 현재 작업 저장소: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\df297811\docs\reports`
- 원본 산출물 저장소: `C:\PythonProjects\AgentDesk\.agentdesk-worktrees\488b9ff8\docs\reports`

### 2.2 점검 방법
- 명령: `icacls <path>`
- 결과 기록: `docs/reports/security/2026-03-05-rbac-access-log.csv`

### 2.3 RBAC 최소권한 기준
- `Administrators`, `SYSTEM`: `F`(Full)
- 협업 계정(`CodexSandboxUsers`, SID): `M`(Modify)
- `BUILTIN\Users`: `RX`(Read/Execute)
- 임의 `Everyone:(F)` 또는 광범위 Full Control 부여 금지

## 3) [보완계획] 배포 전 CI 보안 게이트 제출 항목

### 3.1 필수 통과 조건
1. 비밀정보 스캔: `0건`
2. 악성 매크로/첨부파일 검사: `PASS` (`vbaProject.bin`, `activeX`, 실행성 첨부파일 없음)
3. 접근권한 변경 이력 로그: 제출 완료

### 3.2 제출 패키지
- `docs/reports/security/2026-03-05-security-gate-report.md`
- `docs/reports/security/2026-03-05-artifact-integrity.csv`
- `docs/reports/security/2026-03-05-rbac-access-log.csv`
