import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { api } from "../../lib/api.js";

interface Props {
  query: string;
  projectId: string | null;
  onSelect: (path: string) => void;
}

export function FileSearch({ query, projectId }: Props): React.ReactElement | null {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!query || !projectId) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<{ files?: string[] }>(
          `/api/projects/path-tree?project_id=${projectId}&query=${encodeURIComponent(query)}`,
        );
        if (!cancelled) {
          setFiles((data.files ?? []).slice(0, 10));
        }
      } catch {
        if (!cancelled) setFiles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, projectId]);

  if (files.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text dimColor>Files matching "{query}":</Text>
      {files.map((f, i) => (
        <Text key={i} color="cyan">
          {"  "}
          {f}
        </Text>
      ))}
    </Box>
  );
}
