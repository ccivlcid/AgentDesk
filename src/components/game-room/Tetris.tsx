import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameScore } from "./useGameRoomState";

/* ── Constants ─────────────────────────────────────────── */
const COLS = 10;
const ROWS = 20;
const CELL = 24;
const TICK_BASE = 800;
const TICK_MIN = 80;
const LINES_PER_LEVEL = 10;

type Color = string | null;

/* ── Tetromino definitions ─────────────────────────────── */
const SHAPES: { cells: number[][]; color: string }[] = [
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: "#06b6d4" }, // I
  { cells: [[0,0],[1,0],[0,1],[1,1]], color: "#eab308" }, // O
  { cells: [[1,0],[0,1],[1,1],[2,1]], color: "#a855f7" }, // T
  { cells: [[1,0],[2,0],[0,1],[1,1]], color: "#22c55e" }, // S
  { cells: [[0,0],[1,0],[1,1],[2,1]], color: "#ef4444" }, // Z
  { cells: [[0,0],[0,1],[1,1],[2,1]], color: "#3b82f6" }, // J
  { cells: [[2,0],[0,1],[1,1],[2,1]], color: "#f97316" }, // L
];

interface GameState {
  board: Color[][];
  piece: { cells: number[][]; color: string };
  next: { cells: number[][]; color: string };
  pos: { r: number; c: number };
  score: number;
  lines: number;
  level: number;
  over: boolean;
}

function emptyBoard(): Color[][] {
  return Array.from({ length: ROWS }, () => Array<Color>(COLS).fill(null));
}

function randomShape() {
  const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { cells: s.cells.map(([x, y]) => [x, y]), color: s.color };
}

function initState(): GameState {
  const piece = randomShape();
  return {
    board: emptyBoard(),
    piece,
    next: randomShape(),
    pos: { r: 0, c: Math.floor(COLS / 2) - 1 },
    score: 0,
    lines: 0,
    level: 0,
    over: false,
  };
}

/* Absolute cell coords for current piece */
function absCells(piece: { cells: number[][] }, pos: { r: number; c: number }) {
  return piece.cells.map(([x, y]) => [pos.c + x, pos.r + y]);
}

function fits(board: Color[][], piece: { cells: number[][] }, pos: { r: number; c: number }) {
  for (const [x, y] of piece.cells) {
    const bc = pos.c + x;
    const br = pos.r + y;
    if (bc < 0 || bc >= COLS || br < 0 || br >= ROWS) return false;
    if (board[br][bc]) return false;
  }
  return true;
}

function rotateCells(cells: number[][]): number[][] {
  // Find bounding box
  let maxX = 0, maxY = 0;
  for (const [x, y] of cells) { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  // Rotate 90 CW: (x,y) → (maxY-y, x)
  return cells.map(([x, y]) => [maxY - y, x]);
}

function ghostPos(board: Color[][], piece: { cells: number[][] }, pos: { r: number; c: number }) {
  let gr = pos.r;
  while (fits(board, piece, { r: gr + 1, c: pos.c })) gr++;
  return gr;
}

function lockAndClear(board: Color[][], piece: { cells: number[][] }, pos: { r: number; c: number }, color: string) {
  const b = board.map((row) => [...row]);
  for (const [x, y] of piece.cells) {
    const bc = pos.c + x;
    const br = pos.r + y;
    if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) b[br][bc] = color;
  }
  const kept = b.filter((row) => row.some((c) => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array<Color>(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

function lineScore(n: number, level: number) {
  return [0, 100, 300, 500, 800][n] * (level + 1);
}

/** Pure: one gravity step. Returns new state or null if need lock. */
function moveDownState(state: GameState): GameState | null {
  if (state.over) return state;
  const np = { r: state.pos.r + 1, c: state.pos.c };
  if (fits(state.board, state.piece, np)) return { ...state, pos: np };
  return null;
}

/** Pure: lock piece and spawn next. Call when moveDownState returned null. */
function lockAndSpawnState(state: GameState): GameState {
  if (state.over) return state;
  const { board: newBoard, cleared } = lockAndClear(state.board, state.piece, state.pos, state.piece.color);
  const newLines = state.lines + cleared;
  const newLevel = Math.floor(newLines / LINES_PER_LEVEL);
  const pts = cleared > 0 ? lineScore(cleared, state.level) : 0;
  const nextPiece = state.next;
  const spawnPos = { r: 0, c: Math.floor(COLS / 2) - 1 };
  if (!fits(newBoard, nextPiece, spawnPos)) {
    return {
      ...state,
      board: newBoard,
      score: state.score + pts,
      lines: newLines,
      level: newLevel,
      over: true,
    };
  }
  return {
    ...state,
    board: newBoard,
    piece: nextPiece,
    next: randomShape(),
    pos: spawnPos,
    score: state.score + pts,
    lines: newLines,
    level: newLevel,
  };
}

/** Pure: move piece (dr, dc). Returns new state or null if invalid. */
function tryMoveState(state: GameState, dr: number, dc: number): GameState | null {
  if (state.over) return null;
  const np = { r: state.pos.r + dr, c: state.pos.c + dc };
  if (fits(state.board, state.piece, np)) return { ...state, pos: np };
  return null;
}

/** Pure: rotate piece. Returns new state or null if no valid kick. */
function tryRotateState(state: GameState): GameState | null {
  if (state.over) return null;
  const rotated = { ...state.piece, cells: rotateCells(state.piece.cells) };
  for (const [dc, dr] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]]) {
    const np = { r: state.pos.r + dr, c: state.pos.c + dc };
    if (fits(state.board, rotated, np)) return { ...state, piece: rotated, pos: np };
  }
  return null;
}

/** Placement score: lower = better. 라인 클리어 우선, 높이·구멍·울퉁불퉁 패널티. */
function scorePlacement(board: Color[][], piece: { cells: number[][] }, pos: { r: number; c: number }): number {
  const b = board.map((row) => [...row]);
  for (const [x, y] of piece.cells) {
    const bc = pos.c + x;
    const br = pos.r + y;
    if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) b[br][bc] = "#";
  }
  const kept = b.filter((row) => row.some((c) => !c));
  const cleared = ROWS - kept.length;
  const colHeights: number[] = [];
  for (let c = 0; c < COLS; c++) {
    let h = 0;
    for (let r = 0; r < kept.length; r++) {
      if (kept[r][c]) {
        h = kept.length - r;
        break;
      }
    }
    colHeights.push(h);
  }
  const maxHeight = Math.max(...colHeights, 0);
  let holes = 0;
  for (let c = 0; c < COLS; c++) {
    let foundTop = false;
    for (let r = 0; r < kept.length; r++) {
      if (kept[r][c]) foundTop = true;
      else if (foundTop) holes++;
    }
  }
  const bumpiness = colHeights.slice(1).reduce((acc, h, i) => acc + Math.abs(h - colHeights[i]), 0);
  return maxHeight * 8 + holes * 25 + bumpiness * 2 - cleared * 120;
}

/** Best column + rotation for current piece (greedy). Returns { col, rotation } or null. */
function getBestPlacement(state: GameState): { col: number; rotation: number } | null {
  let bestScore = Infinity;
  let best: { col: number; rotation: number } | null = null;
  let piece = state.piece;
  for (let rot = 0; rot < 4; rot++) {
    for (let col = 0; col <= COLS - 1; col++) {
      const c = Math.max(0, Math.min(col, COLS - 1));
      const spawn = { r: 0, c };
      if (!fits(state.board, piece, spawn)) continue;
      let r = 0;
      while (fits(state.board, piece, { r: r + 1, c })) r++;
      const sc = scorePlacement(state.board, piece, { r, c });
      if (sc < bestScore) {
        bestScore = sc;
        best = { col: c, rotation: rot };
      }
    }
    piece = { ...piece, cells: rotateCells(piece.cells) };
  }
  return best;
}

/** Senior용: 현재 회전으로 가장 낮은 높이인 컬럼 반환. */
function getBestColumnSimple(state: GameState): number {
  let bestCol = state.pos.c;
  let bestScore = Infinity;
  for (let col = 0; col < COLS; col++) {
    const spawn = { r: 0, c: col };
    if (!fits(state.board, state.piece, spawn)) continue;
    let r = 0;
    while (fits(state.board, state.piece, { r: r + 1, c: col })) r++;
    const sc = scorePlacement(state.board, state.piece, { r, c: col });
    if (sc < bestScore) {
      bestScore = sc;
      bestCol = col;
    }
  }
  return bestCol;
}

/** Opponent AI: next action based on role. */
function opponentAction(state: GameState, role: string): "left" | "right" | "rotate" | "down" | null {
  if (state.over) return null;
  if (role === "team_leader") {
    const best = getBestPlacement(state);
    if (!best) return "down";
    const targetCol = best.col;
    const curCol = state.pos.c;
    if (targetCol < curCol && tryMoveState(state, 0, -1)) return "left";
    if (targetCol > curCol && tryMoveState(state, 0, 1)) return "right";
    if (tryRotateState(state)) return "rotate";
    return "down";
  }
  if (role === "senior") {
    const targetCol = getBestColumnSimple(state);
    const curCol = state.pos.c;
    if (targetCol < curCol && tryMoveState(state, 0, -1)) return "left";
    if (targetCol > curCol && tryMoveState(state, 0, 1)) return "right";
    if (Math.random() < 0.4 && tryRotateState(state)) return "rotate";
    return "down";
  }
  if (role === "junior" || role === "intern") {
    const targetCol = getBestColumnSimple(state);
    const curCol = state.pos.c;
    if (targetCol !== curCol && Math.random() < 0.6) {
      if (targetCol < curCol && tryMoveState(state, 0, -1)) return "left";
      if (targetCol > curCol && tryMoveState(state, 0, 1)) return "right";
    }
    if (Math.random() < 0.25 && tryRotateState(state)) return "rotate";
    return "down";
  }
  return "down";
}

/** 틱당 최대 조정 횟수 (목표에 가까워질 시간 확보). */
const OPPONENT_ACTIONS_PER_TICK: Record<string, number> = {
  team_leader: 4,
  senior: 3,
  junior: 2,
  intern: 1,
};

/** Pure: one tick — 역할별로 여러 번 조정 후 한 칸 낙하. */
function opponentTick(state: GameState, role: string): GameState {
  if (state.over) return state;
  let s: GameState = state;
  const maxActions = OPPONENT_ACTIONS_PER_TICK[role] ?? 2;
  for (let i = 0; i < maxActions; i++) {
    const action = opponentAction(s, role);
    if (action === "left") s = tryMoveState(s, 0, -1)!;
    else if (action === "right") s = tryMoveState(s, 0, 1)!;
    else if (action === "rotate") s = tryRotateState(s)!;
    else break;
    if (!s) break;
  }
  const next = moveDownState(s);
  return next ?? lockAndSpawnState(s);
}

/* ── Persist state across Strict Mode remount (리마운트 시 점수/레벨 유지) ── */
let tetrisPersisted: { gs: GameState; opponentGs: GameState } | null = null;

function getPersistedOrInit(): { gs: GameState; opponentGs: GameState } {
  if (tetrisPersisted) return tetrisPersisted;
  const gs = initState();
  const opp = initState();
  tetrisPersisted = { gs, opponentGs: opp };
  return tetrisPersisted;
}

function clearTetrisPersisted() {
  tetrisPersisted = null;
}

/* ── Component ─────────────────────────────────────────── */
interface TetrisProps {
  opponent: Agent;
  onFinish: (score: GameScore) => void;
  onBack: () => void;
}

export default function Tetris({ opponent, onFinish, onBack }: TetrisProps) {
  const { t, locale } = useI18n();
  const opponentName = localeName(locale, opponent);

  const [gs, setGs] = useState<GameState>(() => getPersistedOrInit().gs);
  const [opponentGs, setOpponentGs] = useState<GameState>(() => getPersistedOrInit().opponentGs);
  const opponentStateRef = useRef<GameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const gsRef = useRef(gs);
  gsRef.current = gs;
  const finishedRef = useRef(false);
  const opponentScoreAtFinishRef = useRef(0);

  // ref를 state와 동기화 (상대 보드 렌더용)
  useEffect(() => {
    opponentStateRef.current = opponentGs;
  }, [opponentGs]);

  // Strict Mode 리마운트 시 복원용: 진행 중인 점수/레벨을 모듈 ref에 동기화
  useEffect(() => {
    tetrisPersisted = { gs, opponentGs };
  }, [gs, opponentGs]);

  const handleBack = useCallback(() => {
    clearTetrisPersisted();
    onBack();
  }, [onBack]);

  const showReaction = useCallback((msg: string) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(msg);
    reactionTimer.current = setTimeout(() => setReaction(null), 2000);
  }, []);

  /* ── Core update: returns new state ─────────── */
  const tryMove = useCallback((dr: number, dc: number): boolean => {
    const g = gsRef.current;
    if (g.over) return false;
    const np = { r: g.pos.r + dr, c: g.pos.c + dc };
    if (fits(g.board, g.piece, np)) {
      setGs((prev) => ({ ...prev, pos: np }));
      return true;
    }
    return false;
  }, []);

  const tryRotate = useCallback(() => {
    const g = gsRef.current;
    if (g.over) return;
    const rotated = { ...g.piece, cells: rotateCells(g.piece.cells) };
    for (const [dc, dr] of [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]]) {
      const np = { r: g.pos.r + dr, c: g.pos.c + dc };
      if (fits(g.board, rotated, np)) {
        setGs((prev) => ({ ...prev, piece: rotated, pos: np }));
        return;
      }
    }
  }, []);

  const doLock = useCallback(() => {
    setGs((prev) => {
      if (prev.over) return prev;
      const next = lockAndSpawnState(prev);
      if (next.lines > prev.lines) {
        const cleared = next.lines - prev.lines;
        const msgs: Record<number, string> = {
          1: t({ ko: "나이스!", en: "Nice!", ja: "ナイス!", zh: "不错!" }),
          2: t({ ko: "더블!", en: "Double!", ja: "ダブル!", zh: "双消!" }),
          3: t({ ko: "트리플!", en: "Triple!", ja: "トリプル!", zh: "三消!" }),
          4: t({ ko: "테트리스!!", en: "TETRIS!!", ja: "テトリス!!", zh: "俄罗斯!!" }),
        };
        showReaction(next.level > prev.level
          ? t({ ko: "레벨 업!", en: "Level up!", ja: "レベルアップ!", zh: "升级了!" })
          : (msgs[cleared] ?? msgs[1]));
      }
      if (next.over) showReaction(t({ ko: "수고하셨어요!", en: "Good game!", ja: "お疲れ様!", zh: "辛苦了!" }));
      return next;
    });
  }, [showReaction, t]);

  const moveDown = useCallback(() => {
    const g = gsRef.current;
    if (g.over || pausedRef.current) return;
    const np = { r: g.pos.r + 1, c: g.pos.c };
    if (fits(g.board, g.piece, np)) {
      setGs((prev) => ({ ...prev, pos: np }));
    } else {
      doLock();
    }
  }, [doLock]);

  const hardDrop = useCallback(() => {
    const g = gsRef.current;
    if (g.over || pausedRef.current) return;
    const gr = ghostPos(g.board, g.piece, g.pos);
    // Move to ghost row then lock immediately
    setGs((prev) => ({ ...prev, pos: { ...prev.pos, r: gr } }));
    // Lock on next microtask so the render shows the dropped position briefly
    queueMicrotask(() => doLock());
  }, [doLock]);

  // Opponent (AI) game loop: ref로 최신 상태 읽어서 틱 후 setState로 확실히 반영
  const opponentTickMs = 500;
  useEffect(() => {
    if (gs.over) return;
    const id = setInterval(() => {
      const prev = opponentStateRef.current ?? opponentGs;
      if (prev.over) return;
      const next = opponentTick(prev, opponent.role);
      opponentStateRef.current = next;
      setOpponentGs(next);
    }, opponentTickMs);
    return () => clearInterval(id);
  }, [gs.over, opponent.role]);

  // Finish game when CEO game over: compare with opponent score at that moment
  useEffect(() => {
    if (gs.over && !finishedRef.current) {
      finishedRef.current = true;
      clearTetrisPersisted();
      opponentScoreAtFinishRef.current = opponentGs.score;
      const timer = setTimeout(() => {
        const oppScore = opponentScoreAtFinishRef.current;
        const playerWins = gs.score > oppScore ? 1 : 0;
        const opponentWins = oppScore > gs.score ? 1 : 0;
        const draws = gs.score === oppScore ? 1 : 0;
        onFinish({
          playerWins,
          opponentWins,
          draws,
          points: gs.score,
          lines: gs.lines,
          level: gs.level,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gs.over, gs.score, gs.lines, gs.level, opponentGs.score, onFinish]);

  // Gravity
  useEffect(() => {
    if (gs.over) return;
    const ms = Math.max(TICK_MIN, TICK_BASE - gs.level * 70);
    const id = setInterval(() => {
      if (!pausedRef.current) moveDown();
    }, ms);
    return () => clearInterval(id);
  }, [gs.over, gs.level, moveDown]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gsRef.current.over) return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); if (!pausedRef.current) tryMove(0, -1); break;
        case "ArrowRight": e.preventDefault(); if (!pausedRef.current) tryMove(0, 1); break;
        case "ArrowDown": e.preventDefault(); if (!pausedRef.current) moveDown(); break;
        case "ArrowUp": e.preventDefault(); if (!pausedRef.current) tryRotate(); break;
        case " ": e.preventDefault(); if (!pausedRef.current) hardDrop(); break;
        case "p": case "P": setPaused((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hardDrop, moveDown, tryMove, tryRotate]);

  // Cleanup
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);

  /* ── Rendering: build board cells for any state ──────────────────────────────── */
  function buildBoardCells(state: GameState): React.ReactNode[] {
    const ghost = state.over ? state.pos.r : ghostPos(state.board, state.piece, state.pos);
    const curCells = absCells(state.piece, state.pos);
    const ghostCells = absCells(state.piece, { r: ghost, c: state.pos.c });
    const curSet = new Set(curCells.map(([x, y]) => `${x},${y}`));
    const ghostSet = new Set(ghostCells.map(([x, y]) => `${x},${y}`));
    const out: React.ReactNode[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${c},${r}`;
        const locked = state.board[r][c];
        const isCur = curSet.has(key);
        const isGhost = !state.over && !isCur && ghostSet.has(key);
        const bg = isCur
          ? state.piece.color
          : locked
            ? locked
            : isGhost
              ? `${state.piece.color}22`
              : "rgba(30,41,59,0.4)";
        const border = isCur
          ? "rgba(255,255,255,0.2)"
          : isGhost
            ? "rgba(148,163,184,0.2)"
            : "rgba(30,41,59,0.3)";
        const shadow = isCur ? `0 0 6px ${state.piece.color}88` : undefined;
        out.push(
          <div
            key={`${r}-${c}`}
            style={{
              position: "absolute",
              left: c * CELL,
              top: r * CELL,
              width: CELL,
              height: CELL,
              backgroundColor: bg,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: border,
              boxShadow: shadow,
            }}
          />,
        );
      }
    }
    return out;
  }

  const boardCells = buildBoardCells(gs);
  const opponentBoardCells = buildBoardCells(opponentGs);

  // Next preview
  const nextPreviewCell = 18;
  let nMaxX = 0, nMaxY = 0;
  for (const [x, y] of gs.next.cells) { nMaxX = Math.max(nMaxX, x); nMaxY = Math.max(nMaxY, y); }
  const nextCells = gs.next.cells.map(([x, y], i) => (
    <div
      key={i}
      style={{
        position: "absolute",
        left: x * nextPreviewCell,
        top: y * nextPreviewCell,
        width: nextPreviewCell,
        height: nextPreviewCell,
        backgroundColor: gs.next.color,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "rgba(255,255,255,0.2)",
      }}
    />
  ));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={handleBack} className="text-sm text-slate-400 hover:text-slate-200 transition">
          &larr; {t({ ko: "로비", en: "Lobby", ja: "ロビー", zh: "大厅" })}
        </button>
        <div className="text-xs text-slate-500">
          {t({ ko: "테트리스", en: "Tetris", ja: "テトリス", zh: "俄罗斯方块" })}
        </div>
      </div>

      <div className="flex flex-nowrap justify-start gap-4 sm:gap-6 pb-2" style={{ minWidth: "min-content" }}>
        {/* CEO (내 게임) — 왼쪽 */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="text-xs font-semibold text-blue-400">
            {t({ ko: "CEO", en: "CEO", ja: "CEO", zh: "CEO" })}
          </div>
          <div className="flex gap-3">
            <div
              style={{
                position: "relative",
                width: COLS * CELL,
                height: ROWS * CELL,
                border: "2px solid rgb(71,85,105)",
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: "rgb(15,23,42)",
              }}
            >
              {boardCells}
              {paused && !gs.over && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <span style={{ color: "#cbd5e1", fontSize: 18, fontWeight: 700 }}>
                    {t({ ko: "일시정지", en: "PAUSED", ja: "一時停止", zh: "已暂停" })}
                  </span>
                </div>
              )}
              {gs.over && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <span style={{ color: "#f87171", fontSize: 18, fontWeight: 700 }}>GAME OVER</span>
                </div>
              )}
            </div>

            {/* CEO side panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 120 }}>
          {/* Score */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              {t({ ko: "점수", en: "Score", ja: "スコア", zh: "分数" })}
            </div>
            <div className="text-lg font-bold text-amber-400 font-mono">{gs.score.toLocaleString()}</div>
          </div>

          {/* Level & Lines */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                {t({ ko: "레벨", en: "Level", ja: "レベル", zh: "等级" })}
              </div>
              <div className="text-sm font-bold text-green-400">{gs.level}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                {t({ ko: "라인", en: "Lines", ja: "ライン", zh: "行数" })}
              </div>
              <div className="text-sm font-bold text-cyan-400">{gs.lines}</div>
            </div>
          </div>

          {/* Next piece */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              {t({ ko: "다음", en: "Next", ja: "次", zh: "下一个" })}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: (nMaxX + 1) * nextPreviewCell, height: (nMaxY + 1) * nextPreviewCell }}>
                {nextCells}
              </div>
            </div>
          </div>

          {/* Agent reaction */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center">
            <div className="text-lg mb-1">{opponent.avatar_emoji}</div>
            <div className="text-[10px] text-slate-400">{opponentName}</div>
            {reaction && (
              <div className="text-xs text-amber-300 mt-1 animate-bounce">{reaction}</div>
            )}
          </div>

          {/* Pause */}
          {!gs.over && (
            <button
              onClick={() => setPaused((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600/50 hover:bg-slate-700/60 transition-all text-xs"
            >
              {paused
                ? t({ ko: "계속", en: "Resume", ja: "再開", zh: "继续" })
                : t({ ko: "일시정지", en: "Pause", ja: "一時停止", zh: "暂停" })}
            </button>
          )}
            </div>
          </div>
        </div>

        {/* 상대 (Opponent) 게임 화면 — 오른쪽 */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="text-xs font-semibold text-red-400 flex items-center gap-1">
            <span>{opponent.avatar_emoji}</span>
            <span>{opponentName}</span>
          </div>
          <div className="flex gap-3">
            <div
              style={{
                position: "relative",
                width: COLS * CELL,
                height: ROWS * CELL,
                border: "2px solid rgb(71,85,105)",
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: "rgb(15,23,42)",
              }}
            >
              {opponentBoardCells}
              {opponentGs.over && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <span style={{ color: "#f87171", fontSize: 18, fontWeight: 700 }}>GAME OVER</span>
                </div>
              )}
            </div>

            {/* Opponent side panel: score, level, lines, reaction */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 120 }}>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  {t({ ko: "점수", en: "Score", ja: "スコア", zh: "分数" })}
                </div>
                <div className="text-lg font-bold text-amber-400 font-mono">{opponentGs.score.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t({ ko: "레벨", en: "Level", ja: "レベル", zh: "等级" })}</div>
                  <div className="text-sm font-bold text-green-400">{opponentGs.level}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t({ ko: "라인", en: "Lines", ja: "ライン", zh: "行数" })}</div>
                  <div className="text-sm font-bold text-cyan-400">{opponentGs.lines}</div>
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center">
                {reaction && (
                  <div className="text-xs text-amber-300 animate-bounce">{reaction}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="text-center text-[10px] text-slate-600 space-x-3">
        <span>&larr;&rarr; {t({ ko: "이동", en: "Move", ja: "移動", zh: "移动" })}</span>
        <span>&uarr; {t({ ko: "회전", en: "Rotate", ja: "回転", zh: "旋转" })}</span>
        <span>&darr; {t({ ko: "내리기", en: "Soft Drop", ja: "下移動", zh: "下移" })}</span>
        <span>Space {t({ ko: "낙하", en: "Hard Drop", ja: "ハードドロップ", zh: "硬降" })}</span>
        <span>P {t({ ko: "일시정지", en: "Pause", ja: "一時停止", zh: "暂停" })}</span>
      </div>
    </div>
  );
}
