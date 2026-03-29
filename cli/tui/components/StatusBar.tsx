import React from "react";
import { Box, Text } from "ink";

interface Props {
  projectName: string | null;
  sessionMinutes: number;
  tokens: number;
  cost: number;
  activeTasks: number;
  totalTasks: number;
  agentCount: number;
  mode: "plan" | "build" | "yolo";
  leaderMode?: boolean;
  showHints?: boolean;
}

export function StatusBar(props: Props): React.ReactElement {
  const {
    projectName,
    sessionMinutes,
    tokens,
    cost,
    activeTasks,
    totalTasks,
    agentCount,
    mode,
    leaderMode,
    showHints,
  } = props;

  const modeColor = mode === "plan" ? "blue" : mode === "yolo" ? "red" : "green";
  const formatTokens = (t: number) => (t >= 1000 ? `${Math.round(t / 1000)}k` : `${t}`);
  const timeStr =
    sessionMinutes >= 60
      ? `${Math.floor(sessionMinutes / 60)}h${sessionMinutes % 60}m`
      : `${sessionMinutes}m`;

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Box>
        <Text bold color="cyan">[AgentDesk]</Text>
        <Text dimColor> | </Text>
        <Text>{projectName ?? "no project"}</Text>
        <Text dimColor> | </Text>
        <Text>{timeStr}</Text>
        <Text dimColor> | </Text>
        <Text>{formatTokens(tokens)} tok</Text>
        <Text dimColor> | </Text>
        <Text>${cost.toFixed(2)}</Text>
        <Text dimColor> | </Text>
        <Text>T:{activeTasks}/{totalTasks}</Text>
        <Text dimColor> | </Text>
        <Text>A:{agentCount}</Text>
        <Text dimColor> | </Text>
        <Text color={modeColor} bold>
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </Text>
      </Box>
      {(leaderMode || showHints) && (
        <Box>
          {leaderMode ? (
            <Text color="yellow" bold>[Ctrl+X ...] waiting for key</Text>
          ) : (
            <Text dimColor>Tab: mode  esc: interrupt  Ctrl+X: leader  ?: toggle hints</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
