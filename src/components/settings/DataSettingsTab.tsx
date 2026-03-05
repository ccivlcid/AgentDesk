import { useCallback, useRef, useState } from "react";
import { downloadBackup, restoreBackup, exportTasksCsv, exportTasksJson } from "../../api/backup";
import type { TFunction } from "./types";

interface DataSettingsTabProps {
  t: TFunction;
}

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

  const sectionStyle = {
    borderColor: "var(--th-border)",
    background: "var(--th-bg-surface)",
  };

  return (
    <div className="space-y-5">
      {/* Backup Section */}
      <div className="rounded-xl border p-5" style={sectionStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "데이터베이스 백업", en: "Database Backup", ja: "データベースバックアップ", zh: "数据库备份" })}
        </h3>
        <p className="mb-4 text-xs" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "전체 SQLite 데이터베이스를 파일로 다운로드합니다.",
            en: "Download the entire SQLite database as a file.",
            ja: "SQLiteデータベース全体をファイルとしてダウンロードします。",
            zh: "将整个SQLite数据库下载为文件。",
          })}
        </p>
        <button
          onClick={handleBackup}
          disabled={backupBusy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--th-accent, #3b82f6)" }}
        >
          {backupBusy
            ? t({ ko: "다운로드 중...", en: "Downloading...", ja: "ダウンロード中...", zh: "下载中..." })
            : t({ ko: "백업 다운로드", en: "Download Backup", ja: "バックアップをダウンロード", zh: "下载备份" })}
        </button>
      </div>

      {/* Restore Section */}
      <div className="rounded-xl border p-5" style={sectionStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "데이터베이스 복원", en: "Database Restore", ja: "データベース復元", zh: "数据库恢复" })}
        </h3>
        <p className="mb-4 text-xs" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "이전에 백업한 SQLite 파일을 업로드하여 복원합니다. 복원 후 서버 재시작이 필요합니다.",
            en: "Upload a previously backed-up SQLite file to restore. Server restart required after restore.",
            ja: "以前バックアップしたSQLiteファイルをアップロードして復元します。復元後にサーバーの再起動が必要です。",
            zh: "上传之前备份的SQLite文件进行恢复。恢复后需要重启服务器。",
          })}
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".sqlite,.db"
            className="text-sm"
            style={{ color: "var(--th-text-secondary)" }}
          />
          <button
            onClick={handleRestore}
            disabled={restoreBusy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#ef4444" }}
          >
            {restoreBusy
              ? t({ ko: "복원 중...", en: "Restoring...", ja: "復元中...", zh: "恢复中..." })
              : t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" })}
          </button>
        </div>
      </div>

      {/* Export Section */}
      <div className="rounded-xl border p-5" style={sectionStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "태스크 데이터 내보내기", en: "Export Tasks", ja: "タスクデータのエクスポート", zh: "导出任务数据" })}
        </h3>
        <p className="mb-4 text-xs" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "모든 태스크를 CSV 또는 JSON 형식으로 내보냅니다.",
            en: "Export all tasks in CSV or JSON format.",
            ja: "すべてのタスクをCSVまたはJSON形式でエクスポートします。",
            zh: "将所有任务导出为CSV或JSON格式。",
          })}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exportBusy}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--th-border)",
              color: "var(--th-text-primary)",
              background: "var(--th-bg-primary)",
            }}
          >
            {t({ ko: "CSV 내보내기", en: "Export CSV", ja: "CSVエクスポート", zh: "导出CSV" })}
          </button>
          <button
            onClick={handleExportJson}
            disabled={exportBusy}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--th-border)",
              color: "var(--th-text-primary)",
              background: "var(--th-bg-primary)",
            }}
          >
            {t({ ko: "JSON 내보내기", en: "Export JSON", ja: "JSONエクスポート", zh: "导出JSON" })}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          } border`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
