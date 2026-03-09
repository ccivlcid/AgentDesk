import type { TerminalProgressHintsPayload, TerminalProgressHint } from "../../api";

export interface ProgressHintsStripProps {
  progressHints: TerminalProgressHintsPayload;
  activeToolHint: { tool: string } | null;
  shortPath: (v: string) => string;
  compactHintText: (v: string, max?: number) => string;
  hintLineLabel: (hint: TerminalProgressHint) => string;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}

export function ProgressHintsStrip({
  progressHints,
  activeToolHint,
  shortPath,
  compactHintText,
  hintLineLabel,
  tr,
}: ProgressHintsStripProps) {
  return (
    <div className="terminal-panel-strip border-t px-4 py-2">
      <div className="text-[10px] italic" style={{ color: "var(--th-text-secondary)" }}>
        {activeToolHint
          ? tr(
              `도구 실행중.. ${activeToolHint.tool} 확인 중`,
              `Tool running.. checking ${activeToolHint.tool}`,
              `ツール実行中.. ${activeToolHint.tool} を確認中`,
              `工具运行中.. 正在检查 ${activeToolHint.tool}`,
            )
          : tr(
              "도구 실행중.. 진행 상황 확인 중",
              "Tool running.. checking progress",
              "ツール実行中.. 進捗確認中",
              "工具运行中.. 正在检查进度",
            )}
      </div>
      {progressHints.current_file && (
        <div className="mt-1 text-[10px] break-words" style={{ color: "var(--th-text-muted)" }}>
          {tr(
            `파일: ${shortPath(progressHints.current_file)}`,
            `file: ${shortPath(progressHints.current_file)}`,
            `ファイル: ${shortPath(progressHints.current_file)}`,
            `文件: ${shortPath(progressHints.current_file)}`,
          )}
        </div>
      )}
      <div className="mt-1 max-h-20 space-y-0.5 overflow-y-auto">
        {progressHints.hints.slice(-4).map((hint, idx) => (
          <div
            key={`${hint.tool}-${hint.phase}-${idx}`}
            className="text-[10px] italic break-words"
            style={{ color: hint.phase === "error" ? "rgb(253,164,175)" : "var(--th-text-muted)" }}
          >
            {hintLineLabel(hint)}
          </div>
        ))}
      </div>
      {progressHints.ok_items.length > 0 && (
        <div className="mt-1 text-[10px] break-words" style={{ color: "rgb(167,243,208)" }}>
          {`✓ ${progressHints.ok_items.map((item) => compactHintText(item, 44)).join(" · ")}`}
        </div>
      )}
    </div>
  );
}
