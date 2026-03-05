import { useState, useEffect } from "react";
import { useI18n } from "../../i18n";
import { getTaskArtifactDownloadUrl, type TaskArtifact } from "../../api";

interface TextPreviewModalProps {
  taskId: string;
  artifact: TaskArtifact;
  onClose: () => void;
}

export default function TextPreviewModal({ taskId, artifact, onClose }: TextPreviewModalProps) {
  const { t } = useI18n();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = getTaskArtifactDownloadUrl(taskId, artifact.relativePath, true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setContent)
      .catch((err) => setError(String(err)));
  }, [taskId, artifact.relativePath]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{artifact.title}</h3>
            <div className="text-[11px] text-slate-500">{artifact.relativePath}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getTaskArtifactDownloadUrl(taskId, artifact.relativePath)}
              download
              className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
            </a>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="text-xs text-rose-400">{error}</div>
          ) : content === null ? (
            <div className="text-xs text-slate-500 animate-pulse">
              {t({ ko: "로딩중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all text-xs text-slate-300 font-mono leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
