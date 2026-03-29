import React from "react";
import { Box, Text } from "ink";

interface SidebarProps {
  project: { name: string | null; path: string | null; branch?: string | null };
  agents: Array<{ name: string; status: string; api_model?: string | null; cli_provider?: string | null; currentTask?: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  pipelineStage: string | null;
  tokens: number;
  cost: number;
  readyCli?: Set<string>;
}

// Task status -> icon
const TASK_ICON: Record<string, string> = {
  done: "[v]",
  in_progress: "[>]",
  planned: "[ ]",
  failed: "[!]",
  review: "[?]",
};

// Agent status -> indicator
const AGENT_INDICATOR: Record<string, string> = {
  working: "*",
  running: "*",
  idle: "o",
  break: "-",
  offline: "o",
};

// Pipeline stages
const PIPELINE_STAGES = ["Meeting", "Planning", "Assigning", "Executing", "Review"];

export const Sidebar = React.memo(function Sidebar({ project, agents, tasks, pipelineStage, tokens, cost, readyCli = new Set() }: SidebarProps): React.ReactElement {
  const currentStageIdx = PIPELINE_STAGES.findIndex(
    (s) => s.toLowerCase() === pipelineStage?.toLowerCase()
  );

  const formatTokens = (t: number) => (t >= 1000 ? `${Math.round(t / 1000)}k` : `${t}`);

  return (
    <Box flexDirection="column" width={36} borderStyle="single" paddingX={1}>
      {/* Project */}
      <Text bold color="cyan">Project</Text>
      <Text>  {project.name ?? "(none)"}</Text>
      {project.path && (
        <Text dimColor>
          {"  "}{project.path.length > 30 ? "..." + project.path.slice(-27) : project.path}
        </Text>
      )}
      {project.branch && <Text dimColor>  {project.branch}</Text>}
      <Text> </Text>

      {/* Agents */}
      <Text bold color="yellow">Agents</Text>
      {agents.length === 0 ? (
        <Text dimColor>  (none)</Text>
      ) : (
        agents.map((a, i) => {
          // Green only if: api_model set OR cli_provider is actually installed+authenticated
          const cliReady = !!a.cli_provider && readyCli.has(a.cli_provider);
          const hasLlm = !!a.api_model || cliReady;
          const label = a.api_model ?? (cliReady ? a.cli_provider : null) ?? null;
          const model = label ? (label.length > 20 ? label.slice(0, 19) + "~" : label) : null;
          const llmColor = hasLlm ? "green" : "red";
          return (
            <Box key={i} flexDirection="column">
              <Text>
                <Text color={a.status === "working" || a.status === "running" ? "green" : "gray"}>
                  {"  "}{AGENT_INDICATOR[a.status] ?? "o"}
                </Text>
                <Text> {a.name.length > 20 ? a.name.slice(0, 19) + "~" : a.name}</Text>
                <Text color={llmColor}> ●</Text>
              </Text>
              {model && <Text dimColor>    {model}</Text>}
            </Box>
          );
        })
      )}
      <Text> </Text>

      {/* Tasks */}
      <Text bold color="blue">Tasks</Text>
      {tasks.length === 0 ? (
        <Text dimColor>  (none)</Text>
      ) : (
        tasks.slice(0, 8).map((t, i) => {
          const icon = TASK_ICON[t.status] ?? "[ ]";
          const color =
            t.status === "done"
              ? "green"
              : t.status === "in_progress"
                ? "yellow"
                : t.status === "failed"
                  ? "red"
                  : undefined;
          const label = t.title.length > 28 ? t.title.slice(0, 27) + "~" : t.title;
          return (
            <Text key={i}>
              <Text color={color}>  {icon}</Text>
              <Text> {label}</Text>
            </Text>
          );
        })
      )}
      {tasks.length > 8 && <Text dimColor>  +{tasks.length - 8} more</Text>}
      <Text> </Text>

      {/* Pipeline */}
      {pipelineStage && (
        <>
          <Text bold color="magenta">Pipeline</Text>
          {PIPELINE_STAGES.map((stage, i) => {
            const isCurrent = i === currentStageIdx;
            const isDone = i < currentStageIdx;
            const prefix = isCurrent ? " >" : "  ";
            const suffix = isDone ? " v" : "";
            return (
              <Text key={stage} color={isCurrent ? "cyan" : isDone ? "green" : "gray"} bold={isCurrent}>
                {prefix}{stage}{suffix}
              </Text>
            );
          })}
          <Text> </Text>
        </>
      )}

      {/* Cost */}
      <Text bold dimColor>Cost</Text>
      <Text dimColor>  {formatTokens(tokens)} tok  ${cost.toFixed(2)}</Text>
    </Box>
  );
});
