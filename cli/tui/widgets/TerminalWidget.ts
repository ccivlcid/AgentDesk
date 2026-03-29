/**
 * Terminal widget — embedded PTY via blessed-xterm.
 * Spawns a real shell that the user can interact with.
 */
import blessed from "neo-blessed";

// blessed-xterm is optional — graceful fallback if not available
let XTerm: typeof import("blessed-xterm") | null = null;
try {
  XTerm = (await import("blessed-xterm")).default ?? (await import("blessed-xterm"));
} catch {
  // blessed-xterm or node-pty not available
}

export class TerminalWidget {
  element: blessed.Widgets.BoxElement;
  private xterm: InstanceType<NonNullable<typeof XTerm>> | null = null;
  private available: boolean;
  visible = true;

  constructor(
    parent: blessed.Widgets.Screen,
    options: blessed.Widgets.BoxOptions,
  ) {
    this.available = XTerm !== null;

    if (this.available && XTerm) {
      this.xterm = new XTerm({
        ...options,
        parent,
        shell:
          process.env.SHELL ||
          (process.platform === "win32" ? "powershell.exe" : "bash"),
        args: [],
        env: process.env as Record<string, string>,
        cwd: process.cwd(),
        cursorType: "block",
        scrollback: 5000,
        border: { type: "line" },
        style: {
          fg: "default",
          bg: "default",
          border: { fg: "gray" },
          focus: { border: { fg: "green" } },
        },
        label: " Terminal ",
      });
      this.element = this.xterm as unknown as blessed.Widgets.BoxElement;
    } else {
      // Fallback: plain box with message
      this.element = blessed.box({
        ...options,
        parent,
        border: { type: "line" },
        style: {
          fg: "gray",
          border: { fg: "gray" },
        },
        tags: true,
        content:
          "{center}Terminal not available.\nInstall blessed-xterm and node-pty:\n  pnpm add blessed-xterm node-pty{/center}",
        label: " Terminal ",
      });
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }

  focus(): void {
    this.element.focus();
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.element.show();
    } else {
      this.element.hide();
    }
  }

  show(): void {
    this.visible = true;
    this.element.show();
  }

  hide(): void {
    this.visible = false;
    this.element.hide();
  }

  terminate(): void {
    if (this.xterm) {
      try {
        this.xterm.terminate();
      } catch {
        // already terminated
      }
    }
  }
}
