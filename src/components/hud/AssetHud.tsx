import React, { useEffect, useState } from "react";
import type { Agent, Task } from "../../types";
import { usePackVocab } from "../../pack-identity/vocabulary";

interface AssetHudProps {
  agents: Agent[];
  tasks: Task[];
}

/** Trading Floor HUD — live orders + simulated P&L + market clock */
export default function AssetHud({ agents, tasks }: AssetHudProps) {
  const vocab = usePackVocab("asset_management");
  const executing = tasks.filter((t) => t.status === "in_progress").length;
  const watching = agents.filter((a) => a.status === "idle").length;
  const settled = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length || 1;

  // Simulated P&L based on completion ratio
  const pnl = settled > 0 ? ((settled / total) * 20 - 3).toFixed(1) : "0.0";
  const pnlColor = Number(pnl) >= 0 ? "#22c55e" : "#ef4444";
  const pnlSign = Number(pnl) >= 0 ? "+" : "";

  // Live clock
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClock(`${n.getHours().toString().padStart(2, "0")}:${n.getMinutes().toString().padStart(2, "0")}:${n.getSeconds().toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pack-hud pack-hud--asset">
      <span className="pack-hud__rec-dot" style={{ background: "#22c55e" }} />
      <span style={{ color: "#22c55e", fontWeight: 700 }}>LIVE</span>
      <span className="pack-hud__sep" />
      <span>{vocab.tasks.toUpperCase()}: {executing} EXEC</span>
      <span className="pack-hud__sep" />
      <span>{watching} WATCH</span>
      <span className="pack-hud__sep" />
      <span>TODAY {vocab.xp}: <span style={{ color: pnlColor }}>{pnlSign}{pnl}%</span></span>
      <span className="pack-hud__sep" />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{clock}</span>
    </div>
  );
}
