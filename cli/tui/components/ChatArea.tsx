import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Message } from "./Message.js";
import type { ChatMessage } from "../App.js";

interface Props {
  messages: ChatMessage[];
  showDetails?: boolean;
  scrollOffset?: number;
  totalMessages?: number;
  isProcessing?: boolean;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner({ label }: { label: string }): React.ReactElement {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  return (
    <Text color="yellow">
      {SPINNER_FRAMES[frame]} {label}
    </Text>
  );
}

export function ChatArea({ messages, showDetails = false, scrollOffset = 0, totalMessages = 0, isProcessing = false }: Props): React.ReactElement {
  const isScrolled = scrollOffset > 0;
  return (
    <Box flexDirection="column" flexGrow={1} overflowY="hidden" paddingX={1}>
      {isScrolled && (
        <Text dimColor>↑ {scrollOffset} older  (Ctrl+X d: down)</Text>
      )}
      {messages.length === 0 ? (
        <Box paddingY={1}>
          <Text dimColor>메시지가 없습니다. 목표를 입력하거나 /help 를 입력하세요.</Text>
        </Box>
      ) : (
        messages.map((msg) => <Message key={msg.id} message={msg} showDetails={showDetails} />)
      )}
      {isProcessing && !isScrolled && (
        <Box paddingY={0}>
          <Spinner label="PM 처리 중..." />
        </Box>
      )}
      {isScrolled && (
        <Text dimColor>── {totalMessages - scrollOffset}/{totalMessages}  Ctrl+X u↑  Ctrl+X d↓ ──</Text>
      )}
    </Box>
  );
}
