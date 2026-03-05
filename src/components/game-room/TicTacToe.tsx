import { useCallback, useEffect, useState } from "react";
import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameScore } from "./useGameRoomState";

type Cell = "O" | "X" | null;
type Board = Cell[];

interface TicTacToeProps {
  opponent: Agent;
  onFinish: (score: GameScore) => void;
  onBack: () => void;
}

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isDraw(board: Board): boolean {
  return board.every((c) => c !== null);
}

/** Simple AI: difficulty based on agent role */
function aiMove(board: Board, role: string): number {
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return -1;

  // team_leader: minimax (perfect play)
  if (role === "team_leader") {
    return minimaxBest(board);
  }

  // senior: block wins + take wins, otherwise random
  if (role === "senior") {
    // Try to win
    for (const i of empty) {
      const test = [...board];
      test[i] = "X";
      if (checkWinner(test).winner === "X") return i;
    }
    // Block player
    for (const i of empty) {
      const test = [...board];
      test[i] = "O";
      if (checkWinner(test).winner === "O") return i;
    }
    // Take center
    if (board[4] === null) return 4;
  }

  // junior/intern: random
  return empty[Math.floor(Math.random() * empty.length)];
}

function minimaxBest(board: Board): number {
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  let bestScore = -Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    const next = [...board];
    next[i] = "X";
    const s = minimax(next, false);
    if (s > bestScore) {
      bestScore = s;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax(board: Board, isMax: boolean): number {
  const { winner } = checkWinner(board);
  if (winner === "X") return 1;
  if (winner === "O") return -1;
  if (isDraw(board)) return 0;
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      const next = [...board];
      next[i] = "X";
      best = Math.max(best, minimax(next, false));
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      const next = [...board];
      next[i] = "O";
      best = Math.min(best, minimax(next, true));
    }
    return best;
  }
}

const ROUNDS_TO_WIN = 2;
const MAX_ROUNDS = 5;

export default function TicTacToe({ opponent, onFinish, onBack }: TicTacToeProps) {
  const { t, locale } = useI18n();
  const opponentName = localeName(locale, opponent);

  const [roundPlayerWins, setRoundPlayerWins] = useState(0);
  const [roundOpponentWins, setRoundOpponentWins] = useState(0);
  const [roundDraws, setRoundDraws] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [thinking, setThinking] = useState(false);

  const endMatch = useCallback(
    (playerWins: number, opponentWins: number, draws: number) => {
      setTimeout(() => onFinish({ playerWins, opponentWins, draws }), 1500);
    },
    [onFinish],
  );

  const startNextRound = useCallback(() => {
    setBoard(Array(9).fill(null));
    setWinLine(null);
    setGameOver(false);
    setIsPlayerTurn(true);
    setRoundNumber((r) => r + 1);
  }, []);

  const handleClick = useCallback(
    (index: number) => {
      if (board[index] || !isPlayerTurn || gameOver) return;
      const next = [...board];
      next[index] = "O";
      setBoard(next);

      const { winner, line } = checkWinner(next);
      if (winner) {
        setWinLine(line);
        setGameOver(true);
        const newPlayer = roundPlayerWins + 1;
        setRoundPlayerWins(newPlayer);
        if (newPlayer >= ROUNDS_TO_WIN) {
          endMatch(newPlayer, roundOpponentWins, roundDraws);
        } else {
          setTimeout(startNextRound, 1500);
        }
        return;
      }
      if (isDraw(next)) {
        setGameOver(true);
        const newDraws = roundDraws + 1;
        setRoundDraws(newDraws);
        const totalPlayed = roundNumber;
        if (totalPlayed >= MAX_ROUNDS) {
          endMatch(roundPlayerWins, roundOpponentWins, newDraws);
        } else {
          setTimeout(startNextRound, 1500);
        }
        return;
      }
      setIsPlayerTurn(false);
    },
    [board, gameOver, isPlayerTurn, roundPlayerWins, roundOpponentWins, roundDraws, roundNumber, endMatch, startNextRound],
  );

  // AI turn
  useEffect(() => {
    if (isPlayerTurn || gameOver) return;
    setThinking(true);
    const delay = 500 + Math.random() * 500;
    const timer = setTimeout(() => {
      const move = aiMove(board, opponent.role);
      if (move < 0) return;
      const next = [...board];
      next[move] = "X";
      setBoard(next);
      setThinking(false);

      const { winner, line } = checkWinner(next);
      if (winner) {
        setWinLine(line);
        setGameOver(true);
        const newOpponent = roundOpponentWins + 1;
        setRoundOpponentWins(newOpponent);
        if (newOpponent >= ROUNDS_TO_WIN) {
          endMatch(roundPlayerWins, newOpponent, roundDraws);
        } else {
          setTimeout(startNextRound, 1500);
        }
        return;
      }
      if (isDraw(next)) {
        setGameOver(true);
        const newDraws = roundDraws + 1;
        setRoundDraws(newDraws);
        const totalPlayed = roundNumber;
        if (totalPlayed >= MAX_ROUNDS) {
          endMatch(roundPlayerWins, roundOpponentWins, newDraws);
        } else {
          setTimeout(startNextRound, 1500);
        }
        return;
      }
      setIsPlayerTurn(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [board, gameOver, isPlayerTurn, roundPlayerWins, roundOpponentWins, roundDraws, roundNumber, endMatch, startNextRound, opponent.role]);

  const roundWinner = winLine ? board[winLine[0]] : null;
  const isMatchOver =
    gameOver &&
    (roundPlayerWins >= ROUNDS_TO_WIN ||
      roundOpponentWins >= ROUNDS_TO_WIN ||
      roundNumber >= MAX_ROUNDS);

  const statusText = gameOver
    ? winLine
      ? roundWinner === "O"
        ? t({ ko: "CEO 이번 라운드 승리!", en: "You win this round!", ja: "CEOがこのラウンドで勝利!", zh: "CEO本局获胜!" })
        : t({ ko: `${opponentName} 이번 라운드 승리!`, en: `${opponentName} wins this round!`, ja: `${opponentName}\u304C\u52DD\u5229!`, zh: `${opponentName}本局获胜!` })
      : t({ ko: "무승부! 다음 라운드", en: "Draw! Next round", ja: "引き分け! 次のラウンド", zh: "平局！下一局" })
    : thinking
      ? t({ ko: `${opponentName} 생각 중...`, en: `${opponentName} is thinking...`, ja: `${opponentName}\u304C\u8003\u3048\u4E2D...`, zh: `${opponentName}\u6B63\u5728\u601D\u8003...` })
      : isPlayerTurn
        ? t({ ko: "CEO 차례", en: "Your Turn", ja: "CEOの番", zh: "CEO的回合" })
        : "";

  const difficultyLabel = opponent.role === "team_leader"
    ? t({ ko: "\uCD5C\uACE0 \uB09C\uC774\uB3C4", en: "Expert", ja: "\u6700\u9AD8\u96E3\u6613\u5EA6", zh: "\u6700\u9AD8\u96BE\u5EA6" })
    : opponent.role === "senior"
      ? t({ ko: "\uC911\uAC04 \uB09C\uC774\uB3C4", en: "Medium", ja: "\u4E2D\u7D1A", zh: "\u4E2D\u7B49\u96BE\u5EA6" })
      : t({ ko: "\uC27D\uC6B4 \uB09C\uC774\uB3C4", en: "Easy", ja: "\u521D\u7D1A", zh: "\u7B80\u5355\u96BE\u5EA6" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200 transition">
          &larr; {t({ ko: "로비", en: "Lobby", ja: "ロビー", zh: "大厅" })}
        </button>
        <div className="text-xs text-slate-500">
          {opponent.avatar_emoji} {opponentName} · {difficultyLabel}
        </div>
      </div>

      {/* Match score: first to 2 wins */}
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-blue-400/90 font-medium">
          CEO <span className="text-slate-100 font-bold">{roundPlayerWins}</span>
        </span>
        <span className="text-slate-500">
          {t({ ko: "라운드", en: "Round", ja: "ラウンド", zh: "局" })} {roundNumber}
        </span>
        <span className="text-red-400/90 font-medium">
          <span className="text-slate-100 font-bold">{roundOpponentWins}</span> {opponentName}
        </span>
      </div>

      {/* Status */}
      <div className="text-center text-sm text-slate-300 h-6">
        {statusText}
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-2 w-fit">
          {board.map((cell, i) => {
            const isWin = winLine?.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={!!cell || !isPlayerTurn || gameOver}
                className={`w-20 h-20 rounded-xl border-2 text-3xl font-bold transition-all flex items-center justify-center ${
                  isWin
                    ? cell === "O"
                      ? "border-blue-400 bg-blue-500/20 text-blue-300"
                      : "border-red-400 bg-red-500/20 text-red-300"
                    : cell === "O"
                      ? "border-slate-600 bg-slate-800/60 text-blue-400"
                      : cell === "X"
                        ? "border-slate-600 bg-slate-800/60 text-red-400"
                        : isPlayerTurn && !gameOver
                          ? "border-slate-700 bg-slate-800/40 hover:border-blue-500/40 hover:bg-slate-800/60 cursor-pointer"
                          : "border-slate-700/50 bg-slate-800/30 cursor-not-allowed"
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-slate-400">
        <span><span className="text-blue-400 font-bold">O</span> = CEO</span>
        <span><span className="text-red-400 font-bold">X</span> = {opponent.avatar_emoji} {opponentName}</span>
      </div>

      {gameOver && isMatchOver && (
        <div className="text-center text-slate-400 text-sm animate-pulse">
          {t({ ko: "결과 화면으로 이동 중...", en: "Going to results...", ja: "結果画面へ...", zh: "正在跳转结果..." })}
        </div>
      )}
    </div>
  );
}
