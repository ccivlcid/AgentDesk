import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "ink";

const LEADER_TIMEOUT_MS = 2000;

const LEADER_BINDINGS: Record<string, string> = {
  s: "/status",
  t: "/tasks",
  a: "/agents",
  n: "/new",
  f: "/fork",
  p: "/providers",
  m: "/models",
  c: "/cost",
  q: "/quit",
  h: "/help",
  u: "/__scroll_up",
  d: "/__scroll_down",
  "?": "/__toggle_hints",
};

interface UseLeaderKeyParams {
  onCommand: (cmd: string) => void;
}

export function useLeaderKey({ onCommand }: UseLeaderKeyParams) {
  const [leaderMode, setLeaderMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelLeader = useCallback(() => {
    setLeaderMode(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useInput((input, key) => {
    // Ctrl+X activates leader mode
    if (key.ctrl && input === "x") {
      setLeaderMode(true);
      timerRef.current = setTimeout(cancelLeader, LEADER_TIMEOUT_MS);
      return;
    }

    // If in leader mode, handle second key
    if (leaderMode) {
      cancelLeader();
      const cmd = LEADER_BINDINGS[input];
      if (cmd) {
        onCommand(cmd);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { leaderMode };
}
