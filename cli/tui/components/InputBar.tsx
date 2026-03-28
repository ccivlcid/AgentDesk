import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { CommandPalette } from "./CommandPalette.js";
import { FileSearch } from "./FileSearch.js";

interface Props {
  onSend: (text: string) => void;
  mode: "plan" | "build" | "yolo";
  projectId?: string | null;
}

export function InputBar({ onSend, mode, projectId = null }: Props): React.ReactElement {
  const [value, setValue] = useState("");
  const modeLabel = mode.toUpperCase();
  const modeColor = mode === "plan" ? "blue" : mode === "yolo" ? "red" : "green";

  const handleSubmit = (text: string) => {
    if (text.trim()) {
      onSend(text.trim());
      setValue("");
    }
  };

  const showPalette = value.startsWith("/");

  // Extract @ query: last @ and everything after it (no spaces after @)
  const atIndex = value.lastIndexOf("@");
  const atQuery =
    atIndex !== -1 && !value.slice(atIndex + 1).includes(" ")
      ? value.slice(atIndex + 1)
      : null;
  const showFileSearch = atQuery !== null && atQuery.length > 0;

  return (
    <Box flexDirection="column">
      {showPalette && <CommandPalette filter={value} />}
      {showFileSearch && (
        <FileSearch
          query={atQuery}
          projectId={projectId}
          onSelect={() => undefined}
        />
      )}
      <Box borderStyle="single" borderTop paddingX={1}>
        <Text color="green">&gt; </Text>
        <Box flexGrow={1}>
          <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
        </Box>
        <Text color={modeColor}>[{modeLabel}]</Text>
      </Box>
    </Box>
  );
}
