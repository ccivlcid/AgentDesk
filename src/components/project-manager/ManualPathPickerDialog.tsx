import type { ManualPathEntry, ProjectI18nTranslate } from "./types";

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden"
        style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent)" }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({
              ko: "앱 내 폴더 탐색",
              en: "In-App Folder Browser",
              ja: "アプリ内フォルダ閲覧",
              zh: "应用内文件夹浏览",
            })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent" }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="px-3 py-2" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "현재 위치", en: "Current Location", ja: "現在位置", zh: "当前位置" })}
            </p>
            <p className="break-all text-xs font-mono" style={{ color: "var(--th-text-primary)" }}>{manualPathCurrent || "-"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!manualPathParent || manualPathLoading}
              onClick={() => {
                if (!manualPathParent) return;
                void onLoadEntries(manualPathParent);
              }}
              className="px-2.5 py-1 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "상위 폴더", en: "Up", ja: "上位フォルダ", zh: "上级目录" })}
            </button>
            <button
              type="button"
              disabled={manualPathLoading}
              onClick={() => void onLoadEntries(manualPathCurrent || undefined)}
              className="px-2.5 py-1 text-xs font-semibold font-mono transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            </button>
          </div>
          <div className="max-h-[45dvh] overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            {manualPathLoading ? (
              <p className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "폴더 목록을 불러오는 중...",
                  en: "Loading directories...",
                  ja: "フォルダ一覧を読み込み中...",
                  zh: "正在加载目录...",
                })}
              </p>
            ) : manualPathError ? (
              <p className="px-3 py-2 text-xs text-rose-300">{manualPathError}</p>
            ) : manualPathEntries.length === 0 ? (
              <p className="px-3 py-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({
                  ko: "선택 가능한 하위 폴더가 없습니다.",
                  en: "No selectable subdirectories.",
                  ja: "選択可能なサブディレクトリがありません。",
                  zh: "没有可选的子目录。",
                })}
              </p>
            ) : (
              manualPathEntries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => void onLoadEntries(entry.path)}
                  className="w-full px-3 py-2 text-left transition"
                  style={{ borderBottom: "1px solid var(--th-border)" }}
                >
                  <p className="text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{entry.name}</p>
                  <p className="truncate text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{entry.path}</p>
                </button>
              ))
            )}
          </div>
          {manualPathTruncated && (
            <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "항목이 많아 상위 300개 폴더만 표시했습니다.",
                en: "Only the first 300 directories are shown.",
                ja: "項目数が多いため先頭300件のみ表示しています。",
                zh: "目录过多，仅显示前300个。",
              })}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            type="button"
            disabled={!manualPathCurrent}
            onClick={onSelectCurrent}
            className="px-3 py-1.5 text-xs font-semibold font-mono uppercase transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            {t({ ko: "현재 폴더 선택", en: "Select Current Folder", ja: "現在フォルダを選択", zh: "选择当前文件夹" })}
          </button>
        </div>
      </div>
    </div>
  );
}
