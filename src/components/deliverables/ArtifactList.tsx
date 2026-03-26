import { useState } from "react";
import { useI18n } from "../../i18n";
import { getTaskArtifactDownloadUrl, type TaskArtifact } from "../../api";

interface ArtifactListProps {
  taskId: string;
  artifacts: TaskArtifact[];
  onPreview: (artifact: TaskArtifact) => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const EXT_COLOR: Record<string, string> = {
  ".pptx": "#f59e0b", ".ppt": "#f59e0b",
  ".xlsx": "#4ade80", ".xls": "#4ade80",
  ".docx": "#60a5fa", ".doc": "#60a5fa",
  ".pdf":  "#f87171",
  ".mp4":  "#c084fc", ".mp3": "#c084fc",
  ".html": "#34d399", ".htm": "#34d399",
  ".md":   "#94a3b8", ".txt": "#94a3b8",
  ".json": "#fbbf24", ".csv": "#fbbf24",
  ".png":  "#818cf8", ".jpg": "#818cf8", ".jpeg": "#818cf8",
  ".gif":  "#818cf8", ".svg": "#818cf8", ".webp": "#818cf8",
  ".zip":  "#f59e0b",
};

const EXT_TAG: Record<string, string> = {
  ".pptx": "PPT",  ".ppt":  "PPT",
  ".xlsx": "XLS",  ".xls":  "XLS",
  ".docx": "DOC",  ".doc":  "DOC",
  ".pdf":  "PDF",
  ".mp4":  "MP4",  ".mp3":  "MP3",
  ".html": "HTML", ".htm":  "HTML",
  ".md":   "MD",   ".txt":  "TXT",
  ".json": "JSON", ".csv":  "CSV",
  ".png":  "PNG",  ".jpg":  "JPG",  ".jpeg": "JPG",
  ".gif":  "GIF",  ".svg":  "SVG",  ".webp": "WEBP",
  ".zip":  "ZIP",
};

function getExt(fileName: string): string {
  return fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico"]);
const PDF_EXTS   = new Set([".pdf"]);

export default function ArtifactList({ taskId, artifacts, onPreview }: ArtifactListProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {artifacts.map((art, idx) => {
        const ext = getExt(art.title);
        const extColor = EXT_COLOR[ext] ?? "#64748b";
        const extTag   = EXT_TAG[ext]   ?? ext.replace(".", "").toUpperCase().slice(0, 4);
        const isText   = art.type === "text";
        const isHtml   = art.mime === "text/html";
        const isImage  = IMAGE_EXTS.has(ext);
        const isPdf    = PDF_EXTS.has(ext);
        const canInline = isImage || isPdf;
        const isExpanded = expandedId === art.id;
        const downloadUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath);
        const previewUrl  = getTaskArtifactDownloadUrl(taskId, art.relativePath, true);

        return (
          <div key={art.id}>
            <div
              className="group"
              style={{
                ...mono,
                display: "flex",
                alignItems: "center",
                gap: 0,
                borderBottom: idx < artifacts.length - 1 || isExpanded ? "1px solid #E5E7EB" : "none",
                background: "var(--th-bg-primary)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-primary)"; }}
            >
              {/* 파일 타입 태그 */}
              <div style={{ width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
                <span style={{ fontSize: "8px", fontWeight: 700, padding: "1px 4px", border: `1px solid ${extColor}44`, color: extColor, background: `${extColor}11`, letterSpacing: "0.06em" }}>
                  {extTag}
                </span>
              </div>

              {/* 파일명 + 경로 */}
              <div style={{ flex: 1, minWidth: 0, padding: "10px 8px" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={art.relativePath}
                >
                  {art.title}
                </div>
                {art.relativePath !== art.title && (
                  <div style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {art.relativePath}
                  </div>
                )}
              </div>

              {/* 크기 */}
              <span style={{ fontSize: "9px", color: "var(--th-text-muted)", width: 64, flexShrink: 0, textAlign: "right", paddingRight: 12 }}>
                {formatSize(art.size)}
              </span>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", borderLeft: "1px solid #E5E7EB", flexShrink: 0 }}>
                {canInline && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : art.id)}
                    style={{
                      ...mono,
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "0 10px",
                      minHeight: 38,
                      background: isExpanded ? "rgba(245,158,11,0.08)" : "none",
                      border: "none",
                      borderRight: "1px solid #E5E7EB",
                      color: isExpanded ? "var(--th-accent)" : "var(--th-text-muted)",
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {isExpanded
                      ? t({ ko: "접기", en: "HIDE", ja: "閉じる", zh: "收起" })
                      : t({ ko: "보기", en: "VIEW", ja: "プレビュー", zh: "预览" })}
                  </button>
                )}
                {isText && !isHtml && (
                  <button
                    type="button"
                    onClick={() => onPreview(art)}
                    style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "0 10px", minHeight: 38, background: "none", border: "none", borderRight: "1px solid #E5E7EB", color: "var(--th-text-muted)", cursor: "pointer", letterSpacing: "0.04em" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
                  >
                    {t({ ko: "보기", en: "VIEW", ja: "表示", zh: "查看" })}
                  </button>
                )}
                {isHtml && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "0 10px", minHeight: 38, display: "flex", alignItems: "center", background: "rgba(167,139,250,0.08)", borderRight: "1px solid #E5E7EB", color: "rgb(196,181,253)", textDecoration: "none", letterSpacing: "0.04em" }}
                  >
                    {t({ ko: "열기", en: "OPEN", ja: "開く", zh: "打开" })}
                  </a>
                )}
                <a
                  href={downloadUrl}
                  download
                  style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "0 10px", minHeight: 38, display: "flex", alignItems: "center", background: "none", color: "var(--th-text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#4ade80"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
                  title={t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t({ ko: "DL", en: "DL", ja: "DL", zh: "下载" })}
                  </span>
                </a>
              </div>
            </div>

            {/* 인라인 미리보기 */}
            {isExpanded && isImage && (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E7EB", background: "var(--th-bg-elevated)" }}>
                <img src={previewUrl} alt={art.title} style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} loading="lazy" />
              </div>
            )}
            {isExpanded && isPdf && (
              <div style={{ borderBottom: "1px solid #E5E7EB" }}>
                <iframe src={previewUrl} title={art.title} style={{ width: "100%", height: 400, background: "#fff", display: "block", border: "none" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
