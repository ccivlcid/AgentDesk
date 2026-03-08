import React, { useEffect, useState } from "react";
import type { Agent, Task } from "../../types";
import { usePackVocab } from "../../pack-identity/vocabulary";

interface VideoHudProps {
  agents: Agent[];
  tasks: Task[];
}

/** Production Studio HUD — ON AIR indicator + active shot info */
export default function VideoHud({ agents, tasks }: VideoHudProps) {
  const vocab = usePackVocab("video_preprod");
  const workingAgents = agents.filter((a) => a.status === "working");
  const isOnAir = workingAgents.length > 0;
  const activeTask = tasks.find((t) => t.status === "in_progress");

  // Elapsed timer for active shot
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!activeTask?.started_at) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - (activeTask.started_at ?? 0)) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTask?.started_at]);

  // Find which department (stage) the first working agent belongs to
  const stageAgent = workingAgents[0];
  const stageName = stageAgent ? `STAGE ${(stageAgent.department_id ?? "A").slice(-1).toUpperCase()}` : "";

  return (
    <div className="pack-hud pack-hud--video">
      {isOnAir ? (
        <>
          <span className="pack-hud__rec-dot" />
          <span style={{ color: "#ef4444", fontWeight: 700 }}>ON AIR</span>
        </>
      ) : (
        <span style={{ color: "var(--th-text-muted)" }}>STANDBY</span>
      )}
      <span className="pack-hud__sep" />
      {stageName && <><span>{stageName}</span><span className="pack-hud__sep" /></>}
      {activeTask && (
        <>
          <span>{activeTask.title.slice(0, 25)}</span>
          <span className="pack-hud__sep" />
        </>
      )}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{elapsed}</span>
      <span className="pack-hud__sep" />
      <span>{workingAgents.length} {vocab.agents}</span>
    </div>
  );
}
