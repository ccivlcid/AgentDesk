export const mono = "var(--th-font-mono)";

export interface ToolTheme {
  accent: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}

export function getToolTheme(name: string): ToolTheme {
  const n = (name ?? "").toLowerCase();
  if (n === "bash" || n === "computer")
    return { accent: "#4ade80", bg: "rgba(74,222,128,0.06)",  border: "rgba(74,222,128,0.18)",  icon: "⌗", label: name };
  if (n === "write")
    return { accent: "#60a5fa", bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.18)",  icon: "✎", label: name };
  if (n === "edit" || n === "multiedit")
    return { accent: "#38bdf8", bg: "rgba(56,189,248,0.06)",  border: "rgba(56,189,248,0.18)",  icon: "✐", label: name };
  if (n === "read")
    return { accent: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.18)", icon: "◎", label: name };
  if (n === "glob")
    return { accent: "#a78bfa", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.18)", icon: "⌕", label: name };
  if (n === "grep")
    return { accent: "#c084fc", bg: "rgba(192,132,252,0.06)", border: "rgba(192,132,252,0.18)", icon: "⌕", label: name };
  if (n === "websearch")
    return { accent: "#fb923c", bg: "rgba(251,146,60,0.06)",  border: "rgba(251,146,60,0.18)",  icon: "⊙", label: name };
  if (n === "webfetch")
    return { accent: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.18)",  icon: "⤓", label: name };
  if (n === "task" || n === "agent" || n === "todocreate" || n === "todowrite")
    return { accent: "#e879f9", bg: "rgba(232,121,249,0.06)", border: "rgba(232,121,249,0.18)", icon: "◈", label: name };
  return   { accent: "#f59e0b", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  icon: "◆", label: name };
}

export function toolInputSummary(input: unknown, toolName?: string): string {
  if (input == null) return "";
  const n = (toolName ?? "").toLowerCase();
  if (typeof input === "string") return input.slice(0, 80);
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const cmd = obj.command ?? obj.action;
    if (cmd && typeof cmd === "string") return cmd.slice(0, 80);
    const fp = obj.file_path ?? obj.path ?? obj.filename;
    if (fp && typeof fp === "string") {
      if (n === "read") return String(fp);
      const content = obj.content ?? obj.new_string;
      if (typeof content === "string") return `${fp}  ·  ${content.split("\n").length} lines`;
      return String(fp);
    }
    const pattern = obj.pattern ?? obj.query ?? obj.prompt;
    if (pattern && typeof pattern === "string") return pattern.slice(0, 80);
  }
  return "";
}
