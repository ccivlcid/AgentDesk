import { useCallback, useState } from "react";
import type { Agent } from "../../types";

export type GameScreen = "lobby" | "rps" | "tictactoe" | "memory" | "tetris" | "result";
export type GameType = "rps" | "tictactoe" | "memory" | "tetris";

export interface GameScore {
  playerWins: number;
  opponentWins: number;
  draws: number;
  /** Solo game points (e.g. Tetris score) */
  points?: number;
  /** Solo game extra stats */
  lines?: number;
  level?: number;
}

export function useGameRoomState({ agents }: { agents: Agent[] }) {
  const [screen, setScreen] = useState<GameScreen>("lobby");
  const [opponent, setOpponent] = useState<Agent | null>(null);
  const [lastGame, setLastGame] = useState<GameType | null>(null);
  const [lastScore, setLastScore] = useState<GameScore | null>(null);

  const availableAgents = agents.filter((a) => a.status !== "offline");

  const selectOpponent = useCallback((agent: Agent) => {
    setOpponent(agent);
  }, []);

  const startGame = useCallback((game: GameType) => {
    if (!opponent) return;
    setLastGame(game);
    setLastScore(null);
    setScreen(game);
  }, [opponent]);

  const finishGame = useCallback((score: GameScore) => {
    setLastScore(score);
    setScreen("result");
  }, []);

  const backToLobby = useCallback(() => {
    setScreen("lobby");
    setLastScore(null);
    setLastGame(null);
  }, []);

  const playAgain = useCallback(() => {
    if (lastGame) {
      setLastScore(null);
      setScreen(lastGame);
    }
  }, [lastGame]);

  return {
    screen,
    opponent,
    lastGame,
    lastScore,
    availableAgents,
    selectOpponent,
    startGame,
    finishGame,
    backToLobby,
    playAgain,
  };
}
