import type { Agent } from "../../types";
import { localeName, useI18n } from "../../i18n";
import type { GameType } from "./useGameRoomState";

function departmentDisplayName(locale: string, agent: Agent): string | null {
  const dept = agent.department;
  if (!dept) return null;
  return localeName(locale, dept);
}

interface GameLobbyProps {
  agents: Agent[];
  opponent: Agent | null;
  onSelectOpponent: (agent: Agent) => void;
  onStartGame: (game: GameType) => void;
}

export default function GameLobby({ agents, opponent, onSelectOpponent, onStartGame }: GameLobbyProps) {
  const { t, locale } = useI18n();

  const games: { id: GameType; icon: string; name: string; desc: string }[] = [
    {
      id: "rps",
      icon: "\u2702\uFE0F",
      name: t({ ko: "가위바위보", en: "Rock Paper Scissors", ja: "じゃんけん", zh: "石头剪刀布" }),
      desc: t({ ko: "3판 2선승", en: "Best of 3", ja: "3本勝負", zh: "3局两胜" }),
    },
    {
      id: "tictactoe",
      icon: "\u2B55",
      name: t({ ko: "틱택토", en: "Tic-Tac-Toe", ja: "三目並べ", zh: "井字棋" }),
      desc: t({ ko: "3×3 보드", en: "3×3 Board", ja: "3×3ボード", zh: "3×3棋盘" }),
    },
    {
      id: "memory",
      icon: "\uD83C\uDFB4",
      name: t({ ko: "카드 짝맞추기", en: "Memory Match", ja: "神経衰弱", zh: "记忆配对" }),
      desc: t({ ko: "4×4 메모리", en: "4×4 Cards", ja: "4×4カード", zh: "4×4卡牌" }),
    },
    {
      id: "tetris",
      icon: "\uD83E\uDDF1",
      name: t({ ko: "테트리스", en: "Tetris", ja: "テトリス", zh: "俄罗斯方块" }),
      desc: t({ ko: "클래식 블록 퍼즐", en: "Classic Block Puzzle", ja: "クラシックブロック", zh: "经典方块游戏" }),
    },
  ];

  return (
    <div className="lounge-layout">
      {/* 헤더: 휴게실 분위기 */}
      <header className="lounge-header">
        <div className="lounge-header-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18v-2a3 3 0 013-3h10a3 3 0 013 3v2" />
            <path d="M5 18h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
            <path d="M8 12v2M16 12v2" />
            <path d="M10 7l1.5 4h1L14 7" />
          </svg>
        </div>
        <h2 className="lounge-title">
          {t({ ko: "휴게실", en: "Lounge", ja: "休憩室", zh: "休息室" })}
        </h2>
        <p className="lounge-subtitle">
          {t({
            ko: "직원들과 함께 잠깐 쉬어 가는 공간",
            en: "A place to take a break with your team",
            ja: "チームと一緒にひと休み",
            zh: "与团队小憩的空间",
          })}
        </p>
      </header>

      {/* 함께할 상대: 세련된 파트너 카드 */}
      <section className="lounge-section lounge-partner-section">
        <div className="lounge-partner-header">
          <h3 className="lounge-section-title">
            {t({ ko: "함께할 상대", en: "Pick a partner", ja: "相手を選ぶ", zh: "选择对手" })}
          </h3>
          <p className="lounge-partner-desc">
            {t({
              ko: "휴식 활동을 함께할 직원을 선택하세요",
              en: "Choose a colleague to join your break",
              ja: "休憩を一緒にする相手を選んでください",
              zh: "选择一起休息的同事",
            })}
          </p>
        </div>
        {agents.length === 0 ? (
          <div className="lounge-partner-empty">
            <span className="lounge-partner-empty-icon" aria-hidden>👋</span>
            <p className="lounge-partner-empty-text">
              {t({
                ko: "등록된 직원이 없습니다",
                en: "No agents available",
                ja: "登録されたメンバーがいません",
                zh: "暂无可用成员",
              })}
            </p>
          </div>
        ) : (
          <div className="lounge-agent-grid">
            {agents.map((agent) => {
              const selected = opponent?.id === agent.id;
              const busy = agent.status === "working";
              const deptName = departmentDisplayName(locale, agent);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => !busy && onSelectOpponent(agent)}
                  className={`lounge-agent-card ${selected ? "lounge-agent-card--selected" : ""} ${busy ? "lounge-agent-card--busy" : ""}`}
                  aria-pressed={selected}
                  aria-label={localeName(locale, agent) + (selected ? " (selected)" : "")}
                >
                  <span className="lounge-agent-avatar" aria-hidden>
                    {agent.avatar_emoji}
                  </span>
                  <span className="lounge-agent-info">
                    <span className="lounge-agent-name">{localeName(locale, agent)}</span>
                    {deptName && (
                      <span className="lounge-agent-dept">{deptName}</span>
                    )}
                  </span>
                  {busy && (
                    <span className="lounge-agent-badge" aria-label="busy">
                      {t({ ko: "업무중", en: "Busy", ja: "作業中", zh: "忙碌" })}
                    </span>
                  )}
                  {selected && !busy && (
                    <span className="lounge-agent-check" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 휴식 활동(게임) 선택 */}
      <section className="lounge-section lounge-activity-section">
        <div className="lounge-activity-header">
          <h3 className="lounge-section-title">
            {t({ ko: "휴식 활동", en: "Break activity", ja: "休憩アクティビティ", zh: "休息活动" })}
          </h3>
          <p className="lounge-activity-desc">
            {t({
              ko: "간단한 게임으로 머리를 식혀 보세요",
              en: "Unwind with a quick game",
              ja: "気軽なゲームでリフレッシュ",
              zh: "用简单游戏放松一下",
            })}
          </p>
        </div>
        <div className="lounge-game-grid">
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => onStartGame(game.id)}
              disabled={!opponent}
              className={`lounge-game-card ${!opponent ? "lounge-game-card--disabled" : ""}`}
              aria-label={game.name}
            >
              <span className="lounge-game-icon-wrap" aria-hidden>
                <span className="lounge-game-icon">{game.icon}</span>
              </span>
              <span className="lounge-game-name">{game.name}</span>
              <span className="lounge-game-desc">{game.desc}</span>
            </button>
          ))}
        </div>
        {!opponent && (
          <p className="lounge-activity-hint">
            {t({
              ko: "함께할 상대를 먼저 선택해 주세요",
              en: "Select a partner first",
              ja: "まず相手を選んでください",
              zh: "请先选择对手",
            })}
          </p>
        )}
      </section>
    </div>
  );
}
