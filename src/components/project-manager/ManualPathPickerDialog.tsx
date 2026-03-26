import { useEffect, useRef, useState } from "react";
import type { ManualPathEntry, ProjectI18nTranslate } from "./types";
import AppWindow from "../windows/AppWindow";

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

const folderIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

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

  return (
    <AppWindow
      windowType="folder-browser"
      title={t({ ko: "폴더 탐색", en: "Folder Browser", ja: "フォルダ閲覧", zh: "文件夹浏览" })}
      emoji={folderIcon}
      defaultWidth={680}
      defaultHeight={460}
      onClose={onClose}
    >
      {/* Toolbar: current path + nav buttons */}
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
      >
        <button
          type="button"
          disabled={!manualPathParent || manualPathLoading}
          onClick={() => { if (!manualPathParent) return; void onLoadEntries(manualPathParent); }}
          title={t({ ko: "상위 폴더", en: "Up", ja: "上位フォルダ", zh: "上级目录" })}
          className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75"
          style={{ ...mono, fontSize: 14, lineHeight: 1, background: "none", border: "none", color: "var(--th-text-secondary)", cursor: "pointer", padding: "2px 4px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          disabled={manualPathLoading}
          onClick={() => void onLoadEntries(manualPathCurrent || undefined)}
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75"
          style={{ ...mono, fontSize: 13, lineHeight: 1, background: "none", border: "none", color: "var(--th-text-secondary)", cursor: "pointer", padding: "2px 4px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
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
          className="disabled:cursor-not-allowed disabled:opacity-35 transition-opacity hover:opacity-75 flex items-center gap-1"
          style={{ ...mono, fontSize: 11, background: "none", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-secondary)", cursor: "pointer", padding: "3px 7px" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "var(--th-bg-elevated)" }}>
        {creating && (
          <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
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
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                style={{ ...mono, fontSize: 12, padding: "3px 8px", background: "none", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-muted)", cursor: "pointer" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
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
              className="w-full text-left transition-colors hover:bg-[var(--th-bg-primary)]"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 16px",
                borderBottom: i < manualPathEntries.length - 1 ? "1px solid var(--th-border)" : "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--th-accent)" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
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
        style={{ borderTop: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
      >
        <p style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "선택할 폴더로 이동 후 아래 버튼을 누르세요", en: "Navigate to folder, then confirm", ja: "フォルダに移動して確認", zh: "导航到文件夹后确认" })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            style={{ ...mono, fontSize: 11, padding: "5px 12px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer" }}
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
              borderRadius: 4,
              background: "var(--th-accent)",
              color: "var(--th-accent-text, var(--th-bg-primary))",
              cursor: "pointer",
              opacity: manualPathCurrent ? 1 : 0.4,
            }}
          >
            {t({ ko: "이 폴더 선택", en: "Select folder", ja: "選択", zh: "选择" })}
          </button>
        </div>
      </div>
    </AppWindow>
  );
}
