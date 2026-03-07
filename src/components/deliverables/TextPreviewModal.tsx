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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{artifact.title}</h3>
            <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{artifact.relativePath}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getTaskArtifactDownloadUrl(taskId, artifact.relativePath)}
              download
              className="px-2.5 py-1 text-xs font-mono transition"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
            </a>
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-mono transition"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>{error}</div>
          ) : content === null ? (
            <div className="text-xs font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "로딩중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all text-xs font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
