import type { MissingPathPrompt, ProjectI18nTranslate } from "./types";

interface MissingPathPromptDialogProps {
  prompt: MissingPathPrompt | null;
  t: ProjectI18nTranslate;
  saving: boolean;
  onCancel: () => void;
  onConfirmCreate: () => void;
}

export default function MissingPathPromptDialog({
  prompt,
  t,
  saving,
  onCancel,
  onConfirmCreate,
}: MissingPathPromptDialogProps) {
  if (!prompt) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent)" }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({
              ko: "프로젝트 경로 확인",
              en: "Confirm Project Path",
              ja: "プロジェクトパス確認",
              zh: "确认项目路径",
            })}
          </h3>
        </div>
        <div className="space-y-2 px-4 py-4">
          <p className="text-xs font-mono" style={{ color: "var(--th-text-primary)" }}>
            {t({
              ko: "해당 경로가 없습니다. 추가하시겠습니까?",
              en: "This path does not exist. Create it now?",
              ja: "このパスは存在しません。作成しますか？",
              zh: "该路径不存在。现在创建吗？",
            })}
          </p>
          <p className="break-all px-2.5 py-2 text-xs font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}>
            {prompt.normalizedPath}
          </p>
          {prompt.nearestExistingParent && (
            <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: `기준 폴더: ${prompt.nearestExistingParent}`,
                en: `Base folder: ${prompt.nearestExistingParent}`,
                ja: `基準フォルダ: ${prompt.nearestExistingParent}`,
                zh: `基准目录：${prompt.nearestExistingParent}`,
              })}
            </p>
          )}
          {!prompt.canCreate && (
            <p className="text-xs text-amber-300">
              {t({
                ko: "현재 권한으로 해당 경로를 생성할 수 없습니다. 다른 경로를 선택해주세요.",
                en: "This path is not creatable with current permissions. Choose another path.",
                ja: "現在の権限ではこのパスを作成できません。別のパスを指定してください。",
                zh: "当前权限无法创建此路径，请选择其他路径。",
              })}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            type="button"
            disabled={!prompt.canCreate || saving}
            onClick={onConfirmCreate}
            className="px-3 py-1.5 text-xs font-semibold font-mono uppercase transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderRadius: "2px", background: "#10b981", color: "#000" }}
          >
            {t({ ko: "예", en: "Yes", ja: "はい", zh: "是" })}
          </button>
        </div>
      </div>
    </div>
  );
}
