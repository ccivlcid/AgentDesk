import { useMemo } from "react";
import type { WorkflowPackKey } from "../types";

/**
 * Pack Vocabulary — 팩별 UI 용어 교체 시스템.
 *
 * 각 팩의 산업 언어로 공통 개념을 표현한다.
 * 예: RPG 팩에서 Task → Quest, Agent → Adventurer, Done → Cleared
 */
export interface PackVocab {
  // Core concepts
  task: string;
  tasks: string;
  agent: string;
  agents: string;
  department: string;
  departments: string;

  // Statuses
  done: string;
  running: string;
  idle: string;
  onBreak: string;

  // UI labels
  dashboard: string;
  createTask: string;
  assignTask: string;
  xp: string;

  // Office view labels
  ceoTitle: string;
  breakRoom: string;
  conferenceRoom: string;
}

const DEV_VOCAB: PackVocab = {
  task: "Issue",
  tasks: "Issues",
  agent: "Engineer",
  agents: "Engineers",
  department: "Team",
  departments: "Teams",
  done: "Merged",
  running: "Running",
  idle: "Idle",
  onBreak: "On Break",
  dashboard: "Sprint Board",
  createTask: "New Issue",
  assignTask: "Assign Issue",
  xp: "XP",
  ceoTitle: "CEO",
  breakRoom: "Break Room",
  conferenceRoom: "Conference",
};

const REPORT_VOCAB: PackVocab = {
  task: "Story",
  tasks: "Stories",
  agent: "Reporter",
  agents: "Reporters",
  department: "Desk",
  departments: "Desks",
  done: "Published",
  running: "Writing",
  idle: "Standby",
  onBreak: "Off Duty",
  dashboard: "Front Page",
  createTask: "Assign Story",
  assignTask: "Assign Story",
  xp: "XP",
  ceoTitle: "Editor-in-Chief",
  breakRoom: "Lounge",
  conferenceRoom: "Editorial Meeting",
};

const NOVEL_VOCAB: PackVocab = {
  task: "Chapter",
  tasks: "Chapters",
  agent: "Author",
  agents: "Authors",
  department: "Studio",
  departments: "Studios",
  done: "Written",
  running: "Drafting",
  idle: "Resting",
  onBreak: "Tea Break",
  dashboard: "Outline",
  createTask: "New Chapter",
  assignTask: "Assign Chapter",
  xp: "Words",
  ceoTitle: "Chief Editor",
  breakRoom: "Fireplace Lounge",
  conferenceRoom: "Reading Room",
};

const VIDEO_VOCAB: PackVocab = {
  task: "Shot",
  tasks: "Shots",
  agent: "Crew",
  agents: "Crew",
  department: "Stage",
  departments: "Stages",
  done: "Wrapped",
  running: "ON AIR",
  idle: "Standby",
  onBreak: "In Trailer",
  dashboard: "Slate",
  createTask: "New Shot",
  assignTask: "Assign Shot",
  xp: "XP",
  ceoTitle: "Director",
  breakRoom: "Green Room",
  conferenceRoom: "Screening Room",
};

const RPG_VOCAB: PackVocab = {
  task: "Quest",
  tasks: "Quests",
  agent: "Adventurer",
  agents: "Adventurers",
  department: "Guild",
  departments: "Guilds",
  done: "Cleared",
  running: "On Quest",
  idle: "In Town",
  onBreak: "At Inn",
  dashboard: "Quest Log",
  createTask: "Post Quest",
  assignTask: "Accept Quest",
  xp: "EXP",
  ceoTitle: "Guild Master",
  breakRoom: "Tavern",
  conferenceRoom: "War Room",
};

const ASSET_VOCAB: PackVocab = {
  task: "Order",
  tasks: "Orders",
  agent: "Trader",
  agents: "Traders",
  department: "Desk",
  departments: "Desks",
  done: "Settled",
  running: "Executing",
  idle: "Watching",
  onBreak: "Off Floor",
  dashboard: "Portfolio",
  createTask: "New Order",
  assignTask: "Route Order",
  xp: "P&L",
  ceoTitle: "Head Trader",
  breakRoom: "Break Floor",
  conferenceRoom: "Risk Room",
};

const WEB_VOCAB: PackVocab = {
  task: "Query",
  tasks: "Queries",
  agent: "Analyst",
  agents: "Analysts",
  department: "Lab",
  departments: "Labs",
  done: "Published",
  running: "Researching",
  idle: "Standby",
  onBreak: "On Break",
  dashboard: "Index",
  createTask: "New Query",
  assignTask: "Assign Query",
  xp: "XP",
  ceoTitle: "Lead Researcher",
  breakRoom: "Break Room",
  conferenceRoom: "Briefing Room",
};

const ROLEPLAY_VOCAB: PackVocab = {
  task: "Scene",
  tasks: "Scenes",
  agent: "Character",
  agents: "Characters",
  department: "Act",
  departments: "Acts",
  done: "Curtain",
  running: "On Stage",
  idle: "Backstage",
  onBreak: "Intermission",
  dashboard: "Script",
  createTask: "New Scene",
  assignTask: "Cast Scene",
  xp: "XP",
  ceoTitle: "Director",
  breakRoom: "Green Room",
  conferenceRoom: "Rehearsal Hall",
};

const PACK_VOCAB: Record<string, PackVocab> = {
  development: DEV_VOCAB,
  report: REPORT_VOCAB,
  novel: NOVEL_VOCAB,
  video_preprod: VIDEO_VOCAB,
  roleplay: ROLEPLAY_VOCAB,
  asset_management: ASSET_VOCAB,
  web_research_report: WEB_VOCAB,
};

/** Get vocabulary for a given pack key. Falls back to DEV vocab. */
export function getPackVocab(packKey: string): PackVocab {
  return PACK_VOCAB[packKey] ?? DEV_VOCAB;
}

/** React hook — returns memoized vocabulary for the active pack. */
export function usePackVocab(packKey: WorkflowPackKey | string): PackVocab {
  return useMemo(() => getPackVocab(packKey), [packKey]);
}

// Re-export for convenience
export { RPG_VOCAB, ASSET_VOCAB, REPORT_VOCAB, NOVEL_VOCAB, VIDEO_VOCAB, WEB_VOCAB, ROLEPLAY_VOCAB, DEV_VOCAB };
