import React from "react";
import { Box, Text } from "ink";

export interface ToolCallData {
  name: string;
  status: "running" | "success" | "error";
  summary?: string;
  detail?: string;
}

interface Props {
  tool: ToolCallData;
  expanded?: boolean;
}

export function ToolCall({ tool, expanded = false }: Props): React.ReactElement {
  const icon = expanded ? "\u25be" : "\u25b8";
  const statusColor =
    tool.status === "success" ? "green" : tool.status === "error" ? "red" : "yellow";

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text>
        <Text color={statusColor}>{icon}</Text>
        <Text bold> {tool.name}</Text>
        {tool.summary !== undefined && <Text dimColor> {tool.summary}</Text>}
      </Text>
      {expanded && tool.detail !== undefined && (
        <Box marginLeft={2}>
          <Text dimColor>{tool.detail}</Text>
        </Box>
      )}
    </Box>
  );
}
