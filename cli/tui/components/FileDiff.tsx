import React from "react";
import { Box, Text } from "ink";

export interface FileDiffData {
  path: string;
  action: "create" | "edit" | "delete";
  summary?: string;
  lines?: string[];
}

interface Props {
  diff: FileDiffData;
  expanded?: boolean;
}

export function FileDiff({ diff, expanded = false }: Props): React.ReactElement {
  const icon = expanded ? "\u25be" : "\u25b8";
  const actionColor =
    diff.action === "create" ? "green" : diff.action === "delete" ? "red" : "yellow";
  const actionLabel =
    diff.action === "create" ? "New" : diff.action === "delete" ? "Del" : "Edit";

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text>
        <Text color={actionColor}>
          {icon} {actionLabel}
        </Text>
        <Text bold> {diff.path}</Text>
        {diff.summary !== undefined && <Text dimColor> ({diff.summary})</Text>}
      </Text>
      {expanded && diff.lines !== undefined && (
        <Box flexDirection="column" marginLeft={2}>
          {diff.lines.map((line, i) => {
            let color: string | undefined;
            if (line.startsWith("+")) color = "green";
            else if (line.startsWith("-")) color = "red";
            else if (line.startsWith("@@")) color = "cyan";
            return (
              <Text key={i} color={color}>
                {line}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
