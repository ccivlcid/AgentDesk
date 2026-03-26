import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 900, maxHeight: "90vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", border: "1px solid #E5E7EB", background: "var(--th-bg-surface)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 20px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artifact.title}</div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>{artifact.relativePath}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <a
              href={getTaskArtifactDownloadUrl(taskId, artifact.relativePath)}
              download
              style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, padding: "4px 10px", border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent", textDecoration: "none", cursor: "pointer" }}
            >
              {t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
            </a>
            <button
              onClick={onClose}
              style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, padding: "4px 10px", border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent", cursor: "pointer" }}
            >
              {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {error ? (
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, color: "rgb(253,164,175)" }}>{error}</div>
          ) : content === null ? (
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, color: "var(--th-text-muted)" }}>
              {t({ ko: "로딩중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : (
            <pre style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, color: "var(--th-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.7, margin: 0 }}>
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
