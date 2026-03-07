import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameScore } from "./useGameRoomState";

interface MemoryMatchProps {
  opponent: Agent;
  onFinish: (score: GameScore) => void;
  onBack: () => void;
}

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ["\uD83D\uDE80", "\uD83C\uDF1F", "\uD83C\uDF52", "\uD83C\uDF3B", "\uD83D\uDC1F", "\uD83C\uDFB5", "\uD83D\uDD25", "\uD83D\uDC8E"];

function createDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < EMOJIS.length; i++) {
    cards.push({ id: i * 2, emoji: EMOJIS[i], pairId: i, flipped: false, matched: false });
    cards.push({ id: i * 2 + 1, emoji: EMOJIS[i], pairId: i, flipped: false, matched: false });
  }
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Memory rate based on agent role */
function getMemoryRate(role: string): number {
  if (role === "team_leader") return 0.8;
  if (role === "senior") return 0.5;
  return 0.2;
}

export default function MemoryMatch({ opponent, onFinish, onBack }: MemoryMatchProps) {
  const { t, locale } = useI18n();
  const opponentName = localeName(locale, opponent);

  const [cards, setCards] = useState<Card[]>(() => createDeck());
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerScore, setPlayerScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);

  // AI memory: stores card positions it has "seen"
  const aiMemoryRef = useRef<Map<number, number>>(new Map()); // pairId → cardId
  const memoryRate = getMemoryRate(opponent.role);

  const totalPairs = EMOJIS.length;

  const recordAiMemory = useCallback(
    (card: Card) => {
      if (Math.random() < memoryRate) {
        aiMemoryRef.current.set(card.pairId * 100 + card.id, card.id);
      }
    },
    [memoryRate],
  );

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (!isPlayerTurn || checking || gameOver) return;
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.flipped || card.matched) return;
      if (flippedIds.length >= 2) return;

      const newFlipped = [...flippedIds, cardId];
      setFlippedIds(newFlipped);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c)));

      // Let AI remember what player flips
      recordAiMemory(card);

      if (newFlipped.length === 2) {
        setChecking(true);
        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = card;

        setTimeout(() => {
          if (first.pairId === second.pairId) {
            // Match found
            setCards((prev) =>
              prev.map((c) => (c.pairId === first.pairId ? { ...c, matched: true, flipped: true } : c)),
            );
            setPlayerScore((s) => s + 1);
            setFlippedIds([]);
            setChecking(false);
            // Player gets another turn
          } else {
            // No match - flip back
            setCards((prev) =>
              prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c)),
            );
            setFlippedIds([]);
            setChecking(false);
            setIsPlayerTurn(false);
          }
        }, 800);
      }
    },
    [cards, checking, flippedIds, gameOver, isPlayerTurn, recordAiMemory],
  );

  // AI turn
  useEffect(() => {
    if (isPlayerTurn || gameOver) return;
    setThinking(true);

    const delay = 600 + Math.random() * 400;
    const timer = setTimeout(() => {
      const unmatched = cards.filter((c) => !c.matched);
      if (unmatched.length < 2) return;

      // Build AI's known pairs
      const memory = aiMemoryRef.current;
      const knownPositions = new Map<number, number[]>(); // pairId → [cardIds]
      for (const [, cardId] of memory) {
        const card = unmatched.find((c) => c.id === cardId);
        if (card) {
          const arr = knownPositions.get(card.pairId) ?? [];
          if (!arr.includes(cardId)) arr.push(cardId);
          knownPositions.set(card.pairId, arr);
        }
      }

      // Try to find a known pair
      let pick1 = -1;
      let pick2 = -1;
      for (const [, ids] of knownPositions) {
        if (ids.length >= 2) {
          const valid = ids.filter((id) => !cards.find((c) => c.id === id)?.matched);
          if (valid.length >= 2) {
            pick1 = valid[0];
            pick2 = valid[1];
            break;
          }
        }
      }

      // Random picks if no known pair
      if (pick1 < 0) {
        const unmatchedIds = unmatched.map((c) => c.id);
        pick1 = unmatchedIds[Math.floor(Math.random() * unmatchedIds.length)];
        const remaining = unmatchedIds.filter((id) => id !== pick1);
        pick2 = remaining[Math.floor(Math.random() * remaining.length)];
      }

      // Flip first card
      setCards((prev) => prev.map((c) => (c.id === pick1 ? { ...c, flipped: true } : c)));

      setTimeout(() => {
        // Flip second card
        setCards((prev) => prev.map((c) => (c.id === pick2 ? { ...c, flipped: true } : c)));

        const c1 = cards.find((c) => c.id === pick1)!;
        const c2 = cards.find((c) => c.id === pick2)!;

        // Remember what AI sees
        recordAiMemory(c1);
        recordAiMemory(c2);

        setTimeout(() => {
          if (c1.pairId === c2.pairId) {
            // Match
            setCards((prev) =>
              prev.map((c) => (c.pairId === c1.pairId ? { ...c, matched: true, flipped: true } : c)),
            );
            setOppScore((s) => s + 1);
            setThinking(false);
            // AI gets another turn — re-trigger by keeping isPlayerTurn false
            // We set a small state change to re-trigger the effect
            setFlippedIds(["retrigger"] as unknown as number[]);
            setTimeout(() => setFlippedIds([]), 50);
          } else {
            // No match
            setCards((prev) =>
              prev.map((c) => (c.id === pick1 || c.id === pick2 ? { ...c, flipped: false } : c)),
            );
            setThinking(false);
            setIsPlayerTurn(true);
          }
        }, 800);
      }, 500);
    }, delay);

    return () => clearTimeout(timer);
  }, [cards, gameOver, isPlayerTurn, recordAiMemory]);

  // Check game over
  useEffect(() => {
    const matched = cards.filter((c) => c.matched).length / 2;
    if (matched >= totalPairs && !gameOver) {
      setGameOver(true);
      const score: GameScore = {
        playerWins: playerScore > oppScore ? 1 : 0,
        opponentWins: oppScore > playerScore ? 1 : 0,
        draws: playerScore === oppScore ? 1 : 0,
      };
      setTimeout(() => onFinish(score), 1500);
    }
  }, [cards, gameOver, onFinish, oppScore, playerScore, totalPairs]);

  const statusText = gameOver
    ? t({ ko: "\uAC8C\uC784 \uC885\uB8CC!", en: "Game Over!", ja: "\u30B2\u30FC\u30E0\u7D42\u4E86!", zh: "\u6E38\u620F\u7ED3\u675F!" })
    : thinking
      ? t({ ko: `${opponentName} \uC0DD\uAC01 \uC911...`, en: `${opponentName} is thinking...`, ja: `${opponentName}\u304C\u8003\u3048\u4E2D...`, zh: `${opponentName}\u6B63\u5728\u601D\u8003...` })
      : isPlayerTurn
        ? t({ ko: "CEO \uCC28\uB840", en: "Your Turn", ja: "CEO\u306E\u756A", zh: "CEO\u7684\u56DE\u5408" })
        : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-mono transition hover:text-[var(--th-text-primary)]" style={{ color: "var(--th-text-muted)" }}>
          &larr; {t({ ko: "\uB85C\uBE44", en: "Lobby", ja: "\u30ED\u30D3\u30FC", zh: "\u5927\u5385" })}
        </button>
        <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "\uCE74\uB4DC \uC9DD\uB9DE\uCD94\uAE30", en: "Memory Match", ja: "\u795E\u7D4C\u8870\u5F31", zh: "\u8BB0\u5FC6\u914D\u5BF9" })}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <div className={`text-2xl font-bold ${isPlayerTurn && !gameOver ? "text-[#60a5fa]" : ""}`} style={!(isPlayerTurn && !gameOver) ? { color: "var(--th-text-muted)" } : undefined}>{playerScore}</div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>CEO</div>
        </div>
        <div className="text-sm font-mono" style={{ color: "var(--th-border)" }}>vs</div>
        <div>
          <div className={`text-2xl font-bold ${!isPlayerTurn && !gameOver ? "text-red-400" : ""}`} style={!(!isPlayerTurn && !gameOver) ? { color: "var(--th-text-muted)" } : undefined}>{oppScore}</div>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{opponent.avatar_emoji} {opponentName}</div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-sm font-mono h-6" style={{ color: "var(--th-text-secondary)" }}>{statusText}</div>

      {/* Card Grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-2 w-fit">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.flipped || card.matched || !isPlayerTurn || checking || gameOver}
              className={`w-16 h-16 sm:w-20 sm:h-20 text-2xl transition-all duration-300 flex items-center justify-center ${
                card.matched
                  ? "text-green-300"
                  : isPlayerTurn && !checking && !gameOver && !card.flipped
                    ? "hover:border-[rgba(59,130,246,0.4)] cursor-pointer"
                    : !isPlayerTurn || checking || gameOver
                      ? "cursor-not-allowed"
                      : ""
              }`}
              style={{
                borderRadius: "4px",
                perspective: "600px",
                border: card.matched
                  ? "2px solid rgba(52,211,153,0.5)"
                  : card.flipped
                    ? "2px solid rgba(245,158,11,0.5)"
                    : "2px solid var(--th-border)",
                background: card.matched
                  ? "rgba(52,211,153,0.1)"
                  : card.flipped
                    ? "rgba(245,158,11,0.1)"
                    : "var(--th-bg-elevated)",
              }}
            >
              {card.flipped || card.matched ? (
                <span className="animate-in">{card.emoji}</span>
              ) : (
                <span style={{ color: "var(--th-border)" }}>?</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {gameOver && (
        <div className="text-center text-sm font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "\uACB0\uACFC \uD654\uBA74\uC73C\uB85C \uC774\uB3D9 \uC911...", en: "Going to results...", ja: "\u7D50\u679C\u753B\u9762\u3078...", zh: "\u6B63\u5728\u8DF3\u8F6C\u7ED3\u679C..." })}
        </div>
      )}
    </div>
  );
}
