import React from "react";
import { Box, Text } from "ink";

interface Props {
  projectName: string | null;
  mode: "plan" | "build" | "yolo";
  agentCount: number;
}

export function HeaderBar({ projectName, mode, agentCount }: Props): React.ReactElement {
  const modeLabel = mode.toUpperCase();
  const modeColor = mode === "plan" ? "blue" : mode === "yolo" ? "red" : "green";
  return (
    <Box borderStyle="single" borderBottom paddingX={1}>
      <Text bold color="cyan">AgentDesk</Text>
      <Text> v2.0.1</Text>
      <Box flexGrow={1} />
      {projectName && <Text dimColor>project: {projectName}  </Text>}
      <Text color={modeColor}>[{modeLabel}]</Text>
      <Text dimColor> {agentCount} agents</Text>
    </Box>
  );
}
