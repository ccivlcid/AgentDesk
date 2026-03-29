/**
 * Input history + leader key state machine — replaces useLeaderKey + InputBar history.
 */
import { EventEmitter } from "events";

const LEADER_TIMEOUT_MS = 2000;
const MAX_HISTORY = 50;

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

export class InputService extends EventEmitter {
  history: string[] = [];
  historyIdx = -1;
  leaderMode = false;
  private leaderTimer: NodeJS.Timeout | null = null;

  addToHistory(text: string): void {
    this.history.unshift(text);
    if (this.history.length > MAX_HISTORY) this.history.pop();
    this.historyIdx = -1;
  }

  navigateUp(): string | null {
    if (this.history.length === 0) return null;
    this.historyIdx = Math.min(this.historyIdx + 1, this.history.length - 1);
    return this.history[this.historyIdx];
  }

  navigateDown(): string | null {
    if (this.historyIdx < 0) return null;
    this.historyIdx -= 1;
    return this.historyIdx >= 0 ? this.history[this.historyIdx] : "";
  }

  resetHistoryIdx(): void {
    this.historyIdx = -1;
  }

  /** Call when Ctrl+X is pressed */
  activateLeader(): void {
    this.leaderMode = true;
    this.emit("leaderChanged", true);
    this.leaderTimer = setTimeout(() => this.cancelLeader(), LEADER_TIMEOUT_MS);
  }

  /** Call with the key pressed while in leader mode */
  handleLeaderKey(ch: string): string | null {
    this.cancelLeader();
    const cmd = LEADER_BINDINGS[ch] ?? null;
    if (cmd) {
      this.emit("command", cmd);
    }
    return cmd;
  }

  cancelLeader(): void {
    this.leaderMode = false;
    if (this.leaderTimer) {
      clearTimeout(this.leaderTimer);
      this.leaderTimer = null;
    }
    this.emit("leaderChanged", false);
  }
}
