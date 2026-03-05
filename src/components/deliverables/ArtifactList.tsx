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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtifactList({ taskId, artifacts, onPreview }: ArtifactListProps) {
  const { t } = useI18n();

  return (
    <div className="divide-y divide-slate-700/40">
      {artifacts.map((art) => {
        const isText = art.type === "text";
        const isHtml = art.mime === "text/html";
        const downloadUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath);
        const previewUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath, true);

        return (
          <div key={art.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/50 transition">
            <span className="text-base shrink-0">{getIcon(art.title)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-200 truncate" title={art.relativePath}>
                {art.title}
              </div>
              <div className="text-[10px] text-slate-500">{formatSize(art.size)}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isText && !isHtml && (
                <button
                  type="button"
                  onClick={() => onPreview(art)}
                  className="rounded-md border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-600/50 transition"
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
                  className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-500/20 transition"
                >
                  {t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
                </a>
              )}
              <a
                href={downloadUrl}
                download
                className="rounded-md border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-600/50 transition"
                title={t({ ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载" })}
              >
                {t({ ko: "다운", en: "DL", ja: "DL", zh: "下载" })}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
