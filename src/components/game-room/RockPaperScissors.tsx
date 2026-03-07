import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameScore } from "./useGameRoomState";

type RpsChoice = "rock" | "paper" | "scissors";
type RoundResult = "win" | "lose" | "draw";
type Phase = "choosing" | "countdown" | "reveal" | "done";

interface RockPaperScissorsProps {
  opponent: Agent;
  onFinish: (score: GameScore) => void;
  onBack: () => void;
}

const CHOICES: RpsChoice[] = ["rock", "paper", "scissors"];
const CHOICE_EMOJI: Record<RpsChoice, string> = { rock: "\u270A", paper: "\u270B", scissors: "\u270C\uFE0F" };

function getResult(player: RpsChoice, opp: RpsChoice): RoundResult {
  if (player === opp) return "draw";
  if (
    (player === "rock" && opp === "scissors") ||
    (player === "scissors" && opp === "paper") ||
    (player === "paper" && opp === "rock")
  )
    return "win";
  return "lose";
}

export default function RockPaperScissors({ opponent, onFinish, onBack }: RockPaperScissorsProps) {
  const { t, locale } = useI18n();

  const [phase, setPhase] = useState<Phase>("choosing");
  const [playerChoice, setPlayerChoice] = useState<RpsChoice | null>(null);
  const [oppChoice, setOppChoice] = useState<RpsChoice | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [round, setRound] = useState(1);

  const scoreRef = useRef<GameScore>({ playerWins: 0, opponentWins: 0, draws: 0 });
  const [scoreDisplay, setScoreDisplay] = useState<GameScore>({ playerWins: 0, opponentWins: 0, draws: 0 });
  const playerChoiceRef = useRef<RpsChoice | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opponentName = localeName(locale, opponent);

  const choiceLabel = useCallback(
    (c: RpsChoice) => {
      const labels: Record<RpsChoice, { ko: string; en: string; ja: string; zh: string }> = {
        rock: { ko: "\uBC14\uC704", en: "Rock", ja: "\u30B0\u30FC", zh: "\u77F3\u5934" },
        paper: { ko: "\uBCF4", en: "Paper", ja: "\u30D1\u30FC", zh: "\u5E03" },
        scissors: { ko: "\uAC00\uC704", en: "Scissors", ja: "\u30C1\u30E7\u30AD", zh: "\u526A\u5200" },
      };
      return t(labels[c]);
    },
    [t],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChoice = useCallback(
    (choice: RpsChoice) => {
      if (phase !== "choosing") return;
      playerChoiceRef.current = choice;
      setPlayerChoice(choice);
      setPhase("countdown");
      setCountdown(3);
    },
    [phase],
  );

  // Countdown ticker
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      // Reveal
      const aiChoice = CHOICES[Math.floor(Math.random() * 3)];
      const result = getResult(playerChoiceRef.current!, aiChoice);
      setOppChoice(aiChoice);
      setRoundResult(result);
      setPhase("reveal");

      const s = scoreRef.current;
      if (result === "win") s.playerWins++;
      else if (result === "lose") s.opponentWins++;
      else s.draws++;
      scoreRef.current = { ...s };
      setScoreDisplay({ ...s });

      if (s.playerWins >= 2 || s.opponentWins >= 2) {
        setPhase("done");
        timerRef.current = setTimeout(() => onFinish({ ...s }), 2000);
      } else {
        timerRef.current = setTimeout(() => {
          setPlayerChoice(null);
          setOppChoice(null);
          setRoundResult(null);
          setRound((r) => r + 1);
          setPhase("choosing");
        }, 1800);
      }
      return;
    }
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, countdown, onFinish]);

  const resultLabel = roundResult
    ? roundResult === "win"
      ? t({ ko: "\uC2B9\uB9AC!", en: "Win!", ja: "\u52DD\u5229!", zh: "\u80DC\u5229!" })
      : roundResult === "lose"
        ? t({ ko: "\uD328\uBC30!", en: "Lose!", ja: "\u6557\u5317!", zh: "\u5931\u8D25!" })
        : t({ ko: "\uBB34\uC2B9\uBD80!", en: "Draw!", ja: "\u5F15\u304D\u5206\u3051!", zh: "\u5E73\u5C40!" })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-mono transition hover:text-[var(--th-text-primary)]" style={{ color: "var(--th-text-muted)" }}>
          &larr; {t({ ko: "\uB85C\uBE44", en: "Lobby", ja: "\u30ED\u30D3\u30FC", zh: "\u5927\u5385" })}
        </button>
        <div className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: `\uB77C\uC6B4\uB4DC ${round}`,
            en: `Round ${round}`,
            ja: `\u30E9\u30A6\u30F3\u30C9 ${round}`,
            zh: `\u7B2C ${round} \u5C40`,
          })}
          <span className="ml-1" style={{ color: "var(--th-border)" }}>
            ({t({ ko: "2\uC2B9 \uC2DC \uC885\uB8CC", en: "First to 2", ja: "2\u52DD\u5148\u53D6", zh: "\u5148\u80DC2\u5C40" })})
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-[#60a5fa]">{scoreDisplay.playerWins}</div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>CEO</div>
        </div>
        <div className="text-sm font-mono" style={{ color: "var(--th-border)" }}>vs</div>
        <div>
          <div className="text-2xl font-bold text-red-400">{scoreDisplay.opponentWins}</div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {opponent.avatar_emoji} {opponentName}
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex items-center justify-center gap-12 py-8">
        {/* Player side */}
        <div className="text-center space-y-2 min-w-[100px]">
          <div
            className={`text-6xl transition-transform duration-300 ${phase === "countdown" ? "animate-pulse" : ""}`}
          >
            {playerChoice ? CHOICE_EMOJI[playerChoice] : "\u2753"}
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>CEO</div>
        </div>

        {/* VS / Countdown */}
        <div className="text-center min-w-[60px]">
          {phase === "countdown" && countdown > 0 ? (
            <div className="text-4xl font-bold text-amber-400 animate-ping">{countdown}</div>
          ) : roundResult ? (
            <div
              className={`text-lg font-bold font-mono ${roundResult === "win" ? "text-green-400" : roundResult === "lose" ? "text-red-400" : ""}`}
          style={roundResult === "draw" ? { color: "var(--th-text-muted)" } : undefined}
            >
              {resultLabel}
            </div>
          ) : (
            <div className="text-2xl font-mono" style={{ color: "var(--th-border)" }}>VS</div>
          )}
        </div>

        {/* Opponent side */}
        <div className="text-center space-y-2 min-w-[100px]">
          <div
            className={`text-6xl transition-transform duration-300 ${phase === "countdown" ? "animate-pulse" : ""}`}
          >
            {oppChoice ? CHOICE_EMOJI[oppChoice] : phase === "countdown" ? "\u2753" : "\uD83D\uDE0F"}
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {opponent.avatar_emoji} {opponentName}
          </div>
        </div>
      </div>

      {/* Choice buttons */}
      {phase !== "done" && (
        <div className="flex justify-center gap-4">
          {CHOICES.map((c) => (
            <button
              key={c}
              onClick={() => handleChoice(c)}
              disabled={phase !== "choosing"}
              className={`flex flex-col items-center gap-2 px-6 py-4 transition-all ${
                phase !== "choosing"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-[rgba(59,130,246,0.5)] hover:scale-105 cursor-pointer"
              }`}
              style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
            >
              <span className="text-3xl">{CHOICE_EMOJI[c]}</span>
              <span className="text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>{choiceLabel(c)}</span>
            </button>
          ))}
        </div>
      )}

      {phase === "done" && (
        <div className="text-center text-sm font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "\uACB0\uACFC \uD654\uBA74\uC73C\uB85C \uC774\uB3D9 \uC911...",
            en: "Going to results...",
            ja: "\u7D50\u679C\u753B\u9762\u3078...",
            zh: "\u6B63\u5728\u8DF3\u8F6C\u7ED3\u679C...",
          })}
        </div>
      )}
    </div>
  );
}
