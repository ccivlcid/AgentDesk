import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import React from "react";

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#0d1117",
  bg2: "#161b22",
  bg3: "#1c2230",
  border: "#30363d",
  accent: "#f59e0b",
  accent2: "#3b82f6",
  accent3: "#22c55e",
  accent4: "#a78bfa",
  text: "#e6edf3",
  muted: "#8b949e",
};

const FONT = {
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function useFadeIn(start = 0, duration = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.7 }, from: 0, to: 1 });
}

function FadeIn({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 20 }, from: 0, to: 1 });
  const y = interpolate(frame - delay, [0, 20], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>{children}</div>;
}

function SlideBase({ children, gradient }: { children: React.ReactNode; gradient?: string }) {
  return (
    <AbsoluteFill style={{
      background: gradient ?? C.bg,
      fontFamily: FONT.body,
      color: C.text,
      padding: "72px 100px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {children}
    </AbsoluteFill>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.15em",
      color: C.accent, textTransform: "uppercase", marginBottom: 14,
    }}>{label}</div>
  );
}

function H1({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, ...style }}>{children}</div>;
}
function H2({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.2, ...style }}>{children}</div>;
}
function H3({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, ...style }}>{children}</div>;
}
function Mono({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: FONT.mono, ...style }}>{children}</span>;
}

function Card({ children, style = {}, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${accent ? accent + "55" : C.border}`,
      borderRadius: 14,
      padding: "22px 26px",
      ...style,
    }}>{children}</div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: FONT.mono, fontSize: 11, padding: "3px 9px",
      border: `1px solid ${color}55`, borderRadius: 5,
      color, background: color + "18", marginLeft: 8,
    }}>{label}</span>
  );
}

function ProgressBar({ label, pct, color = C.accent, delay = 0 }: { label: string; pct: number; color?: string; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame: frame - delay, fps, config: { damping: 22, mass: 1.2 }, from: 0, to: pct });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted, width: 200 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: C.bg3, borderRadius: 4 }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 11, color, width: 38, textAlign: "right" }}>{Math.round(w)}%</div>
    </div>
  );
}

// ── SLIDE 1: Title ─────────────────────────────────────────────────────────
function Slide1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 16, mass: 0.8 }, from: 0.85, to: 1 });
  const orb1 = interpolate(frame, [0, 300], [0, 360]);
  const orb2 = interpolate(frame, [0, 300], [0, -240]);

  return (
    <SlideBase gradient={`radial-gradient(ellipse at 28% 50%, ${C.accent}12 0%, transparent 55%),
      radial-gradient(ellipse at 78% 18%, ${C.accent2}10 0%, transparent 50%),
      radial-gradient(ellipse at 55% 80%, ${C.accent4}08 0%, transparent 45%),
      ${C.bg}`}>
      {/* Rotating orbs */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 320 + i * 120, height: 320 + i * 120,
          borderRadius: "50%",
          border: `1px solid ${[C.accent, C.accent2, C.accent4][i]}22`,
          left: "12%", top: "50%",
          transform: `translate(-50%, -50%) rotate(${(i % 2 === 0 ? orb1 : orb2) + i * 40}deg)`,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", transform: `scale(${scale})`, transformOrigin: "left center" }}>
        <FadeIn delay={0}>
          <Mono style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>▣ AgentDesk v2.0</Mono>
        </FadeIn>
        <FadeIn delay={6}>
          <H1><span style={{ color: C.accent }}>AgentDesk</span></H1>
        </FadeIn>
        <FadeIn delay={14} style={{ marginTop: 18 }}>
          <div style={{ fontSize: 26, color: C.muted, lineHeight: 1.6, maxWidth: 780 }}>
            AI 에이전트를 위한 <strong style={{ color: C.text }}>Project OS</strong><br />
            다수의 에이전트를 동시에 실행·모니터링·제어하는 개발자 환경
          </div>
        </FadeIn>
        <FadeIn delay={22} style={{ marginTop: 50, display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            ["Stack", "React 19 · Node.js · SQLite"],
            ["UI", "macOS Desktop Metaphor"],
            ["Phase", "18 Complete"],
            ["API", "REST + WebSocket"],
          ].map(([k, v]) => (
            <div key={k} style={{ fontFamily: FONT.mono, fontSize: 12, color: C.muted }}>
              {k} <strong style={{ color: C.accent }}>{v}</strong>
            </div>
          ))}
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 2: Problem ────────────────────────────────────────────────────────
function Slide2() {
  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Problem" /></FadeIn>
      <FadeIn delay={4}><H2>다수의 AI 에이전트, 지금 무슨 일이<br /><span style={{ color: C.accent }}>일어나고 있나요?</span></H2></FadeIn>
      <div style={{ display: "flex", gap: 48, marginTop: 36, flex: 1, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          {[
            ["어느 에이전트가 어떤 태스크를 하는지 알 수 없다", 6],
            ["Rules·Memory·Hooks 적용 위치 파악 불가", 10],
            ["에이전트 간 협업 흐름 추적 불가", 14],
            ["토큰 비용 소비 현황 가시성 없음", 18],
            ["문제 발생 시 원인 추적 어려움", 22],
            ["로컬 LLM·외부 지식베이스 연동 분산", 26],
          ].map(([text, delay]) => (
            <FadeIn key={text} delay={delay as number} style={{ display: "flex", gap: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
              <span style={{ color: "#ef4444", fontFamily: FONT.mono, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✖</span>
              <span style={{ fontSize: 16, lineHeight: 1.5 }}>{text}</span>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={30} style={{ flexShrink: 0, width: 360 }}>
          <Card accent={C.accent} style={{ background: C.accent + "0a" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💡</div>
            <H3 style={{ color: C.accent, marginBottom: 12 }}>AgentDesk의 답</H3>
            <div style={{ fontSize: 16, color: C.text, lineHeight: 1.85 }}>
              에이전트는 CLI 프로세스다.<br />
              프로젝트는 그 에이전트들이 일하는 <strong style={{ color: C.accent }}>OS</strong>다.<br />
              UI/UX는 그 OS의 <strong style={{ color: C.accent2 }}>컨트롤 패널</strong>이다.
            </div>
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 3: Architecture ───────────────────────────────────────────────────
function Slide3() {
  const layers = [
    { label: "Frontend Layer", color: C.accent4, items: ["React 19 + Vite", "Zustand Store", "Tailwind CSS", "@xyflow/react"], delay: 6 },
    { label: "Backend Layer", color: C.accent2, items: ["Node.js + Express", "WebSocket Hub", "Task Execution Engine", "Workflow Scheduler"], delay: 12 },
    { label: "Data Layer", color: C.accent3, items: ["SQLite (better-sqlite3)", "Versioned Migrations", "File Storage", "Pino Logger"], delay: 18 },
    { label: "Integration Layer", color: C.accent, items: ["OpenAI / Local LLM", "Synapse (Notion/Figma)", "Discord / Slack", "Electron (optional)"], delay: 24 },
  ];

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Architecture" /></FadeIn>
      <FadeIn delay={4}><H2>네 계층으로 구성된 <span style={{ color: C.accent4 }}>모듈형 아키텍처</span></H2></FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 30, flex: 1 }}>
        {layers.map(({ label, color, items, delay }) => (
          <FadeIn key={label} delay={delay}>
            <Card accent={color} style={{ height: "100%" }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>{label}</div>
              {items.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}80` }}>
                  <span style={{ color, fontFamily: FONT.mono, fontSize: 12, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </Card>
          </FadeIn>
        ))}
      </div>
    </SlideBase>
  );
}

// ── SLIDE 4: macOS Desktop UI ────────────────────────────────────────────────
function Slide4() {
  const uiParts = [
    { icon: "▭", label: "Menu Bar", desc: "프로젝트 전환 · 비용 · 알림 · 시계", color: C.accent, delay: 6 },
    { icon: "⊞", label: "Desktop Icons", desc: "드래그 · 지글 모드 · 삭제 배지", color: C.accent2, delay: 10 },
    { icon: "◫", label: "App Windows", desc: "워크플로우 · 라이브러리 · 설정 · 채팅 · CLI", color: C.accent3, delay: 14 },
    { icon: "▦", label: "Widgets", desc: "에이전트 · 태스크 · 비용 · 플로우그래프 · Synapse", color: C.accent4, delay: 18 },
    { icon: "━", label: "Dock", desc: "즐겨찾기 앱 · 실행 중 인디케이터", color: C.accent, delay: 22 },
    { icon: "⌘", label: "Shortcuts", desc: "Spotlight · Mission Control · g+key 앱 전환", color: C.accent2, delay: 26 },
  ];

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="UI / UX" /></FadeIn>
      <FadeIn delay={4}><H2><span style={{ color: C.accent }}>macOS 데스크탑</span> 메타포 기반<br />직관적 에이전트 제어 환경</H2></FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 30, flex: 1 }}>
        {uiParts.map(({ icon, label, desc, color, delay }) => (
          <FadeIn key={label} delay={delay}>
            <Card style={{ height: "100%" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <H3 style={{ color, marginBottom: 8 }}>{label}</H3>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
            </Card>
          </FadeIn>
        ))}
      </div>
    </SlideBase>
  );
}

// ── SLIDE 5: Multi-Agent Execution ───────────────────────────────────────────
function Slide5() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const agents = [
    { name: "alpha", status: "running", task: "코드 리뷰 — PR #127", progress: 72, color: C.accent3 },
    { name: "beta", status: "running", task: "API 문서화 — v2.0", progress: 45, color: C.accent2 },
    { name: "gamma", status: "idle", task: "대기 중", progress: 100, color: C.muted },
    { name: "delta", status: "running", task: "테스트 작성 — auth 모듈", progress: 28, color: C.accent4 },
  ];

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Multi-Agent Monitoring" /></FadeIn>
      <FadeIn delay={4}><H2>에이전트 <span style={{ color: C.accent3 }}>실시간 모니터링</span><br />플로우 그래프 시각화</H2></FadeIn>
      <div style={{ display: "flex", gap: 32, marginTop: 28, flex: 1, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {agents.map(({ name, status, task, progress, color }, i) => (
            <FadeIn key={name} delay={i * 6 + 10}>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: status === "running" ? color : C.muted,
                      boxShadow: status === "running" ? `0 0 8px ${color}` : "none",
                    }} />
                    <Mono style={{ fontSize: 13, color }}>{name}</Mono>
                  </div>
                  <Badge label={status} color={status === "running" ? color : C.muted} />
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{task}</div>
                <div style={{ height: 4, background: C.bg3, borderRadius: 3 }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: color, borderRadius: 3 }} />
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={30} style={{ flexShrink: 0, width: 340 }}>
          <Card accent={C.accent}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.accent, letterSpacing: "0.12em", marginBottom: 16, textTransform: "uppercase" }}>Flow Graph</div>
            {/* SVG flow graph */}
            <svg viewBox="0 0 300 220" width={300} height={220}>
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6Z" fill={C.muted} />
                </marker>
              </defs>
              {/* edges */}
              {[["150,40", "80,120"], ["150,40", "220,120"], ["80,120", "150,200"], ["220,120", "150,200"]].map(([a, b], i) => {
                const [ax, ay] = a.split(",").map(Number);
                const [bx, by] = b.split(",").map(Number);
                return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={C.border} strokeWidth={1.5} markerEnd="url(#arr)" />;
              })}
              {/* nodes */}
              {[
                { cx: 150, cy: 40, label: "alpha", color: C.accent3 },
                { cx: 80, cy: 120, label: "beta", color: C.accent2 },
                { cx: 220, cy: 120, label: "delta", color: C.accent4 },
                { cx: 150, cy: 200, label: "gamma", color: C.muted },
              ].map(({ cx, cy, label, color }) => (
                <g key={label}>
                  <rect x={cx - 32} y={cy - 18} width={64} height={36} rx={8}
                    fill={C.bg3} stroke={color} strokeWidth={1.5} />
                  <text x={cx} y={cy + 5} textAnchor="middle" fill={color}
                    fontSize={11} fontFamily={FONT.mono}>{label}</text>
                </g>
              ))}
            </svg>
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 6: Synapse Knowledge Base ─────────────────────────────────────────
function Slide6() {
  const sources = [
    { icon: "📄", name: "Notion", desc: "페이지 URL로 문서 수집", color: C.accent, delay: 8 },
    { icon: "🗒", name: "Obsidian", desc: "로컬 Vault 마크다운 수집", color: C.accent4, delay: 12 },
    { icon: "🎨", name: "Figma", desc: "디자인 파일 컴포넌트 메타데이터", color: C.accent2, delay: 16 },
    { icon: "📓", name: "NotebookLM", desc: "Notebook 소스 동기화", color: C.accent3, delay: 20 },
  ];

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Synapse — Knowledge Base" /></FadeIn>
      <FadeIn delay={4}><H2><span style={{ color: C.accent4 }}>Synapse</span> 지식베이스 연동<br />외부 소스 → 에이전트 컨텍스트</H2></FadeIn>
      <div style={{ display: "flex", gap: 40, marginTop: 32, flex: 1, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {sources.map(({ icon, name, desc, color, delay }) => (
              <FadeIn key={name} delay={delay}>
                <Card accent={color}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <H3 style={{ color, marginBottom: 6 }}>{name}</H3>
                  <div style={{ fontSize: 13, color: C.muted }}>{desc}</div>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
        <FadeIn delay={26} style={{ flexShrink: 0, width: 380 }}>
          <Card>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>Synapse Flow</div>
            {[
              ["소스 URL 등록", C.accent2],
              ["자동 수집 & 청크 분할", C.accent4],
              ["임베딩 & 검색 인덱스 생성", C.accent],
              ["태스크 생성 시 컨텍스트 주입", C.accent3],
            ].map(([label, color], i) => (
              <div key={label as string} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "11px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: (color as string) + "22", border: `1px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONT.mono, fontSize: 10, color: color as string, flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: 14 }}>{label}</span>
              </div>
            ))}
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 7: Local LLM ───────────────────────────────────────────────────────
function Slide7() {
  const backends = [
    { name: "Ollama", status: "running", model: "mistral:7b-instruct", latency: "320ms", color: C.accent3 },
    { name: "LM Studio", status: "stopped", model: "—", latency: "—", color: C.muted },
    { name: "Jan", status: "running", model: "llama-3.1-8b", latency: "280ms", color: C.accent2 },
    { name: "llama.cpp", status: "stopped", model: "—", latency: "—", color: C.muted },
  ];

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Local LLM Integration" /></FadeIn>
      <FadeIn delay={4}><H2>로컬 LLM <span style={{ color: C.accent3 }}>자동 감지 & 라우팅</span><br />비용 없는 프라이빗 추론</H2></FadeIn>
      <div style={{ display: "flex", gap: 40, marginTop: 30, flex: 1, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {backends.map(({ name, status, model, latency, color }, i) => (
            <FadeIn key={name} delay={i * 5 + 8}>
              <div style={{
                display: "flex", alignItems: "center", gap: 18,
                padding: "14px 0", borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: status === "running" ? color : C.bg3, border: `1px solid ${color}`, flexShrink: 0 }} />
                <Mono style={{ width: 120, fontSize: 14, color }}>{name}</Mono>
                <span style={{ flex: 1, fontSize: 13, color: C.muted }}>{model}</span>
                <Mono style={{ fontSize: 12, color: status === "running" ? C.accent3 : C.muted }}>{latency}</Mono>
                <Badge label={status} color={color} />
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={28} style={{ flexShrink: 0, width: 360 }}>
          <Card accent={C.accent3}>
            <H3 style={{ color: C.accent3, marginBottom: 16 }}>Smart Routing</H3>
            {[
              ["로컬 LLM 연결 시 자동 우선 사용", C.accent3],
              ["사용 불가 시 OpenAI API fallback", C.accent],
              ["모델별 파라미터 (온도·시드·토큰) 조정", C.accent2],
              ["채팅 패널에서 실시간 모델 전환", C.accent4],
            ].map(([text, color]) => (
              <div key={text as string} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}80` }}>
                <span style={{ color: color as string, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14 }}>{text}</span>
              </div>
            ))}
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 8: Image Studio ────────────────────────────────────────────────────
function Slide8() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgScale = spring({ frame: frame - 20, fps, config: { damping: 14, mass: 0.9 }, from: 0.8, to: 1 });

  return (
    <SlideBase>
      <FadeIn delay={0}><Tag label="Image Studio" /></FadeIn>
      <FadeIn delay={4}><H2>AI 이미지 생성 스튜디오<br /><span style={{ color: C.accent }}>DALL-E 3 통합 갤러리</span></H2></FadeIn>
      <div style={{ display: "flex", gap: 40, marginTop: 30, flex: 1, alignItems: "flex-start" }}>
        <FadeIn delay={10} style={{ flex: 1 }}>
          <Card>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>Generate Tab</div>
            <div style={{ background: C.bg3, borderRadius: 8, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Prompt</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                "A futuristic AI control room with multiple holographic screens, dark navy theme, cinematic lighting"
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[["Provider", "OpenAI"], ["Model", "dall-e-3"], ["Size", "1024×1024"]].map(([k, v]) => (
                <div key={k} style={{ flex: 1, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.accent }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
        <FadeIn delay={20} style={{ flexShrink: 0, width: 380 }}>
          <Card accent={C.accent}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>Gallery</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const colors = [C.accent, C.accent2, C.accent3, C.accent4, C.accent, C.accent2];
                return (
                  <div key={i} style={{
                    height: 80, borderRadius: 8,
                    background: `linear-gradient(135deg, ${colors[i]}22, ${colors[(i + 2) % 6]}11)`,
                    border: `1px solid ${colors[i]}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: `scale(${imgScale})`,
                  }}>
                    <span style={{ fontSize: 20 }}>🖼</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: C.muted, fontFamily: FONT.mono }}>6 images · dall-e-3</div>
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 9: Status / Progress ───────────────────────────────────────────────
function Slide9() {
  return (
    <SlideBase gradient={`radial-gradient(ellipse at 70% 80%, ${C.accent3}08 0%, transparent 60%), ${C.bg}`}>
      <FadeIn delay={0}><Tag label="Development Status" /></FadeIn>
      <FadeIn delay={4}><H2>Phase 18 완료 <Badge label="COMPLETE" color={C.accent3} /><br /><span style={{ color: C.accent3, fontSize: 32 }}>전체 기능 구현 완료</span></H2></FadeIn>
      <div style={{ display: "flex", gap: 40, marginTop: 28, flex: 1, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <ProgressBar label="Phase 1–10 (Core OS)" pct={100} delay={6} />
          <ProgressBar label="Phase 11–12 (Agent CLI)" pct={100} delay={12} />
          <ProgressBar label="Phase 13 (CSS Overhaul)" pct={100} delay={18} />
          <ProgressBar label="Phase 14 (MED Features)" pct={100} delay={24} />
          <ProgressBar label="Phase 15 (Image Studio)" pct={100} delay={30} />
          <ProgressBar label="Phase 16 (Synapse KB)" pct={100} delay={36} />
          <ProgressBar label="Phase 17 (Local LLM)" pct={100} delay={42} />
          <ProgressBar label="Phase 18 (Flow Graph)" pct={100} delay={48} color={C.accent3} />
        </div>
        <FadeIn delay={50} style={{ flexShrink: 0, width: 360 }}>
          <Card accent={C.accent3}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.accent3, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.12em" }}>Key Stats</div>
            {[
              ["Frontend Components", "85+"],
              ["API Endpoints", "40+"],
              ["DB Migrations", "19"],
              ["Test Coverage", "E2E + Unit"],
              ["WebSocket Events", "12 types"],
              ["Keyboard Shortcuts", "12 actions"],
            ].map(([k, v]) => (
              <div key={k as string} style={{
                display: "flex", justifyContent: "space-between",
                padding: "9px 0", borderBottom: `1px solid ${C.border}80`,
                fontSize: 13,
              }}>
                <span style={{ color: C.muted }}>{k}</span>
                <Mono style={{ color: C.accent3, fontSize: 13 }}>{v}</Mono>
              </div>
            ))}
          </Card>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── SLIDE 10: Outro ──────────────────────────────────────────────────────────
function Slide10() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orb = interpolate(frame, [0, 300], [0, 360]);
  const pulse = Math.sin(frame * 0.08) * 0.5 + 0.5;

  return (
    <SlideBase gradient={`radial-gradient(ellipse at 50% 50%, ${C.accent}10 0%, transparent 60%),
      radial-gradient(ellipse at 20% 80%, ${C.accent4}08 0%, transparent 50%),
      ${C.bg}`}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 400 + i * 150, height: 400 + i * 150,
          borderRadius: "50%",
          border: `1px solid ${C.accent}${Math.round(pulse * 20 + 10).toString(16).padStart(2, "0")}`,
          left: "50%", top: "50%",
          transform: `translate(-50%, -50%) rotate(${orb + i * 45}deg)`,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <FadeIn delay={0}>
          <Mono style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>▣ AgentDesk v2.0</Mono>
        </FadeIn>
        <FadeIn delay={6}>
          <H1 style={{ textAlign: "center" }}>
            <span style={{ color: C.accent }}>Agent</span>Desk
          </H1>
        </FadeIn>
        <FadeIn delay={14}>
          <div style={{ fontSize: 22, color: C.muted, marginTop: 20, lineHeight: 1.7 }}>
            AI 에이전트 운영을 위한 <strong style={{ color: C.text }}>Project OS</strong>
          </div>
        </FadeIn>
        <FadeIn delay={22} style={{ marginTop: 48, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            ["React 19", C.accent2],
            ["Node.js", C.accent3],
            ["SQLite", C.accent],
            ["@xyflow/react", C.accent4],
            ["Remotion", "#e11d48"],
          ].map(([label, color]) => (
            <div key={label} style={{
              fontFamily: FONT.mono, fontSize: 12,
              padding: "6px 16px", borderRadius: 20,
              border: `1px solid ${color}44`,
              color: color as string, background: (color as string) + "10",
            }}>{label}</div>
          ))}
        </FadeIn>
        <FadeIn delay={30}>
          <div style={{ marginTop: 52, fontFamily: FONT.mono, fontSize: 12, color: C.muted }}>
            Phase 1 – 18 Complete &nbsp;·&nbsp; 85+ Components &nbsp;·&nbsp; 40+ API Endpoints
          </div>
        </FadeIn>
      </div>
    </SlideBase>
  );
}

// ── Root Composition ──────────────────────────────────────────────────────────
const FPS = 30;
const SLIDE_DURATION = 9; // seconds per slide

export const slides = [
  { id: "slide1",  component: Slide1,  duration: 10 },
  { id: "slide2",  component: Slide2,  duration: 10 },
  { id: "slide3",  component: Slide3,  duration: 9 },
  { id: "slide4",  component: Slide4,  duration: 9 },
  { id: "slide5",  component: Slide5,  duration: 10 },
  { id: "slide6",  component: Slide6,  duration: 9 },
  { id: "slide7",  component: Slide7,  duration: 9 },
  { id: "slide8",  component: Slide8,  duration: 9 },
  { id: "slide9",  component: Slide9,  duration: 11 },
  { id: "slide10", component: Slide10, duration: 10 },
];

export const TOTAL_FRAMES = slides.reduce((acc, s) => acc + s.duration * FPS, 0);

export function AgentDeskVideo() {
  let offset = 0;
  return (
    <AbsoluteFill>
      {slides.map(({ id, component: Comp, duration }) => {
        const from = offset;
        offset += duration * FPS;
        return (
          <Sequence key={id} from={from} durationInFrames={duration * FPS}>
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
