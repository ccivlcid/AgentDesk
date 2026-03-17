/**
 * 스크린샷 → MP4 슬라이드쇼 영상 생성
 * ffmpeg (Remotion 내장) 사용
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SCREEN_DIR = "C:/project/AgentDesk/docs/screen";
const OUT_FILE   = "C:/project/AgentDesk/docs/reports/AgentDesk-Screencast.mp4";
const FFMPEG     = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const DURATION   = 3.5; // seconds per slide
const FPS        = 30;

// Ordered slides with labels
const SLIDES = [
  { file: "01-desktop.png",           label: "Desktop Overview" },
  { file: "05-widget-picker.png",     label: "Widget Picker" },
  { file: "31-widget-dashboard.png",  label: "Dashboard Widgets" },
  { file: "11-command-palette.png",   label: "Command Palette (Ctrl+K)" },
  { file: "30-mission-control.png",   label: "Mission Control" },
  { file: "28-agent-manager.png",     label: "Agent Manager" },
  { file: "37-agent-create.png",      label: "Hire Agent" },
  { file: "23-workflow-builder.png",  label: "Workflow Builder" },
  { file: "24-workflow-scheduled.png",label: "Scheduled Workflows" },
  { file: "25-workflow-composition.png", label: "Agent Composition" },
  { file: "18-library-skills.png",    label: "Library — Skills" },
  { file: "19-library-rules.png",     label: "Library — Rules" },
  { file: "21-library-hooks.png",     label: "Library — Hooks" },
  { file: "22-library-deliverables.png", label: "Library — Deliverables" },
  { file: "26-chat-direct.png",       label: "Direct Chat" },
  { file: "27-chat-group.png",        label: "Group Broadcast Chat" },
  { file: "29-repl.png",              label: "Agent CLI (REPL)" },
  { file: "12-settings-general.png",  label: "Settings — General" },
  { file: "15-settings-api.png",      label: "Settings — API Providers" },
  { file: "04-wallpaper-picker.png",  label: "Wallpaper Picker" },
  { file: "02-app-menu.png",          label: "App Menu" },
  { file: "01-desktop.png",           label: "AgentDesk — Project OS" },
];

// Filter to existing files only
const existing = SLIDES.filter(s => fs.existsSync(path.join(SCREEN_DIR, s.file)));
console.log(`▸ ${existing.length}/${SLIDES.length} slides found`);

// Write concat list file
const listPath = "C:/project/AgentDesk/docs/reports/.concat-list.txt";
const listContent = existing.map(s =>
  `file '${path.join(SCREEN_DIR, s.file).replace(/\\/g, "/")}'\nduration ${DURATION}`
).join("\n") + `\nfile '${path.join(SCREEN_DIR, existing.at(-1).file).replace(/\\/g, "/")}'`;

fs.writeFileSync(listPath, listContent);

// Build ffmpeg command
// - concat demuxer: image slideshow
// - scale to 1920x1080 with padding (letterbox if needed)
// - libx264, yuv420p for max compatibility
const cmd = [
  `"${FFMPEG}"`,
  `-y`,
  `-f concat -safe 0 -i "${listPath}"`,
  `-vf "scale=1920:1080,format=yuv420p"`,
  `-c:v libx264 -preset fast -crf 18`,
  `-r ${FPS}`,
  `-movflags +faststart`,
  `"${OUT_FILE}"`,
].join(" ");

console.log("▸ Encoding video...");
try {
  execSync(cmd, { stdio: "inherit" });
  const stat = fs.statSync(OUT_FILE);
  const mb = (stat.size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Done: docs/reports/AgentDesk-Screencast.mp4 (${mb} MB)`);
  console.log(`   Duration: ~${(existing.length * DURATION).toFixed(0)}s  |  ${existing.length} slides  |  ${FPS}fps`);
} catch (err) {
  console.error("❌ ffmpeg failed:", err.message);
  process.exit(1);
} finally {
  fs.unlinkSync(listPath);
}
