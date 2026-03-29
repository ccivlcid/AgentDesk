/**
 * Terminal widget — embedded PTY via blessed-xterm.
 * Spawns a real shell that the user can interact with.
 */
import blessed from "neo-blessed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XTermConstructor = new (options: any) => any;

async function loadXTerm(): Promise<XTermConstructor | null> {
  try {
    const mod = await import("blessed-xterm");
    return (mod.default ?? mod) as XTermConstructor;
  } catch {
    return null;
  }
}

export class TerminalWidget {
  element: blessed.Widgets.BoxElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private xterm: any = null;
  private available = false;
  visible = true;

  private constructor(
    parent: blessed.Widgets.Screen,
    options: blessed.Widgets.BoxOptions,
    XTerm: XTermConstructor | null,
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
      this.element = this.xterm as blessed.Widgets.BoxElement;
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

  static async create(
    parent: blessed.Widgets.Screen,
    options: blessed.Widgets.BoxOptions,
  ): Promise<TerminalWidget> {
    const XTerm = await loadXTerm();
    return new TerminalWidget(parent, options, XTerm);
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
