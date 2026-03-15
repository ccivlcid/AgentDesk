import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Section {
  heading: string;
  body: string;
  keys?: { keys: string[]; desc: string }[];
}

interface Chapter {
  id: string;
  emoji: string;
  title: string;
  sections: Section[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "getting-started",
    emoji: "🚀",
    title: "시작하기",
    sections: [
      {
        heading: "AgentDesk란?",
        body: "AgentDesk는 여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS입니다. macOS 바탕화면 은유로 설계되어 메뉴바, 데스크톱 아이콘, 위젯, Dock, 앱 창 등으로 구성됩니다.",
      },
      {
        heading: "첫 프로젝트 만들기",
        body: "1. 데스크탑 아이콘 📁(프로젝트 생성)을 클릭합니다.\n2. 프로젝트 이름과 목표를 입력합니다.\n3. 에이전트를 배정하고 태스크를 실행합니다.\n\n또는 상단 메뉴바의 프로젝트 선택기에서 새 프로젝트를 생성할 수 있습니다.",
      },
      {
        heading: "화면 구성 한눈에 보기",
        body: "• 상단 메뉴바 — 로고, 프로젝트 선택, 비용, 알림, 시각\n• 바탕화면 — 아이콘 + 위젯 배치 영역\n• 하단 Dock — ⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat\n• 앱 창 — 트래픽 라이트(닫기·최소화·최대화) 스타일",
      },
    ],
  },
  {
    id: "desktop",
    emoji: "🖥️",
    title: "바탕화면",
    sections: [
      {
        heading: "데스크톱 아이콘",
        body: "바탕화면 아이콘을 클릭하면 해당 기능이 열립니다.\n\n• 👤 에이전트 설정 — 에이전트·부서 관리\n• 📁 프로젝트 생성 — 프로젝트 마법사\n• ▶ 태스크 실행 — 즉시 태스크 생성\n• ⚡ 워크플로 빌더 — 파이프라인 편집\n• 📋 라이브러리 — Skills·Rules·Memory\n• 💬 채팅 — 팀 채널",
      },
      {
        heading: "아이콘 이동",
        body: "아이콘을 드래그하면 바탕화면 어디든 자유롭게 배치할 수 있습니다. 위치는 브라우저를 닫아도 저장됩니다.",
      },
      {
        heading: "Jiggle Mode (흔들기 모드)",
        body: "빈 바탕화면을 600ms 이상 길게 누르면 Jiggle Mode가 활성화됩니다.\n\n• 프로젝트 아이콘 좌상단에 빨간 ✕ 배지가 나타납니다.\n• ✕를 클릭하면 해당 프로젝트가 삭제됩니다.\n• Esc 키를 누르거나 바탕화면 빈 곳을 클릭하면 해제됩니다.",
      },
      {
        heading: "Quick Look (빠른 미리보기)",
        body: "프로젝트 아이콘을 클릭해 선택한 뒤 Space 키를 누르면 빠른 미리보기 패널이 열립니다.\n\n• 프로젝트명, 경로, 목표, 태스크 수, 담당 에이전트 등을 확인합니다.\n• Esc 키 또는 패널 바깥 클릭으로 닫습니다.\n\n프로젝트 아이콘을 우클릭해도 '빠른 미리보기' 메뉴를 사용할 수 있습니다.",
      },
    ],
  },
  {
    id: "agents",
    emoji: "🤖",
    title: "에이전트",
    sections: [
      {
        heading: "에이전트란?",
        body: "에이전트는 특정 역할을 자동으로 수행하는 AI 작업자입니다. 각 에이전트는 독립적으로 실행되며 태스크를 배정받아 결과를 보고합니다.",
      },
      {
        heading: "에이전트 상태 표시",
        body: "• ● (초록) — idle: 대기 중\n• ● (노랑) — working: 작업 중\n• ─ — paused: 일시 정지\n• ✕ — error: 오류 발생\n\n에이전트 위젯 또는 AgentManager 창에서 실시간 상태를 확인합니다.",
      },
      {
        heading: "에이전트 만들기",
        body: "1. 데스크탑 아이콘 👤(에이전트 설정)를 클릭합니다.\n2. '새 에이전트' 버튼을 클릭합니다.\n3. 이름, 역할(Role), 모델을 설정합니다.\n4. 부서(Department)에 배치합니다.",
      },
    ],
  },
  {
    id: "tasks",
    emoji: "📋",
    title: "태스크",
    sections: [
      {
        heading: "태스크란?",
        body: "태스크는 에이전트에게 부여하는 작업 단위입니다. 각 태스크는 상태(pending → running → done)를 가지며 서브태스크로 분해될 수 있습니다.",
      },
      {
        heading: "태스크 생성",
        body: "• 데스크탑 아이콘 ▶(태스크 실행)을 클릭합니다.\n• 커맨드 팔레트(Ctrl+Shift+K)에서 N 키를 눌러 빠르게 생성합니다.\n\n태스크 생성 시 제목, 설명, 배정 에이전트, 우선순위를 설정합니다.",
      },
      {
        heading: "태스크 모니터링",
        body: "Tasks 위젯을 바탕화면에 추가하면 실시간으로 진행 상황을 볼 수 있습니다.\n위젯 추가: 앱 메뉴(AgentDesk 클릭) → '위젯 추가...'",
      },
    ],
  },
  {
    id: "workflow",
    emoji: "⚡",
    title: "워크플로",
    sections: [
      {
        heading: "워크플로란?",
        body: "워크플로는 여러 태스크를 연결한 자동화 파이프라인입니다. 한 태스크의 결과를 다음 태스크의 입력으로 전달할 수 있습니다.",
      },
      {
        heading: "워크플로 빌더 사용법",
        body: "1. Dock의 ⚡ 버튼 또는 데스크탑 아이콘 ⚡를 클릭합니다.\n2. 캔버스에 에이전트 노드를 드래그합니다.\n3. 노드 간 연결선을 그어 흐름을 정의합니다.\n4. '실행' 버튼으로 파이프라인을 시작합니다.",
      },
      {
        heading: "예약 태스크",
        body: "Workflow 창 → 'Scheduled' 탭에서 cron 표현식으로 태스크를 예약합니다.\n예: `0 9 * * 1-5` — 평일 오전 9시 자동 실행",
      },
    ],
  },
  {
    id: "shortcuts",
    emoji: "⌨️",
    title: "단축키",
    sections: [
      {
        heading: "전역 단축키",
        keys: [
          { keys: ["Ctrl", "Shift", "K"], desc: "커맨드 팔레트 (Spotlight) 열기" },
          { keys: ["Cmd", "K"], desc: "커맨드 팔레트 열기 (macOS)" },
          { keys: ["Ctrl", "↑"], desc: "Mission Control — 열린 창 오버뷰" },
          { keys: ["?"], desc: "유저 가이드 열기/닫기" },
          { keys: ["Esc"], desc: "패널 닫기 / Jiggle 해제 / Quick Look 닫기" },
        ],
        body: "",
      },
      {
        heading: "g + 키 — 앱 창 토글 (VIM 스타일)",
        keys: [
          { keys: ["g", "w"], desc: "Workflow 창 토글" },
          { keys: ["g", "l"], desc: "Library 창 토글" },
          { keys: ["g", "s"], desc: "Settings 창 토글" },
          { keys: ["g", "c"], desc: "Chat 창 토글" },
          { keys: ["g", "a"], desc: "에이전트 설정 창 토글" },
          { keys: ["g", "e"], desc: "에이전트 REPL 창 토글" },
        ],
        body: "",
      },
      {
        heading: "바탕화면",
        keys: [
          { keys: ["Space"], desc: "선택된 프로젝트 아이콘 Quick Look" },
          { keys: ["Long Press (600ms)"], desc: "빈 바탕화면 — Jiggle Mode ON" },
        ],
        body: "",
      },
      {
        heading: "커맨드 팔레트 내",
        keys: [
          { keys: ["↑", "↓"], desc: "항목 이동" },
          { keys: ["↵"], desc: "선택 / 실행" },
          { keys: ["N"], desc: "(빈 검색) 새 태스크 생성" },
          { keys: ["T"], desc: "(빈 검색) 태스크 보드" },
          { keys: ["A"], desc: "(빈 검색) 에이전트" },
          { keys: ["S"], desc: "(빈 검색) 스킬" },
          { keys: ["M"], desc: "(빈 검색) 메모리" },
          { keys: [","], desc: "(빈 검색) 설정" },
        ],
        body: "",
      },
    ],
  },
  {
    id: "widgets",
    emoji: "📦",
    title: "위젯",
    sections: [
      {
        heading: "위젯이란?",
        body: "위젯은 바탕화면에 고정된 미니 뷰입니다. 드래그로 이동하고 모서리를 끌어 크기를 조정할 수 있습니다.",
      },
      {
        heading: "사용 가능한 위젯",
        body: "• 🤖 Agents 위젯 — 에이전트 실시간 상태\n• 📋 Tasks 위젯 — 진행 중인 태스크 목록\n• 🔔 Alerts 위젯 — 주요 알림 표시\n• 💰 CLI Cost 위젯 — 오늘의 AI 사용 비용\n• 🌊 Flow Graph 위젯 — 에이전트 흐름 그래프",
      },
      {
        heading: "위젯 추가 방법",
        body: "1. 상단 메뉴바 'AgentDesk' 클릭 → '위젯 추가...'\n2. 또는 우클릭 컨텍스트 메뉴 → '위젯 추가'\n3. 원하는 위젯을 선택하면 바탕화면에 배치됩니다.\n\n위젯 헤더 오른쪽 ✕ 버튼으로 제거합니다.",
      },
    ],
  },
];

interface UserGuidePanelProps {
  open: boolean;
  onClose: () => void;
  initialChapter?: string;
}

const mono = "var(--th-font-mono)";

const kbdStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10,
  color: "var(--th-text-secondary)",
  background: "var(--th-bg-elevated)",
  border: "1px solid var(--th-border)",
  borderRadius: 4,
  padding: "2px 6px",
  boxShadow: "0 1px 0 var(--th-border)",
  display: "inline-block",
};

export default function UserGuidePanel({ open, onClose, initialChapter }: UserGuidePanelProps) {
  const [selectedId, setSelectedId] = useState(initialChapter ?? "getting-started");

  useEffect(() => {
    if (initialChapter) setSelectedId(initialChapter);
  }, [initialChapter]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const chapter = CHAPTERS.find((c) => c.id === selectedId) ?? CHAPTERS[0];

  const panel = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 949,
            background: "var(--th-modal-overlay)",
          }}
        />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-label="AgentDesk 유저 가이드"
        style={{
          position: "fixed",
          top: 44,
          right: 0,
          bottom: 0,
          width: 480,
          zIndex: 950,
          display: "flex",
          flexDirection: "column",
          background: "var(--th-panel-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid var(--th-border)",
          transform: open ? "translateX(0)" : "translateX(480px)",
          transition: "transform 0.28s cubic-bezier(0.32,0,0.15,1)",
          fontFamily: mono,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            height: 44,
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            background: "var(--th-bg-header)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ff5f57",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)", flex: 1 }}>
            AgentDesk 가이드
          </span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: mono }}>Esc</span>
        </div>

        {/* Body — 2단 */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* 좌측 챕터 nav */}
          <div
            style={{
              width: 160,
              flexShrink: 0,
              borderRight: "1px solid var(--th-border)",
              overflowY: "auto",
              padding: "8px 0",
              background: "var(--th-bg-sidebar)",
            }}
          >
            {CHAPTERS.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 14px",
                    background: active ? "var(--th-accent-glow)" : "transparent",
                    border: "none",
                    borderRight: active ? "2px solid var(--th-accent)" : "2px solid transparent",
                    color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
                    fontFamily: mono,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span>{c.emoji}</span>
                  <span>{c.title}</span>
                </button>
              );
            })}
          </div>

          {/* 우측 콘텐츠 */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 20px 32px",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{chapter.emoji}</div>
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--th-text-heading)",
                fontFamily: mono,
              }}
            >
              {chapter.title}
            </h2>

            {chapter.sections.map((sec) => (
              <div key={sec.heading} style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--th-text-muted)",
                    fontFamily: mono,
                  }}
                >
                  {sec.heading}
                </h3>

                {/* 키보드 단축키 목록 */}
                {sec.keys && sec.keys.length > 0 && (
                  <div style={{ marginBottom: sec.body ? 10 : 0 }}>
                    {sec.keys.map(({ keys, desc }) => (
                      <div
                        key={keys.join("+")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          gap: 12,
                          borderBottom: "1px solid var(--th-border)",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--th-text-secondary)", fontFamily: mono }}>
                          {desc}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {keys.map((k, i) => (
                            <span key={i}>
                              <kbd style={kbdStyle}>{k}</kbd>
                              {i < keys.length - 1 && (
                                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", margin: "0 2px" }}>
                                  +
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 텍스트 본문 */}
                {sec.body && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.75,
                      color: "var(--th-text-secondary)",
                      fontFamily: mono,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {sec.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
