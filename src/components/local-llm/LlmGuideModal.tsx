import { useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import AppWindow from "../windows/AppWindow";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

/* ─── Provider definitions ───────────────────────────────── */

type Step = {
  title: { ko: string; en: string };
  desc: { ko: string; en: string };
  cmd?: string;
  tip?: { ko: string; en: string };
  warn?: { ko: string; en: string };
};

type Provider = {
  id: string;
  icon: string;
  name: string;
  badge: string;
  badgeColor: string;
  tagline: { ko: string; en: string };
  steps: Step[];
};

const PROVIDERS: Provider[] = [
  /* ── Ollama ── */
  {
    id: "ollama",
    icon: "🦙",
    name: "Ollama",
    badge: "LOCAL",
    badgeColor: "#3fb950",
    tagline: { ko: "무료 · 오픈소스 · 완전 로컬 실행", en: "Free · Open-source · Fully local" },
    steps: [
      {
        title: { ko: "Ollama 다운로드", en: "Download Ollama" },
        desc: {
          ko: "ollama.com 에서 운영체제에 맞는 패키지를 다운로드합니다.\nmacOS/Windows는 설치 프로그램, Linux는 쉘 스크립트로 설치합니다.",
          en: "Download the installer for your OS from ollama.com.\nmacOS/Windows: installer · Linux: shell script.",
        },
        tip: { ko: "설치 후 tray 아이콘이 생기면 서버가 자동 시작됩니다.", en: "After install, a tray icon appears — server starts automatically." },
      },
      {
        title: { ko: "설치 확인", en: "Verify Installation" },
        desc: { ko: "터미널을 열고 아래 명령어로 Ollama가 정상 설치됐는지 확인합니다.", en: "Open a terminal and verify the installation." },
        cmd: "ollama --version",
      },
      {
        title: { ko: "실행 앱 탭에서 상태 확인", en: "Check Status in Runtime Tab" },
        desc: {
          ko: "AgentDesk → 로컬 LLM → 실행 앱 탭으로 이동합니다.\nOllama 카드에 \"실행 중\" 상태가 표시되면 준비 완료입니다.",
          en: "Go to Local LLM → Runtime tab.\nIf the Ollama card shows \"Running\", you are ready.",
        },
        tip: { ko: "연결 안 되면 Start 버튼을 눌러 수동 시작하세요.", en: "If not connected, click Start to launch manually." },
      },
      {
        title: { ko: "모델 설치", en: "Install a Model" },
        desc: {
          ko: "AI 모델 탭 → 모델 라이브러리에서 원하는 모델을 고릅니다.\nPC 사양 배지(GPU/CPU/불가)를 확인한 후 설치 버튼을 클릭하세요.",
          en: "AI Models tab → Model Library → pick a model.\nCheck the hardware badge (GPU / CPU / N/A), then click Install.",
        },
        cmd: "ollama pull llama3.2:3b",
        tip: { ko: "처음이라면 llama3.2:3b (약 2 GB) 를 추천합니다.", en: "Recommend llama3.2:3b (~2 GB) for beginners." },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → 에이전트 선택 → Provider 설정에서\n\"Ollama\" 를 선택하고 설치한 모델을 지정합니다.",
          en: "Agent Manager → select an agent → Provider settings\n→ choose \"Ollama\" and specify the installed model.",
        },
        tip: { ko: "기본 URL: http://localhost:11434", en: "Default URL: http://localhost:11434" },
      },
    ],
  },

  /* ── LM Studio ── */
  {
    id: "lmstudio",
    icon: "🖥",
    name: "LM Studio",
    badge: "LOCAL",
    badgeColor: "#3fb950",
    tagline: { ko: "GUI 앱 · 모델 탐색 · 로컬 서버", en: "GUI App · Model browser · Local server" },
    steps: [
      {
        title: { ko: "LM Studio 설치", en: "Install LM Studio" },
        desc: {
          ko: "lmstudio.ai 에서 운영체제에 맞는 설치 파일을 다운로드합니다.\nmacOS / Windows / Linux 버전이 모두 제공됩니다.",
          en: "Download from lmstudio.ai for your OS.\nmacOS / Windows / Linux builds available.",
        },
      },
      {
        title: { ko: "모델 다운로드 (앱 내부)", en: "Download a Model (in-app)" },
        desc: {
          ko: "LM Studio 앱을 실행하고 Discover 탭에서 원하는 모델을 검색합니다.\n모델을 클릭하고 Download 버튼을 누르면 자동 다운로드됩니다.",
          en: "Launch LM Studio, go to Discover tab, search for a model.\nClick the model and press Download.",
        },
        tip: { ko: "Llama / Mistral / Phi 등 Hugging Face 모델을 바로 받을 수 있습니다.", en: "Llama / Mistral / Phi and other HuggingFace models available." },
      },
      {
        title: { ko: "Local Server 활성화", en: "Enable Local Server" },
        desc: {
          ko: "좌측 사이드바 ↔ 아이콘(Local Server) 탭을 클릭합니다.\n모델을 선택하고 Start Server 버튼을 누르세요. 기본 포트는 1234입니다.",
          en: "Click the ↔ icon (Local Server) in the left sidebar.\nSelect a model and click Start Server. Default port is 1234.",
        },
        warn: { ko: "LM Studio는 GUI 앱이므로 AgentDesk에서 시작/종료할 수 없습니다.\n반드시 수동으로 앱을 켜두세요.", en: "LM Studio is a GUI app — AgentDesk cannot start/stop it.\nKeep the app running manually." },
      },
      {
        title: { ko: "AgentDesk에서 확인", en: "Verify in AgentDesk" },
        desc: {
          ko: "로컬 LLM → 실행 앱 탭의 LM Studio 카드에서\n\"실행 중\" 상태와 로드된 모델 수가 표시됩니다.",
          en: "Local LLM → Runtime tab → LM Studio card\nshould show \"Running\" and the number of loaded models.",
        },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → Provider 설정에서\n\"LM Studio\" 또는 베이스 URL http://localhost:1234 로 연결하세요.",
          en: "Agent Manager → Provider settings\n→ select \"LM Studio\" or set base URL to http://localhost:1234",
        },
        tip: { ko: "기본 URL: http://localhost:1234 / OpenAI 호환 API", en: "Default URL: http://localhost:1234 / OpenAI-compatible API" },
      },
    ],
  },

  /* ── OpenAI ── */
  {
    id: "openai",
    icon: "⬡",
    name: "OpenAI",
    badge: "API",
    badgeColor: "#58a6ff",
    tagline: { ko: "GPT-4o · o3 · 사용량 과금", en: "GPT-4o · o3 · Pay-per-use" },
    steps: [
      {
        title: { ko: "OpenAI 계정 및 API 키 발급", en: "Create account & API key" },
        desc: {
          ko: "platform.openai.com 에 접속하여 계정을 만들고\nAPI Keys 메뉴에서 새 키를 발급합니다.\nsk-... 형태의 시크릿 키를 복사해 두세요.",
          en: "Go to platform.openai.com, create an account,\ngo to API Keys and generate a new key.\nCopy the sk-... secret key.",
        },
        warn: { ko: "API 키는 한 번만 표시됩니다. 반드시 안전한 곳에 저장하세요.", en: "The key is shown only once. Store it somewhere safe." },
      },
      {
        title: { ko: "API Provider 추가", en: "Add API Provider" },
        desc: {
          ko: "AgentDesk → 설정 → API Providers → + 새 Provider 추가\n타입: OpenAI, API 키 입력, 연결 테스트를 실행합니다.",
          en: "AgentDesk → Settings → API Providers → + New Provider\nType: OpenAI, paste API key, run Connection Test.",
        },
        tip: { ko: "연결 테스트 시 사용 가능한 모델 목록이 자동으로 캐시됩니다.", en: "Connection test auto-caches the available model list." },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → 에이전트 선택 → Provider에서\n방금 추가한 OpenAI provider를 선택하고 모델을 지정합니다.",
          en: "Agent Manager → select agent → Provider\n→ choose the OpenAI provider and select a model.",
        },
        tip: { ko: "추천 모델: gpt-4o (균형), o3-mini (추론 집중)", en: "Recommended: gpt-4o (balanced), o3-mini (reasoning)" },
      },
    ],
  },

  /* ── Anthropic ── */
  {
    id: "anthropic",
    icon: "◈",
    name: "Anthropic",
    badge: "API",
    badgeColor: "#58a6ff",
    tagline: { ko: "Claude 3.5 · 3.7 · 긴 컨텍스트", en: "Claude 3.5 · 3.7 · Long context" },
    steps: [
      {
        title: { ko: "Anthropic Console에서 API 키 발급", en: "Get API key from Anthropic Console" },
        desc: {
          ko: "console.anthropic.com 에 접속하고\nAPI Keys 메뉴에서 새 키를 생성합니다.\nsk-ant-... 형태의 키를 복사합니다.",
          en: "Go to console.anthropic.com\n→ API Keys → Create Key.\nCopy the sk-ant-... key.",
        },
        warn: { ko: "신규 계정은 초기 크레딧이 제공됩니다. 사용량을 주기적으로 확인하세요.", en: "New accounts get starter credits. Monitor your usage regularly." },
      },
      {
        title: { ko: "API Provider 추가", en: "Add API Provider" },
        desc: {
          ko: "AgentDesk → 설정 → API Providers → + 새 Provider\n타입: Anthropic, API 키 입력, 연결 테스트를 실행합니다.",
          en: "AgentDesk → Settings → API Providers → + New Provider\nType: Anthropic, paste key, run Connection Test.",
        },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → Provider에서 Anthropic을 선택하고\n사용할 Claude 모델을 지정합니다.",
          en: "Agent Manager → Provider → select Anthropic\nand specify the Claude model.",
        },
        tip: { ko: "추천 모델: claude-sonnet-4-6 (최신 고성능)", en: "Recommended: claude-sonnet-4-6 (latest, high performance)" },
      },
    ],
  },

  /* ── OpenRouter ── */
  {
    id: "openrouter",
    icon: "⇄",
    name: "OpenRouter",
    badge: "API",
    badgeColor: "#58a6ff",
    tagline: { ko: "200+ 모델 · 단일 API · 비교 구매", en: "200+ models · Single API · Compare & shop" },
    steps: [
      {
        title: { ko: "OpenRouter 가입 & 크레딧 충전", en: "Sign up & add credits" },
        desc: {
          ko: "openrouter.ai 에서 가입하고\nCredits 페이지에서 소액을 충전합니다.\n다양한 모델을 한 API 키로 사용할 수 있습니다.",
          en: "Sign up at openrouter.ai\nAdd a small credit on the Credits page.\nOne API key gives access to 200+ models.",
        },
        tip: { ko: "무료 티어로도 일부 오픈소스 모델을 사용할 수 있습니다.", en: "Free tier gives access to some open-source models." },
      },
      {
        title: { ko: "API 키 발급", en: "Generate API Key" },
        desc: {
          ko: "openrouter.ai/keys 에서 새 키를 생성합니다.\nsk-or-... 형태의 키를 복사합니다.",
          en: "Go to openrouter.ai/keys → Create Key.\nCopy the sk-or-... key.",
        },
      },
      {
        title: { ko: "API Provider 추가", en: "Add API Provider" },
        desc: {
          ko: "AgentDesk → 설정 → API Providers → + 새 Provider\n타입: OpenRouter, API 키 입력, 연결 테스트를 실행합니다.",
          en: "AgentDesk → Settings → API Providers → + New Provider\nType: OpenRouter, paste key, run Connection Test.",
        },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → Provider에서 OpenRouter를 선택합니다.\n연결 테스트로 캐시된 모델 중 하나를 선택하세요.",
          en: "Agent Manager → Provider → select OpenRouter.\nPick from the cached model list (from Connection Test).",
        },
        tip: { ko: "추천: anthropic/claude-3.5-sonnet, meta-llama/llama-3.3-70b-instruct", en: "Try: anthropic/claude-3.5-sonnet or meta-llama/llama-3.3-70b-instruct" },
      },
    ],
  },

  /* ── Google Gemini ── */
  {
    id: "google",
    icon: "◉",
    name: "Google Gemini",
    badge: "API",
    badgeColor: "#58a6ff",
    tagline: { ko: "Gemini 2.0 · 무료 티어 제공", en: "Gemini 2.0 · Free tier available" },
    steps: [
      {
        title: { ko: "Google AI Studio에서 API 키 발급", en: "Get API key from AI Studio" },
        desc: {
          ko: "aistudio.google.com 에 접속하여\nGet API Key → Create API key in new project 를 클릭합니다.\nAIza... 형태의 키를 복사합니다.",
          en: "Go to aistudio.google.com\n→ Get API Key → Create API key in new project.\nCopy the AIza... key.",
        },
        tip: { ko: "무료 티어: Gemini 1.5 Flash 분당 15회, 일 1500회 제공.", en: "Free tier: Gemini 1.5 Flash — 15 RPM, 1500 RPD." },
      },
      {
        title: { ko: "API Provider 추가", en: "Add API Provider" },
        desc: {
          ko: "AgentDesk → 설정 → API Providers → + 새 Provider\n타입: Google, API 키 입력, 연결 테스트를 실행합니다.",
          en: "AgentDesk → Settings → API Providers → + New Provider\nType: Google, paste key, run Connection Test.",
        },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → Provider에서 Google을 선택하고\nGemini 모델을 지정합니다.",
          en: "Agent Manager → Provider → select Google\nand specify the Gemini model.",
        },
        tip: { ko: "추천 모델: gemini-2.0-flash (빠름), gemini-2.0-pro (고성능)", en: "Recommended: gemini-2.0-flash (fast), gemini-2.0-pro (powerful)" },
      },
    ],
  },

  /* ── Custom / Self-hosted ── */
  {
    id: "custom",
    icon: "⚙",
    name: "자체 서버",
    badge: "CUSTOM",
    badgeColor: "#a371f7",
    tagline: { ko: "OpenAI 호환 · vLLM · Text Gen UI", en: "OpenAI-compatible · vLLM · Text Gen UI" },
    steps: [
      {
        title: { ko: "OpenAI 호환 서버 실행", en: "Run an OpenAI-compatible server" },
        desc: {
          ko: "vLLM, text-generation-webui, LocalAI 등\nOpenAI 호환 API를 제공하는 서버를 실행합니다.\n서버 주소와 포트를 메모해 두세요.",
          en: "Run any OpenAI-compatible server:\nvLLM, text-generation-webui, LocalAI, etc.\nNote the server address and port.",
        },
        cmd: "python -m vllm.entrypoints.openai.api_server --model mistralai/Mistral-7B-v0.1",
        tip: { ko: "대부분의 서버는 /v1/chat/completions 엔드포인트를 지원합니다.", en: "Most servers expose the /v1/chat/completions endpoint." },
      },
      {
        title: { ko: "API Provider 추가", en: "Add API Provider" },
        desc: {
          ko: "AgentDesk → 설정 → API Providers → + 새 Provider\n타입: OpenAI (호환), Base URL에 서버 주소를 입력합니다.\nAPI 키가 없으면 빈칸으로 두거나 dummy를 입력하세요.",
          en: "AgentDesk → Settings → API Providers → + New Provider\nType: OpenAI (compatible), set Base URL to your server.\nLeave API key empty or enter a dummy value if not required.",
        },
        warn: { ko: "URL 끝에 /v1 또는 /v1/chat/completions 를 포함하지 마세요. 자동으로 추가됩니다.", en: "Do NOT include /v1 or /v1/chat/completions at the end — added automatically." },
      },
      {
        title: { ko: "연결 테스트 & 모델 캐시", en: "Connection Test & Model Cache" },
        desc: {
          ko: "연결 테스트 버튼을 눌러 /v1/models 엔드포인트를 호출합니다.\n성공하면 모델 목록이 캐시되어 에이전트 설정에서 선택할 수 있습니다.",
          en: "Click Connection Test to call /v1/models.\nOn success, models are cached and selectable in agent settings.",
        },
      },
      {
        title: { ko: "에이전트에 연결", en: "Connect to an Agent" },
        desc: {
          ko: "에이전트 관리자 → Provider에서 추가한 서버를 선택하고\n캐시된 모델 또는 직접 입력한 모델명을 지정합니다.",
          en: "Agent Manager → Provider → select the custom server\nand specify the model name from the cache or enter manually.",
        },
      },
    ],
  },
];

/* ─── Step component ──────────────────────────────────────── */

function StepItem({ step, index, total, t }: {
  step: Step;
  index: number;
  total: number;
  t: (v: { ko: string; en: string }) => string;
}) {
  const isLast = index === total - 1;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {/* Left: number + connector line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "1.5px solid var(--th-accent)",
          background: "rgba(245,158,11,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "var(--th-accent)",
          flexShrink: 0,
        }}>
          {index + 1}
        </div>
        {!isLast && (
          <div style={{
            width: 1, flex: 1, minHeight: 16,
            background: "var(--th-border)",
            margin: "4px 0",
          }} />
        )}
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--th-text-primary)", marginBottom: 6, lineHeight: 1.4 }}>
          {t(step.title)}
        </div>
        <div style={{
          fontSize: 11, color: "var(--th-text-secondary)",
          lineHeight: 1.7, whiteSpace: "pre-line",
          marginBottom: (step.cmd || step.tip || step.warn) ? 8 : 0,
        }}>
          {t(step.desc)}
        </div>

        {step.cmd && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px",
            background: "#0d1117",
            border: "1px solid rgba(88,166,255,0.2)",
            borderRadius: 6,
            marginBottom: (step.tip || step.warn) ? 7 : 0,
          }}>
            <span style={{ color: "var(--th-text-muted)", fontSize: 10, userSelect: "none" }}>$</span>
            <code style={{
              fontFamily: "var(--th-font-mono)",
              fontSize: 11, color: "#79c0ff",
              letterSpacing: "0.02em",
            }}>
              {step.cmd}
            </code>
          </div>
        )}

        {step.warn && (
          <div style={{
            padding: "7px 10px",
            background: "rgba(248,81,73,0.07)",
            border: "1px solid rgba(248,81,73,0.25)",
            borderRadius: 6,
            fontSize: 10, color: "#f85149",
            lineHeight: 1.6, whiteSpace: "pre-line",
            marginBottom: step.tip ? 7 : 0,
          }}>
            ⚠ {t(step.warn)}
          </div>
        )}

        {step.tip && (
          <div style={{
            padding: "6px 10px",
            background: "rgba(245,158,11,0.06)",
            borderLeft: "2px solid var(--th-accent)",
            borderRadius: "0 4px 4px 0",
            fontSize: 10, color: "var(--th-text-secondary)",
            lineHeight: 1.6,
          }}>
            💡 {t(step.tip)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sidebar item ───────────────────────────────────────── */

function SidebarItem({ p, active, onClick }: { p: Provider; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        width: "100%", padding: "7px 14px",
        background: active
          ? "rgba(245,158,11,0.10)"
          : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        border: "none",
        borderLeft: active ? "2px solid var(--th-accent)" : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.12s",
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
      <span style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: 11, fontWeight: active ? 600 : 400,
        color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
        letterSpacing: "0.02em",
      }}>
        {p.name}
      </span>
    </button>
  );
}

/* ─── Guide content (body of the window) ─────────────────── */

function GuideContent() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState("ollama");
  const active = PROVIDERS.find((p) => p.id === activeId)!;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar */}
      <div style={{
        width: 180, flexShrink: 0,
        borderRight: "1px solid var(--th-border)",
        background: "rgba(255,255,255,0.015)",
        display: "flex", flexDirection: "column",
        padding: "10px 0",
        overflowY: "auto",
      }}>
        {/* Section: Local */}
        <div style={{ ...mono, padding: "4px 14px 6px", fontSize: 9, letterSpacing: "0.08em",
          color: "var(--th-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
          {t({ ko: "로컬 실행", en: "Local Runtime" })}
        </div>
        {PROVIDERS.filter((p) => p.badge === "LOCAL").map((p) => (
          <SidebarItem key={p.id} p={p} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
        ))}

        <div style={{ margin: "8px 14px", borderTop: "1px solid var(--th-border)" }} />

        <div style={{ ...mono, padding: "4px 14px 6px", fontSize: 9, letterSpacing: "0.08em",
          color: "var(--th-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
          {t({ ko: "클라우드 API", en: "Cloud API" })}
        </div>
        {PROVIDERS.filter((p) => p.badge === "API").map((p) => (
          <SidebarItem key={p.id} p={p} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
        ))}

        <div style={{ margin: "8px 14px", borderTop: "1px solid var(--th-border)" }} />

        <div style={{ ...mono, padding: "4px 14px 6px", fontSize: 9, letterSpacing: "0.08em",
          color: "var(--th-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
          {t({ ko: "고급", en: "Advanced" })}
        </div>
        {PROVIDERS.filter((p) => p.badge === "CUSTOM").map((p) => (
          <SidebarItem key={p.id} p={p} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "20px 24px" }}>
        {/* Provider header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{active.icon}</span>
            <span style={{ ...mono, fontSize: 18, fontWeight: 700, color: "var(--th-text-primary)" }}>{active.name}</span>
            <span style={{
              ...mono,
              fontSize: 9, letterSpacing: "0.07em", fontWeight: 700,
              padding: "2px 7px",
              border: `1px solid ${active.badgeColor}40`,
              color: active.badgeColor,
              background: `${active.badgeColor}12`,
              borderRadius: 4,
            }}>
              {active.badge}
            </span>
          </div>
          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t(active.tagline)}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--th-border)", marginBottom: 20 }} />

        {/* Steps */}
        <div>
          {active.steps.map((step, i) => (
            <StepItem key={i} step={step} index={i} total={active.steps.length} t={t} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "10px 14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--th-border)",
          borderRadius: 8,
          ...mono,
          fontSize: 10, color: "var(--th-text-muted)", lineHeight: 1.7,
        }}>
          {t({
            ko: "설정 후 이상이 있으면 모니터 탭에서 백엔드 상태와 추론 로그를 확인하세요.",
            en: "After setup, check the Monitor tab for backend status and inference logs if anything seems wrong.",
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Exported modal wrapper ─────────────────────────────── */

export default function LlmGuideModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <AppWindow
      windowType="llm-guide"
      title="Setup & Run Guide"
      emoji="📖"
      defaultWidth={700}
      defaultHeight={540}
      onClose={onClose}
    >
      <GuideContent />
    </AppWindow>,
    document.body,
  );
}
