import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { CommandPalette } from "./CommandPalette.js";
import { FileSearch } from "./FileSearch.js";
import type { PendingAction } from "../App.js";

interface Props {
  onSend: (text: string) => void;
  mode: "plan" | "build" | "yolo";
  projectId?: string | null;
  pendingAction?: PendingAction | null;
  onConfirm?: (confirmed: boolean) => void;
}

export function InputBar({ onSend, mode, projectId = null, pendingAction = null, onConfirm }: Props): React.ReactElement {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const modeLabel = mode.toUpperCase();
  const modeColor = mode === "plan" ? "blue" : mode === "yolo" ? "red" : "green";

  const handleSubmit = (text: string) => {
    if (text.trim()) {
      setHistory((prev) => [text.trim(), ...prev].slice(0, 50));
      setHistoryIdx(-1);
      onSend(text.trim());
      setValue("");
    }
  };

  // y/n confirmation + history navigation
  useInput((_input, key) => {
    if (pendingAction && onConfirm) {
      if (_input === "y" || _input === "Y") onConfirm(true);
      else if (_input === "n" || _input === "N") onConfirm(false);
      return;
    }
    // History: only when input empty or already browsing (skip ctrl/shift for scroll)
    if (key.upArrow && !key.ctrl && !key.shift && history.length > 0 && (value === "" || historyIdx >= 0)) {
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setValue(history[nextIdx]);
    }
    if (key.downArrow && !key.ctrl && !key.shift && historyIdx >= 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setValue(nextIdx >= 0 ? history[nextIdx] : "");
    }
  });

  const showPalette = value.startsWith("/");

  // Extract @ query: last @ and everything after it (no spaces after @)
  const atIndex = value.lastIndexOf("@");
  const atQuery =
    atIndex !== -1 && !value.slice(atIndex + 1).includes(" ")
      ? value.slice(atIndex + 1)
      : null;
  const showFileSearch = atQuery !== null && atQuery.length > 0;

  if (pendingAction) {
    return (
      <Box flexDirection="column">
        <Box borderStyle="single" borderTop paddingX={1}>
          <Text color="yellow">  Proceed? </Text>
          <Text color="green">[y]</Text>
          <Text dimColor> / </Text>
          <Text color="red">[n]</Text>
        </Box>
      </Box>
    );
  }

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
