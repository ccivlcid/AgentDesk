import React from "react";
import { Box, Text } from "ink";
import { Message } from "./Message.js";
import type { ChatMessage } from "../App.js";

interface Props {
  messages: ChatMessage[];
  showDetails?: boolean;
}

export function ChatArea({ messages, showDetails = false }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.length === 0 ? (
        <Box paddingY={1}>
          <Text dimColor>No active project. Type a goal to start, or /projects to list.</Text>
        </Box>
      ) : (
        messages.map((msg) => <Message key={msg.id} message={msg} showDetails={showDetails} />)
      )}
    </Box>
  );
}
