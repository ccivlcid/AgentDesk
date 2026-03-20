import type { FileTreeNode } from "./types";

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function fmtTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function elapsed(start: number | null | undefined, end: number | null | undefined): string {
  if (!start || !end) return "—";
  const ms = end - start;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

interface TreeInputNode {
  name: string;
  type: "dir" | "file";
  children?: unknown[];
}

export function buildTree(nodes: TreeInputNode[], basePath: string): FileTreeNode[] {
  return nodes.map((n) => ({
    name: n.name,
    type: n.type,
    path: basePath + "/" + n.name,
    children: n.type === "dir" && n.children
      ? buildTree(n.children as TreeInputNode[], basePath + "/" + n.name)
      : undefined,
  }));
}

export function buildRunCommand(fileName: string, filePath: string): string {
  const ext = getExt(fileName);
  switch (ext) {
    case "sh": case "bash": case "zsh": case "fish": return `bash "${filePath}"`;
    case "py": return `python "${filePath}"`;
    case "js": case "mjs": return `node "${filePath}"`;
    case "ts": return `npx tsx "${filePath}"`;
    default: return `"${filePath}"`;
  }
}
