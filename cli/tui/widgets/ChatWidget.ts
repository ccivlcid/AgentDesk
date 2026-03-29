/**
 * Chat display widget — replaces ChatArea + Message + ToolCall + FileDiff components.
 * Uses blessed.log (auto-scrolling, scrollable).
 */
import blessed from "neo-blessed";
import type { ChatMessage, ToolCallData, FileDiffData } from "../types.js";

const ROLE_COLORS: Record<string, string> = {
  user: "cyan",
  pm: "magenta",
  agent: "yellow",
  system: "gray",
};

const ROLE_LABELS: Record<string, string> = {
  user: "You",
  pm: "PM",
  agent: "Agent",
  system: "System",
};

function formatToolCall(tool: ToolCallData, expanded: boolean): string {
  const icon = expanded ? "\u25be" : "\u25b8";
  const statusMark =
    tool.status === "success"
      ? "{green-fg}ok{/green-fg}"
      : tool.status === "error"
        ? "{red-fg}err{/red-fg}"
        : "{yellow-fg}...{/yellow-fg}";
  let line = `    ${icon} {bold}${tool.name}{/bold} ${statusMark}`;
  if (tool.summary) line += ` {gray-fg}${tool.summary}{/gray-fg}`;
  if (expanded && tool.detail) {
    line += `\n      {gray-fg}${tool.detail}{/gray-fg}`;
  }
  return line;
}

function formatFileDiff(diff: FileDiffData, expanded: boolean): string {
  const icon = expanded ? "\u25be" : "\u25b8";
  const colorTag =
    diff.action === "create"
      ? "green"
      : diff.action === "delete"
        ? "red"
        : "yellow";
  const label =
    diff.action === "create"
      ? "New"
      : diff.action === "delete"
        ? "Del"
        : "Edit";
  let line = `    {${colorTag}-fg}${icon} ${label}{/${colorTag}-fg} {bold}${diff.path}{/bold}`;
  if (diff.summary) line += ` {gray-fg}(${diff.summary}){/gray-fg}`;
  if (expanded && diff.lines) {
    for (const l of diff.lines) {
      if (l.startsWith("+")) line += `\n      {green-fg}${l}{/green-fg}`;
      else if (l.startsWith("-")) line += `\n      {red-fg}${l}{/red-fg}`;
      else if (l.startsWith("@@")) line += `\n      {cyan-fg}${l}{/cyan-fg}`;
      else line += `\n      ${l}`;
    }
  }
  return line;
}

function formatMessage(msg: ChatMessage, showDetails: boolean): string {
  const color = ROLE_COLORS[msg.role] ?? "white";
  const label =
    msg.role === "agent" && msg.agentName
      ? `Agent: ${msg.agentName}`
      : (ROLE_LABELS[msg.role] ?? msg.role);

  let text = `{${color}-fg}{bold}${label}{/bold}{/${color}-fg}\n${msg.content}`;

  if (msg.toolCalls && msg.toolCalls.length > 0) {
    for (const tool of msg.toolCalls) {
      text += "\n" + formatToolCall(tool, showDetails);
    }
  }
  if (msg.fileDiffs && msg.fileDiffs.length > 0) {
    for (const diff of msg.fileDiffs) {
      text += "\n" + formatFileDiff(diff, showDetails);
    }
  }
  return text;
}

export class ChatWidget {
  element: blessed.Widgets.Log;
  private messages: ChatMessage[] = [];
  showDetails = false;

  constructor(options: blessed.Widgets.LogOptions) {
    this.element = blessed.log({
      ...options,
      tags: true,
      scrollable: true,
      scrollbar: { ch: "\u2502", style: { fg: "gray" } },
      mouse: true,
      keys: true,
      vi: true,
    });
  }

  addMessage(msg: ChatMessage): void {
    this.messages.push(msg);
    const formatted = formatMessage(msg, this.showDetails);
    this.element.log(formatted);
    // blessed.log auto-scrolls to bottom
  }

  clear(): void {
    this.messages = [];
    this.element.setContent("");
  }

  setShowDetails(show: boolean): void {
    this.showDetails = show;
  }

  /** Re-render all messages (e.g., after toggling details) */
  rerender(): void {
    this.element.setContent("");
    for (const msg of this.messages) {
      this.element.log(formatMessage(msg, this.showDetails));
    }
  }

  /** Show spinner-like processing indicator */
  showProcessing(label: string): void {
    this.element.log(`{yellow-fg}... ${label}{/yellow-fg}`);
  }

  get messageCount(): number {
    return this.messages.length;
  }
}
