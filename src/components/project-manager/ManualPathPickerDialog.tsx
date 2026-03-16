import { createPortal } from "react-dom";
import type { ManualPathEntry, ProjectI18nTranslate } from "./types";
import TrafficLights from "../desktop/TrafficLights";

interface ManualPathPickerDialogProps {
  open: boolean;
  t: ProjectI18nTranslate;
  manualPathCurrent: string;
  manualPathParent: string | null;
  manualPathEntries: ManualPathEntry[];
  manualPathLoading: boolean;
  manualPathError: string | null;
  manualPathTruncated: boolean;
  onClose: () => void;
  onLoadEntries: (targetPath?: string) => Promise<void>;
  onSelectCurrent: () => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function ManualPathPickerDialog({
  open,
  t,
  manualPathCurrent,
  manualPathParent,
  manualPathEntries,
  manualPathLoading,
  manualPathError,
  manualPathTruncated,
  onClose,
  onLoadEntries,
  onSelectCurrent,
}: ManualPathPickerDialogProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center"
      style={{ background: "var(--th-modal-overlay)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden"
        style={{
          borderRadius: 10,
          border: "1px solid var(--th-border-strong)",
          background: "var(--th-bg-elevated)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          maxHeight: "calc(100dvh - 4rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* macOS title bar */}
        <div
          className="flex flex-shrink-0 items-center gap-3 py-2 pl-3 pr-4"
          style={{
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-glass-bg)",
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            minHeight: 40,
          }}
        >
          <TrafficLights onClose={onClose} />
          <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", letterSpacing: "0.02em" }}>
            📁 {t({ ko: "폴더 탐색", en: "Folder Browser", ja: "フォルダ閲覧", zh: "文件夹浏览" })}
          </span>
        </div>

        {/* Toolbar: current path + nav buttons */}
        <div
          className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
          style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-panel)" }}
        >
          <button
            type="button"
            disabled={!manualPathParent || manualPathLoading}
            onClick={() => { if (!manualPathParent) return; void onLoadEntries(manualPathParent); }}
            title={t({ ko: "상위 폴더", en: "Up", ja: "上位フォルダ", zh: "上级目录" })}
            className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75"
            style={{ ...mono, fontSize: 14, lineHeight: 1, background: "none", border: "none", color: "var(--th-text-secondary)", cursor: "pointer", padding: "2px 4px" }}
          >
            ←
          </button>
          <button
            type="button"
            disabled={manualPathLoading}
            onClick={() => void onLoadEntries(manualPathCurrent || undefined)}
            title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75"
            style={{ ...mono, fontSize: 13, lineHeight: 1, background: "none", border: "none", color: "var(--th-text-secondary)", cursor: "pointer", padding: "2px 4px" }}
          >
            ↺
          </button>
          <div
            className="flex-1 truncate px-2 py-1"
            style={{
              ...mono,
              fontSize: 11,
              color: "var(--th-text-primary)",
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border)",
              borderRadius: 4,
            }}
          >
            {manualPathCurrent || "—"}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "var(--th-bg-elevated)" }}>
          {manualPathLoading ? (
            <div className="flex items-center justify-center py-12">
              <p style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
                {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
              </p>
            </div>
          ) : manualPathError ? (
            <div className="px-4 py-3">
              <p style={{ ...mono, fontSize: 11, color: "var(--th-danger-text, #f87171)" }}>{manualPathError}</p>
            </div>
          ) : manualPathEntries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
                {t({ ko: "하위 폴더가 없습니다", en: "No subdirectories", ja: "サブフォルダなし", zh: "无子目录" })}
              </p>
            </div>
          ) : (
            manualPathEntries.map((entry, i) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => void onLoadEntries(entry.path)}
                className="w-full text-left transition-colors hover:bg-[var(--th-hover-bg)]"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 16px",
                  borderBottom: i < manualPathEntries.length - 1 ? "1px solid var(--th-border)" : "none",
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📁</span>
                <span style={{ ...mono, fontSize: 12, color: "var(--th-text-primary)", fontWeight: 500 }}>{entry.name}</span>
                <span className="ml-auto truncate" style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{entry.path}</span>
              </button>
            ))
          )}
          {manualPathTruncated && (
            <p className="px-4 py-2" style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", borderTop: "1px solid var(--th-border)" }}>
              {t({ ko: "상위 300개만 표시", en: "Showing first 300 entries", ja: "先頭300件のみ表示", zh: "仅显示前300项" })}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex flex-shrink-0 items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid var(--th-border)", background: "var(--th-bg-panel)" }}
        >
          <p style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
            {t({ ko: "선택할 폴더로 이동 후 아래 버튼을 누르세요", en: "Navigate to folder, then confirm", ja: "フォルダに移動して確認", zh: "导航到文件夹后确认" })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{ ...mono, fontSize: 11, padding: "5px 12px", borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              type="button"
              disabled={!manualPathCurrent}
              onClick={onSelectCurrent}
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 14px",
                borderRadius: 0,
                background: "var(--th-accent)",
                color: "var(--th-accent-text, var(--th-bg-primary))",
                cursor: "pointer",
                opacity: manualPathCurrent ? 1 : 0.4,
              }}
            >
              {t({ ko: "이 폴더 선택 ↵", en: "Select ↵", ja: "選択 ↵", zh: "选择 ↵" })}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
