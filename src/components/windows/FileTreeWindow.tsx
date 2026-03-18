import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import FileTreeWidget from "../desktop/widgets/FileTreeWidget";

function FileTreeIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M2 4a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />
    </svg>
  );
}

export default function FileTreeWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="file-tree"
      title={t({ ko: "파일 탐색기", en: "File Explorer", ja: "ファイルエクスプローラー", zh: "文件管理" })}
      emoji={<FileTreeIcon />}
      defaultWidth={640}
      defaultHeight={520}
    >
      <FileTreeWidget />
    </AppWindow>
  );
}
