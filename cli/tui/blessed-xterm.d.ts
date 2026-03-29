declare module "blessed-xterm" {
  import { Widgets } from "blessed";

  interface XTermOptions extends Widgets.BoxOptions {
    shell?: string;
    args?: string[];
    env?: Record<string, string | undefined>;
    cwd?: string;
    cursorType?: "block" | "underline" | "line";
    scrollback?: number;
  }

  class XTerm extends Widgets.BoxElement {
    constructor(options?: XTermOptions);
    write(data: string): void;
    terminate(): void;
    spawn(shell: string, args?: string[], cwd?: string, env?: Record<string, string | undefined>): void;
    injectInput(input: string): void;
    pty: unknown;
  }

  export = XTerm;
}
