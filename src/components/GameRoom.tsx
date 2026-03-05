import type { Agent } from "../types";
import GameLobby from "./game-room/GameLobby";
import GameResult from "./game-room/GameResult";
import MemoryMatch from "./game-room/MemoryMatch";
import RockPaperScissors from "./game-room/RockPaperScissors";
import Tetris from "./game-room/Tetris";
import TicTacToe from "./game-room/TicTacToe";
import { useGameRoomState } from "./game-room/useGameRoomState";

interface GameRoomProps {
  agents: Agent[];
}

export default function GameRoom({ agents }: GameRoomProps) {
  const vm = useGameRoomState({ agents });

  const isTetris = vm.screen === "tetris";
  return (
    <div
      className={
        isTetris
          ? "lounge-view w-full overflow-x-auto min-w-0 px-2 sm:px-4"
          : "lounge-view max-w-2xl mx-auto"
      }
    >
      {vm.screen === "lobby" && (
        <GameLobby
          agents={vm.availableAgents}
          opponent={vm.opponent}
          onSelectOpponent={vm.selectOpponent}
          onStartGame={vm.startGame}
        />
      )}

      {vm.screen === "rps" && vm.opponent && (
        <RockPaperScissors
          opponent={vm.opponent}
          onFinish={vm.finishGame}
          onBack={vm.backToLobby}
        />
      )}

      {vm.screen === "tictactoe" && vm.opponent && (
        <TicTacToe
          opponent={vm.opponent}
          onFinish={vm.finishGame}
          onBack={vm.backToLobby}
        />
      )}

      {vm.screen === "memory" && vm.opponent && (
        <MemoryMatch
          opponent={vm.opponent}
          onFinish={vm.finishGame}
          onBack={vm.backToLobby}
        />
      )}

      {vm.screen === "tetris" && vm.opponent && (
        <Tetris
          opponent={vm.opponent}
          onFinish={vm.finishGame}
          onBack={vm.backToLobby}
        />
      )}

      {vm.screen === "result" && vm.opponent && vm.lastScore && vm.lastGame && (
        <GameResult
          opponent={vm.opponent}
          score={vm.lastScore}
          game={vm.lastGame}
          onPlayAgain={vm.playAgain}
          onBackToLobby={vm.backToLobby}
        />
      )}
    </div>
  );
}
