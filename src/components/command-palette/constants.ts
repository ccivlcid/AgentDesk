export const HISTORY_KEY = "cp_history_v1";
export const MAX_HISTORY = 6;

export const STATUS_DOT: Record<string, { color: string; label: string }> = {
  working:  { color: "#30d158", label: "working" },
  running:  { color: "#30d158", label: "running" },
  idle:     { color: "#636366", label: "idle" },
  offline:  { color: "#636366", label: "offline" },
  error:    { color: "#ff453a", label: "error" },
};

export const SHORTCUT_MAP: Record<string, string> = {
  n: "new-task", t: "tasks",
  a: "agents", s: "skills", m: "memory",
  r: "agent-rules", h: "hooks", ",": "settings",
};
