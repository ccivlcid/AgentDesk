import React from "react";
import type { Agent, Task } from "../../types";
import { usePackVocab } from "../../pack-identity/vocabulary";

interface RpgHudProps {
  agents: Agent[];
  tasks: Task[];
}

/** Fantasy Guild HUD — party status + active quests + total XP */
export default function RpgHud({ agents, tasks }: RpgHudProps) {
  const vocab = usePackVocab("roleplay");
  const partySize = agents.filter((a) => a.status !== "offline").length;
  const activeQuests = tasks.filter((t) => t.status === "in_progress").length;
  const totalXp = agents.reduce((sum, a) => sum + (a.stats_xp ?? 0), 0);

  // Guild rank based on total XP
  const guildRank = totalXp >= 100000 ? "S" : totalXp >= 50000 ? "A" : totalXp >= 20000 ? "B" : totalXp >= 5000 ? "C" : "D";

  return (
    <div className="pack-hud pack-hud--rpg">
      <span style={{ color: "#f59e0b" }}>⚔</span>
      <span>PARTY: {partySize}</span>
      <span className="pack-hud__sep" />
      <span>ACTIVE {vocab.tasks.toUpperCase()}: {activeQuests}</span>
      <span className="pack-hud__sep" />
      <span>GUILD RANK: <span style={{ color: guildRank === "S" ? "#f59e0b" : guildRank === "A" ? "#22c55e" : "var(--th-text-secondary)" }}>{guildRank}</span></span>
      <span className="pack-hud__sep" />
      <span>TOTAL {vocab.xp}: {totalXp.toLocaleString()}</span>
    </div>
  );
}
