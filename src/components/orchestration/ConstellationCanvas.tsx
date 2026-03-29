import { useRef, useEffect, useCallback, useState } from "react";
import type { Task, Agent, Department } from "../../types";
import { getTaskProgress } from "./task-progress";

/* ================================================================
   Constants & Theme
   ================================================================ */

const DEPT_COLORS: Record<string, string> = {
  planning: "#06b6d4", dev: "#eab308", design: "#ec4899",
  qa: "#22c55e", devsecops: "#ef4444", operations: "#f97316",
};
const PM_COLOR = "#6366f1";
const DEFAULT_COLOR = "#3b82f6";

function agentColor(dept?: Department): string {
  if (!dept) return DEFAULT_COLOR;
  const k = dept.name.toLowerCase();
  for (const [key, color] of Object.entries(DEPT_COLORS)) {
    if (k.includes(key)) return color;
  }
  return DEFAULT_COLOR;
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") !== "light";
}

/** Theme-aware colors resolved at draw time */
function getThemeColors() {
  const dark = isDarkMode();
  return {
    textPrimary: dark ? "#e8e8e8" : "#1a1a1a",
    textMuted: dark ? "#737373" : "#706b62",
    border: dark ? "42,42,42" : "180,175,165",
    edgeBase: dark ? "140,140,140" : "160,155,145",
    matrixColor: dark ? "34,197,94" : "34,140,80",
    matrixOpacityMin: dark ? 0.05 : 0.04,
    matrixOpacityMax: dark ? 0.12 : 0.08,
    nodeInnerAlpha: dark ? 0.1 : 0.08,
    nodeBorderAlpha: dark ? 0.8 : 0.5,
    hubColor: "99,102,241",
  };
}

const MATRIX_WORDS = [
  "const", "let", "function", "return", "import", "export", "async", "await",
  "class", "interface", "type", "SELECT", "INSERT", "FROM", "WHERE", "UPDATE",
  "if", "else", "for", "while", "map", "filter", "reduce", "Promise",
  "null", "true", "false", "void", "new", "this", "super", "extends",
];

/* ================================================================
   Layout: PM top-center, team below
   ================================================================ */

function computePositions(count: number, w: number, h: number): Array<{ x: number; y: number }> {
  const cx = w / 2;
  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: h * 0.6 }];
  if (count === 2) return [
    { x: cx - w * 0.2, y: h * 0.58 },
    { x: cx + w * 0.2, y: h * 0.58 },
  ];
  if (count === 3) return [
    { x: cx - w * 0.22, y: h * 0.48 },
    { x: cx + w * 0.22, y: h * 0.48 },
    { x: cx, y: h * 0.74 },
  ];
  if (count === 4) return [
    { x: cx - w * 0.24, y: h * 0.44 },
    { x: cx + w * 0.24, y: h * 0.44 },
    { x: cx - w * 0.18, y: h * 0.74 },
    { x: cx + w * 0.18, y: h * 0.74 },
  ];
  // 5+: two rows
  const top = Math.ceil(count / 2);
  const bot = count - top;
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < top; i++) {
    const frac = top === 1 ? 0.5 : i / (top - 1);
    positions.push({ x: w * 0.15 + frac * w * 0.7, y: h * 0.44 });
  }
  for (let i = 0; i < bot; i++) {
    const frac = bot === 1 ? 0.5 : i / (bot - 1);
    positions.push({ x: w * 0.2 + frac * w * 0.6, y: h * 0.74 });
  }
  return positions;
}

/* ================================================================
   Props
   ================================================================ */

interface ConstellationCanvasProps {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  pmAgentId?: string | null;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onDoubleClickAgent: (id: string) => void;
}

/* ================================================================
   Matrix rain
   ================================================================ */

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  charIdx: number;
  opacity: number;
}

function createRainDrops(w: number): RainDrop[] {
  const cols = Math.floor(w / 20);
  const drops: RainDrop[] = [];
  for (let i = 0; i < cols; i++) {
    const word = MATRIX_WORDS[Math.floor(Math.random() * MATRIX_WORDS.length)];
    drops.push({
      x: i * 20 + 4 + Math.random() * 6,
      y: Math.random() * -800,
      speed: 20 + Math.random() * 40,
      chars: word.split(""),
      charIdx: 0,
      opacity: 0.06 + Math.random() * 0.1,
    });
  }
  return drops;
}

/* ================================================================
   Component
   ================================================================ */

export default function ConstellationCanvas({
  agents, tasks, departments, pmAgentId, selectedAgentId, onSelectAgent, onDoubleClickAgent,
}: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rainRef = useRef<RainDrop[]>([]);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [size, setSize] = useState({ w: 600, h: 400 });

  // PM detection: prefer pmAgentId, then team_leader role
  const pmAgent = agents.find((a) => a.id === pmAgentId)
    ?? agents.find((a) => a.role === "team_leader")
    ?? null;
  const teamAgents = agents.filter((a) => a.id !== pmAgent?.id);

  const teamPositions = computePositions(teamAgents.length, size.w, size.h);
  const pmPos = pmAgent ? { x: size.w / 2, y: size.h * 0.16 } : null;

  // Node list
  const nodes: Array<{ id: string; x: number; y: number; r: number; agent: Agent; dept?: Department; isPm: boolean }> = [];
  if (pmAgent && pmPos) {
    nodes.push({ id: pmAgent.id, x: pmPos.x, y: pmPos.y, r: 42, agent: pmAgent, dept: departments.find((d) => d.id === pmAgent.department_id), isPm: true });
  }
  teamAgents.forEach((a, i) => {
    if (i < teamPositions.length) {
      nodes.push({ id: a.id, x: teamPositions[i].x, y: teamPositions[i].y, r: 32, agent: a, dept: departments.find((d) => d.id === a.department_id), isPm: false });
    }
  });

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.round(width), h: Math.round(height) });
        rainRef.current = createRainDrops(Math.round(width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (rainRef.current.length === 0) rainRef.current = createRainDrops(size.w);
  }, [size.w]);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
  }, [size, dpr]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FPS = 30;
    const interval = 1000 / FPS;
    let running = true;

    function draw(now: number) {
      if (!running || !ctx) return;
      animRef.current = requestAnimationFrame(draw);

      const delta = now - lastFrameRef.current;
      if (delta < interval) return;
      lastFrameRef.current = now - (delta % interval);

      const { w, h } = size;
      const theme = getThemeColors();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // -- Matrix rain --
      ctx.font = "10px monospace";
      for (const drop of rainRef.current) {
        drop.y += drop.speed * (delta / 1000);
        if (drop.y > h + 200) {
          drop.y = Math.random() * -500;
          const word = MATRIX_WORDS[Math.floor(Math.random() * MATRIX_WORDS.length)];
          drop.chars = word.split("");
          drop.charIdx = 0;
        }
        for (let j = 0; j < drop.chars.length; j++) {
          const cy = drop.y + j * 14;
          if (cy < -14 || cy > h + 14) continue;
          const fade = 1 - j / drop.chars.length;
          ctx.fillStyle = `rgba(${theme.matrixColor}, ${drop.opacity * fade})`;
          ctx.fillText(drop.chars[(drop.charIdx + j) % drop.chars.length], drop.x, cy);
        }
        drop.charIdx = (drop.charIdx + 1) % drop.chars.length;
      }

      // -- Edges (mesh) --
      const t = now / 1000;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const aWorking = a.agent.status === "working";
          const bWorking = b.agent.status === "working";
          const isSelected = selectedAgentId === a.id || selectedAgentId === b.id;

          let alpha = 0.12;
          let lineW = 1;
          let color = theme.edgeBase;

          if (isSelected) { alpha = 0.6; lineW = 1.5; color = "245,158,11"; }
          else if (aWorking && bWorking) { alpha = 0.35; lineW = 1.5; }
          else if (aWorking || bWorking) { alpha = 0.2; }

          ctx.strokeStyle = `rgba(${color},${alpha})`;
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Data flow dots
          if ((aWorking || bWorking) && !isSelected) {
            const progress = ((t * 0.3) + i * 0.2 + j * 0.15) % 1;
            const dx = a.x + (b.x - a.x) * progress;
            const dy = a.y + (b.y - a.y) * progress;
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color},${alpha * 2})`;
            ctx.fill();
          }
        }
      }

      // -- Hub (centroid) --
      if (nodes.length >= 3) {
        const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
        const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
        const hubAlpha = 0.3 + 0.25 * Math.sin(t * 1.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${theme.hubColor},${hubAlpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${theme.hubColor},${hubAlpha * 0.25})`;
        ctx.fill();
      }

      // -- Nodes --
      for (const node of nodes) {
        const { x, y, r, agent, dept, isPm } = node;
        const isWorking = agent.status === "working";
        const isSelected = selectedAgentId === agent.id;
        const color = isPm ? PM_COLOR : agentColor(dept);
        const currentTask = tasks.find((tk) => tk.assigned_agent_id === agent.id && tk.status === "in_progress");
        const progress = currentTask ? getTaskProgress(currentTask) : 0;

        // Pulse
        const pulseBase = isPm ? 0.7 : 0.5;
        const pulseSpeed = isPm ? 1 : 1.5;
        const pulseAlpha = isWorking || isPm
          ? pulseBase + (1 - pulseBase) * (0.5 + 0.5 * Math.sin(t * pulseSpeed * Math.PI * 2))
          : 0.35;

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, r + 12, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245,158,11,0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Glow
        if (isWorking || isPm) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 16;
        }

        // Progress ring
        if (progress > 0 && !isPm) {
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + (progress / 100) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x, y, r + 6, startAngle, endAngle);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = isWorking || isPm ? 2 : 1.5;
        ctx.globalAlpha = pulseAlpha;
        if (!isWorking && !isPm) ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, theme.nodeInnerAlpha);
        ctx.fill();
        ctx.strokeStyle = `rgba(${theme.border},${theme.nodeBorderAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon circle
        ctx.beginPath();
        ctx.arc(x, y - 2, isPm ? 13 : 10, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.fill();

        // Icon glyph
        ctx.fillStyle = color;
        ctx.font = `bold ${isPm ? 15 : 12}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(getAgentGlyph(dept?.name, isPm), x, y - 2);

        // Name
        ctx.fillStyle = theme.textPrimary;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const displayName = agent.name.length > 10 ? agent.name.slice(0, 9) + ".." : agent.name;
        ctx.fillText(displayName, x, y + r + 10);

        // Role sublabel (역할, not department)
        ctx.fillStyle = theme.textMuted;
        ctx.font = "8px monospace";
        const sublabel = isPm ? "PM" : agent.role === "senior" ? "Senior" : "Junior";
        ctx.fillText(sublabel, x, y + r + 22);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [size, nodes, selectedAgentId, tasks, dpr]);

  // Hit test
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hitId: string | null = null;
    for (const node of nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (dx * dx + dy * dy <= (node.r + 12) * (node.r + 12)) {
        hitId = node.id;
        break;
      }
    }

    const now = Date.now();
    if (hitId && lastClickRef.current && lastClickRef.current.id === hitId && now - lastClickRef.current.time < 400) {
      onDoubleClickAgent(hitId);
      lastClickRef.current = null;
      return;
    }
    lastClickRef.current = hitId ? { id: hitId, time: now } : null;
    onSelectAgent(hitId);
  }, [nodes, onSelectAgent, onDoubleClickAgent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onSelectAgent(null);
  }, [onSelectAgent]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="img"
      aria-label="Agent constellation network"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: "pointer", display: "block" }}
      />
      <ul style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {agents.map((a) => <li key={a.id}>{a.name}: {a.status}</li>)}
      </ul>
    </div>
  );
}

/* ================================================================
   Helpers
   ================================================================ */

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getAgentGlyph(deptName?: string, isPm?: boolean): string {
  if (isPm) return "\u2605";
  if (!deptName) return ">";
  const k = deptName.toLowerCase();
  if (k.includes("design")) return "\u270E";
  if (k.includes("qa") || k.includes("test")) return "\u2713";
  if (k.includes("devsecops") || k.includes("security")) return "\u2616";
  if (k.includes("operations") || k.includes("ops")) return "\u2699";
  if (k.includes("planning") || k.includes("plan")) return "\u2630";
  return ">_";
}
