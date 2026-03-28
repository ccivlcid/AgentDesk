import React from "react";
import { Box, Text } from "ink";
import type { ChatMessage } from "../App.js";
import { ToolCall } from "./ToolCall.js";
import { FileDiff } from "./FileDiff.js";

const ROLE_COLORS: Record<string, string> = {
  user: "cyan",
  pm: "magenta",
  agent: "yellow",
  system: "gray",
};

const ROLE_LABELS: Record<string, string> = {
  user: "You",
  pm: "PM",
  agent: "Agent",
  system: "System",
};

interface Props {
  message: ChatMessage;
  showDetails?: boolean;
}

export function Message({ message, showDetails = false }: Props): React.ReactElement {
  const color = ROLE_COLORS[message.role] ?? "white";
  const label =
    message.role === "agent" && message.agentName
      ? `Agent: ${message.agentName}`
      : (ROLE_LABELS[message.role] ?? message.role);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>{label}</Text>
      <Text>{message.content}</Text>
      {message.toolCalls !== undefined && message.toolCalls.length > 0 && (
        <Box flexDirection="column">
          {message.toolCalls.map((tool, i) => (
            <ToolCall key={i} tool={tool} expanded={showDetails} />
          ))}
        </Box>
      )}
      {message.fileDiffs !== undefined && message.fileDiffs.length > 0 && (
        <Box flexDirection="column">
          {message.fileDiffs.map((diff, i) => (
            <FileDiff key={i} diff={diff} expanded={showDetails} />
          ))}
        </Box>
      )}
    </Box>
  );
}
