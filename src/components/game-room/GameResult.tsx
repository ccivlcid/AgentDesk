import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameScore, GameType } from "./useGameRoomState";

interface GameResultProps {
  opponent: Agent;
  score: GameScore;
  game: GameType;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

const GAME_NAMES: Record<GameType, { ko: string; en: string; ja: string; zh: string }> = {
  rps: { ko: "\uAC00\uC704\uBC14\uC704\uBCF4", en: "Rock Paper Scissors", ja: "\u3058\u3083\u3093\u3051\u3093", zh: "\u77F3\u5934\u526A\u5200\u5E03" },
  tictactoe: { ko: "\uD2F1\uD0DD\uD1A0", en: "Tic-Tac-Toe", ja: "\u4E09\u76EE\u4E26\u3079", zh: "\u4E95\u5B57\u68CB" },
  memory: { ko: "\uCE74\uB4DC \uC9DD\uB9DE\uCD94\uAE30", en: "Memory Match", ja: "\u795E\u7D4C\u8870\u5F31", zh: "\u8BB0\u5FC6\u914D\u5BF9" },
  tetris: { ko: "\uD14C\uD2B8\uB9AC\uC2A4", en: "Tetris", ja: "\u30C6\u30C8\u30EA\u30B9", zh: "\u4FC4\u7F57\u65AF\u65B9\u5757" },
};

export default function GameResult({ opponent, score, game, onPlayAgain, onBackToLobby }: GameResultProps) {
  const { t, locale } = useI18n();

  const isSoloGame = score.points != null;
  const playerWon = score.playerWins > score.opponentWins;
  const draw = score.playerWins === score.opponentWins && !isSoloGame;
  const opponentName = localeName(locale, opponent);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Result icon */}
      <div className="text-6xl animate-bounce">
        {isSoloGame ? "\uD83C\uDFC6" : playerWon ? "\uD83C\uDF89" : draw ? "\uD83E\uDD1D" : "\uD83D\uDE22"}
      </div>

      {/* Result text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">
          {isSoloGame
            ? t({ ko: "\uAC8C\uC784 \uC885\uB8CC!", en: "Game Over!", ja: "\u30B2\u30FC\u30E0\u7D42\u4E86!", zh: "\u6E38\u620F\u7ED3\u675F!" })
            : playerWon
              ? t({ ko: "\uCD95\uD558\uD569\uB2C8\uB2E4!", en: "You Win!", ja: "\u304A\u3081\u3067\u3068\u3046!", zh: "\u606D\u559C\u4F60\u8D62\u4E86!" })
              : draw
                ? t({ ko: "\uBB34\uC2B9\uBD80!", en: "It's a Draw!", ja: "\u5F15\u304D\u5206\u3051!", zh: "\u5E73\u5C40!" })
                : t({
                    ko: `${opponentName} \uC2B9\uB9AC!`,
                    en: `${opponentName} Wins!`,
                    ja: `${opponentName}\u306E\u52DD\u5229!`,
                    zh: `${opponentName}\u83DC\u4E86!`,
                  })}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {t(GAME_NAMES[game])}
        </p>
      </div>

      {/* Score */}
      {isSoloGame ? (
        <div className="flex items-center gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-amber-400">{score.points!.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">
              {t({ ko: "\uC810\uC218", en: "Score", ja: "\u30B9\u30B3\u30A2", zh: "\u5206\u6570" })}
            </div>
          </div>
          {score.lines != null && (
            <div>
              <div className="text-3xl font-bold text-cyan-400">{score.lines}</div>
              <div className="text-xs text-slate-400 mt-1">
                {t({ ko: "\uB77C\uC778", en: "Lines", ja: "\u30E9\u30A4\u30F3", zh: "\u884C\u6570" })}
              </div>
            </div>
          )}
          {score.level != null && (
            <div>
              <div className="text-3xl font-bold text-green-400">{score.level}</div>
              <div className="text-xs text-slate-400 mt-1">
                {t({ ko: "\uB808\uBCA8", en: "Level", ja: "\u30EC\u30D9\u30EB", zh: "\u7B49\u7EA7" })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-400">{score.playerWins}</div>
            <div className="text-xs text-slate-400 mt-1">
              {t({ ko: "CEO", en: "CEO", ja: "CEO", zh: "CEO" })}
            </div>
          </div>
          <div className="text-slate-600 text-lg">vs</div>
          <div>
            <div className="text-3xl font-bold text-red-400">{score.opponentWins}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-center">
              <span>{opponent.avatar_emoji}</span>
              <span>{opponentName}</span>
            </div>
          </div>
          {score.draws > 0 && (
            <>
              <div className="text-slate-600 text-lg">&middot;</div>
              <div>
                <div className="text-3xl font-bold text-slate-400">{score.draws}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {t({ ko: "\uBB34\uC2B9\uBD80", en: "Draw", ja: "\u5F15\u304D\u5206\u3051", zh: "\u5E73\u5C40" })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onPlayAgain}
          className="px-5 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all text-sm font-medium"
        >
          {t({ ko: "\uB2E4\uC2DC \uD558\uAE30", en: "Play Again", ja: "\u3082\u3046\u4E00\u5EA6", zh: "\u518D\u6765\u4E00\u5C40" })}
        </button>
        <button
          onClick={onBackToLobby}
          className="px-5 py-2.5 rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600/50 hover:bg-slate-700/60 transition-all text-sm"
        >
          {t({ ko: "\uB85C\uBE44\uB85C", en: "Back to Lobby", ja: "\u30ED\u30D3\u30FC\u3078", zh: "\u8FD4\u56DE\u5927\u5385" })}
        </button>
      </div>
    </div>
  );
}
