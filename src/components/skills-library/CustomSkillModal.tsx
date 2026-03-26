import type { RefObject } from "react";
import FloatingWindow from "./FloatingWindow";
import type { TFunction } from "./model";

interface CustomSkillModalProps {
  t: TFunction;
  show: boolean;
  customSkillName: string;
  setCustomSkillName: (value: string) => void;
  customSkillContent: string;
  customSkillFileName: string;
  customSkillSubmitting: boolean;
  customSkillError: string | null;
  customFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export default function CustomSkillModal({
  t,
  show,
  customSkillName,
  setCustomSkillName,
  customSkillContent,
  customSkillFileName,
  customSkillSubmitting,
  customSkillError,
  customFileInputRef,
  onClose,
  onFileSelect,
  onSubmit,
}: CustomSkillModalProps) {
  if (!show) return null;

  const canSubmit = customSkillName.trim() && customSkillContent.trim();

  return (
    <FloatingWindow
      title={t({ ko: "커스텀 스킬 추가", en: "Add Custom Skill", ja: "カスタムスキル追加", zh: "添加自定义技能" })}
      subtitle={t({
        ko: "skills.md 파일을 첨부하여 커스텀 스킬을 등록하세요",
        en: "Attach a skills.md file to register a custom skill",
        ja: "skills.md ファイルを添付してカスタムスキルを登録してください",
        zh: "附加 skills.md 文件以注册自定义技能",
      })}
      onClose={onClose}
      disableClose={customSkillSubmitting}
      defaultWidth={520}
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "스킬명", en: "Skill Name", ja: "スキル名", zh: "技能名称" })}
          </label>
          <input
            type="text"
            value={customSkillName}
            onChange={(e) => setCustomSkillName(e.target.value)}
            placeholder={t({
              ko: "예: my-custom-skill",
              en: "e.g. my-custom-skill",
              ja: "例: my-custom-skill",
              zh: "例如: my-custom-skill",
            })}
            className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}
          />
          <div className="text-[10px] font-mono mt-1" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능",
              en: "Only alphanumeric, dash (-), underscore (_) allowed",
              ja: "英数字、ハイフン(-)、アンダースコア(_)のみ使用可能",
              zh: "仅允许字母数字、短划线(-)或下划线(_)",
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "skills.md 파일", en: "skills.md File", ja: "skills.md ファイル", zh: "skills.md 文件" })}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => customFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition"
              style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
            >
              <span>📎</span>
              {t({ ko: "파일 선택", en: "Choose File", ja: "ファイル選択", zh: "选择文件" })}
            </button>
            <input
              ref={customFileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              onChange={onFileSelect}
              className="hidden"
            />
            {customSkillFileName && (
              <span className="text-xs font-mono truncate max-w-[200px]" style={{ color: "var(--th-text-primary)" }}>📄 {customSkillFileName}</span>
            )}
          </div>
          {customSkillContent && (
            <div className="mt-2 p-2 max-h-32 overflow-y-auto" style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all" style={{ color: "var(--th-text-muted)" }}>
                {customSkillContent.slice(0, 500)}
                {customSkillContent.length > 500 && "..."}
              </pre>
            </div>
          )}
        </div>

        {customSkillError && (
          <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: 8, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>
            {customSkillError}
          </div>
        )}

        <div className="flex justify-end gap-2 pb-2">
          <button
            onClick={onClose}
            disabled={customSkillSubmitting}
            className="px-3 py-1.5 text-xs font-mono transition"
            style={{ borderRadius: 8, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || customSkillSubmitting}
            className="custom-skill-submit-btn px-4 py-1.5 text-xs font-mono border transition flex items-center gap-1.5"
            style={!canSubmit
              ? { borderRadius: 8, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "not-allowed" }
              : { borderRadius: 8, border: "1px solid var(--th-accent-focus)", background: "var(--th-accent-bg)", color: "var(--th-text-primary)" }}
          >
            {customSkillSubmitting ? (
              <>
                <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
                {t({ ko: "등록중...", en: "Submitting...", ja: "登録中...", zh: "提交中..." })}
              </>
            ) : (
              <>
                <span>🎓</span>
                {t({ ko: "학습 시작", en: "Start Training", ja: "学習開始", zh: "开始学习" })}
              </>
            )}
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
}
