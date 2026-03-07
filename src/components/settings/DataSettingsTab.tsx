import { useCallback, useRef, useState } from "react";
import { downloadBackup, restoreBackup, exportTasksCsv, exportTasksJson } from "../../api/backup";
import type { TFunction } from "./types";

interface DataSettingsTabProps {
  t: TFunction;
}

const IconBackup = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconRestore = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const IconExport = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default function DataSettingsTab({ t }: DataSettingsTabProps) {
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = useCallback(async () => {
    setBackupBusy(true);
    setFeedback(null);
    try {
      await downloadBackup();
      setFeedback({
        type: "success",
        message: t({
          ko: "백업 파일이 다운로드되었습니다.",
          en: "Backup file downloaded.",
          ja: "バックアップファイルがダウンロードされました。",
          zh: "备份文件已下载。",
        }),
      });
    } catch {
      setFeedback({
        type: "error",
        message: t({
          ko: "백업 다운로드에 실패했습니다.",
          en: "Backup download failed.",
          ja: "バックアップのダウンロードに失敗しました。",
          zh: "备份下载失败。",
        }),
      });
    } finally {
      setBackupBusy(false);
    }
  }, [t]);

  const handleRestore = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      t({
        ko: "현재 데이터베이스를 업로드한 파일로 교체합니다. 기존 데이터의 백업이 자동으로 생성됩니다. 계속하시겠습니까?",
        en: "This will replace the current database with the uploaded file. A backup of the existing data will be created automatically. Continue?",
        ja: "現在のデータベースをアップロードファイルで置き換えます。既存データのバックアップが自動作成されます。続行しますか？",
        zh: "将用上传的文件替换当前数据库。现有数据的备份将自动创建。是否继续？",
      }),
    );
    if (!confirmed) return;

    setRestoreBusy(true);
    setFeedback(null);
    try {
      const result = await restoreBackup(file);
      if (result.ok) {
        setFeedback({
          type: "success",
          message: t({
            ko: "복원 완료. 서버를 재시작해야 변경사항이 적용됩니다.",
            en: "Restore complete. Restart the server for changes to take effect.",
            ja: "復元完了。変更を反映するにはサーバーの再起動が必要です。",
            zh: "恢复完成。需要重启服务器才能生效。",
          }),
        });
      } else {
        setFeedback({ type: "error", message: result.message || "Restore failed" });
      }
    } catch {
      setFeedback({
        type: "error",
        message: t({
          ko: "복원에 실패했습니다.",
          en: "Restore failed.",
          ja: "復元に失敗しました。",
          zh: "恢复失败。",
        }),
      });
    } finally {
      setRestoreBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [t]);

  const handleExportCsv = useCallback(async () => {
    setExportBusy(true);
    try {
      await exportTasksCsv();
    } catch {
      setFeedback({
        type: "error",
        message: t({ ko: "내보내기 실패", en: "Export failed", ja: "エクスポート失敗", zh: "导出失败" }),
      });
    } finally {
      setExportBusy(false);
    }
  }, [t]);

  const handleExportJson = useCallback(async () => {
    setExportBusy(true);
    try {
      await exportTasksJson();
    } catch {
      setFeedback({
        type: "error",
        message: t({ ko: "내보내기 실패", en: "Export failed", ja: "エクスポート失敗", zh: "导出失败" }),
      });
    } finally {
      setExportBusy(false);
    }
  }, [t]);

  const triggerFileInput = () => fileRef.current?.click();

  return (
    <div className="data-settings-tab space-y-6">
      {/* Page intro */}
      <div className="p-4" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <h2 className="mb-1 text-base font-semibold tracking-tight" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "데이터 관리", en: "Data Management", ja: "データ管理", zh: "数据管理" })}
        </h2>
        <p className="text-sm" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "데이터베이스 백업·복원과 태스크 내보내기를 한 곳에서 할 수 있습니다.",
            en: "Backup, restore the database, and export tasks from one place.",
            ja: "データベースのバックアップ・復元とタスクのエクスポートを一括で行えます。",
            zh: "在此备份/恢复数据库并导出任务。",
          })}
        </p>
      </div>

      {/* Backup */}
      <div className="p-5 transition-colors" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}>
            <IconBackup />
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {t({ ko: "데이터베이스 백업", en: "Database Backup", ja: "データベースバックアップ", zh: "数据库备份" })}
            </h3>
            <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "전체 SQLite 데이터베이스를 파일로 다운로드합니다.",
                en: "Download the entire SQLite database as a file.",
                ja: "SQLiteデータベース全体をファイルとしてダウンロードします。",
                zh: "将整个SQLite数据库下载为文件。",
              })}
            </p>
          </div>
        </div>
        <button
          onClick={handleBackup}
          disabled={backupBusy}
          className="data-settings-btn data-settings-btn-primary px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
          style={{ borderRadius: "2px" }}
        >
          {backupBusy
            ? t({ ko: "다운로드 중...", en: "Downloading...", ja: "ダウンロード中...", zh: "下载中..." })
            : t({ ko: "백업 다운로드", en: "Download Backup", ja: "バックアップをダウンロード", zh: "下载备份" })}
        </button>
      </div>

      {/* Restore */}
      <div className="p-5 transition-colors" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}>
            <IconRestore />
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {t({ ko: "데이터베이스 복원", en: "Database Restore", ja: "データベース復元", zh: "数据库恢复" })}
            </h3>
            <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "이전에 백업한 SQLite 파일을 업로드하여 복원합니다. 복원 후 서버 재시작이 필요합니다.",
                en: "Upload a previously backed-up SQLite file to restore. Server restart required after restore.",
                ja: "以前バックアップしたSQLiteファイルをアップロードして復元します。復元後にサーバーの再起動が必要です。",
                zh: "上传之前备份的SQLite文件进行恢复。恢复后需要重启服务器。",
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".sqlite,.db"
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={restoreBusy}
            className="data-settings-btn data-settings-btn-secondary px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
            style={{ borderRadius: "2px" }}
          >
            {t({ ko: "파일 선택", en: "Choose File", ja: "ファイルを選択", zh: "选择文件" })}
          </button>
          <button
            onClick={handleRestore}
            disabled={restoreBusy}
            className="data-settings-btn data-settings-btn-danger px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
            style={{ borderRadius: "2px" }}
          >
            {restoreBusy
              ? t({ ko: "복원 중...", en: "Restoring...", ja: "復元中...", zh: "恢复中..." })
              : t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" })}
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="p-5 transition-colors" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}>
            <IconExport />
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
              {t({ ko: "태스크 데이터 내보내기", en: "Export Tasks", ja: "タスクデータのエクスポート", zh: "导出任务数据" })}
            </h3>
            <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "모든 태스크를 CSV 또는 JSON 형식으로 내보냅니다.",
                en: "Export all tasks in CSV or JSON format.",
                ja: "すべてのタスクをCSVまたはJSON形式でエクスポートします。",
                zh: "将所有任务导出为CSV或JSON格式。",
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exportBusy}
            className="data-settings-btn data-settings-btn-secondary px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
            style={{ borderRadius: "2px" }}
          >
            {t({ ko: "CSV 내보내기", en: "Export CSV", ja: "CSVエクスポート", zh: "导出CSV" })}
          </button>
          <button
            onClick={handleExportJson}
            disabled={exportBusy}
            className="data-settings-btn data-settings-btn-secondary px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
            style={{ borderRadius: "2px" }}
          >
            {t({ ko: "JSON 내보내기", en: "Export JSON", ja: "JSONエクスポート", zh: "导出JSON" })}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          className="data-settings-feedback px-4 py-3 text-sm font-mono"
          style={{
            borderRadius: "2px",
            border: feedback.type === "success" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)",
            background: feedback.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: feedback.type === "success" ? "#34d399" : "#f87171",
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
