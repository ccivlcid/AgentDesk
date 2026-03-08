import React from "react";
import type { Agent, Task, WorkflowPackKey } from "../../types";
import ReportHud from "./ReportHud";
import VideoHud from "./VideoHud";
import RpgHud from "./RpgHud";
import AssetHud from "./AssetHud";
import NovelHud from "./NovelHud";

interface PackHudProps {
  packKey: WorkflowPackKey;
  agents: Agent[];
  tasks: Task[];
}

/** Dispatches to the correct pack-specific HUD overlay.
 *  Returns null for packs without a custom HUD (development, web_research_report). */
export default function PackHud({ packKey, agents, tasks }: PackHudProps) {
  switch (packKey) {
    case "report":
      return <ReportHud tasks={tasks} />;
    case "video_preprod":
      return <VideoHud agents={agents} tasks={tasks} />;
    case "roleplay":
      return <RpgHud agents={agents} tasks={tasks} />;
    case "asset_management":
      return <AssetHud agents={agents} tasks={tasks} />;
    case "novel":
      return <NovelHud agents={agents} tasks={tasks} />;
    default:
      return null;
  }
}
