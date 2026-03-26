import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const PptxGenJS = require("C:/project/AgentDesk/node_modules/pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 16:9 (13.33" × 7.5")

// ── Design tokens ─────────────────────────────────────────────────────────
const BG  = "0D1117";
const BG2 = "161B22";
const BG3 = "1C2230";
const BD  = "30363D";
const ACC  = "F59E0B"; // amber
const ACC2 = "3B82F6"; // blue
const ACC3 = "22C55E"; // green
const ACC4 = "A78BFA"; // purple
const TXT  = "E6EDF3";
const MUT  = "8B949E";

const FONT_BODY = "Segoe UI";
const FONT_MONO = "Courier New";

// ── Helper: background fill ───────────────────────────────────────────────
function bgFill(slide) {
  slide.background = { color: BG };
}

// ── Helper: mono-spaced tag label ────────────────────────────────────────
function addTag(slide, label, y = 0.55) {
  slide.addText(label.toUpperCase(), {
    x: 0.6, y, w: 12, h: 0.28,
    fontFace: FONT_MONO, fontSize: 10,
    color: ACC, charSpacing: 3,
  });
}

// ── Helper: strip alpha suffix from hex color → returns [6-char hex, transparency 0-100]
function hexAlpha(hexWithAlpha) {
  if (hexWithAlpha.length === 8) {
    const base = hexWithAlpha.slice(0, 6);
    const alpha = parseInt(hexWithAlpha.slice(6), 16); // 0-255
    const transparency = Math.round((1 - alpha / 255) * 100);
    return [base, transparency];
  }
  return [hexWithAlpha, 0];
}

// ── Helper: decorative border card ──────────────────────────────────────
function addCard(slide, { x, y, w, h, border = BD, fill = BG2, radius = 0.1 }) {
  const [borderColor, borderTransp] = hexAlpha(border);
  const [fillColor, fillTransp] = hexAlpha(fill);
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fillColor, transparency: fillTransp },
    line: { color: borderColor, width: 0.8, transparency: borderTransp },
    rectRadius: radius,
  });
}

// ── Helper: bullet list item ─────────────────────────────────────────────
function bulletRow(icon, text, color = TXT) {
  return [
    { text: icon + "  ", options: { color: "EF4444", fontFace: FONT_MONO, fontSize: 13 } },
    { text, options: { color, fontFace: FONT_BODY, fontSize: 14 } },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Title
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);

  // Decorative circles
  for (const [cx, cy, r, clr] of [
    [1.5, 3.8, 2.2, ACC + "18"],
    [10.5, 1.2, 1.6, ACC2 + "14"],
    [7.0, 6.0, 1.0, ACC4 + "12"],
  ]) {
    s.addShape(pptx.ShapeType.ellipse, {
      x: cx - r, y: cy - r, w: r * 2, h: r * 2,
      fill: { color: clr.slice(0, 6), transparency: 90 },
      line: { color: clr.slice(0, 6), width: 0.5, transparency: 70 },
    });
  }

  s.addText("▣ AgentDesk v2.0", {
    x: 0.6, y: 1.6, w: 12, h: 0.3,
    fontFace: FONT_MONO, fontSize: 12, color: MUT,
  });
  s.addText("AgentDesk", {
    x: 0.6, y: 2.0, w: 12, h: 1.4,
    fontFace: FONT_BODY, fontSize: 72, bold: true, color: ACC,
  });
  s.addText("AI 에이전트를 위한 Project OS", {
    x: 0.6, y: 3.35, w: 10, h: 0.5,
    fontFace: FONT_BODY, fontSize: 22, color: MUT,
  });
  s.addText("다수의 에이전트를 동시에 실행·모니터링·제어하는 개발자 환경", {
    x: 0.6, y: 3.8, w: 10, h: 0.4,
    fontFace: FONT_BODY, fontSize: 15, color: MUT,
  });

  // Meta pills
  const metas = [
    ["Stack", "React 19 · Node.js · SQLite"],
    ["UI", "macOS Desktop Metaphor"],
    ["Phase", "18 Complete"],
    ["API", "REST + WebSocket"],
  ];
  metas.forEach(([k, v], i) => {
    const x = 0.6 + i * 3.15;
    addCard(s, { x, y: 4.6, w: 2.9, h: 0.55, fill: BG2 });
    s.addText(k, { x: x + 0.15, y: 4.65, w: 1.0, h: 0.25, fontFace: FONT_MONO, fontSize: 9, color: MUT });
    s.addText(v, { x: x + 0.15, y: 4.88, w: 2.6, h: 0.22, fontFace: FONT_MONO, fontSize: 10, color: ACC, bold: true });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Problem
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Problem");

  s.addText("다수의 AI 에이전트,\n지금 무슨 일이 일어나고 있나요?", {
    x: 0.6, y: 0.85, w: 7.5, h: 1.1,
    fontFace: FONT_BODY, fontSize: 30, bold: true, color: TXT,
  });

  // Problem list
  const problems = [
    "어느 에이전트가 어떤 태스크를 하는지 알 수 없다",
    "Rules·Memory·Hooks 적용 위치 파악 불가",
    "에이전트 간 협업 흐름 추적 불가",
    "토큰 비용 소비 현황 가시성 없음",
    "문제 발생 시 원인 추적 어려움",
    "로컬 LLM·외부 지식베이스 연동 분산",
  ];
  problems.forEach((text, i) => {
    const y = 2.1 + i * 0.68;
    s.addText("✖  " + text, {
      x: 0.6, y, w: 7.2, h: 0.55,
      fontFace: FONT_BODY, fontSize: 14, color: TXT,
      line: { color: BD, width: 0.5 },
    });
  });

  // Answer card
  addCard(s, { x: 8.5, y: 2.0, w: 4.4, h: 3.2, border: ACC + "55", fill: ACC + "08" });
  s.addText("💡", { x: 8.7, y: 2.15, w: 0.6, h: 0.45, fontSize: 24 });
  s.addText("AgentDesk의 답", { x: 9.3, y: 2.2, w: 3.4, h: 0.4, fontFace: FONT_BODY, fontSize: 16, bold: true, color: ACC });
  s.addText(
    "에이전트는 CLI 프로세스다.\n프로젝트는 그 에이전트들이 일하는 OS다.\nUI/UX는 그 OS의 컨트롤 패널이다.",
    { x: 8.7, y: 2.7, w: 3.9, h: 1.5, fontFace: FONT_BODY, fontSize: 14, color: TXT, lineSpacingMultiple: 1.7 }
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Architecture
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Architecture");

  s.addText("네 계층으로 구성된 모듈형 아키텍처", {
    x: 0.6, y: 0.82, w: 12, h: 0.7,
    fontFace: FONT_BODY, fontSize: 30, bold: true, color: TXT,
  });

  const layers = [
    { label: "Frontend Layer", color: ACC4, items: ["React 19 + Vite", "Zustand Store", "Tailwind CSS", "WebSocket"] },
    { label: "Backend Layer", color: ACC2, items: ["Node.js + Express", "WebSocket Hub", "Task Execution Engine", "Workflow Scheduler"] },
    { label: "Data Layer", color: ACC3, items: ["SQLite (better-sqlite3)", "Versioned Migrations", "File Storage", "Pino Logger"] },
    { label: "Integration Layer", color: ACC, items: ["OpenAI / Local LLM", "Synapse (Notion/Figma)", "Discord / Slack", "Electron (optional)"] },
  ];

  layers.forEach(({ label, color, items }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.45;
    const y = 1.75 + row * 2.65;
    addCard(s, { x, y, w: 6.1, h: 2.4, border: color + "55" });
    s.addText(label.toUpperCase(), { x: x + 0.2, y: y + 0.18, w: 5.6, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color, charSpacing: 2 });
    items.forEach((item, j) => {
      s.addText("›  " + item, { x: x + 0.2, y: y + 0.6 + j * 0.42, w: 5.6, h: 0.38, fontFace: FONT_BODY, fontSize: 13, color: TXT });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 4 — macOS Desktop UI
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "UI / UX");

  s.addText("macOS 데스크탑 메타포 기반\n직관적 에이전트 제어 환경", {
    x: 0.6, y: 0.82, w: 12, h: 1.0,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: TXT,
  });

  const parts = [
    { icon: "▭", label: "Menu Bar", desc: "프로젝트 전환 · 비용 · 알림 · 시계", color: ACC },
    { icon: "⊞", label: "Desktop Icons", desc: "드래그 · 지글 모드 · 삭제 배지", color: ACC2 },
    { icon: "◫", label: "App Windows", desc: "워크플로우 · 라이브러리 · 설정 · 채팅", color: ACC3 },
    { icon: "▦", label: "Widgets", desc: "에이전트 · 태스크 · 비용 · Flow Graph", color: ACC4 },
    { icon: "━", label: "Dock", desc: "즐겨찾기 앱 · 실행 인디케이터", color: ACC },
    { icon: "⌘", label: "Shortcuts", desc: "Spotlight · Mission Control · g+key", color: ACC2 },
  ];

  parts.forEach(({ icon, label, desc, color }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.28;
    const y = 2.0 + row * 2.35;
    addCard(s, { x, y, w: 4.0, h: 2.15, border: color + "44" });
    s.addText(icon, { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.5, fontSize: 22, color });
    s.addText(label, { x: x + 0.2, y: y + 0.72, w: 3.5, h: 0.4, fontFace: FONT_BODY, fontSize: 16, bold: true, color });
    s.addText(desc, { x: x + 0.2, y: y + 1.18, w: 3.6, h: 0.55, fontFace: FONT_BODY, fontSize: 12, color: MUT });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Multi-Agent Monitoring
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Multi-Agent Monitoring");

  s.addText("에이전트 실시간 모니터링\nFlow Graph 시각화", {
    x: 0.6, y: 0.82, w: 8, h: 1.0,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: TXT,
  });

  const agents = [
    { name: "alpha", status: "running", task: "코드 리뷰 — PR #127", pct: 72, color: ACC3 },
    { name: "beta",  status: "running", task: "API 문서화 — v2.0", pct: 45, color: ACC2 },
    { name: "gamma", status: "idle",    task: "대기 중", pct: 100, color: MUT },
    { name: "delta", status: "running", task: "테스트 작성 — auth 모듈", pct: 28, color: ACC4 },
  ];

  agents.forEach(({ name, status, task, pct, color }, i) => {
    const y = 2.0 + i * 1.15;
    addCard(s, { x: 0.5, y, w: 7.5, h: 1.0 });
    // status dot
    s.addShape(pptx.ShapeType.ellipse, { x: 0.75, y: y + 0.32, w: 0.18, h: 0.18, fill: { color } });
    s.addText(name, { x: 1.05, y: y + 0.12, w: 1.5, h: 0.35, fontFace: FONT_MONO, fontSize: 13, color, bold: true });
    s.addText(status.toUpperCase(), { x: 6.0, y: y + 0.12, w: 1.7, h: 0.3, fontFace: FONT_MONO, fontSize: 9, color, align: "right" });
    s.addText(task, { x: 1.05, y: y + 0.45, w: 5.5, h: 0.28, fontFace: FONT_BODY, fontSize: 12, color: MUT });
    // progress bar bg
    s.addShape(pptx.ShapeType.rect, { x: 1.05, y: y + 0.78, w: 5.5, h: 0.1, fill: { color: BG3 } });
    // progress bar fill
    s.addShape(pptx.ShapeType.rect, { x: 1.05, y: y + 0.78, w: 5.5 * pct / 100, h: 0.1, fill: { color } });
  });

  // Flow graph card
  addCard(s, { x: 8.4, y: 1.9, w: 4.5, h: 4.6, border: ACC + "44" });
  s.addText("FLOW GRAPH", { x: 8.6, y: 2.05, w: 4, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: ACC, charSpacing: 2 });

  // SVG-like node diagram using shapes
  const nodes = [
    { x: 10.4, y: 2.6, label: "alpha", color: ACC3 },
    { x: 9.2,  y: 3.7, label: "beta",  color: ACC2 },
    { x: 11.6, y: 3.7, label: "delta", color: ACC4 },
    { x: 10.4, y: 4.8, label: "gamma", color: MUT },
  ];
  // edges
  const edges = [[0,1],[0,2],[1,3],[2,3]];
  edges.forEach(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    s.addShape(pptx.ShapeType.line, {
      x: na.x + 0.35, y: na.y + 0.2,
      w: nb.x - na.x, h: nb.y - na.y,
      line: { color: BD, width: 1 },
    });
  });
  nodes.forEach(({ x, y, label, color }) => {
    s.addShape(pptx.ShapeType.roundRect, { x: x - 0.02, y, w: 0.75, h: 0.4, fill: { color: BG3 }, line: { color, width: 1 }, rectRadius: 0.06 });
    s.addText(label, { x, y: y + 0.07, w: 0.7, h: 0.26, fontFace: FONT_MONO, fontSize: 10, color, align: "center" });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Synapse
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Synapse — Knowledge Base");

  s.addText("Synapse 지식베이스 연동\n외부 소스 → 에이전트 컨텍스트", {
    x: 0.6, y: 0.82, w: 12, h: 1.0,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: TXT,
  });

  const sources = [
    { icon: "📄", name: "Notion", desc: "페이지 URL로 문서 수집", color: ACC },
    { icon: "🗒", name: "Obsidian", desc: "로컬 Vault 마크다운 수집", color: ACC4 },
    { icon: "🎨", name: "Figma", desc: "디자인 파일 컴포넌트 메타데이터", color: ACC2 },
    { icon: "📓", name: "NotebookLM", desc: "Notebook 소스 동기화", color: ACC3 },
  ];

  sources.forEach(({ icon, name, desc, color }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.1;
    const y = 2.0 + row * 2.3;
    addCard(s, { x, y, w: 3.8, h: 2.1, border: color + "44" });
    s.addText(icon, { x: x + 0.2, y: y + 0.18, w: 0.55, h: 0.45, fontSize: 22 });
    s.addText(name, { x: x + 0.2, y: y + 0.68, w: 3.3, h: 0.4, fontFace: FONT_BODY, fontSize: 16, bold: true, color });
    s.addText(desc, { x: x + 0.2, y: y + 1.1, w: 3.3, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: MUT });
  });

  // Flow card
  addCard(s, { x: 8.9, y: 1.9, w: 4.0, h: 4.6 });
  s.addText("SYNAPSE FLOW", { x: 9.1, y: 2.05, w: 3.5, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: MUT, charSpacing: 2 });

  const steps = [
    ["소스 URL 등록", ACC2],
    ["자동 수집 & 청크 분할", ACC4],
    ["임베딩 & 검색 인덱스", ACC],
    ["태스크 컨텍스트 주입", ACC3],
  ];
  steps.forEach(([label, color], i) => {
    const y = 2.6 + i * 0.88;
    s.addShape(pptx.ShapeType.ellipse, { x: 9.1, y: y + 0.04, w: 0.32, h: 0.32, fill: { color: BG3 }, line: { color: color, width: 0.8 } });
    s.addText(String(i + 1), { x: 9.1, y: y + 0.06, w: 0.32, h: 0.28, fontFace: FONT_MONO, fontSize: 10, color: color, align: "center" });
    s.addText(label, { x: 9.55, y, w: 3.1, h: 0.4, fontFace: FONT_BODY, fontSize: 13, color: TXT });
    if (i < 3) s.addShape(pptx.ShapeType.line, { x: 9.26, y: y + 0.36, w: 0, h: 0.52, line: { color: BD, width: 0.8 } });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 7 — Local LLM
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Local LLM Integration");

  s.addText("로컬 LLM 자동 감지 & 라우팅\n비용 없는 프라이빗 추론", {
    x: 0.6, y: 0.82, w: 12, h: 1.0,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: TXT,
  });

  const backends = [
    { name: "Ollama",    status: "running", model: "mistral:7b-instruct", latency: "320ms", color: ACC3 },
    { name: "LM Studio", status: "stopped", model: "—", latency: "—", color: MUT },
    { name: "Jan",       status: "running", model: "llama-3.1-8b", latency: "280ms", color: ACC2 },
    { name: "llama.cpp", status: "stopped", model: "—", latency: "—", color: MUT },
  ];

  backends.forEach(({ name, status, model, latency, color }, i) => {
    const y = 2.0 + i * 0.95;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.6, y: y + 0.3, w: 0.16, h: 0.16, fill: { color: status === "running" ? color : BG3 }, line: { color, width: 0.8 } });
    s.addText(name, { x: 0.9, y, w: 2.0, h: 0.7, fontFace: FONT_MONO, fontSize: 14, color, bold: true });
    s.addText(model, { x: 3.1, y, w: 3.8, h: 0.7, fontFace: FONT_BODY, fontSize: 13, color: MUT });
    s.addText(latency, { x: 7.1, y, w: 1.2, h: 0.7, fontFace: FONT_MONO, fontSize: 12, color: status === "running" ? ACC3 : MUT, align: "right" });
    s.addText(status.toUpperCase(), { x: 8.0, y: y + 0.18, w: 1.3, h: 0.34, fontFace: FONT_MONO, fontSize: 9, color,
      fill: { color: BG2 }, line: { color, width: 0.5, transparency: 67 }, margin: [0, 6, 0, 6] });
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: y + 0.82, w: 8.9, h: 0, line: { color: BD, width: 0.5 } });
  });

  // Routing card
  addCard(s, { x: 9.2, y: 1.9, w: 3.9, h: 4.3, border: ACC3 + "44" });
  s.addText("SMART ROUTING", { x: 9.4, y: 2.05, w: 3.4, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: ACC3, charSpacing: 2 });
  [
    ["로컬 LLM 연결 시 자동 우선 사용", ACC3],
    ["미연결 시 OpenAI API fallback", ACC],
    ["모델별 파라미터 개별 조정", ACC2],
    ["채팅 패널 실시간 모델 전환", ACC4],
  ].forEach(([text, color], i) => {
    s.addText("✓  " + text, { x: 9.4, y: 2.55 + i * 0.8, w: 3.5, h: 0.65, fontFace: FONT_BODY, fontSize: 13, color: TXT });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 8 — Image Studio
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Image Studio");

  s.addText("AI 이미지 생성 스튜디오\nDALL-E 3 통합 갤러리", {
    x: 0.6, y: 0.82, w: 12, h: 1.0,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: TXT,
  });

  // Generate panel
  addCard(s, { x: 0.5, y: 2.0, w: 7.5, h: 4.5 });
  s.addText("GENERATE TAB", { x: 0.7, y: 2.15, w: 4, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: MUT, charSpacing: 2 });

  addCard(s, { x: 0.7, y: 2.55, w: 7.1, h: 1.5, fill: BG3 });
  s.addText("Prompt", { x: 0.9, y: 2.65, w: 2, h: 0.25, fontFace: FONT_MONO, fontSize: 9, color: MUT });
  s.addText('"A futuristic AI control room with multiple holographic screens, dark navy theme, cinematic lighting"', {
    x: 0.9, y: 2.93, w: 6.7, h: 0.9, fontFace: FONT_BODY, fontSize: 13, color: TXT,
  });

  const settings = [["Provider", "OpenAI"], ["Model", "dall-e-3"], ["Size", "1024×1024"]];
  settings.forEach(([k, v], i) => {
    const x = 0.7 + i * 2.35;
    addCard(s, { x, y: 4.2, w: 2.15, h: 0.85, fill: BG3 });
    s.addText(k.toUpperCase(), { x: x + 0.12, y: 4.28, w: 1.9, h: 0.22, fontFace: FONT_MONO, fontSize: 8, color: MUT });
    s.addText(v, { x: x + 0.12, y: 4.5, w: 1.9, h: 0.28, fontFace: FONT_MONO, fontSize: 11, color: ACC, bold: true });
  });

  // Gallery panel
  addCard(s, { x: 8.3, y: 2.0, w: 4.6, h: 4.5, border: ACC + "44" });
  s.addText("GALLERY", { x: 8.5, y: 2.15, w: 4, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: MUT, charSpacing: 2 });

  const galleryColors = [ACC, ACC2, ACC3, ACC4, ACC, ACC2];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      const x = 8.5 + col * 1.45;
      const y = 2.6 + row * 1.4;
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: 1.28, h: 1.2,
        fill: { color: galleryColors[i], transparency: 88 },
        line: { color: galleryColors[i], width: 0.5, transparency: 67 },
        rectRadius: 0.08,
      });
      s.addText("🖼", { x: x + 0.4, y: y + 0.38, w: 0.5, h: 0.45, fontSize: 18 });
    }
  }
  s.addText("6 images  ·  dall-e-3", { x: 8.5, y: 5.7, w: 4, h: 0.3, fontFace: FONT_MONO, fontSize: 10, color: MUT });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 9 — Status & Progress
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);
  addTag(s, "Development Status");

  s.addText("Phase 18 완료  ✓  전체 기능 구현 완료", {
    x: 0.6, y: 0.82, w: 12, h: 0.7,
    fontFace: FONT_BODY, fontSize: 28, bold: true, color: ACC3,
  });

  const phases = [
    ["Phase 1–10  (Core OS)",       100, ACC3],
    ["Phase 11–12 (Agent CLI)",      100, ACC3],
    ["Phase 13   (CSS Overhaul)",    100, ACC3],
    ["Phase 14   (MED Features)",    100, ACC3],
    ["Phase 15   (Image Studio)",    100, ACC3],
    ["Phase 16   (Synapse KB)",      100, ACC3],
    ["Phase 17   (Local LLM)",       100, ACC3],
    ["Phase 18   (Flow Graph)",      100, ACC3],
  ];

  phases.forEach(([label, pct, color], i) => {
    const y = 1.75 + i * 0.62;
    s.addText(label, { x: 0.6, y, w: 3.6, h: 0.38, fontFace: FONT_MONO, fontSize: 10, color: MUT });
    s.addShape(pptx.ShapeType.rect, { x: 4.3, y: y + 0.1, w: 5.2, h: 0.12, fill: { color: BG3 } });
    s.addShape(pptx.ShapeType.rect, { x: 4.3, y: y + 0.1, w: 5.2 * (pct) / 100, h: 0.12, fill: { color: color } });
    s.addText("100%", { x: 9.6, y, w: 0.7, h: 0.38, fontFace: FONT_MONO, fontSize: 10, color: color, align: "right" });
  });

  // Stats card
  addCard(s, { x: 10.5, y: 1.6, w: 2.7, h: 5.0, border: ACC3 + "44" });
  s.addText("KEY STATS", { x: 10.65, y: 1.78, w: 2.3, h: 0.28, fontFace: FONT_MONO, fontSize: 9, color: ACC3, charSpacing: 2 });

  const stats = [
    ["Components", "85+"],
    ["API Endpoints", "40+"],
    ["DB Migrations", "19"],
    ["WS Events", "12 types"],
    ["Shortcuts", "12 actions"],
    ["Slides", "10"],
  ];
  stats.forEach(([k, v], i) => {
    const y = 2.28 + i * 0.7;
    s.addText(k, { x: 10.65, y, w: 2.3, h: 0.3, fontFace: FONT_BODY, fontSize: 11, color: MUT });
    s.addText(v, { x: 10.65, y: y + 0.28, w: 2.3, h: 0.3, fontFace: FONT_MONO, fontSize: 13, color: ACC3, bold: true });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SLIDE 10 — Outro
// ─────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgFill(s);

  // Decorative rings
  for (let i = 0; i < 4; i++) {
    const r = 1.5 + i * 0.9;
    s.addShape(pptx.ShapeType.ellipse, {
      x: 6.67 - r, y: 3.75 - r, w: r * 2, h: r * 2,
      fill: { type: "none" },
      line: { color: ACC, width: 0.4, transparency: 75 + i * 5 },
    });
  }

  s.addText("▣ AgentDesk v2.0", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35,
    fontFace: FONT_MONO, fontSize: 12, color: MUT, align: "center",
  });
  s.addText("AgentDesk", {
    x: 0.6, y: 1.85, w: 12.1, h: 1.5,
    fontFace: FONT_BODY, fontSize: 72, bold: true, color: ACC, align: "center",
  });
  s.addText("AI 에이전트 운영을 위한 Project OS", {
    x: 0.6, y: 3.4, w: 12.1, h: 0.55,
    fontFace: FONT_BODY, fontSize: 20, color: MUT, align: "center",
  });

  const pills = ["React 19", "Node.js", "SQLite", "WebSocket", "Remotion", "Electron"];
  const pillColors = [ACC2, ACC3, ACC, ACC4, "E11D48", MUT];
  pills.forEach((label, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 3.8 + col * 2.0;
    const y = 4.3 + row * 0.75;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 1.75, h: 0.52,
      fill: { color: pillColors[i], transparency: 88 },
      line: { color: pillColors[i], width: 0.6, transparency: 67 },
      rectRadius: 0.26,
    });
    s.addText(label, { x, y: y + 0.1, w: 1.75, h: 0.32, fontFace: FONT_MONO, fontSize: 11, color: pillColors[i], align: "center" });
  });

  s.addText("Phase 1–18 Complete  ·  85+ Components  ·  40+ API Endpoints", {
    x: 0.6, y: 6.5, w: 12.1, h: 0.35,
    fontFace: FONT_MONO, fontSize: 11, color: MUT, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: "C:/project/AgentDesk/docs/reports/AgentDesk-Introduction.pptx" });
console.log("✓ Saved: docs/reports/AgentDesk-Introduction.pptx");
