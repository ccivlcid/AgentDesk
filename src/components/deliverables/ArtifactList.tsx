import { useState } from "react";
import { useI18n } from "../../i18n";
import { getTaskArtifactDownloadUrl, type TaskArtifact } from "../../api";

interface ArtifactListProps {
  taskId: string;
  artifacts: TaskArtifact[];
  onPreview: (artifact: TaskArtifact) => void;
}

const FILE_ICONS: Record<string, string> = {
  ".pptx": "\uD83D\uDCCA",
  ".ppt": "\uD83D\uDCCA",
  ".xlsx": "\uD83D\uDCC8",
  ".xls": "\uD83D\uDCC8",
  ".docx": "\uD83D\uDCC4",
  ".doc": "\uD83D\uDCC4",
  ".pdf": "\uD83D\uDCD5",
  ".mp4": "\uD83C\uDFAC",
  ".mp3": "\uD83C\uDFB5",
  ".html": "\uD83C\uDF10",
  ".htm": "\uD83C\uDF10",
  ".md": "\uD83D\uDCDD",
  ".markdown": "\uD83D\uDCDD",
  ".txt": "\uD83D\uDCDD",
  ".json": "\uD83D\uDCDD",
  ".csv": "\uD83D\uDCDD",
  ".png": "\uD83D\uDDBC\uFE0F",
  ".jpg": "\uD83D\uDDBC\uFE0F",
  ".jpeg": "\uD83D\uDDBC\uFE0F",
  ".gif": "\uD83D\uDDBC\uFE0F",
  ".svg": "\uD83D\uDDBC\uFE0F",
  ".webp": "\uD83D\uDDBC\uFE0F",
  ".zip": "\uD83D\uDCE6",
};

function getIcon(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return FILE_ICONS[ext] || "\uD83D\uDCC1";
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico"]);
const PDF_EXTS = new Set([".pdf"]);

function isImageFile(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTS.has(ext);
}

function isPdfFile(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return PDF_EXTS.has(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtifactList({ taskId, artifacts, onPreview }: ArtifactListProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ borderTop: "1px solid var(--th-border)" }}>
      {artifacts.map((art) => {
        const isText = art.type === "text";
        const isHtml = art.mime === "text/html";
        const isImage = isImageFile(art.title);
        const isPdf = isPdfFile(art.title);
        const canInlinePreview = isImage || isPdf;
        const isExpanded = expandedId === art.id;
        const downloadUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath);
        const previewUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath, true);

        return (
          <div key={art.id}>
            <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--th-bg-surface-hover)] transition" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span className="text-base shrink-0">{getIcon(art.title)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono truncate" style={{ color: "var(--th-text-primary)" }} title={art.relativePath}>
                  {art.title}
                </div>
                <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{formatSize(art.size)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canInlinePreview && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : art.id)}
                    className="px-2 py-0.5 text-[10px] font-mono transition"
                    style={isExpanded
                      ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                      : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                    title={t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
                  >
                    {isExpanded
                      ? t({ ko: "접기", en: "Hide", ja: "閉じる", zh: "收起" })
                      : t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
                  </button>
                )}
                {isText && !isHtml && (
                  <button
                    type="button"
                    onClick={() => onPreview(art)}
                    className="px-2 py-0.5 text-[10px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                    title={t({ ko: "보기", en: "View", ja: "表示", zh: "查看" })}
                  >
                    {t({ ko: "보기", en: "View", ja: "表示", zh: "查看" })}
                  </button>
                )}
                {isHtml && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 text-[10px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.1)", color: "rgb(196,181,253)" }}
                  >
                    {t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
                  </a>
                )}
                <a
                  href={downloadUrl}
                  download
                  className="px-2 py-0.5 text-[10px] font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                  title={t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
                >
                  {t({ ko: "다운", en: "DL", ja: "DL", zh: "下载" })}
                </a>
              </div>
            </div>
            {/* Inline preview */}
            {isExpanded && isImage && (
              <div className="px-3 pb-3">
                <div className="p-2 flex items-center justify-center" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                  <img
                    src={previewUrl}
                    alt={art.title}
                    className="max-w-full max-h-80 object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {isExpanded && isPdf && (
              <div className="px-3 pb-3">
                <iframe
                  src={previewUrl}
                  title={art.title}
                  className="w-full h-96 bg-white"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
