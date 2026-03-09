export interface TerminalPanelHeaderActionsProps {
  hasThinking: boolean;
  showThinking: boolean;
  setShowThinking: (fn: (p: boolean) => boolean) => void;
  isInterventionTarget: boolean;
  interventionOpen: boolean;
  setInterventionOpen: (fn: (p: boolean) => boolean) => void;
  setInterventionMessage: (v: string | null) => void;
  taskStatus?: string;
  showSearchBar: boolean;
  setShowSearchBar: (fn: (p: boolean) => boolean) => void;
  follow: boolean;
  setFollow: (fn: (f: boolean) => boolean) => void;
  onCopyLog: () => void;
  onDownloadLog: () => void;
  onScrollToBottom: () => void;
  onClose: () => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}

export function TerminalPanelHeaderActions({
  hasThinking,
  showThinking,
  setShowThinking,
  isInterventionTarget,
  interventionOpen,
  setInterventionOpen,
  setInterventionMessage,
  taskStatus,
  showSearchBar,
  setShowSearchBar,
  follow,
  setFollow,
  onCopyLog,
  onDownloadLog,
  onScrollToBottom,
  onClose,
  tr,
}: TerminalPanelHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {hasThinking && (
        <button
          type="button"
          onClick={() => setShowThinking((p) => !p)}
          className="px-2 py-1 text-[10px] font-mono border transition"
          style={
            showThinking
              ? { borderRadius: "2px", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)", borderColor: "rgba(251,191,36,0.4)" }
              : { borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }
          }
          title={tr("사고 흐름", "Reasoning", "思考フロー", "推理流程")}
        >
          {tr("사고", "THINK", "思考", "推理")}
        </button>
      )}
      {isInterventionTarget && (
        <button
          type="button"
          onClick={() => {
            setInterventionOpen((prev) => !prev);
            setInterventionMessage(null);
          }}
          className="px-2 py-1 text-[10px] font-mono border transition"
          style={
            interventionOpen
              ? { borderRadius: "2px", background: "rgba(244,63,94,0.15)", color: "rgb(253,164,175)", borderColor: "rgba(244,63,94,0.4)" }
              : { borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }
          }
          title={tr("난입 패널", "Interrupt panel", "割り込みパネル", "中断面板")}
        >
          {taskStatus === "pending" ? tr("주입", "Inject", "注入", "注入") : tr("난입", "Interrupt", "割込", "中断")}
        </button>
      )}
      <button
        type="button"
        onClick={() => setShowSearchBar((prev) => !prev)}
        className="px-2 py-1 text-[10px] font-mono border transition"
        style={
          showSearchBar
            ? { borderRadius: "2px", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)", borderColor: "rgba(251,191,36,0.4)" }
            : { borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }
        }
        title={tr("검색", "Search", "検索", "搜索")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onCopyLog}
        className="px-2 py-1 text-[10px] font-mono border transition"
        style={{ borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }}
        title={tr("복사", "Copy log", "コピー", "复制")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDownloadLog}
        className="px-2 py-1 text-[10px] font-mono border transition"
        style={{ borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }}
        title={tr("다운로드", "Download log", "ダウンロード", "下载")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setFollow((f) => !f)}
        className="px-2 py-1 text-[10px] font-mono border transition"
        style={
          follow
            ? { borderRadius: "2px", background: "rgba(52,211,153,0.15)", color: "rgb(167,243,208)", borderColor: "rgba(52,211,153,0.4)" }
            : { borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderColor: "var(--th-border)" }
        }
        title={
          follow
            ? tr("자동 스크롤 ON", "Auto-scroll ON", "自動スクロール ON", "自动滚动 ON")
            : tr("자동 스크롤 OFF", "Auto-scroll OFF", "自動スクロール OFF", "自动滚动 OFF")
        }
      >
        {follow ? tr("따라가기", "FOLLOW", "追従中", "跟随中") : tr("일시정지", "PAUSED", "一時停止", "已暂停")}
      </button>
      <button
        type="button"
        onClick={onScrollToBottom}
        className="p-1.5 transition"
        style={{ borderRadius: "2px", color: "var(--th-text-secondary)" }}
        title={tr("맨 아래로", "Scroll to bottom", "一番下へ", "滚动到底部")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
      <button type="button" onClick={onClose} className="p-1.5 transition" style={{ borderRadius: "2px", color: "var(--th-text-secondary)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
