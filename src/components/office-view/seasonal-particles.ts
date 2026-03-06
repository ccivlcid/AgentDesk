import { Container, Graphics } from "pixi.js";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export type SeasonKey = "spring" | "summer" | "autumn" | "winter" | "none";

export interface SeasonalParticle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
}

export interface SeasonalParticleState {
  container: Container;
  particles: SeasonalParticle[];
  season: SeasonKey;
  areaW: number;
  areaH: number;
}

/* ================================================================== */
/*  Season config                                                       */
/* ================================================================== */

const MAX_PARTICLES = 60;
const SPAWN_RATE = 0.3; // particles per tick

interface SeasonConfig {
  colors: number[];
  sizeRange: [number, number];
  speedRange: [number, number]; // vy
  driftRange: [number, number]; // vx
  rotRange: [number, number];
  lifeRange: [number, number];
  shape: "circle" | "leaf" | "diamond" | "flake";
}

const SEASON_CONFIGS: Record<Exclude<SeasonKey, "none">, SeasonConfig> = {
  spring: {
    colors: [0xffb7c5, 0xffc0cb, 0xffe0e8, 0xffd4dd, 0xffffff],
    sizeRange: [2, 4],
    speedRange: [0.3, 0.8],
    driftRange: [-0.3, 0.3],
    rotRange: [-0.03, 0.03],
    lifeRange: [200, 400],
    shape: "leaf",
  },
  summer: {
    colors: [0xfff8b0, 0xffe580, 0xffffff, 0xb0e0ff],
    sizeRange: [1, 2.5],
    speedRange: [0.05, 0.2],
    driftRange: [-0.1, 0.1],
    rotRange: [-0.01, 0.01],
    lifeRange: [300, 500],
    shape: "diamond",
  },
  autumn: {
    colors: [0xd4622b, 0xc94d18, 0xe8a040, 0xbb4400, 0xd08830],
    sizeRange: [2.5, 5],
    speedRange: [0.4, 1.0],
    driftRange: [-0.5, 0.5],
    rotRange: [-0.05, 0.05],
    lifeRange: [180, 350],
    shape: "leaf",
  },
  winter: {
    colors: [0xffffff, 0xe8f0ff, 0xd8e8ff, 0xf0f8ff],
    sizeRange: [1.5, 3.5],
    speedRange: [0.2, 0.6],
    driftRange: [-0.2, 0.2],
    rotRange: [-0.02, 0.02],
    lifeRange: [250, 450],
    shape: "flake",
  },
};

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function drawShape(g: Graphics, shape: SeasonConfig["shape"], size: number, color: number) {
  switch (shape) {
    case "circle":
      g.circle(0, 0, size).fill({ color, alpha: 0.8 });
      break;
    case "leaf": {
      // petal / leaf shape
      g.ellipse(0, 0, size * 0.6, size).fill({ color, alpha: 0.75 });
      g.ellipse(size * 0.3, 0, size * 0.4, size * 0.7).fill({ color, alpha: 0.5 });
      break;
    }
    case "diamond": {
      // sparkle / light mote
      g.star(0, 0, 4, size, size * 0.4).fill({ color, alpha: 0.6 });
      break;
    }
    case "flake": {
      // snowflake — small cross + diagonals
      const s = size;
      g.circle(0, 0, s * 0.4).fill({ color, alpha: 0.9 });
      g.rect(-s, -0.5, s * 2, 1).fill({ color, alpha: 0.7 });
      g.rect(-0.5, -s, 1, s * 2).fill({ color, alpha: 0.7 });
      break;
    }
  }
}

/* ================================================================== */
/*  Public API                                                          */
/* ================================================================== */

export function createSeasonalParticleState(parent: Container, season: SeasonKey, areaW: number, areaH: number): SeasonalParticleState {
  const container = new Container();
  parent.addChild(container);
  return { container, particles: [], season, areaW, areaH };
}

export function updateSeasonalParticles(state: SeasonalParticleState, tick: number): void {
  if (state.season === "none") return;
  const config = SEASON_CONFIGS[state.season];
  if (!config) return;

  // Spawn
  if (state.particles.length < MAX_PARTICLES && Math.random() < SPAWN_RATE) {
    const color = pick(config.colors);
    const size = rand(...config.sizeRange);
    const g = new Graphics();
    drawShape(g, config.shape, size, color);

    const p: SeasonalParticle = {
      g,
      x: rand(-20, state.areaW + 20),
      y: rand(-30, -5),
      vx: rand(...config.driftRange),
      vy: rand(...config.speedRange),
      size,
      alpha: 1,
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(...config.rotRange),
      life: 0,
      maxLife: rand(...config.lifeRange),
    };
    g.position.set(p.x, p.y);
    g.rotation = p.rotation;
    state.container.addChild(g);
    state.particles.push(p);
  }

  // Update
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life++;
    p.x += p.vx + Math.sin(tick * 0.02 + p.rotation) * 0.15;
    p.y += p.vy;
    p.rotation += p.rotSpeed;

    // Fade out in last 20% of life
    const lifeRatio = p.life / p.maxLife;
    p.alpha = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : Math.min(1, p.life / 20);

    p.g.position.set(p.x, p.y);
    p.g.rotation = p.rotation;
    p.g.alpha = p.alpha;

    // Remove dead or out of bounds
    if (p.life >= p.maxLife || p.y > state.areaH + 10) {
      state.container.removeChild(p.g);
      p.g.destroy();
      state.particles.splice(i, 1);
    }
  }
}

export function destroySeasonalParticles(state: SeasonalParticleState): void {
  for (const p of state.particles) {
    if (!p.g.destroyed) p.g.destroy();
  }
  state.particles.length = 0;
  if (!state.container.destroyed) state.container.destroy({ children: true });
}

/** Auto-detect season from current date */
export function detectSeason(): SeasonKey {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

/** Load season preference from localStorage */
export function loadSeasonPreference(): SeasonKey | "auto" {
  try {
    const val = localStorage.getItem("agentdesk_seasonal_decor");
    if (val === "auto" || val === "spring" || val === "summer" || val === "autumn" || val === "winter" || val === "none") return val;
  } catch {}
  return "auto";
}

/** Save season preference to localStorage and notify listeners */
export function saveSeasonPreference(value: SeasonKey | "auto"): void {
  try {
    localStorage.setItem("agentdesk_seasonal_decor", value);
  } catch {}
  window.dispatchEvent(new CustomEvent("agentdesk_season_change", { detail: value }));
}

/** Resolve actual season from preference */
export function resolveSeasonKey(pref: SeasonKey | "auto"): SeasonKey {
  return pref === "auto" ? detectSeason() : pref;
}
