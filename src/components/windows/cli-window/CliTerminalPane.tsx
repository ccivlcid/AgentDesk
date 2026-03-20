import { lazy, Suspense } from "react";
import type { Task } from "../../../types";
import { CliSpinnerFallback } from "./CliSpinnerFallback";

const XTerminal = lazy(() => import("../../terminal/XTerminal"));

interface CliTerminalPaneProps {
  sessionId: string;
  effectiveCwd: string | undefined;
  activeTask: Task | null;
  initialCommand: string | undefined;
  agentPathLoaded: boolean;
}

export function CliTerminalPane({
  sessionId,
  effectiveCwd,
  activeTask,
  initialCommand,
  agentPathLoaded,
}: CliTerminalPaneProps) {
  return (
    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
      {agentPathLoaded ? (
        <Suspense fallback={<CliSpinnerFallback />}>
          <XTerminal
            sessionId={sessionId}
            cwd={effectiveCwd}
            taskId={activeTask?.id}
            initialCommand={initialCommand}
          />
        </Suspense>
      ) : (
        <CliSpinnerFallback />
      )}
    </div>
  );
}
