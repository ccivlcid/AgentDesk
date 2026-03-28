import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

type Language = "en" | "ko";

interface Props {
  onLanguageSelected: (lang: Language) => void;
}

export function WelcomeScreen({ onLanguageSelected }: Props): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const languages: Array<{ key: Language; label: string }> = [
    { key: "en", label: "English" },
    { key: "ko", label: "\ud55c\uad6d\uc5b4" },
  ];

  useInput((_input, key) => {
    if (key.upArrow) setSelectedIndex((prev) => Math.max(0, prev - 1));
    if (key.downArrow) setSelectedIndex((prev) => Math.min(languages.length - 1, prev + 1));
    if (key.return) {
      onLanguageSelected(languages[selectedIndex].key);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold color="cyan">AgentDesk</Text>
      <Text dimColor>Multi-LLM Orchestrator for Software Development</Text>
      <Text> </Text>
      <Text bold>Language / \uc5b8\uc5b4 \uc120\ud0dd:</Text>
      <Text> </Text>
      {languages.map((lang, i) => (
        <Box key={lang.key}>
          <Text color={i === selectedIndex ? "cyan" : undefined}>
            {i === selectedIndex ? "> " : "  "}{lang.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
