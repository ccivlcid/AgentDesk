import { createPortal } from "react-dom";
import type { RefObject } from "react";
import type { SkillLearnProvider } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import { providerLabel, type TFunction } from "./model";

interface CustomSkillModalProps {
  t: TFunction;
  show: boolean;
  agents: Agent[];
  representatives: Array<{ provider: SkillLearnProvider; agent: Agent | null }>;
  preferKoreanName: boolean;
  customSkillName: string;
  setCustomSkillName: (value: string) => void;
  customSkillContent: string;
  customSkillFileName: string;
  customSkillProviders: SkillLearnProvider[];
  customSkillSubmitting: boolean;
  customSkillError: string | null;
  customFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleProvider: (provider: SkillLearnProvider) => void;
  onSubmit: () => void;
}

export default function CustomSkillModal({
  t,
  show,
  agents,
  representatives,
  preferKoreanName,
  customSkillName,
  setCustomSkillName,
  customSkillContent,
  customSkillFileName,
  customSkillProviders,
  customSkillSubmitting,
  customSkillError,
  customFileInputRef,
  onClose,
  onFileSelect,
  onToggleProvider,
  onSubmit,
}: CustomSkillModalProps) {
  if (!show) return null;

  return createPortal(
    <div className="custom-skill-modal fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="custom-skill-modal-card w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div>
            <h3 className="text-base font-semibold font-mono flex items-center gap-2" style={{ color: "var(--th-text-heading)" }}>
              <span>✏️</span>
              {t({ ko: "커스텀 스킬 추가", en: "Add Custom Skill", ja: "カスタムスキル追加", zh: "添加自定义技能" })}
            </h3>
            <div className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "skills.md 파일을 첨부하고 CLI 대표자를 선택하세요",
                en: "Attach a skills.md file and select CLI representatives",
                ja: "skills.md ファイルを添付し、CLI代表を選択してください",
                zh: "附加 skills.md 文件并选择 CLI 代表",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={customSkillSubmitting}
            className="px-2.5 py-1 text-xs font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
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
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
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
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
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
                <span className="text-xs font-mono truncate max-w-[200px]" style={{ color: "rgb(167,243,208)" }}>📄 {customSkillFileName}</span>
              )}
            </div>
            {customSkillContent && (
              <div className="mt-2 p-2 max-h-32 overflow-y-auto" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)" }}>
                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all" style={{ color: "var(--th-text-muted)" }}>
                  {customSkillContent.slice(0, 500)}
                  {customSkillContent.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "학습시킬 CLI 대표자",
                en: "CLI Representatives to Train",
                ja: "学習させるCLI代表",
                zh: "要培训的 CLI 代表",
              })}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {representatives.map((row) => {
                const isSelected = customSkillProviders.includes(row.provider);
                const hasAgent = !!row.agent;
                const displayName = row.agent
                  ? preferKoreanName
                    ? row.agent.name_ko || row.agent.name
                    : row.agent.name || row.agent.name_ko
                  : t({ ko: "없음", en: "None", ja: "なし", zh: "无" });
                return (
                  <button
                    key={`custom-${row.provider}`}
                    onClick={() => hasAgent && onToggleProvider(row.provider)}
                    disabled={!hasAgent}
                    className="flex items-center gap-2 p-2 text-left transition"
                    style={!hasAgent
                      ? { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)", opacity: 0.5, cursor: "not-allowed" }
                      : isSelected
                        ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)" }
                        : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
                  >
                    <AgentAvatar agent={row.agent ?? undefined} agents={agents} size={32} rounded="xl" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{providerLabel(row.provider)}</div>
                      <div className="text-xs font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{displayName}</div>
                    </div>
                    <div
                      className="w-4 h-4 border flex items-center justify-center text-[10px] font-mono"
                      style={isSelected
                        ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }
                        : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
                    >
                      {isSelected && "✓"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {customSkillError && (
            <div className="text-[11px] font-mono px-3 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>
              {customSkillError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={customSkillSubmitting}
              className="px-3 py-1.5 text-xs font-mono transition"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
            >
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
            <button
              onClick={onSubmit}
              disabled={
                !customSkillName.trim() ||
                !customSkillContent.trim() ||
                customSkillProviders.length === 0 ||
                customSkillSubmitting
              }
              className="custom-skill-submit-btn px-4 py-1.5 text-xs font-mono border transition flex items-center gap-1.5"
              style={!customSkillName.trim() || !customSkillContent.trim() || customSkillProviders.length === 0
                ? { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "not-allowed" }
                : { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
            >
              {customSkillSubmitting ? (
                <>
                  <span className="animate-spin w-3 h-3 border border-t-transparent" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
                  {t({ ko: "등록중...", en: "Submitting...", ja: "登録中...", zh: "提交中..." })}
                </>
              ) : (
                <>
                  <span>🎓</span>
                  {t({ ko: "학습 시작", en: "Start Training", ja: "学習開始", zh: "开始培训" })}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
