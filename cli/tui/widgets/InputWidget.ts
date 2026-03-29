/**
 * Input widget — replaces InputBar + CommandPalette + FileSearch.
 * blessed.textarea for text entry + overlay list for autocomplete.
 */
import blessed from "neo-blessed";
import { api } from "../../lib/api.js";

const COMMANDS = [
  { cmd: "/status", desc: "프로젝트 현황" },
  { cmd: "/tasks", desc: "태스크 목록" },
  { cmd: "/agents", desc: "에이전트 목록" },
  { cmd: "/agent", desc: "에이전트 관리 (edit, list)" },
  { cmd: "/projects", desc: "프로젝트 목록" },
  { cmd: "/import", desc: "현재 디렉토리를 프로젝트로 등록" },
  { cmd: "/kickoff", desc: "프로젝트 킥오프" },
  { cmd: "/connect", desc: "LLM 프로바이더 연결" },
  { cmd: "/providers", desc: "연결된 프로바이더 목록" },
  { cmd: "/models", desc: "사용 가능한 모델 목록" },
  { cmd: "/plan", desc: "Plan 모드 전환" },
  { cmd: "/build", desc: "Build 모드 전환" },
  { cmd: "/yolo", desc: "YOLO 모드 전환" },
  { cmd: "/inbox", desc: "의사결정 수신함" },
  { cmd: "/approve", desc: "대기 중인 결정 승인" },
  { cmd: "/revise", desc: "대기 중인 결정 수정 요청" },
  { cmd: "/cost", desc: "토큰 비용 요약" },
  { cmd: "/usage", desc: "사용량 통계" },
  { cmd: "/logs", desc: "최근 태스크 로그" },
  { cmd: "/skills", desc: "에이전트 스킬" },
  { cmd: "/rules", desc: "에이전트 규칙" },
  { cmd: "/memory", desc: "에이전트 메모리" },
  { cmd: "/hooks", desc: "워크플로우 훅" },
  { cmd: "/sessions", desc: "세션 목록" },
  { cmd: "/fork", desc: "현재 세션 분기" },
  { cmd: "/resume", desc: "세션 재개" },
  { cmd: "/new", desc: "새 세션" },
  { cmd: "/setup", desc: "설정 가이드" },
  { cmd: "/details", desc: "상세 보기 토글" },
  { cmd: "/lang", desc: "언어 변경" },
  { cmd: "/open", desc: "GUI 열기" },
  { cmd: "/help", desc: "도움말" },
  { cmd: "/quit", desc: "종료" },
];

export class InputWidget {
  /** The main text input box */
  element: blessed.Widgets.TextboxElement;
  /** Command palette overlay (shown above input) */
  palette: blessed.Widgets.BoxElement;
  /** File search overlay */
  fileSearch: blessed.Widgets.BoxElement;
  /** Mode label */
  modeLabel: blessed.Widgets.TextElement;

  private mode: "plan" | "build" | "yolo" = "build";
  private onSubmit: ((text: string) => void) | null = null;
  private projectId: string | null = null;

  constructor(
    parent: blessed.Widgets.Screen,
    options: {
      bottom: number;
      left: number | string;
      width: number | string;
      height: number;
    },
  ) {
    // Mode label on the right
    this.modeLabel = blessed.text({
      parent,
      bottom: options.bottom,
      right: "25%",
      width: 8,
      height: 1,
      content: "[BUILD]",
      style: { fg: "green", bold: true },
    });

    // Main input
    this.element = blessed.textbox({
      parent,
      bottom: options.bottom,
      left: options.left,
      width: options.width,
      height: options.height,
      border: { type: "line" },
      style: {
        fg: "white",
        border: { fg: "gray" },
        focus: { border: { fg: "green" } },
      },
      inputOnFocus: true,
      label: " > ",
    });

    // Command palette overlay
    this.palette = blessed.box({
      parent,
      bottom: (options.bottom as number) + options.height,
      left: options.left,
      width: options.width,
      height: 0,
      tags: true,
      border: { type: "line" },
      style: { border: { fg: "cyan" } },
      hidden: true,
      label: " Commands ",
    });

    // File search overlay
    this.fileSearch = blessed.box({
      parent,
      bottom: (options.bottom as number) + options.height,
      left: options.left,
      width: options.width,
      height: 0,
      tags: true,
      border: { type: "line" },
      style: { border: { fg: "yellow" } },
      hidden: true,
      label: " Files ",
    });

    // Submit handler
    this.element.on("submit", (value: string) => {
      if (value.trim()) {
        this.onSubmit?.(value.trim());
      }
      this.element.clearValue();
      this.hidePalette();
      this.hideFileSearch();
      this.element.focus();
    });

    // Key value change — update palette
    this.element.on("keypress", (_ch: string, _key: blessed.Widgets.Events.IKeyEventArg) => {
      // Debounced update of palette after next tick
      process.nextTick(() => {
        const val = this.element.getValue();
        this.updateOverlays(val);
      });
    });
  }

  setOnSubmit(handler: (text: string) => void): void {
    this.onSubmit = handler;
  }

  setMode(mode: "plan" | "build" | "yolo"): void {
    this.mode = mode;
    const color =
      mode === "plan" ? "blue" : mode === "yolo" ? "red" : "green";
    this.modeLabel.setContent(`[${mode.toUpperCase()}]`);
    this.modeLabel.style.fg = color;
  }

  setProjectId(projectId: string | null): void {
    this.projectId = projectId;
  }

  focus(): void {
    this.element.focus();
  }

  /** Show pending action confirmation */
  showConfirmation(description: string): void {
    this.element.setLabel(` ${description} [y/n] `);
  }

  clearConfirmation(): void {
    this.element.setLabel(" > ");
  }

  private updateOverlays(value: string): void {
    if (value.startsWith("/")) {
      this.showPalette(value);
      this.hideFileSearch();
    } else {
      this.hidePalette();
      // Check for @ file reference
      const atIndex = value.lastIndexOf("@");
      const atQuery =
        atIndex !== -1 && !value.slice(atIndex + 1).includes(" ")
          ? value.slice(atIndex + 1)
          : null;
      if (atQuery && atQuery.length > 0 && this.projectId) {
        void this.showFileSearchResults(atQuery);
      } else {
        this.hideFileSearch();
      }
    }
  }

  private showPalette(filter: string): void {
    const prefix = filter.toLowerCase();
    const matches =
      filter === "/"
        ? COMMANDS
        : COMMANDS.filter((c) => c.cmd.startsWith(prefix));
    if (matches.length === 0) {
      this.hidePalette();
      return;
    }

    const lines = matches.map(
      (c) => `{cyan-fg}${c.cmd.padEnd(14)}{/cyan-fg}{gray-fg}${c.desc}{/gray-fg}`,
    );
    const h = Math.min(lines.length + 2, 15); // +2 for border
    this.palette.height = h;
    this.palette.setContent(lines.join("\n"));
    this.palette.show();
    this.palette.parent?.render();
  }

  private hidePalette(): void {
    if (!this.palette.hidden) {
      this.palette.hide();
      this.palette.parent?.render();
    }
  }

  private async showFileSearchResults(query: string): Promise<void> {
    if (!this.projectId) return;
    try {
      const data = await api.get<{ files?: string[] }>(
        `/api/projects/path-tree?project_id=${this.projectId}&query=${encodeURIComponent(query)}`,
      );
      const files = (data.files ?? []).slice(0, 10);
      if (files.length === 0) {
        this.hideFileSearch();
        return;
      }
      const lines = files.map((f) => `  {cyan-fg}${f}{/cyan-fg}`);
      this.fileSearch.height = Math.min(lines.length + 2, 12);
      this.fileSearch.setContent(lines.join("\n"));
      this.fileSearch.show();
      this.fileSearch.parent?.render();
    } catch {
      this.hideFileSearch();
    }
  }

  private hideFileSearch(): void {
    if (!this.fileSearch.hidden) {
      this.fileSearch.hide();
      this.fileSearch.parent?.render();
    }
  }
}
