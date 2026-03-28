import React from "react";
import { Box, Text } from "ink";

const COMMANDS = [
  { cmd: "/status", desc: "Overview" },
  { cmd: "/tasks", desc: "Task list" },
  { cmd: "/agents", desc: "Agent list" },
  { cmd: "/projects", desc: "Projects" },
  { cmd: "/plan", desc: "Plan mode" },
  { cmd: "/build", desc: "Build mode" },
  { cmd: "/yolo", desc: "YOLO mode" },
  { cmd: "/open", desc: "Open GUI" },
  { cmd: "/help", desc: "Help" },
  { cmd: "/quit", desc: "Exit" },
];

interface Props {
  filter: string;
}

export function CommandPalette({ filter }: Props): React.ReactElement | null {
  const prefix = filter.toLowerCase();
  const display = filter === "/" ? COMMANDS : COMMANDS.filter((c) => c.cmd.startsWith(prefix));
  if (display.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={2}>
      {display.map((c) => (
        <Box key={c.cmd}>
          <Text color="cyan">{c.cmd.padEnd(12)}</Text>
          <Text dimColor>{c.desc}</Text>
        </Box>
      ))}
    </Box>
  );
}
