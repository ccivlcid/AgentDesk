# AgentDesk EXE 패키징 계획

> 현재 프로젝트를 Windows에서 실행 가능한 exe(또는 설치형 앱)로 만드는 방법과 단계별 계획입니다.

---

## 1. 현재 구조 요약

| 구분 | 내용 |
|------|------|
| **백엔드** | Express 서버 (`server/index.ts`), 포트 8790, `tsx`로 TypeScript 직접 실행 |
| **프론트엔드** | Vite + React, `pnpm build` 시 `dist/` 생성 |
| **프로덕션 동작** | 서버가 `dist/`를 정적 파일로 서빙, SPA 폴백 |
| **경로 의존** | `DIST_DIR` = `server/config/runtime.ts`에서 `SERVER_DIRNAME` 기준 `../../dist` |
| **Node** | engines `>=22`, ESM(`"type": "module"`) |

exe로 만들려면 **서버 실행 파일화** + **프론트 빌드물 포함** + **(선택) 실행 시 브라우저 자동 오픈**이 필요합니다.

---

## 2. 방안 비교

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. Electron** | 앱을 Electron으로 감싸고, 서버를 자식 프로세스로 실행 후 창에서 로드 | 검증된 방식, 단일 exe/설치 패키지, 아이콘·설치 경로 제어 가능 | 바이너리 크기 증가, Electron 의존성 |
| **B. Node SEA** | Node 22 Single Executable Application으로 서버만 exe화, `dist`는 exe 옆에 두기 | Node만 사용, 공식 기능 | ESM/번들 제한, dist는 별도 폴더 필요, 브라우저 자동 오픈은 별도 처리 |
| **C. pkg** | Vercel pkg로 Node 앱을 exe로 묶기 | 단일 exe 가능 | ESM/최신 Node 지원 불안정, 유지보수 약함 |

**권장: 방안 A (Electron)**  
- 한 번의 더블클릭으로 서버 기동 + 창에서 UI 제공 가능  
- electron-builder로 exe/설치 프로그램(NSIS 등) 생성이 익숙함  
- `dist`와 서버 번들을 패키지에 포함하기 쉬움  

**대안: 방안 B (Node SEA)**  
- Node만 쓰고 싶고, “실행 파일 하나 + 같은 폴더의 dist” 형태로 배포해도 될 때 고려  

---

## 3. 권장 방안 A: Electron 기반 exe — 단계별 계획

### 3.1 목표

- Windows에서 **실행 파일 하나(또는 설치 프로그램)** 로 실행
- 실행 시 **서버 자동 기동** + **Electron 창에서 `http://127.0.0.1:8790` 로드**
- 기존 개발 흐름(`pnpm dev`, `pnpm build`)은 유지

### 3.2 전제 조건

- **서버를 JS로 실행 가능하게** 해야 함  
  - 현재는 `tsx server/index.ts`로만 실행되므로, 다음 중 하나 필요:
  - **옵션 1**: 서버용 TS 빌드 설정 추가 (`tsc`로 `server/` → `dist-server/` 등) 후 `node dist-server/index.js` 실행
  - **옵션 2**: esbuild 등으로 `server/` 진입점을 단일 JS 번들로 만들어 실행 (권장: 패키징 단순)

- **프론트**  
  - 기존대로 `pnpm build` → `dist/` 생성

- **경로 처리**  
  - exe(또는 unpacked 앱) 기준으로 `dist` 경로를 찾도록 런타임에서 조정  
  - 예: `process.resourcesPath`(Electron) 또는 `path.join(process.execPath, '..', 'dist')` 등

### 3.3 구현 단계

| 단계 | 작업 | 상세 |
|------|------|------|
| **1** | 서버 번들/빌드 설정 | esbuild 스크립트 추가: `server/index.ts`(및 의존) → `dist-server/agentdesk-server.js` (단일 파일). 또는 tsc로 서버만 emit하는 `tsconfig.server.json` 추가 후 `dist-server/` 출력 |
| **2** | 런타임 경로 처리 | 패키징 시 `dist`가 exe 옆(또는 resources)에 오도록 가정하고, `server/config/runtime.ts`의 `DIST_DIR`을 환경 변수 또는 `process.env.PORTABLE_EXECUTABLE_DIR` 등으로 override 가능하게 수정 |
| **3** | Electron 진입점 추가 | `electron/main.js`: 1) 서버 프로세스 spawn (`node dist-server/agentdesk-server.js` 또는 번들 경로), 2) 8790 준비 대기, 3) `BrowserWindow`에서 `http://127.0.0.1:8790` 로드, 4) 창 닫을 때 서버 프로세스 종료 |
| **4** | 패키징 스크립트 | `electron-builder` 설정: `dist/`(프론트), `dist-server/`(서버 번들 또는 단일 js), Node 런타임(필요 시 embedded) 포함. Windows target: `portable` exe 또는 `nsis` 설치형 |
| **5** | npm/pnpm 스크립트 | `pnpm build` 후 `pnpm run build:server`, `pnpm run pack`(electron-builder) 순서로 exe 생성. 필요 시 `build:exe` 한 번에 실행 |

### 3.4 디렉터리/파일 구성 예시 (구현 후)

```
AgentDesk/
├── dist/                    # vite build (기존)
├── dist-server/             # 서버 단일 번들 (신규)
│   └── agentdesk-server.js
├── electron/
│   └── main.js              # Electron 메인 프로세스
├── package.json             # electron, electron-builder 추가
├── scripts/
│   └── build-server.mjs     # esbuild로 서버 번들
└── electron-builder.yml     # 또는 package.json "build" 섹션
```

### 3.5 주의사항

- **DB/로그 경로**: 현재 `process.cwd()` 기반이면, exe 실행 시 cwd가 exe 위치가 되도록 하거나, 사용자 데이터는 `app.getPath('userData')` 등 고정 경로에 두는 편이 안전합니다. 필요 시 `DEFAULT_DB_PATH` 등을 Electron 쪽에서 주입.
- **네이티브 모듈**: 서버에 `.node` 네이티브 바이너리가 없으므로, Electron에서 `child_process`로 Node 서버만 띄우면 됩니다.
- **포트 충돌**: 8790이 이미 사용 중이면 실패할 수 있으므로, 실패 시 사용자에게 메시지 표시 또는 포트 자동 변경 로직을 고려할 수 있습니다.

---

## 4. 대안 B: Node SEA만 사용할 때 (요약)

- Node 22+ 의 **Single Executable Application**으로 서버 진입점만 exe화.
- 절차: (1) 서버를 단일 JS로 번들, (2) `node --experimental-sea-config` 등으로 exe 생성, (3) `dist` 폴더는 exe와 같은 디렉터리에 두고, 실행 시 `DIST_DIR`을 exe 위치 기준으로 설정.
- 브라우저 자동 오픈이 필요하면 exe에서 서버 기동 후 `child_process`로 `start http://127.0.0.1:8790` 실행하면 됩니다.

---

## 5. 다음 액션 제안

1. **방안 확정**: Electron(exe + 설치형) vs Node SEA(단일 exe + dist 폴더 동봉) 중 선택.
2. **서버 빌드**: esbuild로 `server` 단일 번들 생성 스크립트 추가 및 `DIST_DIR` 오버라이드 가능하게 수정.
3. **Electron 선택 시**: `electron/`, `electron-builder` 설정, `package.json` 스크립트 추가 후 `pnpm run build:exe`로 exe 생성까지 구현.

---

## 6. 구현 완료 사항 (현재)

- **서버 번들**: `pnpm run build:server` → `dist-server/agentdesk-server.cjs` (esbuild CJS, sharp는 external)
- **런타임 경로**: `AGENTDESK_DIST_DIR`, `AGENTDESK_SERVER_DIR`, `AGENTDESK_VERSION` 환경 변수 지원
- **Electron**: `electron/main.cjs` — 서버를 메인 프로세스에서 require 후 창에서 `http://127.0.0.1:8790` 로드
- **패키징**: `package.json`에 `main`, `build`(electron-builder), 스크립트 `build:server`, `build:exe`, `pack` 추가

### 6.1 exe 빌드 방법

```bash
# 1) 프론트 + 서버 번들 생성
pnpm run build
pnpm run build:server

# 2) Windows exe 생성 (portable + nsis 설치형)
pnpm run build:exe
# 또는 바로
pnpm exec electron-builder --win
```

생성물: `release/AgentDesk-2.0.1-portable.exe`, `release/AgentDesk-Setup-2.0.1.exe` (및 `release/win-unpacked/`)

### 6.2 문제 해결

- **"app.asar is used by another process"**  
  다른 프로그램(탐색기, 백신 등)이 `release` 폴더를 사용 중일 수 있음. 해당 프로그램을 연 폴더에서 나간 뒤 `release` 폴더를 수동 삭제하고 다시 `pnpm run build:exe` 실행.

- **코드 서명 오류(winCodeSign 7z)**  
  `package.json`의 `win.signAndEditExecutable: false`로 서명 비활성화됨. 서명이 필요하면 Windows 개발자 모드(심볼릭 링크 허용) 또는 서명 인증서 설정 후 해당 옵션을 켜면 됨.

- **Electron 로컬 실행**
  `pnpm exec electron .` 전에 Electron 바이너리 설치가 필요함. 스크립트 실행이 막혀 있다면:
  ```bash
  pnpm approve-builds   # electron 선택
  pnpm install
  pnpm exec electron .
  ```

- **sharp "Cannot find module 'detect-libc'"**
  `asarUnpack`에 `detect-libc`, `@img`, `semver` 등 sharp 의존 모듈이 포함되어야 함. `electron/main.cjs`에서 `NODE_PATH`를 unpacked 경로로 설정 후 `Module._initPaths()` 호출.

- **Git 미설치 사용자 (worktree 생성 실패)**
  Git이 설치되지 않은 PC에서는 **direct mode**로 자동 전환됨. Agent가 프로젝트 디렉토리에서 직접 작업하며, worktree 격리·병합·롤백 기능은 비활성화됨. Git을 설치하면 worktree 기반 격리가 자동 활성화됨.
