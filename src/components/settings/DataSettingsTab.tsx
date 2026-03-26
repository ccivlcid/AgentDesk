import { useCallback, useRef, useState } from "react";
import { downloadBackup, restoreBackup, exportTasksCsv, exportTasksJson } from "../../api/backup";
import type { TFunction } from "./types";
import { useConfirm } from "../ui/ConfirmDialog";

interface DataSettingsTabProps {
  t: TFunction;
}

const SigilBackup = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
);
const SigilRestore = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
);
const SigilExport = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12H3M15 18l6-6-6-6"/></svg>
);

export default function DataSettingsTab({ t }: DataSettingsTabProps) {
  const { confirm } = useConfirm();
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mono = "var(--th-font-mono)";

  const handleBackup = useCallback(async () => {
    setBackupBusy(true);
    setFeedback(null);
    try {
      await downloadBackup();
      setFeedback({
        type: "success",
        message: t({ ko: "백업 파일이 다운로드되었습니다.", en: "Backup file downloaded.", ja: "バックアップファイルがダウンロードされました。", zh: "备份文件已下载。" }),
      });
    } catch {
      setFeedback({ type: "error", message: t({ ko: "백업 다운로드에 실패했습니다.", en: "Backup download failed.", ja: "バックアップのダウンロードに失敗しました。", zh: "备份下载失败。" }) });
    } finally {
      setBackupBusy(false);
    }
  }, [t]);

  const handleRestore = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const ok = await confirm({
      title: t({ ko: "데이터베이스 복원", en: "Restore Database", ja: "データベースを復元", zh: "恢复数据库" }),
      message: t({
        ko: "현재 데이터베이스를 업로드한 파일로 교체합니다. 기존 데이터의 백업이 자동으로 생성됩니다. 계속하시겠습니까?",
        en: "This will replace the current database with the uploaded file. A backup of the existing data will be created automatically. Continue?",
        ja: "現在のデータベースをアップロードファイルで置き換えます。既存データのバックアップが自動作成されます。続行しますか？",
        zh: "将用上传的文件替换当前数据库。现有数据的备份将自动创建。是否继续？",
      }),
      confirmLabel: t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" }),
      cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
      variant: "danger",
    });
    if (!ok) return;

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
      setFeedback({ type: "error", message: t({ ko: "복원에 실패했습니다.", en: "Restore failed.", ja: "復元に失敗しました。", zh: "恢复失败。" }) });
    } finally {
      setRestoreBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [confirm, t]);

  const handleExportCsv = useCallback(async () => {
    setExportBusy(true);
    try {
      await exportTasksCsv();
    } catch {
      setFeedback({ type: "error", message: t({ ko: "내보내기 실패", en: "Export failed", ja: "エクスポート失敗", zh: "导出失败" }) });
    } finally {
      setExportBusy(false);
    }
  }, [t]);

  const handleExportJson = useCallback(async () => {
    setExportBusy(true);
    try {
      await exportTasksJson();
    } catch {
      setFeedback({ type: "error", message: t({ ko: "내보내기 실패", en: "Export failed", ja: "エクスポート失敗", zh: "导出失败" }) });
    } finally {
      setExportBusy(false);
    }
  }, [t]);

  const triggerFileInput = () => fileRef.current?.click();

  const sectionStyle: React.CSSProperties = {
    borderRadius: 24,
    padding: "24px",
    background: "var(--th-bg-elevated)",
    border: "1px solid #E5E7EB",
    transition: "all 0.2s",
  };

  const btnStyle = (variant: "primary" | "secondary" | "danger"): React.CSSProperties => ({
    borderRadius: 12,
    padding: "10px 20px",
    fontSize: "12px",
    fontWeight: 800,
    fontFamily: mono,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    transition: "all 0.2s",
    cursor: "pointer",
    border: variant === "secondary" ? "1px solid #E5E7EB" : "none",
    background: variant === "primary" ? "var(--th-accent)" : variant === "danger" ? "#EF4444" : "var(--th-bg-elevated)",
    color: variant === "secondary" ? "#4B5563" : "var(--th-bg-elevated)",
    boxShadow: variant === "secondary" ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  });

  return (
    <div className="data-settings-tab space-y-6">
      {/* Intro */}
      <div className="p-5 flex items-center gap-4" style={{ borderRadius: 24, background: "#F0F7FF", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
        <div style={{ padding: 10, background: "var(--th-bg-elevated)", borderRadius: 14, color: "var(--th-accent)", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.1)" }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7M16 19h6M19 16l3 3-3 3"/></svg>
        </div>
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E40AF" }}>{t({ ko: "데이터 관리", en: "Data Management", ja: "データ管理", zh: "数据管理" })}</h3>
          <p className="text-xs text-blue-600/70 font-medium mt-0.5">{t({ ko: "데이터베이스 백업, 복원 및 태스크 내보내기", en: "Backup, restore, and export tasks", ja: "バックアップ、復元、エクスポート", zh: "备份、恢复和导出任务" })}</p>
        </div>
      </div>

      {/* Backup */}
      <div style={sectionStyle} className="hover:shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div style={{ padding: 10, background: "var(--th-bg-surface)", borderRadius: 12, color: "var(--th-text-secondary)" }}><SigilBackup /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)" }}>{t({ ko: "시스템 백업", en: "System Backup", ja: "システムバックアップ", zh: "系统备份" })}</div>
            <p className="text-xs text-gray-500 mt-0.5">{t({ ko: "전체 SQLite 데이터베이스를 파일로 다운로드합니다.", en: "Download the entire SQLite database file.", ja: "SQLiteデータベース全体をダウンロード.", zh: "下载整个SQLite数据库文件." })}</p>
          </div>
        </div>
        <button onClick={handleBackup} disabled={backupBusy} style={btnStyle("primary")}>
          {backupBusy ? "..." : t({ ko: "백업 다운로드 ↵", en: "Download Backup ↵", ja: "バックアップをダウンロード ↵", zh: "下载备份 ↵" })}
        </button>
      </div>

      {/* Restore */}
      <div style={sectionStyle} className="hover:shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div style={{ padding: 10, background: "var(--th-bg-surface)", borderRadius: 12, color: "var(--th-text-secondary)" }}><SigilRestore /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)" }}>{t({ ko: "데이터 복원", en: "Data Restore", ja: "データ復元", zh: "数据恢复" })}</div>
            <p className="text-xs text-gray-500 mt-0.5">{t({ ko: "백업된 SQLite 파일을 업로드하여 복원합니다. (서버 재시작 필요)", en: "Upload SQLite file to restore. (Restart required)", ja: "SQLiteファイルをアップロードして復元. (再起動が必要)", zh: "上传SQLite文件以恢复. (需要重启)" })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".sqlite,.db" className="hidden" aria-hidden />
          <button type="button" onClick={triggerFileInput} disabled={restoreBusy} style={btnStyle("secondary")}>
            {t({ ko: "파일 선택", en: "Choose File", ja: "ファイルを選択", zh: "选择文件" })}
          </button>
          <button onClick={handleRestore} disabled={restoreBusy} style={btnStyle("danger")}>
            {restoreBusy ? "..." : t({ ko: "복원 ↵", en: "Restore ↵", ja: "復元 ↵", zh: "恢复 ↵" })}
          </button>
        </div>
      </div>

      {/* Export */}
      <div style={sectionStyle} className="hover:shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div style={{ padding: 10, background: "var(--th-bg-surface)", borderRadius: 12, color: "var(--th-text-secondary)" }}><SigilExport /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)" }}>{t({ ko: "태스크 내보내기", en: "Export Tasks", ja: "タスクエクスポート", zh: "导出任务" })}</div>
            <p className="text-xs text-gray-500 mt-0.5">{t({ ko: "모든 태스크를 CSV 또는 JSON 형식으로 내보냅니다.", en: "Export all tasks in CSV or JSON format.", ja: "すべてのタスクをCSVまたはJSONでエクスポート.", zh: "将所有任务导出为CSV或JSON." })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportCsv} disabled={exportBusy} style={btnStyle("secondary")}>CSV 내보내기</button>
          <button onClick={handleExportJson} disabled={exportBusy} style={btnStyle("secondary")}>JSON 내보내기</button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div role="alert" className="px-5 py-4 text-xs font-bold font-mono" style={{ borderRadius: 16, border: feedback.type === "success" ? "1px solid #A7F3D0" : "1px solid #FECACA", background: feedback.type === "success" ? "#ECFDF5" : "var(--th-danger-bg)", color: feedback.type === "success" ? "var(--th-success)" : "var(--th-danger-text)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <span className="mr-2">{feedback.type === "success" ? "✓" : "✗"}</span>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
