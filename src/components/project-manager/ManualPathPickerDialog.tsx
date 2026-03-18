import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
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
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 50);
  }, [creating]);

  const handleConfirmCreate = async () => {
    const name = newFolderName.trim();
    if (!name || !manualPathCurrent) { setCreating(false); return; }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/fs/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_path: manualPathCurrent, name }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) {
        setCreateError(
          data.error === "already_exists"
            ? t({ ko: "이미 존재합니다", en: "Already exists", ja: "既に存在します", zh: "已存在" })
            : (data.error ?? "error"),
        );
        setCreateBusy(false);
        return;
      }
      setCreating(false);
      setNewFolderName("");
      await onLoadEntries(manualPathCurrent);
    } catch {
      setCreateError(t({ ko: "생성 실패", en: "Failed", ja: "作成失敗", zh: "创建失败" }));
    } finally {
      setCreateBusy(false);
    }
  };

  const handleCancelCreate = () => {
    setCreating(false);
    setNewFolderName("");
    setCreateError(null);
  };

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
          <button
            type="button"
            disabled={!manualPathCurrent || manualPathLoading}
            onClick={() => { setCreating(true); setNewFolderName(""); setCreateError(null); }}
            title={t({ ko: "새 폴더 만들기", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" })}
            className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75"
            style={{ ...mono, fontSize: 13, lineHeight: 1, background: "none", border: "none", color: "var(--th-text-secondary)", cursor: "pointer", padding: "2px 6px" }}
          >
            📁+
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "var(--th-bg-elevated)" }}>
          {creating && (
            <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-panel)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>📁</span>
                <input
                  ref={inputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleConfirmCreate();
                    if (e.key === "Escape") handleCancelCreate();
                  }}
                  placeholder={t({ ko: "폴더 이름", en: "Folder name", ja: "フォルダ名", zh: "文件夹名称" })}
                  style={{ ...mono, flex: 1, fontSize: 12, padding: "3px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-accent)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => void handleConfirmCreate()}
                  disabled={createBusy || !newFolderName.trim()}
                  style={{ ...mono, fontSize: 12, padding: "3px 8px", background: "var(--th-accent)", color: "var(--th-accent-text, var(--th-bg-primary))", border: "none", borderRadius: 4, cursor: "pointer", opacity: createBusy || !newFolderName.trim() ? 0.4 : 1 }}
                >✓</button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  style={{ ...mono, fontSize: 12, padding: "3px 8px", background: "none", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-muted)", cursor: "pointer" }}
                >✕</button>
              </div>
              {createError && (
                <p style={{ ...mono, fontSize: 10, color: "var(--th-danger-text, #f87171)", marginTop: 4 }}>{createError}</p>
              )}
            </div>
          )}
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
